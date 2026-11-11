import { sqlite } from "@/db";
import type { Source } from "@/db/schema";
import { assignStories } from "@/lib/cluster";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { inferAndTagArticles } from "@/lib/tagging";
import { fetchSource, type FetchedArticle } from "./fetch";

export type IngestResult = {
  runId: number;
  inserted: number;
  sourceCount: number;
  errorCount: number;
  durationMs: number;
  errors: Array<{ sourceId: string; name: string; error: string }>;
};

const CONCURRENCY = 6;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

async function insertArticles(articles: FetchedArticle[]): Promise<number> {
  if (articles.length === 0) return 0;

  let inserted = 0;
  const fresh: Array<{ id: number; title: string; summary: string | null }> = [];
  await sqlite.transaction(async (tx) => {
    for (const article of articles) {
      const result = await tx.run(
        `INSERT OR IGNORE INTO articles
          (url, title, source_id, summary, author, published_at, fetched_at,
           content_hash, hidden, image_url, image_width, image_height, feed_content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        article.url,
        article.title,
        article.sourceId,
        article.summary,
        article.author,
        article.publishedAt,
        article.fetchedAt,
        article.contentHash,
        article.imageUrl,
        article.imageWidth,
        article.imageHeight,
        article.feedContent,
      );
      if (result.changes > 0) {
        inserted += result.changes;
        fresh.push({
          id: Number(result.lastInsertRowid),
          title: article.title,
          summary: article.summary,
        });
      } else {
        await tx.run(
          `UPDATE articles
           SET image_url = COALESCE(image_url, ?),
               image_width = COALESCE(image_width, ?),
               image_height = COALESCE(image_height, ?),
               feed_content = COALESCE(feed_content, ?)
           WHERE url = ?`,
          article.imageUrl,
          article.imageWidth,
          article.imageHeight,
          article.feedContent,
          article.url,
        );
      }
    }
  });
  await inferAndTagArticles(fresh);
  return inserted;
}

export async function runIngest(): Promise<IngestResult> {
  const startedAt = Date.now();
  const rows = await sqlite.all<{
    id: string;
    name: string;
    homepage: string;
    feed_url: string | null;
    html_url: string | null;
    selectors: string | null;
    gnews_query: string | null;
    gnews_publishers: string | null;
    limit: number;
    enabled: number;
    last_fetched_at: number | null;
    last_error: string | null;
    created_at: number;
  }>("SELECT * FROM sources WHERE enabled = 1 ORDER BY name");

  const sources: Source[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    homepage: row.homepage,
    feedUrl: row.feed_url,
    htmlUrl: row.html_url,
    selectors: row.selectors,
    gnewsQuery: row.gnews_query,
    gnewsPublishers: row.gnews_publishers,
    limit: row.limit,
    enabled: row.enabled,
    lastFetchedAt: row.last_fetched_at,
    lastError: row.last_error,
    createdAt: row.created_at,
  }));

  const runRow = await sqlite.run(
    "INSERT INTO ingest_runs (started_at, source_count, inserted, error_count) VALUES (?, ?, 0, 0)",
    startedAt,
    sources.length,
  );
  const runId = Number(runRow.lastInsertRowid);

  const errors: IngestResult["errors"] = [];
  let inserted = 0;

  const outcomes = await mapWithConcurrency(sources, CONCURRENCY, async (source) => {
    const { articles, error } = await fetchSource(source);
    const count = await insertArticles(articles);
    const fetchedAt = Date.now();

    await sqlite.run(
      "UPDATE sources SET last_fetched_at = ?, last_error = ? WHERE id = ?",
      fetchedAt,
      error,
      source.id,
    );

    if (error) {
      return { sourceId: source.id, name: source.name, error, inserted: count };
    }
    return { sourceId: source.id, name: source.name, inserted: count };
  });

  for (const outcome of outcomes) {
    inserted += outcome.inserted;
    if ("error" in outcome && outcome.error) {
      errors.push({
        sourceId: outcome.sourceId,
        name: outcome.name,
        error: outcome.error,
      });
      logWarn("ingest.run", "Source fetch failed", { sourceId: outcome.sourceId, name: outcome.name, error: outcome.error });
    }
  }

  try {
    await assignStories();
  } catch (error) {
    logError("ingest.run", "Story assignment failed", error);
    throw error;
  }

  const finishedAt = Date.now();
  await sqlite.run(
    `UPDATE ingest_runs
     SET finished_at = ?, inserted = ?, error_count = ?, errors = ?
     WHERE id = ?`,
    finishedAt,
    inserted,
    errors.length,
    errors.length ? JSON.stringify(errors) : null,
    runId,
  );

  const result = {
    runId,
    inserted,
    sourceCount: sources.length,
    errorCount: errors.length,
    durationMs: finishedAt - startedAt,
    errors,
  };
  logInfo("ingest.run", "Ingest completed", { runId, inserted, sourceCount: sources.length, errorCount: errors.length, durationMs: result.durationMs });
  return result;
}
