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

export async function inferAndTagArticles(items: ArticleInput[]): Promise<number> {
  if (items.length === 0) return 0;

  let tagged = 0;
  await sqlite.transaction(async (tx) => {
    for (const item of items) {
      const countries = inferCountries(
        `${item.title} ${item.summary ?? ""}`,
        3,
      );
      for (const country of countries) {
        const result = await tx.run(
          `INSERT OR IGNORE INTO article_countries (article_id, country_code, country_name)
           VALUES (?, ?, ?)`,
          item.id,
          country.code,
          country.name,
        );
        tagged += result.changes;
      }
    }
  });
  return tagged;
}

export async function inferAndTagEvents(items: EventInput[]): Promise<number> {
  if (items.length === 0) return 0;

  let tagged = 0;
  await sqlite.transaction(async (tx) => {
    for (const item of items) {
      const countries =
        item.countries ??
        inferCountries(`${item.title} ${item.description ?? ""}`, 3);
      for (const country of countries) {
        const result = await tx.run(
          `INSERT OR IGNORE INTO event_countries (event_id, country_code, country_name)
           VALUES (?, ?, ?)`,
          item.id,
          country.code,
          country.name,
        );
        tagged += result.changes;
      }
    }
  });
  return tagged;
}

export async function backfillArticleCountries(): Promise<{
  articles: number;
  tags: number;
}> {
  const rows = await sqlite.all<ArticleInput>(
    `SELECT a.id, a.title, a.summary
     FROM articles a
     WHERE a.hidden = 0
       AND NOT EXISTS (
         SELECT 1 FROM article_countries ac WHERE ac.article_id = a.id
       )`,
  );

  const tags = await inferAndTagArticles(rows);
  return { articles: rows.length, tags };
}
