import { findCountry, type CountryRef } from "@/lib/countries";
import { upsertHistoricalEvents, type HistoryInput } from "./upsert";

const ENDPOINT = "https://query.wikidata.org/sparql";

const CLASSES = [
  "Q1656682", // event
  "Q1190554", // occurrence
  "Q13418847", // historical event
  "Q178561", // battle
  "Q131569", // treaty
  "Q198", // war
  "Q3839081", // massacre
];

type Binding = {
  event?: { value: string };
  eventLabel?: { value: string };
  date?: { value: string };
  dateProp?: { value: string };
  country?: { value: string };
  countryLabel?: { value: string };
  article?: { value: string };
};

type SparqlResponse = {
  results?: { bindings?: Binding[] };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sparqlYear(year: number): string {
  const sign = year < 0 ? "-" : "";
  return `${sign}${String(Math.abs(year)).padStart(4, "0")}`;
}

function buildQuery(fromYear: number, toYear: number): string {
  const classes = CLASSES.map((id) => `wd:${id}`).join(" ");
  return `
SELECT DISTINCT ?event ?eventLabel ?date ?dateProp ?country ?countryLabel ?article WHERE {
  VALUES ?class { ${classes} }
  ?event wdt:P31 ?class .
  VALUES ?dateProp { wdt:P580 wdt:P582 wdt:P585 }
  ?event ?dateProp ?date .
  FILTER(?date >= "${sparqlYear(fromYear)}-01-01T00:00:00Z"^^xsd:dateTime
      && ?date < "${sparqlYear(toYear + 1)}-01-01T00:00:00Z"^^xsd:dateTime)
  { ?event wdt:P17 ?country }
  UNION
  { ?event wdt:P276 ?location . ?location wdt:P17 ?country }
  ?article schema:about ?event ;
           schema:isPartOf <https://en.wikipedia.org/> .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 20000
`.trim();
}

async function fetchRange(
  fromYear: number,
  toYear: number,
): Promise<Binding[]> {
  const query = buildQuery(fromYear, toYear);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/sparql-results+json",
        "User-Agent": "Brief/0.1 (local history desk)",
      },
      body: new URLSearchParams({ query }),
    });

    if (response.ok) {
      const payload = (await response.json()) as SparqlResponse;
      return payload.results?.bindings ?? [];
    }

    if (response.status !== 429 && response.status < 500) {
      throw new Error(`Wikidata ${fromYear}-${toYear} failed: ${response.status}`);
    }
    await sleep(1200 * (attempt + 1));
  }
  throw new Error(`Wikidata ${fromYear}-${toYear} failed after retries`);
}

function parseDate(value: string | undefined): {
  year: number;
  month: number | null;
  day: number | null;
} | null {
  if (!value) return null;
  const match = value.match(/^([+-]?\d{1,6})-(\d{2})-(\d{2})T/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!Number.isFinite(year) || year === 0) return null;
  return {
    year,
    month: month >= 1 && month <= 12 ? month : null,
    day: day >= 1 && day <= 31 ? day : null,
  };
}

function qid(uri: string | undefined): string | null {
  if (!uri) return null;
  const match = uri.match(/\/entity\/(Q\d+)$/);
  return match ? match[1] : null;
}

function propertyPriority(uri: string | undefined): number {
  if (!uri) return 0;
  if (uri.endsWith("P585")) return 3;
  if (uri.endsWith("P580")) return 2;
  if (uri.endsWith("P582")) return 1;
  return 0;
}

type Grouped = {
  qid: string;
  title: string;
  date: { year: number; month: number | null; day: number | null };
  priority: number;
  countries: Map<string, CountryRef>;
  sourceUrl: string | null;
};

function groupBindings(bindings: Binding[]): HistoryInput[] {
  const grouped = new Map<string, Grouped>();

  for (const binding of bindings) {
    const id = qid(binding.event?.value);
    const title = binding.eventLabel?.value?.trim();
    const date = parseDate(binding.date?.value);
    if (!id || !title || !date || /^Q\d+$/.test(title)) continue;

    const countryLabel = binding.countryLabel?.value?.trim();
    const countryQid = qid(binding.country?.value);
    const country =
      (countryLabel ? findCountry(countryLabel) : null) ??
      (countryLabel && countryQid
        ? { code: countryQid, name: countryLabel }
        : null);

    const priority = propertyPriority(binding.dateProp?.value);
    const existing = grouped.get(id);

    if (!existing) {
      grouped.set(id, {
        qid: id,
        title,
        date,
        priority,
        countries: new Map(country ? [[country.code, country]] : []),
        sourceUrl: binding.article?.value ?? null,
      });
      continue;
    }

    if (country) existing.countries.set(country.code, country);
    if (!existing.sourceUrl && binding.article?.value) {
      existing.sourceUrl = binding.article.value;
    }
    if (priority > existing.priority) {
      existing.priority = priority;
      existing.date = date;
    }
  }

  return [...grouped.values()].map((event) => ({
    externalId: `wikidata:${event.qid}`,
    title: event.title,
    description: null,
    year: event.date.year,
    month: event.date.month,
    day: event.date.day,
    kind: "event",
    source: "wikidata",
    sourceUrl: event.sourceUrl,
    countries: [...event.countries.values()],
  }));
}

export async function importWikidata(options: {
  fromYear: number;
  toYear: number;
  step?: number;
  onProgress?: (message: string) => void;
}): Promise<{ inserted: number; updated: number; chunks: number }> {
  const step = Math.max(1, options.step ?? 10);
  let inserted = 0;
  let updated = 0;
  let chunks = 0;

  for (let year = options.fromYear; year <= options.toYear; year += step) {
    const end = Math.min(year + step - 1, options.toYear);
    const bindings = await fetchRange(year, end);
    const events = groupBindings(bindings);
    const result = await upsertHistoricalEvents(events);
    inserted += result.inserted;
    updated += result.updated;
    chunks += 1;
    options.onProgress?.(
      `${year}–${end}: ${events.length} events (${result.inserted} new)`,
    );
    await sleep(250);
  }

  return { inserted, updated, chunks };
}
