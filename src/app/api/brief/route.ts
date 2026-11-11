import { generateBrief } from "@/lib/brief";
import { logError } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      force?: boolean;
    };
    const result = await generateBrief({ force: body.force });
    return Response.json(result);
  } catch (error) {
    logError("api.brief", "POST /api/brief failed", error);
    return Response.json({ error: "Brief generation failed" }, { status: 500 });
  }
}
