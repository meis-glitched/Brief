import "server-only";
import { logWarn } from "./logger";
import { Readability } from "@mozilla/readability";
import { load, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import { JSDOM } from "jsdom";
import { getArticleContent, saveArticleContent, updateArticleMedia } from "@/db/reader";
import { resolveGoogleNewsUrl } from "@/lib/google-news";
import { imageFromHtml, metaImage } from "@/lib/media";
import type { ReaderBlock, ReaderPayload, ReaderStatus } from "@/lib/reader-types";
import { fetchPublicUrl } from "@/lib/url-safety";

const READER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const CACHE_DAYS = Number.parseInt(process.env.BRIEF_ARTICLE_CACHE_DAYS ?? "7", 10);
const MAX_IMAGES = Number.parseInt(process.env.BRIEF_READER_MAX_IMAGES ?? "8", 10);

const PAYWALL =
  /(?:subscribe to continue|already a subscriber|sign in to continue|create a free account|this article is for subscribers|subscriber-only)/i;

export type ReaderArticle = {
  id: number;
  url: string;
  title: string;
  sourceName: string;
  author: string | null;
  summary: string | null;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  feedContent: string | null;
  resolvedUrl: string | null;
};

function words(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function textOf($: CheerioAPI, element: Element): string {
  return $(element).text().replace(/\s+/g, " ").trim();
}

function imageBlock(
  $: CheerioAPI,
  element: Element,
  baseUrl: string,
): Extract<ReaderBlock, { type: "image" }> | null {
  const html = $.html(element);
  const candidate = imageFromHtml(html, baseUrl);
  if (!candidate) return null;
  const figure = $(element).closest("figure");
  const caption = figure.length
    ? figure.find("figcaption").first().text().replace(/\s+/g, " ").trim()
    : "";
  const credit = figure.length
    ? figure
        .find(".credit, .caption-credit, [class*='credit']")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim()
    : "";
  return {
    type: "image",
    src: candidate.url,
    width: candidate.width ?? undefined,
    height: candidate.height ?? undefined,
    caption: caption || undefined,
    credit: credit || undefined,
  };
}

export function blocksFromHtml(html: string, baseUrl: string): ReaderBlock[] {
  const $ = load(`<div id="brief-reader-root">${html}</div>`);
  const root = $("#brief-reader-root");
  const blocks: ReaderBlock[] = [];
  const seenImages = new Set<string>();
  let imageCount = 0;

  function addImage(element: Element) {
    if (imageCount >= MAX_IMAGES) return;
    const image = imageBlock($, element, baseUrl);
    if (!image || seenImages.has(image.src)) return;
    seenImages.add(image.src);
    imageCount += 1;
    blocks.push(image);
  }

  function walk(element: Element) {
    for (const child of $(element).children().toArray()) {
      const tag = child.tagName?.toLowerCase();
      if (!tag) continue;
      if (/^(script|style|noscript|iframe|form|nav|aside|footer|header|button|input|select|textarea)$/.test(tag)) {
        continue;
      }

      if (tag === "figure") {
        const image = $(child).find("img").first();
        if (image.length) addImage(image.get(0) as Element);
        continue;
      }
      if (tag === "img") {
        addImage(child);
        continue;
      }
      if (/^h[1-4]$/.test(tag)) {
        const text = textOf($, child);
        if (text) {
          const level = tag === "h1" || tag === "h2" ? 2 : tag === "h3" ? 3 : 4;
          blocks.push({ type: "heading", level, text });
        }
        continue;
      }
      if (tag === "blockquote") {
        const text = textOf($, child);
        if (text) blocks.push({ type: "quote", text });
        continue;
      }
      if (tag === "ul" || tag === "ol") {
        const items = $(child)
          .children("li")
          .toArray()
          .map((item) => textOf($, item))
          .filter(Boolean);
        if (items.length) blocks.push({ type: "list", ordered: tag === "ol", items });
        continue;
      }
      if (tag === "p") {
        const text = textOf($, child);
        if (text.length >= 18) blocks.push({ type: "paragraph", text });
        else if ($(child).find("img").length) {
          $(child)
            .find("img")
            .toArray()
            .forEach((image) => addImage(image));
        }
        continue;
      }
      if (/^(div|section|article|main|span)$/.test(tag)) {
        walk(child);
        continue;
      }
      const text = textOf($, child);
      if (text.length >= 80) blocks.push({ type: "paragraph", text });
    }
  }

  walk(root.get(0) as Element);
  return blocks;
}

export function textFromBlocks(blocks: ReaderBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") {
      parts.push(block.text);
    } else if (block.type === "list") {
      parts.push(block.items.join(" "));
    }
  }
  return parts.join("\n\n").trim();
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetchPublicUrl(url, {
    headers: {
      "User-Agent": READER_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  if (type && !type.includes("text/html") && !type.includes("application/xhtml")) {
    throw new Error(`unsupported content type ${type}`);
  }
  return response.text();
}

function summaryPayload(article: ReaderArticle, error: string | null): ReaderPayload {
  const text = article.summary ?? "";
  const blocks: ReaderBlock[] = text
    ? [{ type: "paragraph", text }]
    : [{ type: "paragraph", text: "This article has no readable text in its feed." }];
  return {
    blocks,
    text,
    wordCount: words(text),
    status: "summary",
    error,
    title: article.title,
    byline: article.author,
    siteName: article.sourceName,
    excerpt: article.summary,
    leadImageUrl: article.imageUrl,
  };
}

export async function buildReader(article: ReaderArticle): Promise<ReaderPayload> {
  const resolved = article.resolvedUrl ?? (await resolveGoogleNewsUrl(article.url));
  const url = resolved ?? article.url;

  const feedBlocks = article.feedContent
    ? blocksFromHtml(article.feedContent, url)
    : [];
  const feedText = textFromBlocks(feedBlocks);
  if (words(feedText) >= 90) {
    return {
      blocks: feedBlocks,
      text: feedText,
      wordCount: words(feedText),
      status: "feed",
      error: null,
      title: article.title,
      byline: article.author,
      siteName: article.sourceName,
      excerpt: article.summary,
      leadImageUrl:
        article.imageUrl ??
        feedBlocks.find((block) => block.type === "image")?.src ??
        null,
    };
  }

  if (!resolved) {
    return summaryPayload(article, "Could not resolve the publisher link.");
  }

  try {
    const html = await fetchHtml(url);
    const meta = metaImage(html, url);
    const dom = new JSDOM(html, { url });
    const parsed = new Readability(dom.window.document, { charThreshold: 200 }).parse();
    dom.window.close();

    const content = parsed?.content ?? "";
    const blocks = content ? blocksFromHtml(content, url) : [];
    const text = textFromBlocks(blocks);
    const enough = words(text) >= 60 && !(PAYWALL.test(text.slice(0, 2500)) && words(text) < 220);

    if (enough) {
      const lead =
        meta?.url ??
        article.imageUrl ??
        blocks.find((block) => block.type === "image")?.src ??
        null;
      return {
        blocks,
        text,
        wordCount: words(text),
        status: "full",
        error: null,
        title: parsed?.title ?? article.title,
        byline: parsed?.byline ?? article.author,
        siteName: parsed?.siteName ?? article.sourceName,
        excerpt: parsed?.excerpt ?? article.summary,
        leadImageUrl: lead,
      };
    }

    if (feedBlocks.length) {
      return {
        blocks: feedBlocks,
        text: feedText,
        wordCount: words(feedText),
        status: "feed",
        error: "Publisher content was limited; showing the feed version.",
        title: article.title,
        byline: article.author,
        siteName: article.sourceName,
        excerpt: article.summary,
        leadImageUrl:
          meta?.url ??
          article.imageUrl ??
          feedBlocks.find((block) => block.type === "image")?.src ??
          null,
      };
    }

    return {
      ...summaryPayload(article, "Publisher content was limited; showing the summary."),
      leadImageUrl: meta?.url ?? article.imageUrl,
    };
  } catch (error) {
    logWarn("reader", "Reader build failed, falling back to summary", {
      articleId: article.id,
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return summaryPayload(
      article,
      error instanceof Error ? error.message : "Could not load the article.",
    );
  }
}

function payloadFromCache(
  article: ReaderArticle,
  cached: NonNullable<Awaited<ReturnType<typeof getArticleContent>>>,
): ReaderPayload {
  let blocks: ReaderBlock[] = [];
  try {
    const parsed = JSON.parse(cached.blocks);
    if (Array.isArray(parsed)) blocks = parsed as ReaderBlock[];
  } catch (error) {
    logWarn("reader", "Failed to parse cached reader blocks", {
      articleId: article.id,
      error: error instanceof Error ? error.message : String(error),
    });
    blocks = [];
  }
  return {
    blocks,
    text: cached.text,
    wordCount: cached.wordCount,
    status: cached.status as ReaderStatus,
    error: cached.error,
    title: article.title,
    byline: article.author,
    siteName: article.sourceName,
    excerpt: article.summary,
    leadImageUrl: article.imageUrl,
  };
}

export async function getReader(
  article: ReaderArticle,
  options: { force?: boolean } = {},
): Promise<ReaderPayload> {
  const cached = await getArticleContent(article.id);
  const fresh =
    cached &&
    Date.now() - cached.fetchedAt < Math.max(1, CACHE_DAYS) * 86_400_000;

  if (!options.force && fresh && cached) {
    return payloadFromCache(article, cached);
  }

  const payload = await buildReader(article);
  await saveArticleContent({
    articleId: article.id,
    blocks: payload.blocks,
    text: payload.text,
    wordCount: payload.wordCount,
    status: payload.status,
    error: payload.error,
  });
  const resolved = article.resolvedUrl ?? (await resolveGoogleNewsUrl(article.url));
  await updateArticleMedia({
    articleId: article.id,
    imageUrl: payload.leadImageUrl,
    resolvedUrl: resolved,
  });
  return payload;
}
