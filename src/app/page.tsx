"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CollateralView } from "@/components/CollateralView";
import { DebriefView } from "@/components/DebriefView";
import { FollowUpView } from "@/components/FollowUpView";
import { MemoView } from "@/components/MemoView";
import { RevenueView } from "@/components/RevenueView";
import { RunView } from "@/components/RunView";
import { SetupView } from "@/components/SetupView";
import { SourcesContext } from "@/components/ui";
import { runStep } from "@/lib/client";
import { DEFAULT_SETUP } from "@/lib/defaults";
import { downloadJson } from "@/lib/exports";
import type { RunState, StepId, StepMeta } from "@/lib/types";

const STORAGE_KEY = "deal-desk-run-v1";
const SOURCE_PREFIX: Partial<Record<StepId, string>> = { profile: "P", buyers: "B", competitive: "C", factcheck: "F" };

type View = "setup" | "run" | "memo" | "revenue" | "debrief" | "collateral" | "followup";

const NAV: { view: View; label: string; group: string; steps?: StepId[] }[] = [
  { view: "setup", label: "Inputs", group: "Before the call" },
  { view: "run", label: "Run agents", group: "Before the call", steps: ["profile", "buyers", "competitive", "revenue", "playbook", "factcheck"] },
  { view: "memo", label: "Pre-call memo", group: "Before the call", steps: ["playbook"] },
  { view: "revenue", label: "Revenue model", group: "Before the call", steps: ["revenue"] },
  { view: "debrief", label: "Call debrief", group: "After the call", steps: ["debrief"] },
  { view: "collateral", label: "Prospect collateral", group: "After the call", steps: ["debrief"] },
  { view: "followup", label: "Follow-up plan", group: "After the call", steps: ["debrief"] },
];

const today = () => new Date().toISOString().slice(0, 10);

function freshState(): RunState {
  return { setup: DEFAULT_SETUP, results: {}, sources: [], meta: {}, callNotes: "", callDate: today() };
}

export default function Home() {
  const [state, setState] = useState<RunState>(freshState);
  const [view, setView] = useState<View>("setup");
  const [running, setRunning] = useState(false);
  const [hasSample, setHasSample] = useState(false);

  // A ref mirror so steps that run after an await see the latest results, not a stale closure.
  const stateRef = useRef(state);
  const update = useCallback((fn: (s: RunState) => RunState) => {
    stateRef.current = fn(stateRef.current);
    setState(stateRef.current);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as RunState;
        // A run interrupted by a reload can't resume, so show it as failed rather than spinning forever.
        for (const m of Object.values(parsed.meta)) if (m?.status === "running") Object.assign(m, { status: "error", error: "Interrupted by page reload." });
        update(() => parsed);
        if (parsed.results.playbook) setView("memo");
      }
    } catch {
      // Storage unavailable (private mode); start fresh.
    }
    fetch("/sample-run.json", { method: "HEAD" })
      .then((r) => setHasSample(r.ok))
      .catch(() => setHasSample(false));
  }, [update]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota or privacy errors; the run still works in memory.
    }
  }, [state]);

  const patchMeta = useCallback(
    (step: StepId, fn: (m: StepMeta) => Partial<StepMeta>) =>
      update((s) => {
        const cur: StepMeta = s.meta[step] ?? { status: "idle", log: [], searches: 0, fetches: 0 };
        return { ...s, meta: { ...s.meta, [step]: { ...cur, ...fn(cur) } } };
      }),
    [update],
  );

  const runOne = useCallback(
    async (step: StepId): Promise<boolean> => {
      patchMeta(step, () => ({ status: "running", startedAt: Date.now(), finishedAt: undefined, log: [], searches: 0, fetches: 0, error: undefined, costUsd: undefined }));
      let ok = false;
      try {
        await runStep(step, stateRef.current, (e) => {
          if (e.type === "log") patchMeta(step, (m) => ({ log: [...m.log, `› ${e.message}`] }));
          else if (e.type === "search") patchMeta(step, (m) => ({ log: [...m.log, `⌕ ${e.query}`], searches: m.searches + 1 }));
          else if (e.type === "fetch") {
            let label = e.url;
            try {
              const u = new URL(e.url);
              label = u.hostname + u.pathname;
            } catch {}
            patchMeta(step, (m) => ({ log: [...m.log, `↳ reading ${label}`], fetches: m.fetches + 1 }));
          } else if (e.type === "result") {
            ok = true;
            const prefix = SOURCE_PREFIX[step];
            update((s) => ({
              ...s,
              savedAt: Date.now(),
              results: { ...s.results, [step]: e.data },
              sources: prefix ? [...s.sources.filter((x) => !x.id.startsWith(prefix)), ...e.sources] : s.sources,
            }));
            patchMeta(step, (m) => ({ status: "done", finishedAt: Date.now(), costUsd: e.costUsd, log: [...m.log, e.sources.length ? `✓ Done · ${e.sources.length} sources cited` : "✓ Done"] }));
          } else if (e.type === "error") {
            patchMeta(step, () => ({ status: "error", finishedAt: Date.now(), error: e.message }));
          }
        });
      } catch (err) {
        patchMeta(step, () => ({ status: "error", finishedAt: Date.now(), error: err instanceof Error ? err.message : String(err) }));
      }
      return ok;
    },
    [patchMeta, update],
  );

  const runPreCall = useCallback(async () => {
    setRunning(true);
    setView("run");
    update((s) => ({ ...s, results: {}, sources: [], meta: {} }));
    try {
      if (!(await runOne("profile"))) return;
      const stage2 = await Promise.all([runOne("buyers"), runOne("competitive")]);
      if (!stage2.every(Boolean)) return;
      await Promise.all([runOne("revenue"), runOne("playbook"), runOne("factcheck")]);
    } finally {
      setRunning(false);
    }
  }, [runOne, update]);

  const runSingle = useCallback(
    async (step: StepId) => {
      setRunning(true);
      try {
        await runOne(step);
      } finally {
        setRunning(false);
      }
    },
    [runOne],
  );

  const loadSample = async () => {
    const res = await fetch("/sample-run.json");
    const sample = (await res.json()) as RunState;
    update(() => sample);
    setView("memo");
  };

  const saveAsDemo = async () => {
    const res = await fetch("/api/dev/save-run", { method: "POST", body: JSON.stringify(stateRef.current) });
    if (res.ok) {
      setHasSample(true);
      alert("Saved as public/sample-run.json. Use \"Load saved run\" to replay it.");
    } else alert(`Save failed: ${await res.text()}`);
  };

  const reset = () => {
    if (!confirm("Clear this run and start over?")) return;
    update(() => freshState());
    setView("setup");
  };

  const sourceMap = useMemo(() => new Map(state.sources.map((s) => [s.id, s])), [state.sources]);
  const totalCost = Object.values(state.meta).reduce((sum, m) => sum + (m?.costUsd ?? 0), 0);

  const navStatus = (steps?: StepId[]) => {
    if (!steps) return "idle";
    const st = steps.map((s) => state.meta[s]?.status ?? "idle");
    if (st.includes("running")) return "running";
    if (st.includes("error")) return "error";
    if (st.every((x) => x === "done")) return "done";
    return "idle";
  };

  return (
    <SourcesContext.Provider value={sourceMap}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">DD</div>
              <div>
                <div className="text-sm font-semibold leading-tight text-slate-900">Deal Desk</div>
                <div className="text-[11px] leading-tight text-slate-500">AI sales call prep · SPIN</div>
              </div>
              <div className="ml-3 hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 sm:block">
                {state.setup.seller} → {state.setup.prospect}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {totalCost > 0 && <span className="mr-2 hidden text-xs tabular-nums text-slate-500 md:inline">Est. compute ${totalCost.toFixed(2)}</span>}
              {hasSample && (
                <button type="button" onClick={loadSample} disabled={running} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                  Load saved run
                </button>
              )}
              {process.env.NODE_ENV === "development" && state.results.profile && (
                <button type="button" onClick={saveAsDemo} disabled={running} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                  Save as demo run
                </button>
              )}
              <button
                type="button"
                onClick={() => downloadJson(state, "deal-desk-run.json")}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Export
              </button>
              <button type="button" onClick={reset} disabled={running} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">
                Reset
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 lg:flex-row">
          <nav className="shrink-0 print:hidden lg:sticky lg:top-20 lg:h-fit lg:w-52">
            <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {NAV.map((item, i) => {
                const st = navStatus(item.steps);
                const showGroup = i === 0 || NAV[i - 1].group !== item.group;
                return (
                  <div key={item.view} className="contents">
                    {showGroup && <div className="hidden px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 first:pt-0 lg:block">{item.group}</div>}
                    <button
                      type="button"
                      onClick={() => setView(item.view)}
                      className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                        view === item.view ? "bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/70"
                      }`}
                    >
                      <span className="whitespace-nowrap">{item.label}</span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          st === "running" ? "pulse-dot bg-indigo-500" : st === "done" ? "bg-emerald-500" : st === "error" ? "bg-rose-500" : "bg-transparent"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </nav>

          <main className="min-w-0 flex-1">
            {view === "setup" && <SetupView setup={state.setup} onChange={(setup) => update((s) => ({ ...s, setup }))} onStart={runPreCall} running={running} />}
            {view === "run" && <RunView state={state} running={running} onRunAll={runPreCall} onRunStep={runSingle} onOpenMemo={() => setView("memo")} />}
            {view === "memo" && <MemoView state={state} onGoRun={() => setView("run")} />}
            {view === "revenue" && (
              <RevenueView state={state} onChange={(revenue) => update((s) => ({ ...s, results: { ...s.results, revenue } }))} onGoRun={() => setView("run")} />
            )}
            {view === "debrief" && (
              <DebriefView
                state={state}
                running={running}
                onNotes={(callNotes) => update((s) => ({ ...s, callNotes }))}
                onCallDate={(callDate) => update((s) => ({ ...s, callDate }))}
                onRun={() => runSingle("debrief")}
                onOpenCollateral={() => setView("collateral")}
              />
            )}
            {view === "collateral" && (
              <CollateralView
                state={state}
                onRoi={(roi_inputs) =>
                  update((s) => (s.results.debrief ? { ...s, results: { ...s.results, debrief: { ...s.results.debrief, roi_inputs } } } : s))
                }
                onGoDebrief={() => setView("debrief")}
              />
            )}
            {view === "followup" && <FollowUpView state={state} onGoDebrief={() => setView("debrief")} />}
          </main>
        </div>
      </div>
    </SourcesContext.Provider>
  );
}
