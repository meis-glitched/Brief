import { sqlite } from "@/db";
import { buildIdf, cosine, tokenize, vectorize } from "./utils";

type PendingArticle = {
  id: number;
  title: string;
  summary: string | null;
  published_at: number | null;
  fetched_at: number;
};

type MemberRow = { story_id: number; title: string };
type StoryRow = { id: number; title: string };

type StoryEntry = {
  vector: Map<string, number>;
  tokens: Set<string>;
};

const SIMILARITY_THRESHOLD = Number(
  process.env.BRIEF_CLUSTER_THRESHOLD ?? 0.42,
);
const MIN_SHARED_TOKENS = Number(process.env.BRIEF_CLUSTER_MIN_SHARED ?? 2);

export function assignStories(windowDays = 3): {
  assigned: number;
  created: number;
} {
  const since = Date.now() - windowDays * 86_400_000;

  const stories = sqlite
    .prepare("SELECT id, title FROM stories WHERE last_seen >= ?")
    .all(since) as StoryRow[];
  const members = sqlite
    .prepare(
      "SELECT story_id, title FROM articles WHERE story_id IS NOT NULL AND COALESCE(published_at, fetched_at) >= ?",
    )
    .all(since) as MemberRow[];

  const pending = sqlite
    .prepare(
      `SELECT id, title, summary, published_at, fetched_at
       FROM articles
       WHERE story_id IS NULL AND hidden = 0
         AND COALESCE(published_at, fetched_at) >= ?
       ORDER BY COALESCE(published_at, fetched_at) DESC
       LIMIT 1000`,
    )
    .all(since) as PendingArticle[];

  if (pending.length === 0) return { assigned: 0, created: 0 };

  const idf = buildIdf([
    ...stories.map((story) => story.title),
    ...members.map((member) => member.title),
    ...pending.map((article) => article.title),
  ]);

  const tokensByStory = new Map<number, StoryEntry[]>();
  const addEntry = (storyId: number, title: string) => {
    const entry = { vector: vectorize(title, idf), tokens: tokenize(title) };
    const existing = tokensByStory.get(storyId);
    if (existing) existing.push(entry);
    else tokensByStory.set(storyId, [entry]);
  };

  for (const story of stories) addEntry(story.id, story.title);
  for (const member of members) addEntry(member.story_id, member.title);

  const insertStory = sqlite.prepare(`
    INSERT INTO stories
      (title, summary, first_seen, last_seen, article_count, source_count, score, created_at)
    VALUES (?, ?, ?, ?, 0, 0, 0, ?)
  `);
  const assignArticle = sqlite.prepare(
    "UPDATE articles SET story_id = ? WHERE id = ?",
  );
  const touchStory = sqlite.prepare(
    "UPDATE stories SET last_seen = MAX(last_seen, ?) WHERE id = ?",
  );

  let assigned = 0;
  let created = 0;

  const run = sqlite.transaction(() => {
    for (const article of pending) {
      const vector = vectorize(article.title, idf);
      const tokens = tokenize(article.title);
      const timestamp = article.published_at ?? article.fetched_at;

      let bestId: number | null = null;
      let bestScore = 0;
      for (const [storyId, entries] of tokensByStory) {
        for (const entry of entries) {
          let shared = 0;
          for (const token of tokens) {
            if (entry.tokens.has(token)) shared += 1;
          }
          if (shared < MIN_SHARED_TOKENS) continue;
          const score = cosine(vector, entry.vector);
          if (score > bestScore) {
            bestScore = score;
            bestId = storyId;
          }
        }
      }

      if (bestId !== null && bestScore >= SIMILARITY_THRESHOLD) {
        assignArticle.run(bestId, article.id);
        touchStory.run(timestamp, bestId);
        addEntry(bestId, article.title);
        assigned += 1;
        continue;
      }

      const result = insertStory.run(
        article.title,
        article.summary,
        timestamp,
        timestamp,
        Date.now(),
      );
      const storyId = Number(result.lastInsertRowid);
      assignArticle.run(storyId, article.id);
      addEntry(storyId, article.title);
      created += 1;
    }

    sqlite.exec(`
      UPDATE stories SET
        article_count = (
          SELECT COUNT(*) FROM articles WHERE articles.story_id = stories.id
        ),
        source_count = (
          SELECT COUNT(DISTINCT source_id) FROM articles WHERE articles.story_id = stories.id
        ),
        first_seen = COALESCE((
          SELECT MIN(COALESCE(published_at, fetched_at))
          FROM articles WHERE articles.story_id = stories.id
        ), first_seen),
        last_seen = COALESCE((
          SELECT MAX(COALESCE(published_at, fetched_at))
          FROM articles WHERE articles.story_id = stories.id
        ), last_seen),
        score = (
          (SELECT COUNT(DISTINCT source_id) FROM articles WHERE articles.story_id = stories.id) * 10
        ) + (
          (SELECT COUNT(*) FROM articles WHERE articles.story_id = stories.id) * 2
        );

      DELETE FROM stories WHERE id NOT IN (
        SELECT DISTINCT story_id FROM articles WHERE story_id IS NOT NULL
      );
    `);
  });

  run();
  return { assigned, created };
}
