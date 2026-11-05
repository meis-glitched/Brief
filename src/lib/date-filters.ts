import { startOfDay } from "@/lib/format";

export type NewsRange = {
  from?: number;
  to?: number;
};

const DAY = 86_400_000;

function parseDay(value: string | undefined, end = false): number | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(`${value}T00:00:00`);
  if (!Number.isFinite(timestamp)) return undefined;
  return end ? timestamp + DAY - 1 : timestamp;
}

export function resolveNewsRange(
  range: string | undefined,
  from: string | undefined,
  to: string | undefined,
): NewsRange {
  const now = Date.now();

  if (range === "today") return { from: startOfDay(now), to: now + 1 };
  if (range === "week") return { from: now - 7 * DAY, to: now + 1 };
  if (range === "month") return { from: now - 30 * DAY, to: now + 1 };
  if (range === "year") {
    const date = new Date(now);
    return { from: new Date(date.getFullYear(), 0, 1).getTime(), to: now + 1 };
  }
  if (range === "custom") {
    return { from: parseDay(from), to: parseDay(to, true) };
  }
  return {};
}

export type HistoryYears = {
  yearFrom?: number;
  yearTo?: number;
};

export function resolveHistoryYears(
  era: string | undefined,
  from: string | undefined,
  to: string | undefined,
): HistoryYears {
  if (era === "ancient") return { yearTo: 499 };
  if (era === "medieval") return { yearFrom: 500, yearTo: 1499 };
  if (era === "early-modern") return { yearFrom: 1500, yearTo: 1799 };
  if (era === "modern") return { yearFrom: 1800, yearTo: 1945 };
  if (era === "contemporary") return { yearFrom: 1946 };
  if (era === "custom") {
    const yearFrom = from ? Number.parseInt(from, 10) : undefined;
    const yearTo = to ? Number.parseInt(to, 10) : undefined;
    return {
      yearFrom: Number.isFinite(yearFrom) ? yearFrom : undefined,
      yearTo: Number.isFinite(yearTo) ? yearTo : undefined,
    };
  }
  return {};
}
