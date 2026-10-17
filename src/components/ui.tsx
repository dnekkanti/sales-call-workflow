"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Source } from "@/lib/types";

export const SourcesContext = createContext<Map<string, Source>>(new Map());

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function Section({ title, kicker, children, actions }: { title: string; kicker?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="break-inside-avoid-page">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          {kicker && <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">{kicker}</div>}
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

const TONES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONES[tone]}`}>{children}</span>;
}

const CONFIDENCE: Record<string, { tone: Tone; label: string }> = {
  sourced: { tone: "green", label: "Sourced" },
  estimated: { tone: "amber", label: "Estimated" },
  assumption: { tone: "slate", label: "Assumption" },
};

export function Confidence({ value }: { value: string }) {
  const c = CONFIDENCE[value] ?? CONFIDENCE.assumption;
  return <Badge tone={c.tone}>{c.label}</Badge>;
}

/** Superscript-style citation chips that link to the page the claim came from. */
export function Cite({ ids }: { ids: string[] }) {
  const sources = useContext(SourcesContext);
  if (!ids?.length) return null;
  return (
    <span className="ml-1 inline-flex flex-wrap gap-0.5 align-middle">
      {ids.map((id) => {
        const s = sources.get(id);
        if (!s) return null;
        return (
          <a
            key={id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            title={s.title}
            className="rounded bg-indigo-50 px-1 font-mono text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
          >
            {id}
          </a>
        );
      })}
    </span>
  );
}

export function Fact({ text, ids, confidence }: { text: string; ids: string[]; confidence?: string }) {
  return (
    <li className="leading-relaxed">
      {text}
      <Cite ids={ids} />
      {confidence && confidence !== "sourced" && (
        <span className="ml-1.5">
          <Confidence value={confidence} />
        </span>
      )}
    </li>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <p className="max-w-md text-sm text-slate-500">{body}</p>
      {action}
    </Card>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm",
    secondary: "bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 print:hidden ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
