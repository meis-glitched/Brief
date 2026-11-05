import { loadWikiPage } from "@/lib/wiki";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  if (!title) return Response.json({ error: "Missing title" }, { status: 400 });
  const page = await loadWikiPage(title, {
    force: searchParams.get("refresh") === "1",
  });
  if (!page) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ page });
}
