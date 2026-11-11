"use server";

import { revalidatePath } from "next/cache";
import { sqlite } from "@/db";
import { generateBrief } from "@/lib/brief";
import { runIngest, type IngestResult } from "@/lib/ingest/run";
import { logError } from "@/lib/logger";

export async function ingestNow(): Promise<IngestResult> {
  try {
    const result = await runIngest();
    revalidatePath("/", "layout");
    return result;
  } catch (error) {
    logError("actions.ingest", "Ingest failed", error);
    throw error;
  }
}

export async function refreshBrief(): Promise<{
  content: string;
  model: string;
  createdAt: number;
  fallback: boolean;
}> {
  try {
    const result = await generateBrief({ force: true });
    revalidatePath("/", "layout");
    return result;
  } catch (error) {
    logError("actions.brief", "Brief refresh failed", error);
    throw error;
  }
}

export async function setArticleRead(id: number, read: boolean): Promise<void> {
  await sqlite.run(
    "UPDATE articles SET read_at = ? WHERE id = ?",
    read ? Date.now() : null,
    id,
  );
  revalidatePath("/", "layout");
}

export async function toggleArticleSaved(id: number): Promise<boolean> {
  const row = await sqlite.get<{ saved_at: number | null }>(
    "SELECT saved_at FROM articles WHERE id = ?",
    id,
  );
  const saved = row?.saved_at == null;
  await sqlite.run(
    "UPDATE articles SET saved_at = ? WHERE id = ?",
    saved ? Date.now() : null,
    id,
  );
  revalidatePath("/", "layout");
  return saved;
}

export async function hideArticle(id: number): Promise<void> {
  await sqlite.run("UPDATE articles SET hidden = 1 WHERE id = ?", id);
  revalidatePath("/", "layout");
}

export async function markAllRead(): Promise<void> {
  await sqlite.run(
    "UPDATE articles SET read_at = ? WHERE read_at IS NULL AND hidden = 0",
    Date.now(),
  );
  revalidatePath("/", "layout");
}

export async function toggleSource(id: string): Promise<boolean> {
  const row = await sqlite.get<{ enabled: number }>(
    "SELECT enabled FROM sources WHERE id = ?",
    id,
  );
  if (!row) return false;
  const enabled = row.enabled ? 0 : 1;
  await sqlite.run("UPDATE sources SET enabled = ? WHERE id = ?", enabled, id);
  revalidatePath("/", "layout");
  return Boolean(enabled);
}
