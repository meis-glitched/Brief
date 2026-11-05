"use server";

import { revalidatePath } from "next/cache";
import { sqlite } from "@/db";
import { generateBrief } from "@/lib/brief";
import { runIngest, type IngestResult } from "@/lib/ingest/run";

export async function ingestNow(): Promise<IngestResult> {
  const result = await runIngest();
  revalidatePath("/", "layout");
  return result;
}

export async function refreshBrief(): Promise<{
  content: string;
  model: string;
  createdAt: number;
  fallback: boolean;
}> {
  const result = await generateBrief({ force: true });
  revalidatePath("/", "layout");
  return result;
}

export async function setArticleRead(id: number, read: boolean): Promise<void> {
  sqlite
    .prepare("UPDATE articles SET read_at = ? WHERE id = ?")
    .run(read ? Date.now() : null, id);
  revalidatePath("/", "layout");
}

export async function toggleArticleSaved(id: number): Promise<boolean> {
  const row = sqlite
    .prepare("SELECT saved_at FROM articles WHERE id = ?")
    .get(id) as { saved_at: number | null } | undefined;
  const saved = row?.saved_at == null;
  sqlite
    .prepare("UPDATE articles SET saved_at = ? WHERE id = ?")
    .run(saved ? Date.now() : null, id);
  revalidatePath("/", "layout");
  return saved;
}

export async function hideArticle(id: number): Promise<void> {
  sqlite.prepare("UPDATE articles SET hidden = 1 WHERE id = ?").run(id);
  revalidatePath("/", "layout");
}

export async function markAllRead(): Promise<void> {
  sqlite
    .prepare("UPDATE articles SET read_at = ? WHERE read_at IS NULL AND hidden = 0")
    .run(Date.now());
  revalidatePath("/", "layout");
}

export async function toggleSource(id: string): Promise<boolean> {
  const row = sqlite
    .prepare("SELECT enabled FROM sources WHERE id = ?")
    .get(id) as { enabled: number } | undefined;
  if (!row) return false;
  const enabled = row.enabled ? 0 : 1;
  sqlite.prepare("UPDATE sources SET enabled = ? WHERE id = ?").run(enabled, id);
  revalidatePath("/", "layout");
  return Boolean(enabled);
}
