import { getLastRun, getStats } from "@/db/queries";
import { logError } from "@/lib/logger";
import { databasePath } from "@/lib/storage";

export async function GET() {
  try {
    const [stats, lastRun] = await Promise.all([getStats(), getLastRun()]);
    const dbPath = databasePath();
    const usingTurso = Boolean(process.env.TURSO_DATABASE_URL);
    const serverless = process.env.VERCEL === "1" || process.env.NOW_REGION !== undefined;
    const ephemeralLocalDb = serverless && !usingTurso;
    const hasFeeds = stats.articles > 0 || Boolean(lastRun);
    const historyHint = "History is empty until you run npm run import:history.";

    return Response.json({
      status: "ok",
      stats,
      lastRun,
      storage: {
        persistent: usingTurso || !serverless,
        usingTurso,
        serverless,
        ephemeralLocalDb,
        databasePath: dbPath,
        imageCacheLocal: true,
      },
      capabilities: {
        briefs: {
          configured: Boolean(process.env.OLLAMA_URL ?? "http://127.0.0.1:11434"),
          ollamaUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
          model: process.env.OLLAMA_MODEL ?? "dolphin3:8b",
          fallback: "deterministic summary when Ollama is unavailable or slow",
        },
        ingest: {
          hasFeeds,
          hint: hasFeeds ? null : "Run npm run ingest or POST /api/ingest to populate the desk.",
        },
        history: {
          hint: historyHint,
        },
      },
      warnings: [
        ...(ephemeralLocalDb
          ? ["Local SQLite is ephemeral on this serverless runtime. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for persistence."]
          : []),
        ...(serverless ? ["Proxied image cache uses local storage and may not persist across instances."] : []),
      ],
      time: Date.now(),
    });
  } catch (error) {
    logError("api.health", "Health check failed", error);
    return Response.json({ status: "error", time: Date.now() }, { status: 500 });
  }
}
