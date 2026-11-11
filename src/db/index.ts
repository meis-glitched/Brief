import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createClient,
  type InArgs,
  type InStatement,
  type ResultSet,
} from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { SOURCES } from "@/lib/ingest/sources";
import { SOURCE_RATINGS } from "@/lib/source-ratings";
import { dataDir } from "@/lib/storage";
import * as schema from "./schema";

const DB_URL =
  process.env.TURSO_DATABASE_URL || `file:${join(dataDir(), "brief.db")}`;
const MIGRATIONS_FOLDER = join(process.cwd(), "drizzle");

if (DB_URL.startsWith("file:")) {
  mkdirSync(dirname(DB_URL.slice("file:".length)), { recursive: true });
}

const client = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export type RunResult = {
  changes: number;
  lastInsertRowid: number | bigint | undefined;
};

export type Database = {
  get<T>(sql: string, ...args: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, ...args: unknown[]): Promise<T[]>;
  run(sql: string, ...args: unknown[]): Promise<RunResult>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
};

type Executor = {
  execute(stmt: InStatement): Promise<ResultSet>;
  executeMultiple(sql: string): Promise<void>;
  batch(stmts: InStatement[]): Promise<ResultSet[]>;
};

function normalizeArgs(args: unknown[]): InArgs {
  return args.map((value) => (value === undefined ? null : value)) as InArgs;
}

function resultOf(result: ResultSet): RunResult {
  return {
    changes: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid,
  };
}

function makeDatabase(executor: Executor): Database {
  return {
    async get<T>(sql: string, ...args: unknown[]) {
      const result = await executor.execute({ sql, args: normalizeArgs(args) });
      return result.rows[0] as T | undefined;
    },
    async all<T>(sql: string, ...args: unknown[]) {
      const result = await executor.execute({ sql, args: normalizeArgs(args) });
      return result.rows as T[];
    },
    async run(sql: string, ...args: unknown[]) {
      const result = await executor.execute({ sql, args: normalizeArgs(args) });
      return resultOf(result);
    },
    async exec(sql: string) {
      await executor.executeMultiple(sql);
    },
    async transaction<T>(fn: (tx: Database) => Promise<T>) {
      const transaction = await client.transaction("write");
      try {
        const result = await fn(makeDatabase(transaction));
        await transaction.commit();
        return result;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
  };
}

async function ensureFts(executor: Executor) {
  const exists = await executor.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'articles_fts'",
  });

  await executor.executeMultiple(`
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

  if (exists.rows.length === 0) {
    await executor.executeMultiple(`
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

async function ensureWikiFts(executor: Executor) {
  const exists = await executor.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'wiki_pages_fts'",
  });

  await executor.executeMultiple(`
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

  if (exists.rows.length === 0) {
    await executor.executeMultiple(`
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

async function seedSources(executor: Executor) {
  const count = await executor.execute("SELECT COUNT(*) AS n FROM sources");
  if (Number(count.rows[0]?.n ?? 0) > 0) return;

  const now = Date.now();
  const statements: InStatement[] = SOURCES.map((source) => ({
    sql: `INSERT OR IGNORE INTO sources
      (id, name, homepage, feed_url, html_url, selectors, gnews_query,
       gnews_publishers, "limit", enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    args: [
      source.id,
      source.name,
      source.homepage,
      source.feedUrl ?? null,
      source.htmlUrl ?? null,
      source.selectors ? JSON.stringify(source.selectors) : null,
      source.gnewsQuery ?? null,
      source.gnewsPublishers ? JSON.stringify(source.gnewsPublishers) : null,
      source.limit ?? 25,
      now,
    ],
  }));

  await executor.batch(statements);
}

async function seedSourceRatings(executor: Executor) {
  const now = Date.now();
  const statements: InStatement[] = SOURCE_RATINGS.map((rating) => ({
    sql: `INSERT INTO source_ratings
      (source_id, bias, bias_score, confidence, ownership, ownership_type,
       country_code, paywall, source_type, provider, provider_url, license,
       notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AllSides', ?, ?, ?, ?)
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
        updated_at = excluded.updated_at`,
    args: [
      rating.sourceId,
      rating.bias,
      rating.biasScore,
      rating.confidence,
      rating.ownership,
      rating.ownershipType,
      rating.countryCode,
      rating.paywall ? 1 : 0,
      rating.sourceType,
      rating.providerUrl,
      rating.providerUrl ? "CC BY-NC 4.0" : null,
      rating.notes ?? null,
      now,
    ],
  }));

  await executor.batch(statements);
}

let ready: Promise<void> | null = null;

async function initialize() {
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  await ensureFts(client);
  await ensureWikiFts(client);
  await seedSources(client);
  await seedSourceRatings(client);
}

function ensureReady(): Promise<void> {
  ready ??= initialize();
  return ready;
}

const database = makeDatabase(client);

export const sqlite: Database = {
  async get<T>(sql: string, ...args: unknown[]) {
    await ensureReady();
    return database.get<T>(sql, ...args);
  },
  async all<T>(sql: string, ...args: unknown[]) {
    await ensureReady();
    return database.all<T>(sql, ...args);
  },
  async run(sql: string, ...args: unknown[]) {
    await ensureReady();
    return database.run(sql, ...args);
  },
  async exec(sql: string) {
    await ensureReady();
    return database.exec(sql);
  },
  async transaction<T>(fn: (tx: Database) => Promise<T>) {
    await ensureReady();
    return database.transaction(fn);
  },
};
