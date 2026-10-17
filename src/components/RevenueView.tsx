"use client";

import type { Revenue } from "@/lib/schemas";
import { SCENARIOS, adoptionFor, projectRevenue, usd } from "@/lib/finance";
import { downloadRevenueXlsx } from "@/lib/exports";
import type { RunState } from "@/lib/types";
import { Button, Card, Empty, Section, Stat } from "./ui";

function NumInput({ value, onChange, suffix, width = "w-20" }: { value: number; onChange: (n: number) => void; suffix?: string; width?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${width} rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-300`}
      />
      {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
    </span>
  );
}

export function RevenueView({ state, onChange, onGoRun }: { state: RunState; onChange: (r: Revenue) => void; onGoRun: () => void }) {
  const rev = state.results.revenue;
  if (!rev) return <Empty title="No revenue model yet" body="The revenue agent runs in stage 3 of the pre-call workflow." action={<Button onClick={onGoRun}>Go to workflow</Button>} />;

  const set = (patch: Partial<Revenue>) => onChange({ ...rev, ...patch });
  const setGroup = (i: number, patch: Partial<Revenue["seat_groups"][number]>) =>
    set({ seat_groups: rev.seat_groups.map((g, j) => (j === i ? { ...g, ...patch } : g)) });

  const scenarios = SCENARIOS.map((s) => ({ s, p: projectRevenue(rev, s) }));
  const base = scenarios[1].p;
  const maxArr = Math.max(...scenarios.flatMap((x) => x.p.years.map((y) => y.arr)), 1);

  return (
    <div className="space-y-8">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Account revenue model</div>
          <h1 className="text-xl font-semibold text-slate-900">
            {state.setup.prospect}: {usd(base.tcv, true)} base-case 3-year value
          </h1>
          <p className="mt-1 text-sm text-slate-500">Claude proposed the assumptions from research. The math is computed here, and every blue field is editable.</p>
        </div>
        <Button variant="secondary" onClick={() => downloadRevenueXlsx(rev, state.setup.seller, state.setup.prospect)}>
          Download Excel model
        </Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {scenarios.map(({ s, p }) => (
          <Card key={s.key} className={`p-4 ${s.key === "base" ? "ring-2 ring-indigo-200" : ""}`}>
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-semibold text-slate-900">{s.label} case</div>
              <div className="text-xs text-slate-400">
                adoption ×{s.adoptionMult} · price ×{s.priceMult}
              </div>
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{usd(p.tcv, true)}</div>
            <div className="text-xs text-slate-500">3-year contract value</div>
            <div className="mt-4 flex h-28 items-end gap-3">
              {p.years.map((y) => (
                <div key={y.year} className="flex flex-1 flex-col items-center gap-1">
                  <div className="text-[10px] tabular-nums text-slate-500">{usd(y.arr, true)}</div>
                  <div className={`w-full rounded-t ${s.key === "base" ? "bg-indigo-500" : "bg-slate-300"}`} style={{ height: `${(y.arr / maxArr) * 80}px` }} />
                  <div className="text-[10px] text-slate-400">Y{y.year}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Section title="Pricing">
        <Card className="grid gap-4 p-4 sm:grid-cols-3">
          <label className="flex items-center justify-between gap-2 text-sm">
            List price / seat / yr <NumInput value={rev.price_per_seat_year} onChange={(n) => set({ price_per_seat_year: n })} width="w-24" />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            Discount <NumInput value={rev.discount_pct} onChange={(n) => set({ discount_pct: n })} suffix="%" />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            Annual escalator <NumInput value={rev.annual_price_escalator_pct} onChange={(n) => set({ annual_price_escalator_pct: n })} suffix="%" />
          </label>
          <p className="text-xs text-slate-500 sm:col-span-3">{rev.price_rationale}</p>
        </Card>
      </Section>

      <Section title="Seat model">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Seat group</th>
                <th className="px-4 py-2 text-right">Headcount</th>
                <th className="px-4 py-2 text-right">Adoption Y1</th>
                <th className="px-4 py-2 text-right">Y2</th>
                <th className="px-4 py-2 text-right">Adoption Y3</th>
                <th className="px-4 py-2">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {rev.seat_groups.map((g, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium text-slate-800">{g.group}</td>
                  <td className="px-4 py-2 text-right">
                    <NumInput value={g.headcount} onChange={(n) => setGroup(i, { headcount: n })} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <NumInput value={g.adoption_pct_year1} onChange={(n) => setGroup(i, { adoption_pct_year1: n })} suffix="%" />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-500">{Math.round(adoptionFor(g, 2))}%</td>
                  <td className="px-4 py-2 text-right">
                    <NumInput value={g.adoption_pct_year3} onChange={(n) => setGroup(i, { adoption_pct_year3: n })} suffix="%" />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{g.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {base.years.map((y) => (
            <Stat key={y.year} label={`Year ${y.year}`} value={usd(y.arr)} sub={`${y.seats} seats at ${usd(y.netPrice)} net`} />
          ))}
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Expansion paths">
          <Card className="divide-y divide-slate-100">
            {rev.expansion_opportunities.map((e, i) => (
              <div key={i} className="flex items-start justify-between gap-4 p-4 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{e.name}</div>
                  <div className="text-xs text-slate-500">{e.description}</div>
                </div>
                <div className="shrink-0 font-semibold tabular-nums">{usd(e.estimated_annual_value, true)}/yr</div>
              </div>
            ))}
          </Card>
        </Section>
        <Section title="Assumptions to pressure-test">
          <Card className="p-4">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {rev.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </Card>
        </Section>
      </div>
    </div>
  );
}
