import { sqlite } from "@/db";
import type { ArticleContent } from "@/db/schema";
import type { ReaderBlock } from "@/lib/reader-types";

export function getArticleContent(articleId: number): ArticleContent | null {
  const row = sqlite
    .prepare("SELECT * FROM article_content WHERE article_id = ?")
    .get(articleId) as
    | {
        article_id: number;
        blocks: string;
        text: string;
        word_count: number;
        status: string;
        fetched_at: number;
        error: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    articleId: row.article_id,
    blocks: row.blocks,
    text: row.text,
    wordCount: row.word_count,
    status: row.status,
    fetchedAt: row.fetched_at,
    error: row.error,
  };
}

export function parseBlocks(value: string): ReaderBlock[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ReaderBlock[]) : [];
  } catch {
    return [];
  }
}

export function saveArticleContent(input: {
  articleId: number;
  blocks: ReaderBlock[];
  text: string;
  wordCount: number;
  status: string;
  error: string | null;
}): void {
  sqlite
    .prepare(
      `INSERT INTO article_content
         (article_id, blocks, text, word_count, status, fetched_at, error)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(article_id) DO UPDATE SET
         blocks = excluded.blocks,
         text = excluded.text,
         word_count = excluded.word_count,
         status = excluded.status,
         fetched_at = excluded.fetched_at,
         error = excluded.error`,
    )
    .run(
      input.articleId,
      JSON.stringify(input.blocks),
      input.text,
      input.wordCount,
      input.status,
      Date.now(),
      input.error,
    );
}

export function updateArticleMedia(input: {
  articleId: number;
  imageUrl?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  resolvedUrl?: string | null;
  feedContent?: string | null;
}): void {
  sqlite
    .prepare(
      `UPDATE articles
       SET image_url = COALESCE(?, image_url),
           image_width = COALESCE(?, image_width),
           image_height = COALESCE(?, image_height),
           resolved_url = COALESCE(?, resolved_url),
           feed_content = COALESCE(?, feed_content)
       WHERE id = ?`,
    )
    .run(
      input.imageUrl ?? null,
      input.imageWidth ?? null,
      input.imageHeight ?? null,
      input.resolvedUrl ?? null,
      input.feedContent ?? null,
      input.articleId,
    );
}
