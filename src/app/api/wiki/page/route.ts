import { loadWikiPage } from "@/lib/wiki";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  if (!title) return Response.json({ error: "Missing title" }, { status: 400 });
  try {
    const page = await loadWikiPage(title, {
      force: searchParams.get("refresh") === "1",
    });
    if (!page) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ page });
  } catch (error) {
    logError("api.wiki.page", "Failed to load wiki page", error, { title });
    return Response.json({ error: "Wikipedia unavailable" }, { status: 502 });
  }
}
