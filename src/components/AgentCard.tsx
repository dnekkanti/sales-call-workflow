"use client";

import { useEffect, useState } from "react";
import type { StepMeta } from "@/lib/types";
import { Badge } from "./ui";

function useElapsed(meta?: StepMeta) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (meta?.status !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [meta?.status]);
  if (!meta?.startedAt) return null;
  const end = meta.status === "running" ? now : (meta.finishedAt ?? now);
  return Math.max(0, Math.round((end - meta.startedAt) / 1000));
}

export function AgentCard({
  title,
  description,
  tools,
  meta,
  onRun,
  disabled,
}: {
  title: string;
  description: string;
  tools: string;
  meta?: StepMeta;
  onRun?: () => void;
  disabled?: boolean;
}) {
  const elapsed = useElapsed(meta);
  const status = meta?.status ?? "idle";
  const ring = {
    idle: "border-slate-200",
    running: "border-indigo-400 ring-4 ring-indigo-100",
    done: "border-emerald-300",
    error: "border-rose-300",
  }[status];

  return (
    <div className={`flex min-h-[220px] flex-col rounded-xl border bg-white p-4 shadow-sm transition ${ring}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                status === "running" ? "pulse-dot bg-indigo-500" : status === "done" ? "bg-emerald-500" : status === "error" ? "bg-rose-500" : "bg-slate-300"
              }`}
            />
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
        {onRun && status !== "running" && (
          <button
            type="button"
            onClick={onRun}
            disabled={disabled}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            {status === "idle" ? "Run" : "Rerun"}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="indigo">{tools}</Badge>
        {(meta?.searches ?? 0) > 0 && <Badge>{meta!.searches} searches</Badge>}
        {(meta?.fetches ?? 0) > 0 && <Badge>{meta!.fetches} pages read</Badge>}
        {elapsed !== null && <Badge>{elapsed}s</Badge>}
        {meta?.costUsd !== undefined && <Badge tone="green">${meta.costUsd.toFixed(2)}</Badge>}
      </div>

      <div className="mt-3 flex-1 overflow-hidden rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] leading-relaxed text-slate-300">
        {status === "idle" && <div className="text-slate-500">Waiting…</div>}
        {meta?.log.slice(-6).map((line, i) => (
          <div key={i} className="truncate" title={line}>
            {line}
          </div>
        ))}
        {status === "error" && <div className="whitespace-normal text-rose-400">✕ {meta?.error}</div>}
      </div>
    </div>
  );
}
