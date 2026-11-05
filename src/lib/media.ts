import { load, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

export type ImageCandidate = {
  url: string;
  width: number | null;
  height: number | null;
};

const BAD_IMAGE =
  /(?:tracking|pixel|spacer|blank|transparent|1x1|logo|icon|avatar|sprite|badge|emoji|gravatar)/i;

function numberOrNull(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeImage(raw: string | undefined, baseUrl: string): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return null;
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (BAD_IMAGE.test(`${url.pathname}${url.search}`)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function fromSrcset(value: string | undefined, baseUrl: string): ImageCandidate | null {
  if (!value) return null;
  const candidates = value
    .split(",")
    .map((part) => {
      const [url, descriptor] = part.trim().split(/\s+/);
      const width = descriptor?.endsWith("w")
        ? Number.parseInt(descriptor.slice(0, -1), 10)
        : null;
      return { url: normalizeImage(url, baseUrl), width };
    })
    .filter((candidate): candidate is { url: string; width: number | null } => Boolean(candidate.url))
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const best = candidates[0];
  return best ? { url: best.url, width: best.width, height: null } : null;
}

function imageFromElement(
  $: CheerioAPI,
  element: Element,
  baseUrl: string,
): ImageCandidate | null {
  const node = $(element);
  const srcset = fromSrcset(node.attr("srcset") ?? node.attr("data-srcset"), baseUrl);
  const raw =
    node.attr("data-src") ??
    node.attr("data-lazy-src") ??
    node.attr("data-original") ??
    node.attr("src");
  const url = normalizeImage(raw, baseUrl);
  if (!url) return srcset;
  const width = numberOrNull(node.attr("width")) ?? srcset?.width ?? null;
  const height = numberOrNull(node.attr("height")) ?? null;
  if (width !== null && width < 120) return srcset;
  return { url, width, height };
}

export function imageFromHtml(html: string | null | undefined, baseUrl: string): ImageCandidate | null {
  if (!html) return null;
  const $ = load(html);
  let found: ImageCandidate | null = null;
  $("img, picture source").each((_, element) => {
    if (found) return false;
    found = imageFromElement($, element, baseUrl);
    return;
  });
  return found;
}

export function imageFromItem(item: Record<string, unknown>, baseUrl: string): ImageCandidate | null {
  const mediaContent = item.mediaContent ?? item["media:content"];
  const mediaList = Array.isArray(mediaContent) ? mediaContent : mediaContent ? [mediaContent] : [];
  for (const entry of mediaList) {
    const record = entry as Record<string, unknown>;
    const attrs = (record.$ ?? record) as Record<string, unknown>;
    if (attrs.medium && attrs.medium !== "image") continue;
    const url = normalizeImage(String(attrs.url ?? ""), baseUrl);
    if (url) {
      return {
        url,
        width: numberOrNull(attrs.width),
        height: numberOrNull(attrs.height),
      };
    }
  }

  const mediaThumbnail = item.mediaThumbnail ?? item["media:thumbnail"];
  const thumbs = Array.isArray(mediaThumbnail)
    ? mediaThumbnail
    : mediaThumbnail
      ? [mediaThumbnail]
      : [];
  for (const entry of thumbs) {
    const record = entry as Record<string, unknown>;
    const attrs = (record.$ ?? record) as Record<string, unknown>;
    const url = normalizeImage(String(attrs.url ?? ""), baseUrl);
    if (url) {
      return {
        url,
        width: numberOrNull(attrs.width),
        height: numberOrNull(attrs.height),
      };
    }
  }

  const enclosure = item.enclosure as Record<string, unknown> | undefined;
  if (enclosure) {
    const type = String(enclosure.type ?? "");
    if (!type || type.startsWith("image/")) {
      const url = normalizeImage(String(enclosure.url ?? ""), baseUrl);
      if (url) {
        return {
          url,
          width: numberOrNull(enclosure.width),
          height: numberOrNull(enclosure.height),
        };
      }
    }
  }

  const html =
    (typeof item.contentEncoded === "string" && item.contentEncoded) ||
    (typeof item["content:encoded"] === "string" && item["content:encoded"]) ||
    (typeof item.content === "string" && item.content.includes("<") && item.content) ||
    null;

  return imageFromHtml(html, baseUrl);
}

export function feedHtmlFromItem(item: Record<string, unknown>): string | null {
  const html =
    (typeof item.contentEncoded === "string" && item.contentEncoded) ||
    (typeof item["content:encoded"] === "string" && item["content:encoded"]) ||
    (typeof item.content === "string" && item.content.includes("<") && item.content) ||
    null;
  if (!html) return null;
  const trimmed = html.trim();
  if (trimmed.length < 40) return null;
  return trimmed.length > 300_000 ? trimmed.slice(0, 300_000) : trimmed;
}

function jsonLdImage(value: unknown, baseUrl: string): ImageCandidate | null {
  if (!value) return null;
  if (typeof value === "string") {
    const url = normalizeImage(value, baseUrl);
    return url ? { url, width: null, height: null } : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = jsonLdImage(item, baseUrl);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const found =
      jsonLdImage(record.image, baseUrl) ??
      jsonLdImage(record.thumbnailUrl, baseUrl) ??
      jsonLdImage(record.contentUrl, baseUrl) ??
      jsonLdImage(record.url, baseUrl);
    if (found) {
      return {
        ...found,
        width: numberOrNull(record.width) ?? found.width,
        height: numberOrNull(record.height) ?? found.height,
      };
    }
  }
  return null;
}

function imageFromJsonLd(html: string, baseUrl: string): ImageCandidate | null {
  const $ = load(html);
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    const text = $(element).text().trim();
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      const found = jsonLdImage(parsed, baseUrl);
      if (found) return found;
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return null;
}

export function metaImage(html: string, baseUrl: string): ImageCandidate | null {
  const $ = load(html);
  const raw =
    $('meta[property="og:image:secure_url"]').attr("content") ??
    $('meta[property="og:image"]').attr("content") ??
    $('meta[name="twitter:image"]').attr("content") ??
    $('meta[name="twitter:image:src"]').attr("content") ??
    $('link[rel="image_src"]').attr("href");
  const url = normalizeImage(raw, baseUrl);
  if (!url) {
    return imageFromJsonLd(html, baseUrl) ?? imageFromHtml(html, baseUrl);
  }
  return {
    url,
    width: numberOrNull($('meta[property="og:image:width"]').attr("content")),
    height: numberOrNull($('meta[property="og:image:height"]').attr("content")),
  };
}
