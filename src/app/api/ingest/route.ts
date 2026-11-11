import { runIngest } from "@/lib/ingest/run";
import { logError } from "@/lib/logger";

export async function POST() {
  try {
    const result = await runIngest();
    return Response.json(result);
  } catch (error) {
    logError("api.ingest", "POST /api/ingest failed", error);
    return Response.json({ error: "Ingest failed" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json(
    { error: "Use POST to run an ingest." },
    { status: 405 },
  );
}
