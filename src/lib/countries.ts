import worldCountries from "world-countries";

export type CountryRef = {
  code: string;
  name: string;
};

type CountryEntry = CountryRef & {
  aliases: string[];
  priority?: number;
};

const GENERIC_ALIASES = new Set([
  "republic",
  "kingdom",
  "state",
  "states",
  "island",
  "islands",
  "territory",
  "territories",
  "union",
  "commonwealth",
  "federation",
  "democratic",
  "arab",
  "central",
  "north",
  "south",
  "east",
  "west",
  "new",
  "the",
  "of",
  "and",
  "united",
]);

const EXPLICIT_ALIASES: Record<string, string[]> = {
  US: ["united states", "united states of america", "america", "american", "usa"],
  GB: ["united kingdom", "britain", "british", "great britain", "england", "scotland", "wales"],
  AE: ["united arab emirates", "uae"],
  NL: ["netherlands", "holland"],
  KR: ["south korea", "republic of korea"],
  KP: ["north korea", "democratic people's republic of korea"],
  CI: ["ivory coast", "cote d'ivoire"],
  MM: ["myanmar", "burma"],
  SZ: ["eswatini", "swaziland"],
  CV: ["cape verde", "cabo verde"],
  TL: ["east timor", "timor-leste"],
  VA: ["vatican city", "vatican", "holy see"],
  CZ: ["czechia", "czech republic"],
  RU: ["russia", "russian federation"],
  PS: ["palestine", "palestinian territories"],
  TW: ["taiwan"],
  HK: ["hong kong"],
  MO: ["macau", "macao"],
  XK: ["kosovo"],
  CD: ["democratic republic of the congo", "dr congo", "drc"],
  CG: ["republic of the congo", "congo-brazzaville"],
};

const HISTORICAL_COUNTRIES: CountryEntry[] = [
  { code: "XSU", name: "Soviet Union", aliases: ["soviet union", "ussr", "soviet"] },
  { code: "XYU", name: "Yugoslavia", aliases: ["yugoslavia", "yugoslav"] },
  { code: "XCS", name: "Czechoslovakia", aliases: ["czechoslovakia", "czechoslovak"] },
  { code: "XOT", name: "Ottoman Empire", aliases: ["ottoman empire", "ottoman"] },
  { code: "XRM", name: "Roman Empire", aliases: ["roman empire", "ancient rome"] },
  { code: "XBY", name: "Byzantine Empire", aliases: ["byzantine empire", "byzantium"] },
  { code: "XBE", name: "British Empire", aliases: ["british empire", "british raj"] },
  { code: "XNG", name: "Nazi Germany", aliases: ["nazi germany", "third reich"] },
  { code: "XWR", name: "Weimar Republic", aliases: ["weimar republic"] },
  { code: "XDD", name: "East Germany", aliases: ["east germany", "german democratic republic"] },
  { code: "XWD", name: "West Germany", aliases: ["west germany", "federal republic of germany"] },
  { code: "XAH", name: "Austria-Hungary", aliases: ["austria-hungary", "austro-hungarian"] },
  { code: "XRE", name: "Russian Empire", aliases: ["russian empire", "imperial russia"] },
  { code: "XPR", name: "Prussia", aliases: ["prussia", "prussian"] },
  { code: "XQD", name: "Qing dynasty", aliases: ["qing dynasty", "qing china"] },
  { code: "XME", name: "Mughal Empire", aliases: ["mughal empire", "mughal"] },
  { code: "XPE", name: "Persian Empire", aliases: ["persian empire", "achaemenid"] },
  { code: "XMC", name: "Ancient Macedon", aliases: ["macedon", "macedonian empire"] },
  { code: "XEG", name: "Ancient Egypt", aliases: ["ancient egypt", "egyptian empire"] },
  { code: "XGR", name: "Ancient Greece", aliases: ["ancient greece", "greek city-state"] },
  { code: "XCA", name: "Carthage", aliases: ["carthage", "carthaginian"] },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildModernEntries(): CountryEntry[] {
  return worldCountries.map((country) => {
    const aliases = [
      country.name.common,
      country.name.official,
      ...country.altSpellings,
      country.demonyms?.eng?.m,
      country.demonyms?.eng?.f,
      ...(EXPLICIT_ALIASES[country.cca2] ?? []),
    ];
    return {
      code: country.cca2,
      name: country.name.common,
      aliases,
      priority: country.unMember ? 0 : country.independent ? 1 : 2,
    };
  });
}

function buildIndex(entries: CountryEntry[]) {
  const byAlias = new Map<string, Array<CountryRef & { priority: number }>>();

  for (const entry of entries) {
    for (const raw of entry.aliases) {
      if (!raw) continue;
      const alias = normalize(raw);
      if (alias.length < 3) continue;
      if (GENERIC_ALIASES.has(alias)) continue;
      if (/^\d+$/.test(alias)) continue;
      const existing = byAlias.get(alias) ?? [];
      if (!existing.some((item) => item.code === entry.code)) {
        existing.push({ code: entry.code, name: entry.name, priority: entry.priority ?? 0 });
      }
      byAlias.set(alias, existing);
    }
  }

  const index: Array<CountryRef & { needle: string }> = [];
  for (const [alias, refs] of byAlias) {
    const winner = [...refs].sort((a, b) => a.priority - b.priority)[0];
    index.push({ code: winner.code, name: winner.name, needle: ` ${alias} ` });
  }
  index.sort((a, b) => b.needle.length - a.needle.length);
  return index;
}

const ENTRIES = [...buildModernEntries(), ...HISTORICAL_COUNTRIES];
const ALIAS_INDEX = buildIndex(ENTRIES);

export const COUNTRY_OPTIONS: CountryRef[] = ENTRIES.map(({ code, name }) => ({
  code,
  name,
})).sort((a, b) => a.name.localeCompare(b.name));

const BY_CODE = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country]));

export function countryName(code: string): string {
  return BY_CODE.get(code)?.name ?? code;
}

export function findCountry(value: string): CountryRef | null {
  const alias = normalize(value);
  if (!alias) return null;
  const direct = ALIAS_INDEX.find((entry) => entry.needle === ` ${alias} `);
  if (direct) return { code: direct.code, name: direct.name };
  return null;
}

const ACRONYMS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /\bU\.?S\.?A?\b/, code: "US" },
  { pattern: /\bU\.?K\.?\b/, code: "GB" },
  { pattern: /\bUAE\b/, code: "AE" },
];

export function inferCountries(value: string, limit = 3): CountryRef[] {
  const haystack = ` ${normalize(value)} `;
  if (haystack.trim().length < 3) return [];

  const matches: Array<CountryRef & { start: number; end: number }> = [];

  for (const entry of ALIAS_INDEX) {
    let cursor = 0;
    while (cursor < haystack.length) {
      const start = haystack.indexOf(entry.needle, cursor);
      if (start === -1) break;
      matches.push({
        code: entry.code,
        name: entry.name,
        start,
        end: start + entry.needle.length,
      });
      cursor = start + 1;
    }
  }

  matches.sort(
    (a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start,
  );

  const selected: CountryRef[] = [];
  const used: Array<{ start: number; end: number }> = [];

  for (const acronym of ACRONYMS) {
    if (!acronym.pattern.test(value)) continue;
    const country = BY_CODE.get(acronym.code);
    if (country && !selected.some((item) => item.code === country.code)) {
      selected.push(country);
    }
  }

  for (const match of matches) {
    if (used.some((span) => match.start < span.end && match.end > span.start)) {
      continue;
    }
    if (selected.some((country) => country.code === match.code)) continue;
    selected.push({ code: match.code, name: match.name });
    used.push({ start: match.start, end: match.end });
    if (selected.length >= limit) break;
  }

  return selected;
}
