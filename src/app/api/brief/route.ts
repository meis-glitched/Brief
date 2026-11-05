import { generateBrief } from "@/lib/brief";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    force?: boolean;
  };
  const result = await generateBrief({ force: body.force });
  return Response.json(result);
}
