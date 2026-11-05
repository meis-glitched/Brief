import { sqlite } from "@/db";
import { inferCountries, type CountryRef } from "@/lib/countries";

type ArticleInput = {
  id: number;
  title: string;
  summary?: string | null;
};

type EventInput = {
  id: number;
  title: string;
  description?: string | null;
  countries?: CountryRef[];
};

export function inferAndTagArticles(items: ArticleInput[]): number {
  if (items.length === 0) return 0;

  const insert = sqlite.prepare(
    `INSERT OR IGNORE INTO article_countries (article_id, country_code, country_name)
     VALUES (?, ?, ?)`,
  );

  let tagged = 0;
  const run = sqlite.transaction(() => {
    for (const item of items) {
      const countries = inferCountries(
        `${item.title} ${item.summary ?? ""}`,
        3,
      );
      for (const country of countries) {
        tagged += insert.run(item.id, country.code, country.name).changes;
      }
    }
  });
  run();
  return tagged;
}

export function inferAndTagEvents(items: EventInput[]): number {
  if (items.length === 0) return 0;

  const insert = sqlite.prepare(
    `INSERT OR IGNORE INTO event_countries (event_id, country_code, country_name)
     VALUES (?, ?, ?)`,
  );

  let tagged = 0;
  const run = sqlite.transaction(() => {
    for (const item of items) {
      const countries =
        item.countries ??
        inferCountries(`${item.title} ${item.description ?? ""}`, 3);
      for (const country of countries) {
        tagged += insert.run(item.id, country.code, country.name).changes;
      }
    }
  });
  run();
  return tagged;
}

export function backfillArticleCountries(): { articles: number; tags: number } {
  const rows = sqlite
    .prepare(
      `SELECT a.id, a.title, a.summary
       FROM articles a
       WHERE a.hidden = 0
         AND NOT EXISTS (
           SELECT 1 FROM article_countries ac WHERE ac.article_id = a.id
         )`,
    )
    .all() as ArticleInput[];

  const tags = inferAndTagArticles(rows);
  return { articles: rows.length, tags };
}
