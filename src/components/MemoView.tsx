"use client";

import type { Buyers } from "@/lib/schemas";
import { projectRevenue, usd } from "@/lib/finance";
import type { RunState } from "@/lib/types";
import { Badge, Button, Card, Cite, Confidence, Empty, Fact, Section, Stat, type Tone } from "./ui";

type Stakeholder = Buyers["stakeholders"][number];

const ROLE_ORDER: { key: Stakeholder["buying_role"]; label: string }[] = [
  { key: "economic_buyer", label: "Economic buyer" },
  { key: "champion", label: "Champion" },
  { key: "technical_evaluator", label: "Technical evaluator" },
  { key: "user_buyer", label: "User buyer" },
  { key: "influencer", label: "Influencer" },
  { key: "gatekeeper", label: "Gatekeeper" },
  { key: "blocker", label: "Potential blocker" },
];

const stageName = (s: string) => s.replace(/^stage\s*\d+\s*[—–:-]\s*/i, "");

const STANCE: Record<Stakeholder["likely_stance"], Tone> = { supporter: "green", neutral: "slate", skeptic: "red" };

const VERDICT: Record<string, { tone: Tone; label: string }> = {
  verified: { tone: "green", label: "Verified" },
  partially_verified: { tone: "amber", label: "Partly verified" },
  unverified: { tone: "slate", label: "Unverified" },
  contradicted: { tone: "red", label: "Contradicted" },
};

function StakeholderCard({ s }: { s: Stakeholder }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`text-sm font-semibold ${s.is_named ? "text-slate-900" : "italic text-slate-500"}`}>
            {s.name}
            <Cite ids={s.source_ids} />
          </div>
          <div className="text-xs text-slate-600">{s.title}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={STANCE[s.likely_stance]}>{s.likely_stance}</Badge>
          <span className="text-[10px] uppercase tracking-wide text-slate-400">{s.influence} influence</span>
        </div>
      </div>
      {s.reports_to && <div className="mt-1 text-[11px] text-slate-400">Reports to {s.reports_to}</div>}
      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
        {s.priorities.slice(0, 3).map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
      <div className="mt-2 rounded-md bg-indigo-50 px-2 py-1.5 text-xs text-indigo-900">
        <span className="font-medium">Message: </span>
        {s.what_they_need_to_hear}
      </div>
    </div>
  );
}

export function MemoView({ state, onGoRun }: { state: RunState; onGoRun: () => void }) {
  const { profile, buyers, competitive, revenue, playbook, factcheck } = state.results;
  if (!profile) {
    return <Empty title="No memo yet" body="Run the pre-call workflow to research the account and build the memo." action={<Button onClick={onGoRun}>Go to workflow</Button>} />;
  }
  const { seller, prospect } = state.setup;
  const rev = revenue ? projectRevenue(revenue) : null;
  const maxWeek = playbook ? Math.max(...playbook.roadmap.map((r) => r.start_week + r.duration_weeks), 1) : 1;

  return (
    <div className="print-page mx-auto max-w-5xl space-y-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Pre-call memo · SPIN</div>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-slate-900">
            {seller} × {prospect}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{profile.one_liner}</p>
          <p className="mt-2 text-xs text-slate-400">
            Prepared {new Date(state.savedAt ?? Date.now()).toLocaleDateString()} · {state.sources.length} cited sources · Each citation tag links to the page the claim came from
          </p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          Print / save PDF
        </Button>
      </header>

      {playbook && (
        <Section kicker="30-second read" title="Executive summary">
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="p-4 md:col-span-3">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {playbook.exec_summary.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </Card>
            <Card className="space-y-3 bg-slate-50 p-4 md:col-span-2">
              <div>
                <div className="text-xs font-semibold text-slate-900">Deal thesis</div>
                <p className="mt-1 text-sm text-slate-700">{playbook.deal_thesis}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">Call objectives</div>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-slate-700">
                  {playbook.call_objectives.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ol>
              </div>
            </Card>
          </div>
        </Section>
      )}

      <Section kicker="Situation" title="Company snapshot">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {profile.key_metrics.map((m, i) => (
            <Stat
              key={i}
              label={m.label}
              value={<span className="text-base">{m.value}</span>}
              sub={
                <span className="inline-flex items-center gap-1">
                  {m.confidence !== "sourced" && <Confidence value={m.confidence} />}
                  <Cite ids={m.source_ids} />
                </span>
              }
            />
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">Strategic priorities</div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {profile.strategic_priorities.map((f, i) => (
                <Fact key={i} text={f.text} ids={f.source_ids} confidence={f.confidence} />
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">AI and technology posture</div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {profile.ai_and_tech_posture.map((f, i) => (
                <Fact key={i} text={f.text} ids={f.source_ids} confidence={f.confidence} />
              ))}
            </ul>
          </Card>
        </div>
        <Card className="mt-4 p-4">
          <div className="mb-3 text-sm font-semibold">Trigger events</div>
          <ol className="relative space-y-3 border-l border-slate-200 pl-5">
            {profile.trigger_events.map((t, i) => (
              <li key={i} className="text-sm">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-500" />
                <div className="text-xs font-medium text-slate-500">{t.date}</div>
                <div className="text-slate-800">
                  {t.event}
                  <Cite ids={t.source_ids} />
                </div>
                <div className="text-xs text-indigo-700">→ {t.implication}</div>
              </li>
            ))}
          </ol>
        </Card>
      </Section>

      <Section kicker="Situation" title="The legal function">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 md:col-span-2">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {profile.legal_function.overview.map((f, i) => (
                <Fact key={i} text={f.text} ids={f.source_ids} confidence={f.confidence} />
              ))}
            </ul>
          </Card>
          <div className="space-y-3">
            <Stat label="Est. attorneys" value={profile.legal_function.estimated_legal_headcount.attorneys} />
            <Stat
              label="Est. legal professionals"
              value={profile.legal_function.estimated_legal_headcount.legal_professionals_total}
              sub={
                <span>
                  <Confidence value={profile.legal_function.estimated_legal_headcount.confidence} /> {profile.legal_function.estimated_legal_headcount.basis}
                </span>
              }
            />
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {profile.legal_function.key_matters.map((m, i) => (
            <Card key={i} className="p-4">
              <div className="text-sm font-semibold text-slate-900">
                {m.name}
                <Cite ids={m.source_ids} />
              </div>
              <p className="mt-1 text-sm text-slate-600">{m.description}</p>
              <p className="mt-2 text-xs font-medium text-indigo-700">Why it matters: {m.relevance_to_seller}</p>
            </Card>
          ))}
        </div>
      </Section>

      {buyers && (
        <Section kicker="Buyer ecosystem" title="Who buys, who decides, who can block">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ROLE_ORDER.map(({ key, label }) => {
              const people = buyers.stakeholders.filter((s) => s.buying_role === key);
              if (!people.length) return null;
              return (
                <div key={key} className="space-y-2 rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                  {people.map((s, i) => (
                    <StakeholderCard key={i} s={s} />
                  ))}
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold">Buying committee dynamics</div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {buyers.buying_committee_notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold">Access strategy</div>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {buyers.access_strategy.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ol>
            </Card>
          </div>
        </Section>
      )}

      {playbook && (
        <Section kicker="Sales process" title="Buying-process roadmap">
          <Card className="overflow-x-auto p-4">
            <div className="min-w-[640px] space-y-2">
              {playbook.roadmap.map((r, i) => (
                <div key={i} className="grid grid-cols-[180px_1fr] items-center gap-3">
                  <div className="text-xs font-medium text-slate-700">{stageName(r.stage)}</div>
                  <div className="relative h-6 rounded bg-slate-100">
                    <div
                      className="absolute top-0 h-6 rounded bg-indigo-500"
                      style={{ left: `${(r.start_week / maxWeek) * 100}%`, width: `${Math.max((r.duration_weeks / maxWeek) * 100, 2)}%` }}
                    />
                    <div
                      className="absolute top-0 flex h-6 items-center whitespace-nowrap pl-1.5 text-[10px] font-medium text-slate-600"
                      style={{ left: `${((r.start_week + r.duration_weeks) / maxWeek) * 100}%`, transform: (r.start_week + r.duration_weeks) / maxWeek > 0.85 ? "translateX(-100%) translateX(-4px)" : undefined }}
                    >
                      <span className={(r.start_week + r.duration_weeks) / maxWeek > 0.85 ? "text-white" : ""}>wk {r.start_week}–{r.start_week + r.duration_weeks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {playbook.roadmap.map((r, i) => (
              <Card key={i} className="p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-slate-900">
                    {i + 1}. {stageName(r.stage)}
                  </div>
                  <span className="text-xs text-slate-400">{r.duration_weeks} wk</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.owners.map((o, j) => (
                    <Badge key={j} tone="sky">
                      {o}
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div>
                    <div className="font-medium text-slate-800">We do</div>
                    <ul className="list-disc pl-4">
                      {r.seller_actions.map((a, j) => (
                        <li key={j}>{a}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">They do</div>
                    <ul className="list-disc pl-4">
                      {r.buyer_actions.map((a, j) => (
                        <li key={j}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-2 text-xs">
                  <span className="font-medium text-emerald-700">Exit: </span>
                  {r.exit_criteria}
                </div>
                <div className="text-xs">
                  <span className="font-medium text-rose-700">Risk: </span>
                  {r.risks}
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {revenue && rev && (
        <Section kicker="Account economics" title="Potential revenue">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {rev.years.map((y) => (
              <Stat key={y.year} label={`Year ${y.year} ARR`} value={usd(y.arr, true)} sub={`${y.seats} seats × ${usd(y.netPrice)}`} />
            ))}
            <Stat label="3-yr contract value" value={usd(rev.tcv, true)} sub="Base case" />
            <Stat label="Expansion upside / yr" value={usd(rev.expansion, true)} sub={`${revenue.expansion_opportunities.length} paths`} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Edit every assumption and download the Excel model in the Revenue model tab.</p>
        </Section>
      )}

      {competitive && (
        <Section kicker="Competitive positioning" title="Battlecard">
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold">Already in the account</div>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {competitive.incumbent_tools.map((f, i) => (
                  <Fact key={i} text={f.text} ids={f.source_ids} confidence={f.confidence} />
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold">Why {seller}</div>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {competitive.differentiators.map((f, i) => (
                  <Fact key={i} text={f.text} ids={f.source_ids} confidence={f.confidence} />
                ))}
              </ul>
            </Card>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Alternative</th>
                  <th className="px-4 py-2">Their strengths</th>
                  <th className="px-4 py-2">Their gaps</th>
                  <th className="px-4 py-2">How we win</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {competitive.competitors.map((c, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {c.name}
                      <Cite ids={c.source_ids} />
                      <div className="text-xs font-normal text-slate-500">{c.positioning}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.strengths.join("; ")}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.weaknesses.join("; ")}</td>
                    <td className="px-4 py-3 text-xs text-slate-800">{c.how_to_win}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {competitive.objections.map((o, i) => (
              <Card key={i} className="p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-slate-900">&ldquo;{o.objection}&rdquo;</div>
                  <Badge>{o.category.replace("_", " ")}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-slate-400">Likely from {o.likely_from}</div>
                <p className="mt-2 text-slate-700">{o.response}</p>
                <p className="mt-1 text-xs text-slate-500">
                  <span className="font-medium">Proof: </span>
                  {o.proof_point}
                </p>
                <p className="mt-1 text-xs text-indigo-700">
                  <span className="font-medium">SPIN reframe: </span>
                  {o.spin_reframe}
                </p>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {playbook && (
        <Section kicker="Methodology" title="SPIN question bank">
          <div className="space-y-4">
            {playbook.spin.map((s, i) => (
              <Card key={i} className="p-4">
                <div className="mb-3 text-sm font-semibold text-slate-900">{s.stakeholder}</div>
                <div className="grid gap-3 md:grid-cols-4">
                  {(
                    [
                      ["Situation", s.situation, "bg-slate-50"],
                      ["Problem", s.problem, "bg-amber-50"],
                      ["Implication", s.implication, "bg-rose-50"],
                      ["Need-payoff", s.need_payoff, "bg-emerald-50"],
                    ] as const
                  ).map(([label, qs, bg]) => (
                    <div key={label} className={`rounded-lg p-3 ${bg}`}>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</div>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {qs.map((q, j) => (
                          <li key={j}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <Card className="mt-4 p-4">
            <div className="mb-2 text-sm font-semibold">30-minute call agenda</div>
            <div className="divide-y divide-slate-100">
              {playbook.call_agenda.map((a, i) => (
                <div key={i} className="flex gap-4 py-2 text-sm">
                  <div className="w-14 shrink-0 tabular-nums text-slate-400">{a.minutes} min</div>
                  <div className="w-44 shrink-0 font-medium text-slate-800">{a.segment}</div>
                  <div className="text-slate-600">{a.goal}</div>
                </div>
              ))}
            </div>
          </Card>
        </Section>
      )}

      {factcheck && (
        <Section kicker="Accuracy and trust" title="Fact-check and known failure modes">
          <Card className="mb-4 bg-slate-50 p-4 text-sm text-slate-700">{factcheck.overall_note}</Card>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Claim</th>
                  <th className="px-4 py-2">Verdict</th>
                  <th className="px-4 py-2">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {factcheck.checks.map((c, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-slate-800">{c.claim}</td>
                    <td className="px-4 py-3">
                      <Badge tone={VERDICT[c.verdict]?.tone}>{VERDICT[c.verdict]?.label ?? c.verdict}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {c.evidence}{" "}
                      {c.source_url && (
                        <a href={c.source_url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                          source
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {factcheck.failure_modes.map((f, i) => (
              <Card key={i} className="p-4 text-sm">
                <div className="font-semibold text-slate-900">{f.area}</div>
                <p className="mt-1 text-slate-600">{f.issue}</p>
                <p className="mt-1 text-xs text-emerald-700">
                  <span className="font-medium">Mitigation: </span>
                  {f.mitigation}
                </p>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Section kicker="Appendix" title={`Sources (${state.sources.length})`}>
        <ol className="grid gap-x-6 gap-y-1 text-xs md:grid-cols-2">
          {state.sources.map((s) => (
            <li key={s.id} className="flex gap-2">
              <span className="w-8 shrink-0 font-mono text-indigo-700">{s.id}</span>
              <a href={s.url} target="_blank" rel="noreferrer" className="truncate text-slate-600 hover:text-indigo-700 hover:underline" title={s.url}>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
