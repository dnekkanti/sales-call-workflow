import type { RunState, StepEvent, StepId } from "./types";

/** Calls one workflow step and forwards its server-sent events as they arrive. */
export async function runStep(step: StepId, state: RunState, onEvent: (e: StepEvent) => void): Promise<void> {
  const res = await fetch("/api/step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      step,
      setup: state.setup,
      results: state.results,
      sources: state.sources,
      callNotes: state.callNotes,
      today: new Date().toISOString().slice(0, 10),
    }),
  });
  if (!res.ok || !res.body) {
    onEvent({ type: "error", message: `Request failed (${res.status}): ${await res.text()}` });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let gotTerminal = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const event = JSON.parse(line.slice(6)) as StepEvent;
      if (event.type === "result" || event.type === "error") gotTerminal = true;
      onEvent(event);
    }
  }
  if (!gotTerminal) onEvent({ type: "error", message: "Connection closed before the step finished (server timeout?)." });
}
