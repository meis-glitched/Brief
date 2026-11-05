import { searchWiki } from "@/lib/wiki";

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
  const results = await searchWiki(query, limit);
  return Response.json({ results });
}
