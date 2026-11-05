import { search } from "@/db/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (!query) return Response.json({ results: [] });
  return Response.json({ results: search(query, 10) });
}
