"use client";

import type { Setup } from "@/lib/types";
import { Button, Card } from "./ui";

const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300";

export function SetupView({ setup, onChange, onStart, running }: { setup: Setup; onChange: (s: Setup) => void; onStart: () => void; running: boolean }) {
  const set = (patch: Partial<Setup>) => onChange({ ...setup, ...patch });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Step 1 · Inputs</div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Who are you selling, and to whom?</h1>
        <p className="mt-1 text-sm text-slate-500">
          These are the only inputs. Change the prospect to run the whole workflow on a different account.
        </p>
      </div>
      <Card className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Your product</span>
            <input className={field} value={setup.seller} onChange={(e) => set({ seller: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Prospect company</span>
            <input className={field} value={setup.prospect} onChange={(e) => set({ prospect: e.target.value })} />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Product brief (what you sell, packaging, security)</span>
          <textarea className={`${field} h-56 font-mono text-xs leading-relaxed`} value={setup.productBrief} onChange={(e) => set({ productBrief: e.target.value })} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Deal context (optional)</span>
          <input className={field} value={setup.context} onChange={(e) => set({ context: e.target.value })} />
        </label>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Runs six Claude agents with live web search. Takes about 5-8 minutes.</p>
          <Button onClick={onStart} disabled={running || !setup.seller.trim() || !setup.prospect.trim()}>
            Run pre-call workflow →
          </Button>
        </div>
      </Card>
    </div>
  );
}
