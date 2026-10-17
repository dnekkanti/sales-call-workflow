"use client";

import { SAMPLE_CALL_NOTES } from "@/lib/defaults";
import type { RunState } from "@/lib/types";
import { AgentCard } from "./AgentCard";
import { Badge, Button, Card, Section, Stat } from "./ui";

export function DebriefView({
  state,
  running,
  onNotes,
  onCallDate,
  onRun,
  onOpenCollateral,
}: {
  state: RunState;
  running: boolean;
  onNotes: (s: string) => void;
  onCallDate: (s: string) => void;
  onRun: () => void;
  onOpenCollateral: () => void;
}) {
  const d = state.results.debrief;
  const preCallReady = !!state.results.playbook;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Post-call input</div>
              <h1 className="text-xl font-semibold text-slate-900">Call notes or transcript</h1>
            </div>
            <Button variant="ghost" onClick={() => onNotes(SAMPLE_CALL_NOTES)}>
              Use simulated call notes
            </Button>
          </div>
          <textarea
            value={state.callNotes}
            onChange={(e) => onNotes(e.target.value)}
            placeholder="Paste your meeting notes, AI meeting summary or transcript here…"
            className="mt-3 h-80 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Call date
              <input
                type="date"
                value={state.callDate}
                onChange={(e) => onCallDate(e.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              />
            </label>
            <Button onClick={onRun} disabled={running || !state.callNotes.trim() || !preCallReady}>
              {running ? "Generating…" : "Generate collateral & follow-up"}
            </Button>
          </div>
          {!preCallReady && <p className="mt-2 text-xs text-amber-700">Run the pre-call workflow first. The debrief builds on that research.</p>}
        </Card>
        <div className="lg:col-span-2">
          <AgentCard
            title="Debrief agent"
            description="Maps what the buyer said to SPIN stages, pulls ROI inputs from the call, writes prospect collateral with an explicit CTA, and plans 30 days of follow-up."
            tools="Claude reasoning"
            meta={state.meta.debrief}
          />
        </div>
      </div>

      {d && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Call debrief</h2>
            <Button onClick={onOpenCollateral}>Open prospect collateral →</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Forecast stage" value={<span className="text-base">{d.forecast.stage}</span>} />
            <Stat label="Win probability" value={`${d.forecast.probability_pct}%`} />
            <Card className="p-3 text-xs text-slate-600">{d.forecast.rationale}</Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Summary">
              <Card className="p-4">
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                  {d.call_summary.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </Card>
            </Section>
            <Section title="Pains confirmed">
              <Card className="divide-y divide-slate-100">
                {d.pains_confirmed.map((p, i) => (
                  <div key={i} className="p-3 text-sm">
                    <div className="font-medium text-slate-900">{p.pain}</div>
                    <div className="text-xs text-slate-500">
                      {p.stakeholder}: {p.evidence}
                    </div>
                  </div>
                ))}
              </Card>
            </Section>
          </div>
          <Section kicker="Methodology" title="SPIN coverage scorecard">
            <div className="grid gap-3 md:grid-cols-4">
              {(["situation", "problem", "implication", "need_payoff"] as const).map((k) => (
                <Card key={k} className="p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k.replace("_", "-")}</div>
                  <p className="mt-1 text-sm text-slate-700">{d.spin_coverage[k]}</p>
                </Card>
              ))}
            </div>
            <Card className="mt-3 p-4">
              <div className="mb-1 text-sm font-semibold">Gaps to close on the next call</div>
              <div className="flex flex-wrap gap-1.5">
                {d.spin_coverage.gaps_to_close.map((g, i) => (
                  <Badge key={i} tone="amber">
                    {g}
                  </Badge>
                ))}
              </div>
            </Card>
          </Section>
          <Section title="Deal risk updates">
            <Card className="p-4">
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {d.deal_risk_updates.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </Card>
          </Section>
        </>
      )}
    </div>
  );
}
