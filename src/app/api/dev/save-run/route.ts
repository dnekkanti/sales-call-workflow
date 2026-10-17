import { writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

// Dev-only: saves the current run as public/sample-run.json so "Load saved run" can replay it
// instantly during a demo. Disabled in production builds.
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not available in production", { status: 404 });
  const body = await request.text();
  JSON.parse(body); // reject anything that is not valid JSON
  await writeFile(path.join(process.cwd(), "public", "sample-run.json"), body);
  return Response.json({ ok: true, bytes: body.length });
}
