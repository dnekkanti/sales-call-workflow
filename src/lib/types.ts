import type { Buyers, Competitive, Debrief, FactCheck, Playbook, Profile, Revenue } from "./schemas";

export type StepId = "profile" | "buyers" | "competitive" | "revenue" | "playbook" | "factcheck" | "debrief";

export interface Setup {
  seller: string;
  productBrief: string;
  prospect: string;
  context: string;
}

export interface Source {
  id: string;
  url: string;
  title: string;
}

export interface StepResults {
  profile?: Profile;
  buyers?: Buyers;
  competitive?: Competitive;
  revenue?: Revenue;
  playbook?: Playbook;
  factcheck?: FactCheck;
  debrief?: Debrief;
}

export interface StepMeta {
  status: "idle" | "running" | "done" | "error";
  startedAt?: number;
  finishedAt?: number;
  log: string[];
  searches: number;
  fetches: number;
  error?: string;
  costUsd?: number;
}

export interface RunState {
  setup: Setup;
  results: StepResults;
  sources: Source[];
  meta: Partial<Record<StepId, StepMeta>>;
  callNotes: string;
  callDate: string;
  savedAt?: number;
}

// Server -> client events streamed over SSE.
export type StepEvent =
  | { type: "log"; message: string }
  | { type: "search"; query: string }
  | { type: "fetch"; url: string }
  | { type: "result"; data: unknown; sources: Source[]; costUsd: number }
  | { type: "error"; message: string };

export interface StepRequest {
  step: StepId;
  setup: Setup;
  results: StepResults;
  sources: Source[];
  callNotes?: string;
  today: string;
}
