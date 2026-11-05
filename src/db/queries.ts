import { sqlite } from "@/db";
import { dayKey, startOfDay, todaySortKey } from "@/lib/format";
import type { IngestRun } from "./schema";
import { normalizeBias, type Bias, type Confidence } from "@/lib/source-ratings";

export type ArticleWithSource = {
  id: number;
  url: string;
  title: string;
  sourceId: string;
  sourceName: string;
  summary: string | null;
  author: string | null;
  publishedAt: number | null;
  fetchedAt: number;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  storyId: number | null;
  storyTitle: string | null;
  readAt: number | null;
  savedAt: number | null;
  countryNames: string | null;
};

export type StoryWithSources = {
  id: number;
  title: string;
  summary: string | null;
  firstSeen: number;
  lastSeen: number;
  articleCount: number;
  sourceCount: number;
  score: number;
  imageUrl: string | null;
  sourceNames: string | null;
  countryNames: string | null;
};

export type SourceHealth = {
  id: string;
  name: string;
  homepage: string;
  feedUrl: string | null;
  htmlUrl: string | null;
  enabled: number;
  lastFetchedAt: number | null;
  lastError: string | null;
  articleCount: number;
  unreadCount: number;
  bias: Bias;
  biasScore: number | null;
  confidence: Confidence;
  ownership: string | null;
  countryCode: string | null;
  sourceType: string | null;
  paywall: boolean;
};

type ArticleRecord = {
  id: number;
  url: string;
  title: string;
  source_id: string;
  source_name: string;
  summary: string | null;
  author: string | null;
  published_at: number | null;
  fetched_at: number;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  story_id: number | null;
  story_title: string | null;
  read_at: number | null;
  saved_at: number | null;
  country_names: string | null;
};

type StoryRecord = {
  id: number;
  title: string;
  summary: string | null;
  first_seen: number;
  last_seen: number;
  article_count: number;
  source_count: number;
  score: number;
  image_url: string | null;
  source_names: string | null;
  country_names: string | null;
};

function mapArticle(row: ArticleRecord): ArticleWithSource {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    sourceId: row.source_id,
    sourceName: row.source_name,
    summary: row.summary,
    author: row.author,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    imageUrl: row.image_url,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    storyId: row.story_id,
    storyTitle: row.story_title,
    readAt: row.read_at,
    savedAt: row.saved_at,
    countryNames: row.country_names,
  };
}

function mapStory(row: StoryRecord): StoryWithSources {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    articleCount: row.article_count,
    sourceCount: row.source_count,
    score: row.score,
    imageUrl: row.image_url,
    sourceNames: row.source_names,
    countryNames: row.country_names,
  };
}

const ARTICLE_SELECT = `
  SELECT a.id, a.url, a.title, a.source_id, so.name AS source_name,
         a.summary, a.author, a.published_at, a.fetched_at,
         a.image_url, a.image_width, a.image_height, a.story_id,
         s.title AS story_title, a.read_at, a.saved_at,
         (
           SELECT group_concat(ac.country_name, ' · ')
           FROM article_countries ac
           WHERE ac.article_id = a.id
         ) AS country_names
  FROM articles a
  JOIN sources so ON so.id = a.source_id
  LEFT JOIN stories s ON s.id = a.story_id
`;

export type ArticleFilter = "all" | "unread" | "saved";

export function getArticles(options: {
  filter?: ArticleFilter;
  sourceId?: string;
  query?: string;
  country?: string;
  from?: number;
  to?: number;
  limit?: number;
} = {}): ArticleWithSource[] {
  const where = ["a.hidden = 0"];
  const params: Array<string | number> = [];

  if (options.filter === "unread") where.push("a.read_at IS NULL");
  if (options.filter === "saved") where.push("a.saved_at IS NOT NULL");
  if (options.sourceId) {
    where.push("a.source_id = ?");
    params.push(options.sourceId);
  }
  if (options.query) {
    where.push("(a.title LIKE ? OR a.summary LIKE ?)");
    const like = `%${options.query}%`;
    params.push(like, like);
  }
  if (options.country) {
    where.push(
      "EXISTS (SELECT 1 FROM article_countries ac WHERE ac.article_id = a.id AND ac.country_code = ?)",
    );
    params.push(options.country);
  }
  if (options.from !== undefined) {
    where.push("COALESCE(a.published_at, a.fetched_at) >= ?");
    params.push(options.from);
  }
  if (options.to !== undefined) {
    where.push("COALESCE(a.published_at, a.fetched_at) <= ?");
    params.push(options.to);
  }

  params.push(options.limit ?? 200);

  const rows = sqlite
    .prepare(
      `${ARTICLE_SELECT}
       WHERE ${where.join(" AND ")}
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
       LIMIT ?`,
    )
    .all(...params) as ArticleRecord[];

  return rows.map(mapArticle);
}

export function getArticle(id: number): ArticleWithSource | null {
  const row = sqlite
    .prepare(`${ARTICLE_SELECT} WHERE a.id = ?`)
    .get(id) as ArticleRecord | undefined;
  return row ? mapArticle(row) : null;
}

export type ReaderArticleWithSource = ArticleWithSource & {
  feedContent: string | null;
  resolvedUrl: string | null;
};

type ReaderArticleRecord = ArticleRecord & {
  feed_content: string | null;
  resolved_url: string | null;
};

export function getReaderArticle(id: number): ReaderArticleWithSource | null {
  const row = sqlite
    .prepare(
      `SELECT a.id, a.url, a.title, a.source_id, so.name AS source_name,
              a.summary, a.author, a.published_at, a.fetched_at,
              a.image_url, a.image_width, a.image_height, a.story_id,
              s.title AS story_title, a.read_at, a.saved_at,
              a.feed_content, a.resolved_url,
              (
                SELECT group_concat(ac.country_name, ' · ')
                FROM article_countries ac
                WHERE ac.article_id = a.id
              ) AS country_names
       FROM articles a
       JOIN sources so ON so.id = a.source_id
       LEFT JOIN stories s ON s.id = a.story_id
       WHERE a.id = ? AND a.hidden = 0`,
    )
    .get(id) as ReaderArticleRecord | undefined;
  if (!row) return null;
  return {
    ...mapArticle(row),
    feedContent: row.feed_content,
    resolvedUrl: row.resolved_url,
  };
}

export function getStories(options: {
  limit?: number;
  since?: number;
  country?: string;
  from?: number;
  to?: number;
} = {}): StoryWithSources[] {
  const since = options.since ?? 0;
  const where = ["s.last_seen >= ?", "s.article_count > 0"];
  const params: Array<string | number> = [since];

  if (options.country) {
    where.push(
      `EXISTS (
        SELECT 1 FROM articles a
        JOIN article_countries ac ON ac.article_id = a.id
        WHERE a.story_id = s.id AND ac.country_code = ?
      )`,
    );
    params.push(options.country);
  }
  if (options.from !== undefined) {
    where.push(
      `EXISTS (
        SELECT 1 FROM articles a
        WHERE a.story_id = s.id AND COALESCE(a.published_at, a.fetched_at) >= ?
      )`,
    );
    params.push(options.from);
  }
  if (options.to !== undefined) {
    where.push(
      `EXISTS (
        SELECT 1 FROM articles a
        WHERE a.story_id = s.id AND COALESCE(a.published_at, a.fetched_at) <= ?
      )`,
    );
    params.push(options.to);
  }

  params.push(options.limit ?? 40);

  const rows = sqlite
    .prepare(
      `SELECT s.id, s.title, s.summary, s.first_seen, s.last_seen,
              s.article_count, s.source_count, s.score,
              (
                SELECT a.image_url FROM articles a
                WHERE a.story_id = s.id AND a.image_url IS NOT NULL
                ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
                LIMIT 1
              ) AS image_url,
              (
                SELECT group_concat(name, ' · ') FROM (
                  SELECT DISTINCT so.name AS name
                  FROM articles a
                  JOIN sources so ON so.id = a.source_id
                  WHERE a.story_id = s.id
                  ORDER BY so.name
                )
              ) AS source_names,
              (
                SELECT group_concat(name, ' · ') FROM (
                  SELECT DISTINCT ac.country_name AS name
                  FROM articles a
                  JOIN article_countries ac ON ac.article_id = a.id
                  WHERE a.story_id = s.id
                  ORDER BY ac.country_name
                )
              ) AS country_names
       FROM stories s
       WHERE ${where.join(" AND ")}
       ORDER BY s.score DESC, s.last_seen DESC
       LIMIT ?`,
    )
    .all(...params) as StoryRecord[];
  return rows.map(mapStory);
}

export function getTodayStories(
  limit = 18,
  options: { country?: string; from?: number; to?: number } = {},
): StoryWithSources[] {
  const since = startOfDay() - 12 * 3_600_000;
  const stories = getStories({ since, limit, ...options });
  if (stories.length) return stories;
  if (options.country || options.from !== undefined || options.to !== undefined) {
    return [];
  }
  return getStories({ limit });
}

export function getStory(id: number): {
  story: StoryWithSources;
  articles: ArticleWithSource[];
} | null {
  const row = sqlite
    .prepare(
      `SELECT s.id, s.title, s.summary, s.first_seen, s.last_seen,
              s.article_count, s.source_count, s.score,
              (
                SELECT a.image_url FROM articles a
                WHERE a.story_id = s.id AND a.image_url IS NOT NULL
                ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
                LIMIT 1
              ) AS image_url,
              (
                SELECT group_concat(name, ' · ') FROM (
                  SELECT DISTINCT so.name AS name
                  FROM articles a
                  JOIN sources so ON so.id = a.source_id
                  WHERE a.story_id = s.id
                  ORDER BY so.name
                )
              ) AS source_names,
              (
                SELECT group_concat(name, ' · ') FROM (
                  SELECT DISTINCT ac.country_name AS name
                  FROM articles a
                  JOIN article_countries ac ON ac.article_id = a.id
                  WHERE a.story_id = s.id
                  ORDER BY ac.country_name
                )
              ) AS country_names
       FROM stories s WHERE s.id = ?`,
    )
    .get(id) as StoryRecord | undefined;

  if (!row) return null;

  const articles = sqlite
    .prepare(
      `${ARTICLE_SELECT}
       WHERE a.story_id = ?
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC`,
    )
    .all(id) as ArticleRecord[];

  return { story: mapStory(row), articles: articles.map(mapArticle) };
}

export function getSourceHealth(): SourceHealth[] {
  const rows = sqlite
    .prepare(
      `SELECT s.id, s.name, s.homepage, s.feed_url, s.html_url, s.enabled,
              s.last_fetched_at, s.last_error,
              COUNT(a.id) AS article_count,
              SUM(CASE WHEN a.read_at IS NULL THEN 1 ELSE 0 END) AS unread_count,
              COALESCE(sr.bias, 'unrated') AS bias, sr.bias_score,
              sr.confidence, sr.ownership, sr.country_code, sr.source_type,
              sr.paywall
       FROM sources s
       LEFT JOIN articles a ON a.source_id = s.id
       LEFT JOIN source_ratings sr ON sr.source_id = s.id
       GROUP BY s.id
       ORDER BY s.name`,
    )
    .all() as Array<{
    id: string;
    name: string;
    homepage: string;
    feed_url: string | null;
    html_url: string | null;
    enabled: number;
    last_fetched_at: number | null;
    last_error: string | null;
    article_count: number;
    unread_count: number | null;
    bias: string | null;
    bias_score: number | null;
    confidence: string | null;
    ownership: string | null;
    country_code: string | null;
    source_type: string | null;
    paywall: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    homepage: row.homepage,
    feedUrl: row.feed_url,
    htmlUrl: row.html_url,
    enabled: row.enabled,
    lastFetchedAt: row.last_fetched_at,
    lastError: row.last_error,
    articleCount: row.article_count,
    unreadCount: row.unread_count ?? 0,
    bias: normalizeBias(row.bias),
    biasScore: row.bias_score,
    confidence: (row.confidence ?? "none") as Confidence,
    ownership: row.ownership,
    countryCode: row.country_code,
    sourceType: row.source_type,
    paywall: Boolean(row.paywall),
  }));
}

export function getEnabledSources(): Array<{
  id: string;
  name: string;
  articleCount: number;
}> {
  return sqlite
    .prepare(
      `SELECT s.id, s.name, COUNT(a.id) AS articleCount
       FROM sources s
       LEFT JOIN articles a ON a.source_id = s.id
       WHERE s.enabled = 1
       GROUP BY s.id
       ORDER BY s.name`,
    )
    .all() as Array<{ id: string; name: string; articleCount: number }>;
}

export function getStats(): {
  articles: number;
  unread: number;
  saved: number;
  stories: number;
  multiSource: number;
  sources: number;
  today: number;
} {
  const row = sqlite
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM articles WHERE hidden = 0) AS articles,
         (SELECT COUNT(*) FROM articles WHERE hidden = 0 AND read_at IS NULL) AS unread,
         (SELECT COUNT(*) FROM articles WHERE hidden = 0 AND saved_at IS NOT NULL) AS saved,
         (SELECT COUNT(*) FROM stories WHERE article_count > 0) AS stories,
         (SELECT COUNT(*) FROM stories WHERE source_count > 1) AS multiSource,
         (SELECT COUNT(*) FROM sources WHERE enabled = 1) AS sources,
         (SELECT COUNT(*) FROM articles WHERE hidden = 0 AND COALESCE(published_at, fetched_at) >= ?) AS today`,
    )
    .get(startOfDay()) as {
    articles: number;
    unread: number;
    saved: number;
    stories: number;
    multiSource: number;
    sources: number;
    today: number;
  };
  return row;
}

export function getLastRun(): IngestRun | null {
  const row = sqlite
    .prepare("SELECT * FROM ingest_runs ORDER BY id DESC LIMIT 1")
    .get() as
    | {
        id: number;
        started_at: number;
        finished_at: number | null;
        inserted: number;
        source_count: number;
        error_count: number;
        errors: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    inserted: row.inserted,
    sourceCount: row.source_count,
    errorCount: row.error_count,
    errors: row.errors,
  };
}

export function getBrief(date = dayKey()): {
  content: string;
  model: string | null;
  createdAt: number;
} | null {
  const row = sqlite
    .prepare("SELECT content, model, created_at FROM briefs WHERE date = ?")
    .get(date) as
    | { content: string; model: string | null; created_at: number }
    | undefined;
  if (!row) return null;
  return { content: row.content, model: row.model, createdAt: row.created_at };
}

export type SearchResult = {
  type: "story" | "article";
  id: number;
  title: string;
  subtitle: string;
  href: string;
};

function ftsQuery(value: string): string {
  const tokens = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .slice(0, 6);
  return tokens.map((token) => `"${token}"*`).join(" OR ");
}

export function search(value: string, limit = 8): SearchResult[] {
  const query = value.trim();
  if (!query) return [];
  const results: SearchResult[] = [];

  const storyRows = sqlite
    .prepare(
      `SELECT id, title, source_count, article_count
       FROM stories
       WHERE title LIKE ? AND article_count > 0
       ORDER BY score DESC, last_seen DESC
       LIMIT ?`,
    )
    .all(`%${query}%`, Math.ceil(limit / 2)) as Array<{
    id: number;
    title: string;
    source_count: number;
    article_count: number;
  }>;

  for (const story of storyRows) {
    results.push({
      type: "story",
      id: story.id,
      title: story.title,
      subtitle: `${story.article_count} articles · ${story.source_count} sources`,
      href: `/stories/${story.id}`,
    });
  }

  const fts = ftsQuery(query);
  if (fts) {
    try {
      const articleRows = sqlite
        .prepare(
          `SELECT a.id, a.title, a.url, a.story_id, so.name AS source_name,
                  a.published_at, a.fetched_at
           FROM articles_fts f
           JOIN articles a ON a.id = f.rowid
           JOIN sources so ON so.id = a.source_id
           WHERE articles_fts MATCH ?
           ORDER BY rank
           LIMIT ?`,
        )
        .all(fts, limit) as Array<{
        id: number;
        title: string;
        url: string;
        story_id: number | null;
        source_name: string;
        published_at: number | null;
        fetched_at: number;
      }>;

      for (const article of articleRows) {
        results.push({
          type: "article",
          id: article.id,
          title: article.title,
          subtitle: article.source_name,
          href: `/articles/${article.id}`,
        });
      }
    } catch {
      const articleRows = sqlite
        .prepare(
          `SELECT a.id, a.title, a.url, a.story_id, so.name AS source_name
           FROM articles a JOIN sources so ON so.id = a.source_id
           WHERE a.title LIKE ?
           ORDER BY COALESCE(a.published_at, a.fetched_at) DESC
           LIMIT ?`,
        )
        .all(`%${query}%`, limit) as Array<{
        id: number;
        title: string;
        url: string;
        story_id: number | null;
        source_name: string;
      }>;
      for (const article of articleRows) {
        results.push({
          type: "article",
          id: article.id,
          title: article.title,
          subtitle: article.source_name,
          href: `/articles/${article.id}`,
        });
      }
    }
  }

  return results.slice(0, limit);
}

export function getWeeklyStories(
  limit = 120,
  options: { country?: string; from?: number; to?: number } = {},
): StoryWithSources[] {
  const since = options.from ?? Date.now() - 7 * 86_400_000;
  const recent = getStories({ since, limit, ...options });
  if (recent.length) return recent;
  if (options.country || options.to !== undefined) return [];
  return getStories({ limit, ...options });
}

export type CountryFacet = {
  code: string;
  name: string;
  count: number;
};

export function getCountryFacets(kind: "news" | "history"): CountryFacet[] {
  if (kind === "news") {
    return sqlite
      .prepare(
        `SELECT ac.country_code AS code, ac.country_name AS name,
                COUNT(DISTINCT ac.article_id) AS count
         FROM article_countries ac
         JOIN articles a ON a.id = ac.article_id
         WHERE a.hidden = 0
         GROUP BY ac.country_code
         ORDER BY count DESC, name`,
      )
      .all() as CountryFacet[];
  }

  return sqlite
    .prepare(
      `SELECT ec.country_code AS code, ec.country_name AS name,
              COUNT(DISTINCT ec.event_id) AS count
       FROM event_countries ec
       GROUP BY ec.country_code
       ORDER BY count DESC, name`,
    )
    .all() as CountryFacet[];
}

export type HistoricalEventWithCountries = {
  id: number;
  externalId: string;
  title: string;
  description: string | null;
  year: number;
  month: number | null;
  day: number | null;
  dateText: string | null;
  sortKey: number;
  kind: string;
  source: string;
  sourceUrl: string | null;
  countryNames: string | null;
};

type HistoricalEventRecord = {
  id: number;
  external_id: string;
  title: string;
  description: string | null;
  year: number;
  month: number | null;
  day: number | null;
  date_text: string | null;
  sort_key: number;
  kind: string;
  source: string;
  source_url: string | null;
  country_names: string | null;
};

export function getHistoricalEvents(options: {
  country?: string;
  yearFrom?: number;
  yearTo?: number;
  kind?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
} = {}): HistoricalEventWithCountries[] {
  const where = ["1 = 1"];
  const params: Array<string | number> = [];

  if (options.country) {
    where.push(
      "EXISTS (SELECT 1 FROM event_countries ec WHERE ec.event_id = e.id AND ec.country_code = ?)",
    );
    params.push(options.country);
  }
  if (options.yearFrom !== undefined) {
    where.push("e.year >= ?");
    params.push(options.yearFrom);
  }
  if (options.yearTo !== undefined) {
    where.push("e.year <= ?");
    params.push(options.yearTo);
  }
  if (options.kind && options.kind !== "all") {
    where.push("e.kind = ?");
    params.push(options.kind);
  }
  where.push("e.sort_key <= ?");
  params.push(todaySortKey());

  params.push(options.limit ?? 60, options.offset ?? 0);

  const rows = sqlite
    .prepare(
      `SELECT e.id, e.external_id, e.title, e.description, e.year, e.month,
              e.day, e.date_text, e.sort_key, e.kind, e.source, e.source_url,
              (
                SELECT group_concat(name, ' · ') FROM (
                  SELECT DISTINCT ec.country_name AS name
                  FROM event_countries ec
                  WHERE ec.event_id = e.id
                  ORDER BY ec.country_name
                )
              ) AS country_names
       FROM historical_events e
       WHERE ${where.join(" AND ")}
       ORDER BY e.sort_key ${options.order === "asc" ? "ASC" : "DESC"}
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as HistoricalEventRecord[];

  return rows.map((row) => ({
    id: row.id,
    externalId: row.external_id,
    title: row.title,
    description: row.description,
    year: row.year,
    month: row.month,
    day: row.day,
    dateText: row.date_text,
    sortKey: row.sort_key,
    kind: row.kind,
    source: row.source,
    sourceUrl: row.source_url,
    countryNames: row.country_names,
  }));
}

export function getHistoryStats(): {
  events: number;
  countries: number;
  earliest: number | null;
  latest: number | null;
} {
  const row = sqlite
    .prepare(
      `SELECT COUNT(DISTINCT e.id) AS events,
              COUNT(DISTINCT ec.country_code) AS countries,
              MIN(e.year) AS earliest,
              MAX(e.year) AS latest
       FROM historical_events e
       LEFT JOIN event_countries ec ON ec.event_id = e.id`,
    )
    .get() as {
    events: number;
    countries: number;
    earliest: number | null;
    latest: number | null;
  };
  return row;
}

export function getHistoryCount(options: {
  country?: string;
  yearFrom?: number;
  yearTo?: number;
  kind?: string;
} = {}): number {
  const where = ["1 = 1"];
  const params: Array<string | number> = [];

  if (options.country) {
    where.push(
      "EXISTS (SELECT 1 FROM event_countries ec WHERE ec.event_id = e.id AND ec.country_code = ?)",
    );
    params.push(options.country);
  }
  if (options.yearFrom !== undefined) {
    where.push("e.year >= ?");
    params.push(options.yearFrom);
  }
  if (options.yearTo !== undefined) {
    where.push("e.year <= ?");
    params.push(options.yearTo);
  }
  if (options.kind && options.kind !== "all") {
    where.push("e.kind = ?");
    params.push(options.kind);
  }
  where.push("e.sort_key <= ?");
  params.push(todaySortKey());

  const row = sqlite
    .prepare(
      `SELECT COUNT(*) AS count FROM historical_events e WHERE ${where.join(" AND ")}`,
    )
    .get(...params) as { count: number };
  return row.count;
}
