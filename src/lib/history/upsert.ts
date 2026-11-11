import { sqlite } from "@/db";
import type { CountryRef } from "@/lib/countries";
import { formatEventDate } from "@/lib/format";

export type HistoryInput = {
  externalId: string;
  title: string;
  description?: string | null;
  year: number;
  month?: number | null;
  day?: number | null;
  dateText?: string | null;
  kind?: string;
  source: "onthisday" | "wikidata";
  sourceUrl?: string | null;
  countries?: CountryRef[];
};

export function historySortKey(
  year: number,
  month?: number | null,
  day?: number | null,
): number {
  return year * 10_000 + (month ?? 0) * 100 + (day ?? 0);
}

export async function upsertHistoricalEvents(items: HistoryInput[]): Promise<{
  inserted: number;
  updated: number;
}> {
  if (items.length === 0) return { inserted: 0, updated: 0 };

  const unique = new Map<string, HistoryInput>();
  for (const item of items) {
    const title = item.title.replace(/\s+/g, " ").trim();
    if (!title || !Number.isFinite(item.year)) continue;
    unique.set(item.externalId, { ...item, title });
  }

  let inserted = 0;
  let updated = 0;
  const now = Date.now();

  await sqlite.transaction(async (tx) => {
    for (const item of unique.values()) {
      const existing = await tx.get<{ id: number }>(
        "SELECT id FROM historical_events WHERE external_id = ?",
        item.externalId,
      );

      await tx.run(
        `INSERT INTO historical_events
          (external_id, title, description, year, month, day, date_text, sort_key,
           kind, source, source_url, created_at)
        VALUES
          (@externalId, @title, @description, @year, @month, @day, @dateText,
           @sortKey, @kind, @source, @sourceUrl, @createdAt)
        ON CONFLICT(external_id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          year = excluded.year,
          month = excluded.month,
          day = excluded.day,
          date_text = excluded.date_text,
          sort_key = excluded.sort_key,
          kind = excluded.kind,
          source = excluded.source,
          source_url = excluded.source_url`,
        {
          externalId: item.externalId,
          title: item.title,
          description: item.description?.trim() || null,
          year: item.year,
          month: item.month ?? null,
          day: item.day ?? null,
          dateText:
            item.dateText ??
            formatEventDate(item.year, item.month ?? null, item.day ?? null),
          sortKey: historySortKey(item.year, item.month, item.day),
          kind: item.kind ?? "event",
          source: item.source,
          sourceUrl: item.sourceUrl ?? null,
          createdAt: now,
        },
      );

      const id =
        existing?.id ??
        (
          await tx.get<{ id: number }>(
            "SELECT id FROM historical_events WHERE external_id = ?",
            item.externalId,
          )
        )!.id;

      await tx.run("DELETE FROM event_countries WHERE event_id = ?", id);
      for (const country of item.countries ?? []) {
        await tx.run(
          `INSERT OR IGNORE INTO event_countries (event_id, country_code, country_name)
           VALUES (?, ?, ?)`,
          id,
          country.code,
          country.name,
        );
      }

      if (existing) updated += 1;
      else inserted += 1;
    }
  });

  return { inserted, updated };
}
