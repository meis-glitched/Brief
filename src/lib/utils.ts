export function normalizeUrl(raw: string, base?: string): string {
  try {
    const url = new URL(raw, base);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_|ref$|source$|cmpid$|smid$)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanTitle(value: string | null | undefined, source?: string): string {
  if (!value) return "";
  let title = stripHtml(value);
  if (source) {
    for (const suffix of [` - ${source}`, ` | ${source}`]) {
      if (title.endsWith(suffix)) title = title.slice(0, -suffix.length).trim();
    }
  }
  return title.replace(/\s+/g, " ").trim();
}

const STOPWORDS = new Set(
  `a an and are as at be been being but by can could did do does for from had has have
   he her here him his how i if in into is it its just like may me might more most my
   new no not now of on one only or other our out over said says she should so some
   than that the their them then there these they this those to too up us was we were
   what when where which while who why will with would you your about after before
   amid among against between during under above below off again further once`
    .split(/\s+/)
    .filter(Boolean),
);

export function tokenizeList(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export function tokenize(value: string): Set<string> {
  return new Set(tokenizeList(value));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / Math.min(a.size, b.size);
}

export function buildIdf(documents: string[]): Map<string, number> {
  const documentFrequency = new Map<string, number>();
  for (const document of documents) {
    for (const token of new Set(tokenizeList(document))) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  const total = documents.length + 1;
  const idf = new Map<string, number>();
  for (const [token, frequency] of documentFrequency) {
    idf.set(token, Math.log(total / (frequency + 1)) + 1);
  }
  return idf;
}

export function vectorize(title: string, idf: Map<string, number>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokenizeList(title)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const vector = new Map<string, number>();
  let norm = 0;
  for (const [token, count] of counts) {
    const weight = (1 + Math.log(count)) * (idf.get(token) ?? 1);
    vector.set(token, weight);
    norm += weight * weight;
  }
  if (norm > 0) {
    const length = Math.sqrt(norm);
    for (const [token, weight] of vector) vector.set(token, weight / length);
  }
  return vector;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let score = 0;
  for (const [token, weight] of a) {
    const other = b.get(token);
    if (other) score += weight * other;
  }
  return score;
}

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
