export const BIAS_ORDER = [
  "left",
  "lean-left",
  "center",
  "lean-right",
  "right",
  "unrated",
] as const;

export type Bias = (typeof BIAS_ORDER)[number];

export type Confidence = "high" | "medium" | "low" | "none";

export type OwnershipType =
  | "public-company"
  | "private"
  | "nonprofit"
  | "public-broadcaster"
  | "state"
  | "community";

export type SourceType =
  | "news"
  | "wire"
  | "tech"
  | "public-broadcaster"
  | "community";

export type SourceRatingSeed = {
  sourceId: string;
  bias: Bias;
  biasScore: number | null;
  confidence: Confidence;
  ownership: string;
  ownershipType: OwnershipType;
  countryCode: string;
  paywall: boolean;
  sourceType: SourceType;
  providerUrl: string | null;
  notes?: string;
};

export const BIAS_META: Record<
  Bias,
  { label: string; short: string; className: string; barClassName: string }
> = {
  left: {
    label: "Left",
    short: "L",
    className:
      "border-[#315b7d]/25 bg-[#315b7d]/10 text-[#315b7d] dark:border-[#8fb7d8]/25 dark:bg-[#8fb7d8]/15 dark:text-[#a9c9e4]",
    barClassName: "bg-[#315b7d] dark:bg-[#8fb7d8]",
  },
  "lean-left": {
    label: "Lean left",
    short: "LL",
    className:
      "border-[#5c7f9e]/25 bg-[#5c7f9e]/10 text-[#4a6b88] dark:border-[#8fb2cc]/25 dark:bg-[#8fb2cc]/15 dark:text-[#a9c6dc]",
    barClassName: "bg-[#6d8fae] dark:bg-[#8fb2cc]",
  },
  center: {
    label: "Center",
    short: "C",
    className:
      "border-[#8b7f6a]/25 bg-[#8b7f6a]/10 text-[#6d6251] dark:border-[#c7b89f]/25 dark:bg-[#c7b89f]/15 dark:text-[#d7c8ae]",
    barClassName: "bg-[#8b7f6a] dark:bg-[#c7b89f]",
  },
  "lean-right": {
    label: "Lean right",
    short: "LR",
    className:
      "border-[#a3743f]/25 bg-[#a3743f]/10 text-[#8a5e2e] dark:border-[#d3a36c]/25 dark:bg-[#d3a36c]/15 dark:text-[#e1bb8a]",
    barClassName: "bg-[#a3743f] dark:bg-[#d3a36c]",
  },
  right: {
    label: "Right",
    short: "R",
    className:
      "border-[#a8422e]/25 bg-[#a8422e]/10 text-[#943826] dark:border-[#e08a6f]/25 dark:bg-[#e08a6f]/15 dark:text-[#eaa78f]",
    barClassName: "bg-[#a8422e] dark:bg-[#e08a6f]",
  },
  unrated: {
    label: "Unrated",
    short: "—",
    className: "border-line bg-paper-deep text-muted",
    barClassName: "bg-line",
  },
};

export function isBias(value: string | null | undefined): value is Bias {
  return BIAS_ORDER.includes((value ?? "") as Bias);
}

export function normalizeBias(value: string | null | undefined): Bias {
  return isBias(value) ? value : "unrated";
}

export function biasFromScore(score: number | null | undefined): Bias {
  if (score === null || score === undefined) return "unrated";
  if (score <= -3) return "left";
  if (score < -1) return "lean-left";
  if (score <= 1) return "center";
  if (score < 3) return "lean-right";
  return "right";
}

export const SOURCE_RATINGS: SourceRatingSeed[] = [
  {
    sourceId: "bbc",
    bias: "center",
    biasScore: -0.8,
    confidence: "medium",
    ownership: "BBC",
    ownershipType: "public-broadcaster",
    countryCode: "GB",
    paywall: false,
    sourceType: "public-broadcaster",
    providerUrl: "https://www.allsides.com/news-source/bbc-news-media-bias",
  },
  {
    sourceId: "reuters",
    bias: "center",
    biasScore: -0.78,
    confidence: "high",
    ownership: "Thomson Reuters",
    ownershipType: "public-company",
    countryCode: "GB",
    paywall: false,
    sourceType: "wire",
    providerUrl: "https://www.allsides.com/news-source/reuters-media-bias",
  },
  {
    sourceId: "hn",
    bias: "unrated",
    biasScore: null,
    confidence: "none",
    ownership: "Y Combinator",
    ownershipType: "private",
    countryCode: "US",
    paywall: false,
    sourceType: "community",
    providerUrl: null,
    notes: "Community forum; no AllSides outlet rating.",
  },
  {
    sourceId: "nyt",
    bias: "lean-left",
    biasScore: -2.2,
    confidence: "high",
    ownership: "The New York Times Company",
    ownershipType: "public-company",
    countryCode: "US",
    paywall: true,
    sourceType: "news",
    providerUrl:
      "https://www.allsides.com/news-source/new-york-times-news-media-bias",
  },
  {
    sourceId: "aljazeera",
    bias: "lean-left",
    biasScore: -2.3,
    confidence: "low",
    ownership: "Al Jazeera Media Network",
    ownershipType: "state",
    countryCode: "QA",
    paywall: false,
    sourceType: "news",
    providerUrl:
      "https://www.allsides.com/news-source/al-jazeera-media-bias",
  },
  {
    sourceId: "hindustantimes",
    bias: "center",
    biasScore: null,
    confidence: "low",
    ownership: "HT Media",
    ownershipType: "public-company",
    countryCode: "IN",
    paywall: false,
    sourceType: "news",
    providerUrl:
      "https://www.allsides.com/news-source/hindustan-times-media-bias",
  },
  {
    sourceId: "guardian",
    bias: "left",
    biasScore: -3.5,
    confidence: "low",
    ownership: "Scott Trust",
    ownershipType: "nonprofit",
    countryCode: "GB",
    paywall: false,
    sourceType: "news",
    providerUrl: "https://www.allsides.com/news-source/guardian-media-bias",
  },
  {
    sourceId: "thehindu",
    bias: "unrated",
    biasScore: null,
    confidence: "none",
    ownership: "The Hindu Group",
    ownershipType: "private",
    countryCode: "IN",
    paywall: true,
    sourceType: "news",
    providerUrl: null,
    notes: "No AllSides outlet rating found.",
  },
  {
    sourceId: "toi",
    bias: "unrated",
    biasScore: null,
    confidence: "none",
    ownership: "The Times Group",
    ownershipType: "private",
    countryCode: "IN",
    paywall: false,
    sourceType: "news",
    providerUrl: null,
    notes: "No AllSides outlet rating found.",
  },
  {
    sourceId: "cnn",
    bias: "lean-left",
    biasScore: -1.3,
    confidence: "high",
    ownership: "Warner Bros. Discovery",
    ownershipType: "public-company",
    countryCode: "US",
    paywall: false,
    sourceType: "news",
    providerUrl: "https://www.allsides.com/news-source/cnn-media-bias",
  },
  {
    sourceId: "ars",
    bias: "center",
    biasScore: null,
    confidence: "low",
    ownership: "Condé Nast",
    ownershipType: "private",
    countryCode: "US",
    paywall: false,
    sourceType: "tech",
    providerUrl:
      "https://www.allsides.com/news-source/ars-technica-media-bias",
  },
  {
    sourceId: "verge",
    bias: "lean-left",
    biasScore: -2,
    confidence: "low",
    ownership: "Vox Media",
    ownershipType: "private",
    countryCode: "US",
    paywall: false,
    sourceType: "tech",
    providerUrl: "https://www.allsides.com/news-source/verge-media-bias",
  },
  {
    sourceId: "npr",
    bias: "lean-left",
    biasScore: -1.88,
    confidence: "medium",
    ownership: "NPR",
    ownershipType: "nonprofit",
    countryCode: "US",
    paywall: false,
    sourceType: "public-broadcaster",
    providerUrl: "https://www.allsides.com/news-source/npr-media-bias",
  },
];

export const SOURCE_RATINGS_BY_ID = new Map(
  SOURCE_RATINGS.map((rating) => [rating.sourceId, rating]),
);
