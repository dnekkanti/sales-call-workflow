import Anthropic from "@anthropic-ai/sdk";
import { STEPS } from "@/lib/steps";
import type { StepEvent, StepRequest } from "@/lib/types";

export const runtime = "nodejs";
// Research steps with many searches can take a few minutes; each step is its own request.
export const maxDuration = 300;

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Invalid or missing ANTHROPIC_API_KEY.";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the Anthropic API. Wait a minute and retry.";
  if (err instanceof Anthropic.APIError) {
    const detail = (err.error as { error?: { message?: string } } | undefined)?.error?.message;
    return `Anthropic API error ${err.status}: ${detail ?? err.message}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function POST(request: Request) {
  const req = (await request.json()) as StepRequest;
  const run = STEPS[req.step];
  if (!run) return new Response(`Unknown step: ${req.step}`, { status: 400 });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const emit = (e: StepEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      // Keep the connection alive during long model calls that emit nothing.
      const heartbeat = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 15_000);
      try {
        const out = await run(req, emit);
        emit({ type: "result", data: out.data, sources: out.sources, costUsd: out.costUsd });
      } catch (err) {
        console.error(`[step ${req.step}]`, err);
        emit({ type: "error", message: describeError(err) });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
