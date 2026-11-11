import { sqlite } from "@/db";
import { getBrief, getTodayStories } from "@/db/queries";
import { dayKey, formatTime } from "./format";
import { logWarn } from "./logger";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "dolphin3:8b";

export type BriefResult = {
  content: string;
  model: string;
  createdAt: number;
  fallback: boolean;
};

async function buildPrompt(): Promise<string> {
  const stories = await getTodayStories(8);
  const lines = stories.map((story, index) => {
    const sources = story.sourceNames ?? "unknown";
    return `${index + 1}. ${story.title}\n   Coverage: ${sources}\n   ${story.summary ?? ""}`;
  });

  return `You are the editor of a calm, intelligent daily news brief.

Write a brief for ${new Date().toDateString()} using only the stories below.
Rules:
- Open with one sentence that names the day's dominant thread.
- Then 4 to 6 short paragraphs, one per major story.
- Say what happened and why it matters. Be specific, no filler.
- Do not use markdown headings. Plain text only.
- Do not invent facts that are not in the story titles or summaries.
- End with a single line beginning "Worth watching:" followed by one story to follow.

Stories:
${lines.join("\n\n")}`;
}

async function fallbackBrief(): Promise<string> {
  const stories = await getTodayStories(8);
  if (stories.length === 0) {
    return "No stories have been ingested yet. Run a fetch to build today's brief.";
  }
  const lines = stories.map((story) => {
    const sources = story.sourceNames ?? "unknown sources";
    return `- ${story.title} (${sources})`;
  });
  return [
    "The local model did not answer in time, so here is the raw edit for now.",
    "",
    ...lines,
    "",
    "Worth watching: the story with the widest source spread above.",
  ].join("\n");
}

async function callOllama(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.4,
        num_predict: 320,
      },
    }),
    signal: AbortSignal.timeout(150_000),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  const payload = (await response.json()) as { response?: string };
  const text = payload.response?.trim();
  if (!text) throw new Error("Ollama returned an empty response");
  return text.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
}

export async function generateBrief(options: {
  date?: string;
  force?: boolean;
} = {}): Promise<BriefResult> {
  const date = options.date ?? dayKey();
  const existing = await getBrief(date);
  if (existing && !options.force) {
    return {
      content: existing.content,
      model: existing.model ?? "cached",
      createdAt: existing.createdAt,
      fallback: existing.model === "fallback",
    };
  }

  let content: string;
  let model = OLLAMA_MODEL;
  let fallback = false;

  try {
    content = await callOllama(await buildPrompt());
  } catch (error) {
    logWarn("brief", "Ollama brief generation failed, using fallback", { model: OLLAMA_MODEL, url: OLLAMA_URL, error: error instanceof Error ? error.message : String(error) });
    content = await fallbackBrief();
    model = "fallback";
    fallback = true;
  }

  const createdAt = Date.now();
  await sqlite.run(
    `INSERT INTO briefs (date, content, model, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       content = excluded.content,
       model = excluded.model,
       created_at = excluded.created_at`,
    date,
    content,
    model,
    createdAt,
  );

  return { content, model, createdAt, fallback };
}

export async function briefTimestamp(): Promise<string> {
  const brief = await getBrief();
  return brief ? formatTime(brief.createdAt) : "";
}
