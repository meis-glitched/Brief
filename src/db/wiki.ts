import { sqlite } from "@/db";
import type { WikiImage, WikiLeadImage, WikiPage } from "@/db/schema";

export type CachedWikiPage = WikiPage & { images: WikiImage[] };

type WikiPageRow = {
  page_id: number;
  title: string;
  summary: string | null;
  extract: string | null;
  url: string;
  thumbnail_url: string | null;
  lead_image_url: string | null;
  lead_image_width: number | null;
  lead_image_height: number | null;
  lead_image_license: string | null;
  lead_image_license_url: string | null;
  lead_image_artist: string | null;
  lead_image_file_page: string | null;
  lead_image_non_free: number;
  fetched_at: number;
};

type WikiImageRow = {
  id: number;
  page_id: number;
  file_title: string;
  url: string;
  thumb_url: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  artist: string | null;
  license: string | null;
  license_url: string | null;
  file_page_url: string | null;
  non_free: number;
  position: number;
};

function mapPage(row: WikiPageRow): WikiPage {
  return {
    pageId: row.page_id,
    title: row.title,
    summary: row.summary,
    extract: row.extract,
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
    leadImageUrl: row.lead_image_url,
    leadImageWidth: row.lead_image_width,
    leadImageHeight: row.lead_image_height,
    leadImageLicense: row.lead_image_license,
    leadImageLicenseUrl: row.lead_image_license_url,
    leadImageArtist: row.lead_image_artist,
    leadImageFilePage: row.lead_image_file_page,
    leadImageNonFree: row.lead_image_non_free,
    fetchedAt: row.fetched_at,
  };
}

function mapImage(row: WikiImageRow): WikiImage {
  return {
    id: row.id,
    pageId: row.page_id,
    fileTitle: row.file_title,
    url: row.url,
    thumbUrl: row.thumb_url,
    width: row.width,
    height: row.height,
    caption: row.caption,
    artist: row.artist,
    license: row.license,
    licenseUrl: row.license_url,
    filePageUrl: row.file_page_url,
    nonFree: row.non_free,
    position: row.position,
  };
}

export function getWikiPageCache(input: {
  pageId?: number;
  title?: string;
}): CachedWikiPage | null {
  const row = input.pageId
    ? (sqlite.prepare("SELECT * FROM wiki_pages WHERE page_id = ?").get(input.pageId) as WikiPageRow | undefined)
    : input.title
      ? (sqlite.prepare("SELECT * FROM wiki_pages WHERE title = ?").get(input.title) as WikiPageRow | undefined)
      : undefined;
  if (!row) return null;
  const images = sqlite
    .prepare("SELECT * FROM wiki_images WHERE page_id = ? ORDER BY position, id")
    .all(row.page_id) as WikiImageRow[];
  return { ...mapPage(row), images: images.map(mapImage) };
}

export function saveWikiPage(input: {
  page: Omit<WikiPage, "fetchedAt">;
  images: Array<Omit<WikiImage, "id" | "pageId">>;
}): void {
  const page = input.page;
  const now = Date.now();
  const upsertPage = sqlite.prepare(`
    INSERT INTO wiki_pages
      (page_id, title, summary, extract, url, thumbnail_url, lead_image_url,
       lead_image_width, lead_image_height, lead_image_license,
       lead_image_license_url, lead_image_artist, lead_image_file_page,
       lead_image_non_free, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(page_id) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      extract = excluded.extract,
      url = excluded.url,
      thumbnail_url = excluded.thumbnail_url,
      lead_image_url = excluded.lead_image_url,
      lead_image_width = excluded.lead_image_width,
      lead_image_height = excluded.lead_image_height,
      lead_image_license = excluded.lead_image_license,
      lead_image_license_url = excluded.lead_image_license_url,
      lead_image_artist = excluded.lead_image_artist,
      lead_image_file_page = excluded.lead_image_file_page,
      lead_image_non_free = excluded.lead_image_non_free,
      fetched_at = excluded.fetched_at
  `);
  const deleteImages = sqlite.prepare("DELETE FROM wiki_images WHERE page_id = ?");
  const insertImage = sqlite.prepare(`
    INSERT OR IGNORE INTO wiki_images
      (page_id, file_title, url, thumb_url, width, height, caption, artist,
       license, license_url, file_page_url, non_free, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sqlite.transaction(() => {
    upsertPage.run(
      page.pageId,
      page.title,
      page.summary,
      page.extract,
      page.url,
      page.thumbnailUrl,
      page.leadImageUrl,
      page.leadImageWidth,
      page.leadImageHeight,
      page.leadImageLicense,
      page.leadImageLicenseUrl,
      page.leadImageArtist,
      page.leadImageFilePage,
      page.leadImageNonFree,
      now,
    );
    deleteImages.run(page.pageId);
    input.images.forEach((image, index) => {
      insertImage.run(
        page.pageId,
        image.fileTitle,
        image.url,
        image.thumbUrl,
        image.width,
        image.height,
        image.caption,
        image.artist,
        image.license,
        image.licenseUrl,
        image.filePageUrl,
        image.nonFree,
        image.position ?? index,
      );
    });
  })();
}

export function getWikiSearchCache(query: string): {
  results: unknown;
  total: number;
  fetchedAt: number;
} | null {
  const row = sqlite
    .prepare("SELECT results, total, fetched_at FROM wiki_searches WHERE query = ?")
    .get(query) as { results: string; total: number; fetched_at: number } | undefined;
  if (!row) return null;
  try {
    return { results: JSON.parse(row.results), total: row.total, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

export function saveWikiSearch(query: string, results: unknown, total: number): void {
  sqlite
    .prepare(
      `INSERT INTO wiki_searches (query, results, total, fetched_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(query) DO UPDATE SET
         results = excluded.results,
         total = excluded.total,
         fetched_at = excluded.fetched_at`,
    )
    .run(query, JSON.stringify(results), total, Date.now());
}

export function getWikiLeadImages(titles: string[]): Map<string, WikiLeadImage> {
  const unique = [...new Set(titles.filter(Boolean))].slice(0, 50);
  const map = new Map<string, WikiLeadImage>();
  if (!unique.length) return map;
  const placeholders = unique.map(() => "?").join(",");
  const rows = sqlite
    .prepare(
      `SELECT title, page_id AS pageId, image_url AS imageUrl,
              width, height, fetched_at AS fetchedAt
       FROM wiki_lead_images
       WHERE title IN (${placeholders})`,
    )
    .all(...unique) as WikiLeadImage[];
  for (const row of rows) map.set(row.title, row);
  return map;
}

export function saveWikiLeadImages(
  images: Array<Omit<WikiLeadImage, "fetchedAt">>,
): void {
  if (!images.length) return;
  const now = Date.now();
  const upsert = sqlite.prepare(`
    INSERT INTO wiki_lead_images (title, page_id, image_url, width, height, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(title) DO UPDATE SET
      page_id = excluded.page_id,
      image_url = excluded.image_url,
      width = excluded.width,
      height = excluded.height,
      fetched_at = excluded.fetched_at
  `);
  sqlite.transaction(() => {
    for (const image of images) {
      upsert.run(
        image.title,
        image.pageId ?? null,
        image.imageUrl,
        image.width ?? null,
        image.height ?? null,
        now,
      );
    }
  })();
}

export function pruneWikiCache(): void {
  const max = Math.max(100, Number.parseInt(process.env.BRIEF_WIKI_CACHE_PAGES ?? "1000", 10));
  sqlite
    .prepare(
      `DELETE FROM wiki_pages
       WHERE page_id NOT IN (
         SELECT page_id FROM wiki_pages ORDER BY fetched_at DESC LIMIT ?
       )`,
    )
    .run(max);

  const leadMax = Math.max(
    100,
    Number.parseInt(process.env.BRIEF_WIKI_LEAD_CACHE ?? "5000", 10),
  );
  sqlite
    .prepare(
      `DELETE FROM wiki_lead_images
       WHERE title NOT IN (
         SELECT title FROM wiki_lead_images ORDER BY fetched_at DESC LIMIT ?
       )`,
    )
    .run(leadMax);

  const searchMax = Math.max(
    100,
    Number.parseInt(process.env.BRIEF_WIKI_SEARCH_CACHE ?? "500", 10),
  );
  sqlite
    .prepare(
      `DELETE FROM wiki_searches
       WHERE query NOT IN (
         SELECT query FROM wiki_searches ORDER BY fetched_at DESC LIMIT ?
       )`,
    )
    .run(searchMax);
}
