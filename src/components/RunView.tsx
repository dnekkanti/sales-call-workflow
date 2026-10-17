"use client";

import type { RunState, StepId } from "@/lib/types";
import { AgentCard } from "./AgentCard";
import { Button, Card } from "./ui";

export const AGENTS: Record<Exclude<StepId, "debrief">, { title: string; description: string; tools: string }> = {
  profile: {
    title: "Prospect research",
    description: "Financials, strategy, legal function, litigation, AI posture and trigger events from filings and news.",
    tools: "Claude + web search",
  },
  buyers: {
    title: "Buyer ecosystem map",
    description: "Names and verifies legal, IT, security, finance and procurement stakeholders and their buying roles.",
    tools: "Claude + web search",
  },
  competitive: {
    title: "Competitive & objections",
    description: "Pricing signals, incumbent tools, competitor battlecard and objection handling with SPIN reframes.",
    tools: "Claude + web search",
  },
  revenue: {
    title: "Account revenue model",
    description: "Bottoms-up seat model with adoption ramp, pricing, discount and expansion paths.",
    tools: "Claude reasoning",
  },
  playbook: {
    title: "SPIN playbook & roadmap",
    description: "Buying-process roadmap, SPIN question bank per stakeholder, call agenda and objectives.",
    tools: "Claude reasoning",
  },
  factcheck: {
    title: "Independent fact-check",
    description: "Re-opens cited pages to verify key claims and lists where this workflow can fail.",
    tools: "Claude + web fetch",
  },
};

const STAGES: { label: string; steps: Exclude<StepId, "debrief">[] }[] = [
  { label: "1 · Research the account", steps: ["profile"] },
  { label: "2 · Map buyers and competition (parallel)", steps: ["buyers", "competitive"] },
  { label: "3 · Model, plan and verify (parallel)", steps: ["revenue", "playbook", "factcheck"] },
];

export function RunView({
  state,
  running,
  onRunAll,
  onRunStep,
  onOpenMemo,
}: {
  state: RunState;
  running: boolean;
  onRunAll: () => void;
  onRunStep: (s: StepId) => void;
  onOpenMemo: () => void;
}) {
  const allDone = STAGES.every((st) => st.steps.every((s) => state.meta[s]?.status === "done"));
  const cost = STAGES.flatMap((s) => s.steps).reduce((sum, s) => sum + (state.meta[s]?.costUsd ?? 0), 0);

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Pre-call workflow</div>
          <h1 className="text-xl font-semibold text-slate-900">
            {state.setup.seller} → {state.setup.prospect}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Six Claude agents run in three stages. Each one plans its own searches, reads sources and returns structured, cited output.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {cost > 0 && <span className="text-xs tabular-nums text-slate-500">Est. compute cost ${cost.toFixed(2)}</span>}
          {allDone && !running && (
            <Button variant="secondary" onClick={onOpenMemo}>
              Open memo →
            </Button>
          )}
          <Button onClick={onRunAll} disabled={running}>
            {running ? "Running…" : allDone ? "Run again" : "Run pre-call workflow"}
          </Button>
        </div>
      </Card>

      {STAGES.map((stage) => (
        <div key={stage.label}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{stage.label}</div>
          <div className={`grid gap-4 ${stage.steps.length === 1 ? "md:grid-cols-1" : stage.steps.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {stage.steps.map((s) => (
              <AgentCard key={s} {...AGENTS[s]} meta={state.meta[s]} onRun={() => onRunStep(s)} disabled={running} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
