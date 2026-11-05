import { sqlite } from "@/db";
import {
  BIAS_ORDER,
  normalizeBias,
  type Bias,
  type Confidence,
} from "@/lib/source-ratings";
import { getStories, type StoryWithSources } from "./queries";

export type SourceRatingView = {
  sourceId: string;
  sourceName: string;
  bias: Bias;
  biasScore: number | null;
  confidence: Confidence;
  ownership: string | null;
  ownershipType: string | null;
  countryCode: string | null;
  paywall: boolean;
  sourceType: string | null;
  provider: string;
  providerUrl: string | null;
  license: string | null;
  notes: string | null;
  updatedAt: number;
};

export type CoverageSource = {
  sourceId: string;
  sourceName: string;
  bias: Bias;
  articleCount: number;
};

export type BiasCounts = Record<Bias, number>;

export type StoryCoverage = {
  storyId: number;
  totalSources: number;
  ratedSources: number;
  unratedSources: number;
  counts: BiasCounts;
  shares: BiasCounts;
  ratedShares: BiasCounts;
  blindspot: "left" | "right" | null;
  sources: CoverageSource[];
};

export type BlindspotStory = {
  story: StoryWithSources;
  coverage: StoryCoverage;
};

export type BiasTally = {
  counts: BiasCounts;
  shares: BiasCounts;
  total: number;
};

export type MyBias = {
  read: BiasTally;
  saved: BiasTally;
  available: BiasTally;
  readArticles: number;
  savedArticles: number;
  availableArticles: number;
};

const MIN_RATED_SOURCES = 3;
const MIN_OPPOSITE_SOURCES = 2;
const OPPOSITE_SHARE = 66;
const SAME_SIDE_MAX_SHARE = 25;

type SourceRow = {
  source_id: string;
  source_name: string;
  bias: string | null;
  bias_score: number | null;
  confidence: string | null;
  ownership: string | null;
  ownership_type: string | null;
  country_code: string | null;
  paywall: number;
  source_type: string | null;
  provider: string | null;
  provider_url: string | null;
  license: string | null;
  notes: string | null;
  updated_at: number;
};

type CoverageRow = {
  story_id: number;
  source_id: string;
  source_name: string;
  bias: string | null;
  article_count: number;
};

function emptyCounts(): BiasCounts {
  return {
    left: 0,
    "lean-left": 0,
    center: 0,
    "lean-right": 0,
    right: 0,
    unrated: 0,
  };
}

function sharesOf(counts: BiasCounts, total: number): BiasCounts {
  const shares = emptyCounts();
  if (total <= 0) return shares;
  for (const bias of BIAS_ORDER) {
    shares[bias] = Math.round((counts[bias] / total) * 100);
  }
  return shares;
}

function detectBlindspot(
  counts: BiasCounts,
  ratedSources: number,
): "left" | "right" | null {
  if (ratedSources < MIN_RATED_SOURCES) return null;

  const left = counts.left + counts["lean-left"];
  const right = counts.right + counts["lean-right"];
  const leftShare = (left / ratedSources) * 100;
  const rightShare = (right / ratedSources) * 100;

  if (
    leftShare <= SAME_SIDE_MAX_SHARE &&
    rightShare >= OPPOSITE_SHARE &&
    right >= MIN_OPPOSITE_SOURCES
  ) {
    return "left";
  }
  if (
    rightShare <= SAME_SIDE_MAX_SHARE &&
    leftShare >= OPPOSITE_SHARE &&
    left >= MIN_OPPOSITE_SOURCES
  ) {
    return "right";
  }
  return null;
}

function buildCoverage(
  storyId: number,
  rows: CoverageRow[],
): StoryCoverage {
  const counts = emptyCounts();
  const sources: CoverageSource[] = rows.map((row) => {
    const bias = normalizeBias(row.bias);
    counts[bias] += 1;
    return {
      sourceId: row.source_id,
      sourceName: row.source_name,
      bias,
      articleCount: row.article_count,
    };
  });

  sources.sort(
    (a, b) =>
      BIAS_ORDER.indexOf(a.bias) - BIAS_ORDER.indexOf(b.bias) ||
      a.sourceName.localeCompare(b.sourceName),
  );

  const totalSources = sources.length;
  const unratedSources = counts.unrated;
  const ratedSources = totalSources - unratedSources;

  return {
    storyId,
    totalSources,
    ratedSources,
    unratedSources,
    counts,
    shares: sharesOf(counts, totalSources),
    ratedShares: sharesOf(counts, ratedSources),
    blindspot: detectBlindspot(counts, ratedSources),
    sources,
  };
}

export function getSourceRatings(): SourceRatingView[] {
  const rows = sqlite
    .prepare(
      `SELECT so.id AS source_id, so.name AS source_name,
              sr.bias, sr.bias_score, sr.confidence, sr.ownership,
              sr.ownership_type, sr.country_code, sr.paywall, sr.source_type,
              sr.provider, sr.provider_url, sr.license, sr.notes, sr.updated_at
       FROM sources so
       LEFT JOIN source_ratings sr ON sr.source_id = so.id
       ORDER BY so.name`,
    )
    .all() as SourceRow[];

  return rows.map((row) => ({
    sourceId: row.source_id,
    sourceName: row.source_name,
    bias: normalizeBias(row.bias),
    biasScore: row.bias_score,
    confidence: (row.confidence ?? "none") as Confidence,
    ownership: row.ownership,
    ownershipType: row.ownership_type,
    countryCode: row.country_code,
    paywall: Boolean(row.paywall),
    sourceType: row.source_type,
    provider: row.provider ?? "AllSides",
    providerUrl: row.provider_url,
    license: row.license,
    notes: row.notes,
    updatedAt: row.updated_at,
  }));
}

export function getStoryCoverage(storyId: number): StoryCoverage | null {
  const rows = sqlite
    .prepare(
      `SELECT a.story_id, so.id AS source_id, so.name AS source_name,
              COALESCE(sr.bias, 'unrated') AS bias, COUNT(a.id) AS article_count
       FROM articles a
       JOIN sources so ON so.id = a.source_id
       LEFT JOIN source_ratings sr ON sr.source_id = so.id
       WHERE a.story_id = ? AND a.hidden = 0
       GROUP BY a.story_id, so.id`,
    )
    .all(storyId) as CoverageRow[];

  if (!rows.length) return null;
  return buildCoverage(storyId, rows);
}

export function getCoverageForStories(
  storyIds: number[],
): Map<number, StoryCoverage> {
  const result = new Map<number, StoryCoverage>();
  if (!storyIds.length) return result;

  const placeholders = storyIds.map(() => "?").join(", ");
  const rows = sqlite
    .prepare(
      `SELECT a.story_id, so.id AS source_id, so.name AS source_name,
              COALESCE(sr.bias, 'unrated') AS bias, COUNT(a.id) AS article_count
       FROM articles a
       JOIN sources so ON so.id = a.source_id
       LEFT JOIN source_ratings sr ON sr.source_id = so.id
       WHERE a.story_id IN (${placeholders}) AND a.hidden = 0
       GROUP BY a.story_id, so.id`,
    )
    .all(...storyIds) as CoverageRow[];

  const grouped = new Map<number, CoverageRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.story_id) ?? [];
    list.push(row);
    grouped.set(row.story_id, list);
  }

  for (const [storyId, list] of grouped) {
    result.set(storyId, buildCoverage(storyId, list));
  }

  return result;
}

export function getBlindspotStories(options: {
  side?: "left" | "right";
  limit?: number;
  since?: number;
} = {}): BlindspotStory[] {
  const stories = getStories({
    since: options.since ?? Date.now() - 30 * 86_400_000,
    limit: options.limit ?? 250,
  });
  const coverage = getCoverageForStories(stories.map((story) => story.id));

  return stories
    .map((story) => ({ story, coverage: coverage.get(story.id) }))
    .filter(
      (entry): entry is BlindspotStory =>
        Boolean(entry.coverage?.blindspot) &&
        (!options.side || entry.coverage?.blindspot === options.side),
    )
    .sort((a, b) => b.story.lastSeen - a.story.lastSeen);
}

function tally(counts: BiasCounts): BiasTally {
  const total = BIAS_ORDER.reduce((sum, bias) => sum + counts[bias], 0);
  return { counts, shares: sharesOf(counts, total), total };
}

function getBiasCounts(where: string): BiasCounts {
  const rows = sqlite
    .prepare(
      `SELECT COALESCE(sr.bias, 'unrated') AS bias, COUNT(*) AS count
       FROM articles a
       JOIN sources so ON so.id = a.source_id
       LEFT JOIN source_ratings sr ON sr.source_id = so.id
       WHERE ${where}
       GROUP BY bias`,
    )
    .all() as Array<{ bias: string | null; count: number }>;

  const counts = emptyCounts();
  for (const row of rows) {
    counts[normalizeBias(row.bias)] += row.count;
  }
  return counts;
}

export function getMyBias(): MyBias {
  const available = tally(getBiasCounts("a.hidden = 0"));
  const read = tally(getBiasCounts("a.hidden = 0 AND a.read_at IS NOT NULL"));
  const saved = tally(getBiasCounts("a.hidden = 0 AND a.saved_at IS NOT NULL"));

  return {
    read,
    saved,
    available,
    readArticles: read.total,
    savedArticles: saved.total,
    availableArticles: available.total,
  };
}
