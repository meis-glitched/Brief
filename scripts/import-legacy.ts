import { existsSync } from "node:fs";
import Database from "better-sqlite3";
import { sqlite } from "../src/db/index";
import { assignStories } from "../src/lib/cluster";
import { inferAndTagArticles } from "../src/lib/tagging";
import { cleanTitle, hash, normalizeUrl } from "../src/lib/utils";

async function main() {
const legacyPath =
  process.env.LEGACY_DB ?? "/home/glitcher/news-aggregator/news.db";

if (!existsSync(legacyPath)) {
  console.error(`Legacy database not found: ${legacyPath}`);
  process.exit(1);
}

const legacy = new Database(legacyPath, { readonly: true });
const rows = legacy
  .prepare(
    `SELECT title, link, source, source_id, published, published_date,
            published_at, first_seen
     FROM headlines
     ORDER BY COALESCE(published_at, '') DESC`,
  )
  .all() as Array<{
  title: string;
  link: string;
  source: string;
  source_id: string;
  published: string | null;
  published_date: string;
  published_at: string | null;
  first_seen: number;
}>;

const knownRows = await sqlite.all<{ id: string }>("SELECT id FROM sources");
const known = new Set(knownRows.map((row) => row.id));

let inserted = 0;
let skipped = 0;
const fresh: Array<{ id: number; title: string; summary: string | null }> = [];

await sqlite.transaction(async (tx) => {
  for (const row of rows) {
    if (!known.has(row.source_id)) {
      skipped += 1;
      continue;
    }
    const url = normalizeUrl(row.link);
    const title = cleanTitle(row.title, row.source);
    if (!url || !title) {
      skipped += 1;
      continue;
    }
    const publishedAt = row.published_at
      ? Date.parse(row.published_at)
      : row.first_seen
        ? row.first_seen * 1000
        : Date.now();
    const result = await tx.run(
      `INSERT OR IGNORE INTO articles
        (url, title, source_id, summary, author, published_at, fetched_at, content_hash, hidden)
      VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, 0)`,
      url,
      title,
      row.source_id,
      Number.isFinite(publishedAt) ? publishedAt : Date.now(),
      Date.now(),
      hash(`${row.source_id}:${url}:${title}`),
    );
    if (result.changes > 0) {
      inserted += result.changes;
      fresh.push({ id: Number(result.lastInsertRowid), title, summary: null });
    }
  }
});

await inferAndTagArticles(fresh);
legacy.close();

const clustered = await assignStories(3650);
console.log(
  `Imported ${inserted} articles from ${legacyPath} (${skipped} skipped). ` +
    `Clustered ${clustered.assigned} into existing stories, created ${clustered.created}.`,
);

}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
