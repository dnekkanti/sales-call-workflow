"use client";

import { useState } from "react";
import { businessDate, downloadFollowUpIcs } from "@/lib/exports";
import type { RunState } from "@/lib/types";
import { Badge, Button, Card, Empty, type Tone } from "./ui";

const CHANNEL: Record<string, { tone: Tone; icon: string }> = {
  email: { tone: "indigo", icon: "✉" },
  meeting: { tone: "green", icon: "◷" },
  call: { tone: "sky", icon: "☏" },
  task: { tone: "amber", icon: "☐" },
};

export function FollowUpView({ state, onGoDebrief }: { state: RunState; onGoDebrief: () => void }) {
  const [open, setOpen] = useState<number | null>(0);
  const [copied, setCopied] = useState<number | null>(null);
  const d = state.results.debrief;
  if (!d) return <Empty title="No follow-up plan yet" body="Generate the debrief to get a 30-day follow-up cadence." action={<Button onClick={onGoDebrief}>Go to debrief</Button>} />;

  const plan = [...d.follow_up].sort((a, b) => a.day_offset - b.day_offset);

  const copy = async (i: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard can be blocked in some browsers; the text is still visible to copy by hand.
    }
  };

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Follow-up plan</div>
          <h1 className="text-xl font-semibold text-slate-900">
            {plan.length} touches over {Math.max(...plan.map((p) => p.day_offset))} days
          </h1>
          <p className="mt-1 text-sm text-slate-500">Dates skip weekends. Download the calendar file to drop every touch onto your calendar with the email drafts attached.</p>
        </div>
        <Button onClick={() => downloadFollowUpIcs(plan, state.callDate, state.setup.prospect)}>Download calendar (.ics)</Button>
      </Card>

      <ol className="relative space-y-3 border-l-2 border-slate-200 pl-6">
        {plan.map((item, i) => {
          const date = businessDate(state.callDate, item.day_offset);
          const ch = CHANNEL[item.channel] ?? CHANNEL.task;
          const isOpen = open === i;
          return (
            <li key={i} className="relative">
              <span className="absolute -left-[33px] top-4 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] ring-2 ring-slate-200">{ch.icon}</span>
              <Card className="p-4">
                <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
                  <div>
                    <div className="text-xs font-medium text-slate-500">
                      {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · Day {item.day_offset}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={ch.tone}>{item.channel}</Badge>
                    <span className="text-xs text-slate-400">{item.owner}</span>
                  </div>
                </button>
                <p className="mt-1 text-sm text-slate-600">{item.purpose}</p>
                {item.attendees.length > 0 && <p className="mt-1 text-xs text-slate-400">With: {item.attendees.join(", ")}</p>}
                {isOpen && item.email_body && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm">
                        <span className="text-slate-500">Subject: </span>
                        <span className="font-medium">{item.email_subject}</span>
                      </div>
                      <Button variant="ghost" onClick={() => copy(i, `Subject: ${item.email_subject}\n\n${item.email_body}`)}>
                        {copied === i ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{item.email_body}</pre>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
