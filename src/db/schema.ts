import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    homepage: text("homepage").notNull(),
    feedUrl: text("feed_url"),
    htmlUrl: text("html_url"),
    selectors: text("selectors"),
    gnewsQuery: text("gnews_query"),
    gnewsPublishers: text("gnews_publishers"),
    limit: integer("limit").notNull().default(25),
    enabled: integer("enabled").notNull().default(1),
    lastFetchedAt: integer("last_fetched_at"),
    lastError: text("last_error"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("sources_enabled_idx").on(table.enabled)],
);

export const sourceRatings = sqliteTable(
  "source_ratings",
  {
    sourceId: text("source_id")
      .primaryKey()
      .references(() => sources.id, { onDelete: "cascade" }),
    bias: text("bias").notNull().default("unrated"),
    biasScore: real("bias_score"),
    confidence: text("confidence").notNull().default("none"),
    ownership: text("ownership"),
    ownershipType: text("ownership_type"),
    countryCode: text("country_code"),
    paywall: integer("paywall").notNull().default(0),
    sourceType: text("source_type"),
    provider: text("provider").notNull().default("AllSides"),
    providerUrl: text("provider_url"),
    license: text("license"),
    notes: text("notes"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("source_ratings_bias_idx").on(table.bias)],
);

export const stories = sqliteTable(
  "stories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    summary: text("summary"),
    firstSeen: integer("first_seen").notNull(),
    lastSeen: integer("last_seen").notNull(),
    articleCount: integer("article_count").notNull().default(0),
    sourceCount: integer("source_count").notNull().default(0),
    score: real("score").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("stories_last_seen_idx").on(table.lastSeen),
    index("stories_score_idx").on(table.score),
  ],
);

export const articles = sqliteTable(
  "articles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    url: text("url").notNull(),
    title: text("title").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    summary: text("summary"),
    author: text("author"),
    publishedAt: integer("published_at"),
    fetchedAt: integer("fetched_at").notNull(),
    contentHash: text("content_hash"),
    imageUrl: text("image_url"),
    imageWidth: integer("image_width"),
    imageHeight: integer("image_height"),
    feedContent: text("feed_content"),
    resolvedUrl: text("resolved_url"),
    storyId: integer("story_id").references(() => stories.id, {
      onDelete: "set null",
    }),
    readAt: integer("read_at"),
    savedAt: integer("saved_at"),
    hidden: integer("hidden").notNull().default(0),
  },
  (table) => [
    uniqueIndex("articles_url_idx").on(table.url),
    index("articles_published_idx").on(table.publishedAt),
    index("articles_source_idx").on(table.sourceId),
    index("articles_story_idx").on(table.storyId),
    index("articles_saved_idx").on(table.savedAt),
  ],
);

export const articleCountries = sqliteTable(
  "article_countries",
  {
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    countryCode: text("country_code").notNull(),
    countryName: text("country_name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.articleId, table.countryCode] }),
    index("article_countries_code_idx").on(table.countryCode),
  ],
);

export const historicalEvents = sqliteTable(
  "historical_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    year: integer("year").notNull(),
    month: integer("month"),
    day: integer("day"),
    dateText: text("date_text"),
    sortKey: integer("sort_key").notNull(),
    kind: text("kind").notNull().default("event"),
    source: text("source").notNull(),
    sourceUrl: text("source_url"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("historical_events_external_idx").on(table.externalId),
    index("historical_events_sort_idx").on(table.sortKey),
    index("historical_events_year_idx").on(table.year),
    index("historical_events_kind_idx").on(table.kind),
  ],
);

export const eventCountries = sqliteTable(
  "event_countries",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => historicalEvents.id, { onDelete: "cascade" }),
    countryCode: text("country_code").notNull(),
    countryName: text("country_name").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.countryCode] }),
    index("event_countries_code_idx").on(table.countryCode),
  ],
);

export const articleContent = sqliteTable(
  "article_content",
  {
    articleId: integer("article_id")
      .primaryKey()
      .references(() => articles.id, { onDelete: "cascade" }),
    blocks: text("blocks").notNull(),
    text: text("text").notNull(),
    wordCount: integer("word_count").notNull().default(0),
    status: text("status").notNull().default("full"),
    fetchedAt: integer("fetched_at").notNull(),
    error: text("error"),
  },
  (table) => [index("article_content_fetched_idx").on(table.fetchedAt)],
);

export const wikiPages = sqliteTable(
  "wiki_pages",
  {
    pageId: integer("page_id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary"),
    extract: text("extract"),
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    leadImageUrl: text("lead_image_url"),
    leadImageWidth: integer("lead_image_width"),
    leadImageHeight: integer("lead_image_height"),
    leadImageLicense: text("lead_image_license"),
    leadImageLicenseUrl: text("lead_image_license_url"),
    leadImageArtist: text("lead_image_artist"),
    leadImageFilePage: text("lead_image_file_page"),
    leadImageNonFree: integer("lead_image_non_free").notNull().default(0),
    fetchedAt: integer("fetched_at").notNull(),
  },
  (table) => [
    uniqueIndex("wiki_pages_title_idx").on(table.title),
    index("wiki_pages_fetched_idx").on(table.fetchedAt),
  ],
);

export const wikiImages = sqliteTable(
  "wiki_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pageId: integer("page_id")
      .notNull()
      .references(() => wikiPages.pageId, { onDelete: "cascade" }),
    fileTitle: text("file_title").notNull(),
    url: text("url").notNull(),
    thumbUrl: text("thumb_url"),
    width: integer("width"),
    height: integer("height"),
    caption: text("caption"),
    artist: text("artist"),
    license: text("license"),
    licenseUrl: text("license_url"),
    filePageUrl: text("file_page_url"),
    nonFree: integer("non_free").notNull().default(0),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    uniqueIndex("wiki_images_page_file_idx").on(table.pageId, table.fileTitle),
    index("wiki_images_page_idx").on(table.pageId),
  ],
);

export const wikiLeadImages = sqliteTable(
  "wiki_lead_images",
  {
    title: text("title").primaryKey(),
    pageId: integer("page_id"),
    imageUrl: text("image_url").notNull(),
    width: integer("width"),
    height: integer("height"),
    fetchedAt: integer("fetched_at").notNull(),
  },
  (table) => [index("wiki_lead_images_fetched_idx").on(table.fetchedAt)],
);

export const wikiSearches = sqliteTable(
  "wiki_searches",
  {
    query: text("query").primaryKey(),
    results: text("results").notNull(),
    total: integer("total").notNull().default(0),
    fetchedAt: integer("fetched_at").notNull(),
  },
  (table) => [index("wiki_searches_fetched_idx").on(table.fetchedAt)],
);

export const briefs = sqliteTable(
  "briefs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    content: text("content").notNull(),
    model: text("model"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("briefs_date_idx").on(table.date)],
);

export const ingestRuns = sqliteTable("ingest_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  inserted: integer("inserted").notNull().default(0),
  sourceCount: integer("source_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  errors: text("errors"),
});

export type Source = typeof sources.$inferSelect;
export type SourceRating = typeof sourceRatings.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type ArticleContent = typeof articleContent.$inferSelect;
export type ArticleCountry = typeof articleCountries.$inferSelect;
export type HistoricalEvent = typeof historicalEvents.$inferSelect;
export type EventCountry = typeof eventCountries.$inferSelect;
export type WikiPage = typeof wikiPages.$inferSelect;
export type WikiImage = typeof wikiImages.$inferSelect;
export type WikiLeadImage = typeof wikiLeadImages.$inferSelect;
export type WikiSearch = typeof wikiSearches.$inferSelect;
export type Brief = typeof briefs.$inferSelect;
export type IngestRun = typeof ingestRuns.$inferSelect;
