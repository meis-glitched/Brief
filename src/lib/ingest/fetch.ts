import { load } from "cheerio";
import Parser from "rss-parser";
import type { Source } from "@/db/schema";
import { feedHtmlFromItem, imageFromItem } from "@/lib/media";
import { cleanTitle, hash, normalizeUrl, stripHtml } from "@/lib/utils";

export type FetchedArticle = {
  url: string;
  title: string;
  sourceId: string;
  summary: string | null;
  author: string | null;
  publishedAt: number | null;
  fetchedAt: number;
  contentHash: string;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  feedContent: string | null;
};

const RSS_USER_AGENT =
  "brief/0.1 (+https://github.com/local/brief) local news reader";
const HTML_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const parser = new Parser({
  timeout: 12_000,
  headers: {
    "User-Agent": RSS_USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

function parseDate(value: string | undefined | null): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function cleanSummary(value: string | null | undefined): string | null {
  const summary = stripHtml(value);
  if (!summary) return null;
  return summary.length > 600 ? `${summary.slice(0, 597)}…` : summary;
}

function jsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function getText(url: string, userAgent: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

export async function fetchRss(source: Source): Promise<FetchedArticle[]> {
  if (!source.feedUrl) return [];
  const xml = await getText(source.feedUrl, RSS_USER_AGENT);
  const feed = await parser.parseString(xml);
  const now = Date.now();
  const seen = new Set<string>();
  const articles: FetchedArticle[] = [];

  for (const item of feed.items.slice(0, source.limit)) {
    const title = cleanTitle(item.title, source.name);
    if (!title || !item.link) continue;
    const url = normalizeUrl(item.link, source.homepage);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const raw = item as unknown as Record<string, unknown>;
    const publisher =
      typeof raw.source === "string" ? raw.source : undefined;
    const summary = cleanSummary(
      item.contentSnippet ??
        (typeof item.content === "string" ? item.content : null),
    );
    const image = imageFromItem(raw, url);

    articles.push({
      url,
      title,
      sourceId: source.id,
      summary,
      author:
        (typeof item.creator === "string" && item.creator) ||
        (typeof raw.author === "string" && raw.author) ||
        publisher ||
        null,
      publishedAt: parseDate(item.isoDate ?? item.pubDate),
      fetchedAt: now,
      contentHash: hash(`${source.id}:${url}:${title}`),
      imageUrl: image?.url ?? null,
      imageWidth: image?.width ?? null,
      imageHeight: image?.height ?? null,
      feedContent: feedHtmlFromItem(raw),
    });
  }

  return articles;
}

export async function fetchHtml(source: Source): Promise<FetchedArticle[]> {
  if (!source.htmlUrl) return [];
  const html = await getText(source.htmlUrl, HTML_USER_AGENT);
  const $ = load(html);
  const now = Date.now();
  const selectors = jsonArray(source.selectors);
  const seen = new Set<string>();
  const articles: FetchedArticle[] = [];

  for (const selector of selectors) {
    $(selector).each((_, node) => {
      if (articles.length >= source.limit) return false;
      const element = $(node);
      const anchor = element.is("a") ? element : element.find("a").first();
      const parentAnchor = anchor.length
        ? anchor
        : element.closest("a");
      const href = parentAnchor.attr("href");
      const title = cleanTitle(parentAnchor.text() || element.text(), source.name);
      if (!href || title.length < 12) return;
      const url = normalizeUrl(href, source.homepage);
      if (!url || seen.has(url)) return;
      seen.add(url);
      articles.push({
        url,
        title,
        sourceId: source.id,
        summary: null,
        author: null,
        publishedAt: now,
        fetchedAt: now,
        contentHash: hash(`${source.id}:${url}:${title}`),
        imageUrl: null,
        imageWidth: null,
        imageHeight: null,
        feedContent: null,
      });
      return;
    });
    if (articles.length >= source.limit) break;
  }

  return articles;
}

export async function fetchSource(
  source: Source,
): Promise<{ articles: FetchedArticle[]; error: string | null }> {
  let rssError: string | null = null;

  if (source.feedUrl) {
    try {
      const articles = await fetchRss(source);
      if (articles.length > 0) return { articles, error: null };
      rssError = "feed returned no items";
    } catch (error) {
      rssError = `rss: ${error instanceof Error ? error.message : "failed"}`;
    }
  }

  if (source.htmlUrl) {
    try {
      const articles = await fetchHtml(source);
      if (articles.length > 0) return { articles, error: null };
      return {
        articles: [],
        error: rssError ? `${rssError}; html: no items` : "no items found",
      };
    } catch (error) {
      const htmlError = `html: ${error instanceof Error ? error.message : "failed"}`;
      return {
        articles: [],
        error: [rssError, htmlError].filter(Boolean).join("; "),
      };
    }
  }

  return { articles: [], error: rssError ?? "no feed configured" };
}
