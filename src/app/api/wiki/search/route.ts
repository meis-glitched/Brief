import { searchWiki } from "@/lib/wiki";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    20,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "8", 10) || 8),
  );
  if (query.length < 2) return Response.json({ results: [] });
  try {
    const results = await searchWiki(query, limit);
    return Response.json({ results });
  } catch (error) {
    logError("api.wiki.search", "Wikipedia search API failed", error, { query });
    return Response.json({ results: [] });
  }
}
