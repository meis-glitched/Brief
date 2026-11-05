import { getLastRun, getStats } from "@/db/queries";

export async function GET() {
  return Response.json({
    status: "ok",
    stats: getStats(),
    lastRun: getLastRun(),
    time: Date.now(),
  });
}
