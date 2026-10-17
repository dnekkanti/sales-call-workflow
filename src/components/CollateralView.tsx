"use client";

import { computeRoi, usd, type RoiInputs } from "@/lib/finance";
import type { RunState } from "@/lib/types";
import { Button, Empty } from "./ui";

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={Math.max(max, value)}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-indigo-600 print:hidden"
      />
    </label>
  );
}

// The model returns deadlines as ISO dates; show them the way a person would write them.
function prettyDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return `Reply by ${new Date(`${s}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`;
}

export function CollateralView({ state, onRoi, onGoDebrief }: { state: RunState; onRoi: (r: RoiInputs) => void; onGoDebrief: () => void }) {
  const d = state.results.debrief;
  if (!d) return <Empty title="No collateral yet" body="Add call notes in the Call debrief tab to generate prospect-ready collateral." action={<Button onClick={onGoDebrief}>Go to debrief</Button>} />;

  const { seller, prospect } = state.setup;
  const c = d.collateral;
  const roi = d.roi_inputs;
  const out = computeRoi(roi);
  const set = (patch: Partial<RoiInputs>) => onRoi({ ...roi, ...patch });
  const n = (x: number) => new Intl.NumberFormat("en-US").format(Math.round(x));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-slate-500">Prospect-facing. Adjust the ROI sliders to match what you heard, then save as PDF and send.</p>
        <Button variant="secondary" onClick={() => window.print()}>
          Print / save PDF
        </Button>
      </div>

      <article className="print-page mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-slate-900 px-8 py-10 text-white sm:px-12">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-300">
            Prepared for {prospect} Legal · {new Date(`${state.callDate}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </div>
          <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-4xl">{c.headline}</h1>
          <p className="mt-3 max-w-2xl text-slate-300">{c.subheadline}</p>
        </header>

        <div className="space-y-10 px-8 py-10 sm:px-12">
          <section>
            <h2 className="font-serif text-xl font-semibold">What we heard</h2>
            <ul className="mt-3 space-y-2">
              {c.what_we_heard.map((w, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  {w}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold">Your priorities, and how {seller} helps</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              {c.priorities.map((p, i) => (
                <div key={i} className="grid gap-2 border-b border-slate-100 p-4 text-sm last:border-0 sm:grid-cols-3">
                  <div className="font-semibold text-slate-900">{p.priority}</div>
                  <div className="text-slate-600">{p.capability}</div>
                  <div className="font-medium text-emerald-700">{p.outcome}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="break-inside-avoid-page">
            <h2 className="font-serif text-xl font-semibold">Economic value</h2>
            <p className="mt-1 text-sm text-slate-500">Built from the numbers you shared on our call. Move the sliders to test your own assumptions.</p>
            <div className="mt-4 grid gap-6 rounded-xl bg-slate-50 p-5 md:grid-cols-2">
              <div className="space-y-4">
                <Slider label="Users" value={roi.users} min={5} max={300} step={5} format={n} onChange={(v) => set({ users: v })} />
                <Slider label="Hours saved per user per week" value={roi.hours_saved_per_user_per_week} min={0} max={15} step={0.5} format={(v) => `${v} h`} onChange={(v) => set({ hours_saved_per_user_per_week: v })} />
                <Slider label="Loaded cost per hour" value={roi.loaded_hourly_cost} min={50} max={600} step={10} format={(v) => usd(v)} onChange={(v) => set({ loaded_hourly_cost: v })} />
                <Slider label="Outside counsel spend in scope" value={roi.outside_counsel_spend_annual} min={0} max={100_000_000} step={500_000} format={(v) => usd(v, true)} onChange={(v) => set({ outside_counsel_spend_annual: v })} />
                <Slider label="Outside counsel work brought in-house" value={roi.outside_counsel_reduction_pct} min={0} max={20} step={0.5} format={(v) => `${v}%`} onChange={(v) => set({ outside_counsel_reduction_pct: v })} />
                <Slider label="Realization (share of savings that becomes real value)" value={roi.realization_pct ?? 50} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => set({ realization_pct: v })} />
                <Slider label="Price per seat per year" value={roi.price_per_seat_year} min={500} max={20_000} step={100} format={(v) => usd(v)} onChange={(v) => set({ price_per_seat_year: v })} />
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-xl bg-slate-900 p-5 text-white">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Estimated annual value</div>
                  <div className="mt-1 text-3xl font-semibold tabular-nums">{usd(out.annualValue, true)}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {usd(out.timeValue, true)} attorney time + {usd(out.counselValue, true)} outside counsel avoided, after a {roi.realization_pct ?? 50}% realization haircut
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs text-slate-500">Payback</div>
                    <div className="text-2xl font-semibold tabular-nums">{Number.isFinite(out.paybackMonths) ? `${out.paybackMonths.toFixed(1)} mo` : "n/a"}</div>
                  </div>
                  <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs text-slate-500">Value ÷ year-1 cost</div>
                    <div className="text-2xl font-semibold tabular-nums">{out.roiMultiple.toFixed(1)}×</div>
                  </div>
                  <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs text-slate-500">Hours freed / yr</div>
                    <div className="text-2xl font-semibold tabular-nums">{n(out.hoursFreed)}</div>
                  </div>
                  <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs text-slate-500">Year-1 investment</div>
                    <div className="text-2xl font-semibold tabular-nums">{usd(out.firstYearCost, true)}</div>
                  </div>
                </div>
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer">Where these numbers come from</summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {roi.basis.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-xl font-semibold">Proposed pilot</h2>
              <p className="mt-2 text-sm text-slate-700">{c.pilot.scope}</p>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{c.pilot.duration_weeks} weeks</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {c.pilot.participants.map((p, i) => (
                  <span key={i} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                    {p}
                  </span>
                ))}
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {c.pilot.success_metrics.map((m, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold">Why teams trust {seller}</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {c.proof_points.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-indigo-500">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl bg-indigo-600 p-8 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Next step</div>
            <h2 className="mt-2 font-serif text-2xl font-semibold">{c.cta.headline}</h2>
            <p className="mt-2 text-indigo-100">{c.cta.ask}</p>
            <div className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700">{prettyDate(c.cta.deadline)}</div>
          </section>
        </div>
      </article>
    </div>
  );
}
