import { sqlite } from "../src/db";
import { resolveGoogleNewsUrl } from "../src/lib/google-news";
import { metaImage } from "../src/lib/media";
import { fetchPublicUrl } from "../src/lib/url-safety";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type Row = {
  id: number;
  url: string;
  resolved_url: string | null;
  image_url: string | null;
  source_name: string;
};

function value(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function has(name: string): boolean {
  return process.argv.includes(name);
}

const limit = Math.max(1, Number.parseInt(value("--limit") ?? "500", 10) || 500);
const concurrency = Math.max(1, Number.parseInt(value("--concurrency") ?? "4", 10) || 4);
const source = value("--source");
const dryRun = has("--dry-run");
const imageOnly = has("--missing-image");
const resolvedOnly = has("--missing-resolved");

const where = ["a.hidden = 0"];
const params: Array<string | number> = [];

if (imageOnly) where.push("a.image_url IS NULL");
if (resolvedOnly) where.push("a.resolved_url IS NULL");
if (!imageOnly && !resolvedOnly) where.push("(a.image_url IS NULL OR a.resolved_url IS NULL)");
if (source) {
  where.push("a.source_id = ?");
  params.push(source);
}
params.push(limit);

const rows = sqlite
  .prepare(
    `SELECT a.id, a.url, a.resolved_url, a.image_url, so.name AS source_name
     FROM articles a
     JOIN sources so ON so.id = a.source_id
     WHERE ${where.join(" AND ")}
     ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
     LIMIT ?`,
  )
  .all(...params) as Row[];

const update = sqlite.prepare(
  `UPDATE articles
   SET image_url = COALESCE(?, image_url),
       image_width = COALESCE(?, image_width),
       image_height = COALESCE(?, image_height),
       resolved_url = COALESCE(?, resolved_url)
   WHERE id = ?`,
);

type Result = {
  id: number;
  image: boolean;
  resolved: boolean;
  error: string | null;
};

async function processRow(row: Row): Promise<Result> {
  let resolved = row.resolved_url;
  if (!resolved) {
    resolved = await resolveGoogleNewsUrl(row.url);
  }

  if (!row.image_url && !resolved) {
    return { id: row.id, image: false, resolved: false, error: "could not resolve link" };
  }

  if (row.image_url) {
    if (!dryRun && resolved) {
      update.run(null, null, null, resolved, row.id);
    }
    return { id: row.id, image: true, resolved: Boolean(resolved), error: null };
  }

  const url = resolved ?? row.url;
  const response = await fetchPublicUrl(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    return { id: row.id, image: false, resolved: Boolean(resolved), error: `HTTP ${response.status}` };
  }

  const type = response.headers.get("content-type") ?? "";
  if (type && !type.includes("text/html") && !type.includes("application/xhtml")) {
    return { id: row.id, image: false, resolved: Boolean(resolved), error: `unsupported ${type}` };
  }

  const html = await response.text();
  const image = metaImage(html, url);
  if (!image) {
    if (!dryRun && resolved) {
      update.run(null, null, null, resolved, row.id);
    }
    return { id: row.id, image: false, resolved: Boolean(resolved), error: "no image found" };
  }

  if (!dryRun) {
    update.run(image.url, image.width, image.height, resolved, row.id);
  }
  return { id: row.id, image: true, resolved: Boolean(resolved), error: null };
}

let cursor = 0;
const results: Result[] = [];

async function worker() {
  while (cursor < rows.length) {
    const index = cursor;
    cursor += 1;
    const row = rows[index];
    try {
      results.push(await processRow(row));
    } catch (error) {
      results.push({
        id: row.id,
        image: false,
        resolved: false,
        error: error instanceof Error ? error.message : "failed",
      });
    }
    if (results.length % 25 === 0 || results.length === rows.length) {
      console.log(`${results.length}/${rows.length}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()));

const images = results.filter((result) => result.image).length;
const resolved = results.filter((result) => result.resolved).length;
const errors = results.filter((result) => result.error);

console.log(
  `${dryRun ? "Would update" : "Updated"} ${images} images and ${resolved} resolved links across ${rows.length} articles.`,
);
if (errors.length) {
  console.log(`${errors.length} skipped:`);
  for (const error of errors.slice(0, 12)) {
    console.log(`  #${error.id}: ${error.error}`);
  }
}
