import { runIngest } from "@/lib/ingest/run";

export async function POST() {
  const result = await runIngest();
  return Response.json(result);
}

export async function GET() {
  return Response.json(
    { error: "Use POST to run an ingest." },
    { status: 405 },
  );
}
