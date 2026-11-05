import "server-only";
import {
  getWikiLeadImages,
  getWikiPageCache,
  getWikiSearchCache,
  pruneWikiCache,
  saveWikiLeadImages,
  saveWikiPage,
  saveWikiSearch,
} from "@/db/wiki";
import type { WikiImage, WikiLeadImage, WikiPage } from "@/db/schema";
import { stripHtml } from "@/lib/utils";
import { normalizeWikiTitle } from "@/lib/wiki-links";

export { wikiHref, wikiTitleFromUrl } from "@/lib/wiki-links";

const API = "https://en.wikipedia.org/w/api.php";
const UA = "Brief/0.1 (local news and reference desk)";
const CACHE_DAYS = Number.parseInt(process.env.BRIEF_WIKI_CACHE_DAYS ?? "30", 10);
const SEARCH_CACHE_HOURS = Number.parseInt(
  process.env.BRIEF_WIKI_SEARCH_CACHE_HOURS ?? "24",
  10,
);
const LEAD_CACHE_DAYS = Number.parseInt(
  process.env.BRIEF_WIKI_LEAD_CACHE_DAYS ?? "30",
  10,
);

let lastPrune = 0;

export type WikiSearchResult = {
  pageId: number;
  title: string;
  summary: string | null;
  url: string;
  thumbnailUrl: string | null;
};

type ApiImage = {
  title: string;
  ns?: number;
};

type ApiPage = {
  pageid: number;
  ns: number;
  title: string;
  fullurl?: string;
  extract?: string;
  thumbnail?: { source: string; width: number; height: number };
  original?: { source: string; width: number; height: number };
  pageimage?: string;
  images?: ApiImage[];
  missing?: boolean;
};

type ApiResponse = {
  query?: {
    pages?: ApiPage[];
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
  };
};

type ImageInfoPage = {
  title: string;
  imageinfo?: Array<{
    url: string;
    descriptionurl?: string;
    thumburl?: string;
    width: number;
    height: number;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};

type ImageInfoResponse = {
  query?: {
    pages?: ImageInfoPage[];
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
  };
};

const SKIP_FILE =
  /(?:logo|wordmark|icon|symbol|flag|commons|wiktionary|wikisource|wikiquote|question_book|ambox|edit-clear|padlock|emblem|seal|blank|placeholder|nuvola|folder|disambig)/i;
const SKIP_EXT = /\.(?:svg|tif|tiff|pdf|djvu|ogg|oga|ogv|webm|mp3|wav)$/i;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fresh(fetchedAt: number, days: number): boolean {
  return Date.now() - fetchedAt < Math.max(1, days) * 86_400_000;
}

function maybePrune() {
  if (Date.now() - lastPrune < 3_600_000) return;
  lastPrune = Date.now();
  pruneWikiCache();
}

async function fetchJson<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(API);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(18_000),
        cache: "no-store",
      });
      if (response.ok) return (await response.json()) as T;
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`Wikipedia HTTP ${response.status}`);
      }
    } catch (error) {
      if (attempt === 3) throw error;
    }
    await sleep(900 * (attempt + 1));
  }
  throw new Error("Wikipedia request failed");
}

function aliasMap(
  normalized: Array<{ from: string; to: string }> = [],
  redirects: Array<{ from: string; to: string }> = [],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of normalized) map.set(entry.from, entry.to);
  for (const entry of redirects) map.set(entry.from, entry.to);
  return map;
}

function resolveAlias(title: string, aliases: Map<string, string>): string {
  let current = title;
  for (let index = 0; index < 6; index += 1) {
    const next = aliases.get(current);
    if (!next || next === current) break;
    current = next;
  }
  return current;
}

function summaryFromExtract(extract: string | undefined): string | null {
  if (!extract) return null;
  const first = extract.split(/\n+/).map((part) => part.trim()).find(Boolean);
  if (!first) return null;
  return first.length > 700 ? `${first.slice(0, 697)}…` : first;
}

function metaValue(
  metadata: Record<string, { value?: string }> | undefined,
  key: string,
): string | null {
  const value = metadata?.[key]?.value;
  return value ? stripHtml(value) : null;
}

function isNonFree(
  metadata: Record<string, { value?: string }> | undefined,
  license: string | null,
): boolean {
  const nonFree = metadata?.NonFree?.value;
  if (nonFree && !/^(?:false|0|no)$/i.test(nonFree)) return true;
  return Boolean(license && /non-free|fair use/i.test(license));
}

function fileImage(
  page: ImageInfoPage,
  position: number,
): Omit<WikiImage, "id" | "pageId"> | null {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  if (SKIP_FILE.test(page.title) || SKIP_EXT.test(page.title)) return null;
  const metadata = info.extmetadata;
  const license = metaValue(metadata, "LicenseShortName");
  return {
    fileTitle: page.title,
    url: info.url,
    thumbUrl: info.thumburl ?? info.url,
    width: info.width ?? null,
    height: info.height ?? null,
    caption: metaValue(metadata, "ImageDescription") ?? metaValue(metadata, "ObjectName"),
    artist: metaValue(metadata, "Artist") ?? metaValue(metadata, "Credit"),
    license,
    licenseUrl: metaValue(metadata, "LicenseUrl"),
    filePageUrl: info.descriptionurl ?? null,
    nonFree: isNonFree(metadata, license) ? 1 : 0,
    position,
  };
}

export async function searchWiki(
  query: string,
  limit = 8,
): Promise<WikiSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const key = trimmed.toLowerCase();
  const cached = getWikiSearchCache(key);
  if (
    cached &&
    Date.now() - cached.fetchedAt <
      Math.max(1, SEARCH_CACHE_HOURS) * 3_600_000
  ) {
    return cached.results as WikiSearchResult[];
  }

  try {
    const payload = await fetchJson<ApiResponse>({
      action: "query",
      generator: "search",
      gsrsearch: trimmed,
      gsrnamespace: "0",
      gsrlimit: String(Math.min(20, Math.max(1, limit))),
      prop: "extracts|pageimages|info",
      exintro: "1",
      explaintext: "1",
      exchars: "260",
      piprop: "thumbnail",
      pithumbsize: "320",
      inprop: "url",
      redirects: "1",
      format: "json",
      formatversion: "2",
    });

    const pages = payload.query?.pages ?? [];
    const results: WikiSearchResult[] = pages
      .filter((page) => !page.missing && page.ns === 0)
      .map((page) => ({
        pageId: page.pageid,
        title: page.title,
        summary: summaryFromExtract(page.extract),
        url:
          page.fullurl ??
          `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
        thumbnailUrl: page.thumbnail?.source ?? null,
      }))
      .slice(0, limit);

    saveWikiSearch(key, results, results.length);
    maybePrune();
    return results;
  } catch {
    return cached ? (cached.results as WikiSearchResult[]) : [];
  }
}

export async function loadWikiPage(
  title: string,
  options: { force?: boolean } = {},
): Promise<(WikiPage & { images: WikiImage[] }) | null> {
  const normalized = normalizeWikiTitle(title);
  if (!normalized) return null;

  const cached = getWikiPageCache({ title: normalized });
  if (!options.force && cached && fresh(cached.fetchedAt, CACHE_DAYS)) {
    return cached;
  }

  try {
    const payload = await fetchJson<ApiResponse>({
      action: "query",
      titles: normalized,
      redirects: "1",
      prop: "extracts|pageimages|images|info",
      exintro: "1",
      explaintext: "1",
      piprop: "thumbnail|original",
      pithumbsize: "640",
      imlimit: "50",
      inprop: "url",
      format: "json",
      formatversion: "2",
    });

    const page = payload.query?.pages?.[0];
    if (!page || page.missing || page.ns !== 0) return null;

    const fileTitles = (page.images ?? [])
      .filter((image) => image.ns === 6 || image.title.startsWith("File:"))
      .map((image) => image.title)
      .slice(0, 50);

    let images: Array<Omit<WikiImage, "id" | "pageId">> = [];
    if (fileTitles.length) {
      const info = await fetchJson<ImageInfoResponse>({
        action: "query",
        titles: fileTitles.join("|"),
        prop: "imageinfo",
        iiprop: "url|size|extmetadata",
        iiurlwidth: "640",
        format: "json",
        formatversion: "2",
      });
      const aliases = aliasMap(info.query?.normalized, info.query?.redirects);
      const byTitle = new Map(
        (info.query?.pages ?? []).map((entry) => [
          resolveAlias(entry.title, aliases),
          entry,
        ]),
      );
      images = fileTitles
        .map((fileTitle, index) => {
          const entry = byTitle.get(resolveAlias(fileTitle, aliases));
          return entry ? fileImage(entry, index) : null;
        })
        .filter((image): image is Omit<WikiImage, "id" | "pageId"> => Boolean(image))
        .slice(0, 12);
    }

    const leadImage = page.original ?? page.thumbnail ?? null;
    const leadFile = page.pageimage
      ? images.find((image) => image.fileTitle === `File:${page.pageimage}`)
      : null;
    const fallback = images[0] ?? null;
    const leadUrl = leadImage?.source ?? fallback?.thumbUrl ?? fallback?.url ?? null;
    const leadWidth = leadImage?.width ?? fallback?.width ?? null;
    const leadHeight = leadImage?.height ?? fallback?.height ?? null;
    const extract = page.extract?.trim() ?? null;

    const record: Omit<WikiPage, "fetchedAt"> = {
      pageId: page.pageid,
      title: page.title,
      summary: summaryFromExtract(extract ?? undefined),
      extract,
      url:
        page.fullurl ??
        `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      thumbnailUrl: page.thumbnail?.source ?? null,
      leadImageUrl: leadUrl,
      leadImageWidth: leadWidth,
      leadImageHeight: leadHeight,
      leadImageLicense: leadFile?.license ?? fallback?.license ?? null,
      leadImageLicenseUrl: leadFile?.licenseUrl ?? fallback?.licenseUrl ?? null,
      leadImageArtist: leadFile?.artist ?? fallback?.artist ?? null,
      leadImageFilePage: leadFile?.filePageUrl ?? fallback?.filePageUrl ?? null,
      leadImageNonFree: leadFile?.nonFree ?? fallback?.nonFree ?? 0,
    };

    saveWikiPage({ page: record, images });
    maybePrune();
    return getWikiPageCache({ pageId: record.pageId });
  } catch {
    return cached;
  }
}

export async function loadWikiLeadImages(
  titles: string[],
): Promise<Map<string, WikiLeadImage>> {
  const unique = [
    ...new Set(titles.map(normalizeWikiTitle).filter(Boolean)),
  ].slice(0, 50);
  const result = new Map<string, WikiLeadImage>();
  if (!unique.length) return result;

  const cached = getWikiLeadImages(unique);
  const missing: string[] = [];
  for (const title of unique) {
    const image = cached.get(title);
    if (image && fresh(image.fetchedAt, LEAD_CACHE_DAYS)) {
      result.set(title, image);
    } else {
      missing.push(title);
    }
  }
  if (!missing.length) return result;

  try {
    const payload = await fetchJson<ApiResponse>({
      action: "query",
      titles: missing.join("|"),
      redirects: "1",
      prop: "pageimages|info",
      piprop: "thumbnail",
      pithumbsize: "320",
      inprop: "url",
      format: "json",
      formatversion: "2",
    });

    const aliases = aliasMap(payload.query?.normalized, payload.query?.redirects);
    const pages = new Map(
      (payload.query?.pages ?? []).map((page) => [page.title, page]),
    );
    const saves: Array<Omit<WikiLeadImage, "fetchedAt">> = [];

    for (const title of missing) {
      const page =
        pages.get(resolveAlias(title, aliases)) ?? pages.get(title) ?? null;
      if (!page?.thumbnail) continue;
      const record = {
        title,
        pageId: page.pageid,
        imageUrl: page.thumbnail.source,
        width: page.thumbnail.width ?? null,
        height: page.thumbnail.height ?? null,
      };
      saves.push(record);
      result.set(title, { ...record, fetchedAt: Date.now() });
    }

    saveWikiLeadImages(saves);
    maybePrune();
    return result;
  } catch {
    return result;
  }
}
