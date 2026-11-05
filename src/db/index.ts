import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { SOURCES } from "@/lib/ingest/sources";
import { SOURCE_RATINGS } from "@/lib/source-ratings";
import * as schema from "./schema";

const DB_PATH =
  process.env.BRIEF_DB_PATH ?? join(process.cwd(), "data", "brief.db");
const MIGRATIONS_FOLDER = join(process.cwd(), "drizzle");

type BriefDb = {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
};

const globalForDb = globalThis as unknown as { __briefDb?: BriefDb };

function ensureFts(sqlite: Database.Database) {
  const exists = sqlite
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'articles_fts'",
    )
    .get();

  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
      INSERT INTO articles_fts(rowid, title, summary)
      VALUES (new.id, new.title, coalesce(new.summary, ''));
    END;
    CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, summary)
      VALUES ('delete', old.id, old.title, coalesce(old.summary, ''));
    END;
    CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, summary)
      VALUES ('delete', old.id, old.title, coalesce(old.summary, ''));
      INSERT INTO articles_fts(rowid, title, summary)
      VALUES (new.id, new.title, coalesce(new.summary, ''));
    END;
  `);

  if (!exists) {
    sqlite.exec(`
      CREATE VIRTUAL TABLE articles_fts USING fts5(
        title,
        summary,
        content='articles',
        content_rowid='id',
        tokenize='porter unicode61'
      );
      INSERT INTO articles_fts(articles_fts) VALUES ('rebuild');
    `);
  }
}

function ensureWikiFts(sqlite: Database.Database) {
  const exists = sqlite
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'wiki_pages_fts'",
    )
    .get();

  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS wiki_pages_ai AFTER INSERT ON wiki_pages BEGIN
      INSERT INTO wiki_pages_fts(rowid, title, summary, extract)
      VALUES (new.page_id, new.title, coalesce(new.summary, ''), coalesce(new.extract, ''));
    END;
    CREATE TRIGGER IF NOT EXISTS wiki_pages_ad AFTER DELETE ON wiki_pages BEGIN
      INSERT INTO wiki_pages_fts(wiki_pages_fts, rowid, title, summary, extract)
      VALUES ('delete', old.page_id, old.title, coalesce(old.summary, ''), coalesce(old.extract, ''));
    END;
    CREATE TRIGGER IF NOT EXISTS wiki_pages_au AFTER UPDATE ON wiki_pages BEGIN
      INSERT INTO wiki_pages_fts(wiki_pages_fts, rowid, title, summary, extract)
      VALUES ('delete', old.page_id, old.title, coalesce(old.summary, ''), coalesce(old.extract, ''));
      INSERT INTO wiki_pages_fts(rowid, title, summary, extract)
      VALUES (new.page_id, new.title, coalesce(new.summary, ''), coalesce(new.extract, ''));
    END;
  `);

  if (!exists) {
    sqlite.exec(`
      CREATE VIRTUAL TABLE wiki_pages_fts USING fts5(
        title,
        summary,
        extract,
        content='wiki_pages',
        content_rowid='page_id',
        tokenize='porter unicode61'
      );
      INSERT INTO wiki_pages_fts(wiki_pages_fts) VALUES ('rebuild');
    `);
  }
}

function seedSources(sqlite: Database.Database) {
  const count = sqlite
    .prepare("SELECT COUNT(*) AS n FROM sources")
    .get() as { n: number };
  if (count.n > 0) return;

  const now = Date.now();
  const insert = sqlite.prepare(`
    INSERT OR IGNORE INTO sources
      (id, name, homepage, feed_url, html_url, selectors, gnews_query,
       gnews_publishers, "limit", enabled, created_at)
    VALUES
      (@id, @name, @homepage, @feedUrl, @htmlUrl, @selectors, @gnewsQuery,
       @gnewsPublishers, @limit, 1, @createdAt)
  `);

  const insertMany = sqlite.transaction(() => {
    for (const source of SOURCES) {
      insert.run({
        id: source.id,
        name: source.name,
        homepage: source.homepage,
        feedUrl: source.feedUrl ?? null,
        htmlUrl: source.htmlUrl ?? null,
        selectors: source.selectors ? JSON.stringify(source.selectors) : null,
        gnewsQuery: source.gnewsQuery ?? null,
        gnewsPublishers: source.gnewsPublishers
          ? JSON.stringify(source.gnewsPublishers)
          : null,
        limit: source.limit ?? 25,
        createdAt: now,
      });
    }
  });

  insertMany();
}

function seedSourceRatings(sqlite: Database.Database) {
  const now = Date.now();
  const insert = sqlite.prepare(`
    INSERT INTO source_ratings
      (source_id, bias, bias_score, confidence, ownership, ownership_type,
       country_code, paywall, source_type, provider, provider_url, license,
       notes, updated_at)
    VALUES
      (@sourceId, @bias, @biasScore, @confidence, @ownership, @ownershipType,
       @countryCode, @paywall, @sourceType, 'AllSides', @providerUrl,
       @license, @notes, @updatedAt)
    ON CONFLICT(source_id) DO UPDATE SET
      bias = excluded.bias,
      bias_score = excluded.bias_score,
      confidence = excluded.confidence,
      ownership = excluded.ownership,
      ownership_type = excluded.ownership_type,
      country_code = excluded.country_code,
      paywall = excluded.paywall,
      source_type = excluded.source_type,
      provider = excluded.provider,
      provider_url = excluded.provider_url,
      license = excluded.license,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);

  const insertMany = sqlite.transaction(() => {
    for (const rating of SOURCE_RATINGS) {
      insert.run({
        sourceId: rating.sourceId,
        bias: rating.bias,
        biasScore: rating.biasScore,
        confidence: rating.confidence,
        ownership: rating.ownership,
        ownershipType: rating.ownershipType,
        countryCode: rating.countryCode,
        paywall: rating.paywall ? 1 : 0,
        sourceType: rating.sourceType,
        providerUrl: rating.providerUrl,
        license: rating.providerUrl ? "CC BY-NC 4.0" : null,
        notes: rating.notes ?? null,
        updatedAt: now,
      });
    }
  });

  insertMany();
}

function createDb(): BriefDb {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  ensureFts(sqlite);
  ensureWikiFts(sqlite);
  seedSources(sqlite);
  seedSourceRatings(sqlite);

  return { sqlite, db };
}

const instance = globalForDb.__briefDb ?? createDb();
globalForDb.__briefDb = instance;

export const sqlite = instance.sqlite;
export const db = instance.db;
