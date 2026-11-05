import { sqlite } from "@/db";
import { inferCountries } from "@/lib/countries";
import { hash } from "@/lib/utils";
import { upsertHistoricalEvents, type HistoryInput } from "./upsert";

type OnThisDayPage = {
  titles?: { normalized?: string };
  content_urls?: { desktop?: { page?: string } };
};

type OnThisDayItem = {
  text: string;
  year?: number;
  pages?: OnThisDayPage[];
};

type OnThisDayResponse = {
  events?: OnThisDayItem[];
  selected?: OnThisDayItem[];
  births?: OnThisDayItem[];
  deaths?: OnThisDayItem[];
};

const ENDPOINTS = [
  (month: number, day: number) =>
    `https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`,
  (month: number, day: number) =>
    `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`,
];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDay(
  month: number,
  day: number,
): Promise<OnThisDayResponse> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length](month, day);
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Brief/0.1 (local history desk)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(40_000),
      });
      if (response.ok) return (await response.json()) as OnThisDayResponse;
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`${month}/${day}: HTTP ${response.status}`);
      }
    } catch (error) {
      if (attempt === 5) throw error;
    }
    await sleep(4_000 * (attempt + 1));
  }
  throw new Error(`${month}/${day}: retries exhausted`);
}

function makeTitle(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 240) return trimmed;
  const cut = trimmed.slice(0, 237);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 120 ? lastSpace : 237).trimEnd()}…`;
}

function toInput(
  item: OnThisDayItem,
  month: number,
  day: number,
  kind: string,
): HistoryInput | null {
  const text = item.text?.trim();
  if (!text || typeof item.year !== "number") return null;

  const pageTitles = (item.pages ?? [])
    .map((page) => page.titles?.normalized ?? "")
    .filter(Boolean);
  const sourceUrl =
    item.pages?.find((page) => page.content_urls?.desktop?.page)?.content_urls
      ?.desktop?.page ?? null;

  return {
    externalId: `otd:${month}-${day}:${item.year}:${hash(text)}`,
    title: makeTitle(text),
    description: text,
    year: item.year,
    month,
    day,
    kind,
    source: "onthisday",
    sourceUrl,
    countries: inferCountries(`${text} ${pageTitles.join(" ")}`, 3),
  };
}

export async function importOnThisDay(options: {
  includePeople?: boolean;
  onProgress?: (message: string) => void;
} = {}): Promise<{
  inserted: number;
  updated: number;
  days: number;
  failed: number;
}> {
  const imported = new Set(
    (
      sqlite
        .prepare(
          "SELECT DISTINCT external_id FROM historical_events WHERE external_id LIKE 'otd:%'",
        )
        .all() as Array<{ external_id: string }>
    )
      .map((row) => row.external_id.match(/^otd:(\d+)-(\d+):/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => `${Number(match[1])}-${Number(match[2])}`),
  );

  const tasks: Array<{ month: number; day: number }> = [];
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= DAYS_IN_MONTH[month - 1]; day += 1) {
      if (!imported.has(`${month}-${day}`)) tasks.push({ month, day });
    }
  }

  let inserted = 0;
  let updated = 0;
  let completed = 0;
  let failed = 0;
  let cursor = 0;
  const concurrency = 2;
  const failures: string[] = [];

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      const { month, day } = tasks[index];

      let payload: OnThisDayResponse;
      try {
        payload = await fetchDay(month, day);
      } catch (error) {
        failed += 1;
        failures.push(`${month}/${day}: ${(error as Error).message}`);
        continue;
      }

      const items: HistoryInput[] = [];

      for (const item of payload.events ?? []) {
        const input = toInput(item, month, day, "event");
        if (input) items.push(input);
      }
      for (const item of payload.selected ?? []) {
        const input = toInput(item, month, day, "selected");
        if (input) items.push(input);
      }
      if (options.includePeople) {
        for (const item of payload.births ?? []) {
          const input = toInput(item, month, day, "birth");
          if (input) items.push(input);
        }
        for (const item of payload.deaths ?? []) {
          const input = toInput(item, month, day, "death");
          if (input) items.push(input);
        }
      }

      const result = upsertHistoricalEvents(items);
      inserted += result.inserted;
      updated += result.updated;
      completed += 1;

      if (completed % 20 === 0) {
        options.onProgress?.(`${completed}/${tasks.length} days imported`);
      }
      await sleep(350);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  options.onProgress?.(`${completed}/${tasks.length} days imported`);
  if (failures.length) {
    options.onProgress?.(
      `${failed} days failed: ${failures.slice(0, 5).join("; ")}${failures.length > 5 ? "…" : ""}`,
    );
  }
  return { inserted, updated, days: completed, failed };
}
