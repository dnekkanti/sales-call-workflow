import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { cliResearch, cliStructure } from "./engine-cli";
import type { Source, StepEvent } from "./types";

/**
 * "api" calls the Anthropic API (needs a funded API key; works on Vercel).
 * "claude-code" runs the local Claude Code CLI on your Claude subscription (local only).
 * Defaults to claude-code when no API key is configured.
 */
export function engine(): "api" | "claude-code" {
  const e = process.env.ENGINE;
  if (e === "api" || e === "claude-code") return e;
  return process.env.ANTHROPIC_API_KEY ? "api" : "claude-code";
}

export const MODEL = "claude-opus-5-5";

// Server-side fallback: if Opus declines a request for policy reasons, the API reruns it on a
// server-chosen fallback model inside the same call instead of returning an empty refusal.
const BETAS = ["server-side-fallback-2026-07-01"];

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local (local) or the Vercel project's environment variables.");
  return (client ??= new Anthropic());
}

type Emit = (e: StepEvent) => void;

// Opus 5.5 list prices: $4 / $20 per MTok, cache reads $0.20, web search $10 per 1,000.
function costOf(usage: Anthropic.Beta.BetaUsage): number {
  const input = usage.input_tokens * 4 + (usage.cache_creation_input_tokens ?? 0) * 5 + (usage.cache_read_input_tokens ?? 0) * 0.2;
  const output = usage.output_tokens * 20;
  const searches = (usage.server_tool_use?.web_search_requests ?? 0) * 10_000;
  return (input + output + searches) / 1_000_000;
}

export interface ResearchResult {
  notes: string;
  sources: Source[];
  costUsd: number;
}

/**
 * Agentic research turn: Claude plans and runs its own web searches and page fetches,
 * then writes up findings. Every URL it saw is captured so later steps can only cite real pages.
 */
export async function research(opts: {
  system: string;
  prompt: string;
  emit: Emit;
  idPrefix: string;
  maxSearches?: number;
  maxFetches?: number;
}): Promise<ResearchResult> {
  if (engine() === "claude-code") return cliResearch(opts);
  const { system, prompt, emit, idPrefix } = opts;
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  const byUrl = new Map<string, Source>();
  const addSource = (url: string, title: string) => {
    if (!url || byUrl.has(url)) return;
    byUrl.set(url, { id: `${idPrefix}${byUrl.size + 1}`, url, title: title || url });
  };

  let notes = "";
  let costUsd = 0;

  // Server tools run a server-side loop that can pause; resume up to a few times.
  for (let turn = 0; turn < 5; turn++) {
    const stream = anthropic().beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: BETAS,
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system,
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: opts.maxSearches ?? 8 },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: opts.maxFetches ?? 4 },
      ],
      messages,
    });

    stream.on("contentBlock", (block) => {
      if (block.type === "server_tool_use") {
        const input = block.input as { query?: string; url?: string };
        if (block.name === "web_search" && input.query) emit({ type: "search", query: input.query });
        if (block.name === "web_fetch" && input.url) emit({ type: "fetch", url: input.url });
      } else if (block.type === "web_search_tool_result") {
        if (Array.isArray(block.content)) {
          for (const r of block.content) if (r.type === "web_search_result") addSource(r.url, r.title);
        }
      } else if (block.type === "web_fetch_tool_result") {
        const c = block.content;
        if (c.type === "web_fetch_result") addSource(c.url, c.content?.title ?? c.url);
      } else if (block.type === "text") {
        for (const cit of block.citations ?? []) {
          if (cit.type === "web_search_result_location") addSource(cit.url, cit.title ?? cit.url);
        }
      }
    });

    const msg = await stream.finalMessage();
    costUsd += costOf(msg.usage);
    for (const b of msg.content) if (b.type === "text") notes += b.text;

    if (msg.stop_reason === "refusal") throw new Error("The model declined this research request.");
    if (msg.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: msg.content });
    emit({ type: "log", message: "Continuing research…" });
  }

  return { notes, sources: [...byUrl.values()], costUsd };
}

/**
 * Turns notes into schema-valid JSON using structured outputs. The model sees a numbered
 * source list and must cite by id; ids it invents are stripped afterwards by validateCitations.
 */
export async function structure<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  effort?: "low" | "medium" | "high";
}): Promise<{ data: z.infer<S>; costUsd: number }> {
  if (engine() === "claude-code") return cliStructure(opts);
  const stream = anthropic().beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: BETAS,
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("The model declined to produce this output.");
  if (msg.stop_reason === "max_tokens") throw new Error("Output was cut off (max_tokens). Try again.");
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const data = opts.schema.parse(JSON.parse(text));
  return { data, costUsd: costOf(msg.usage) };
}

/**
 * Walks any result object. Drops source ids that are not in the registry (hallucinated
 * citations) and downgrades "sourced" claims that lose all their sources to "estimated".
 * Returns the ids actually cited so the source list only shows pages that back a claim.
 */
export function validateCitations(value: unknown, registry: Map<string, Source>, used = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) validateCitations(v, registry, used);
  } else if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.source_ids)) {
      const kept = (obj.source_ids as string[]).filter((id) => registry.has(id));
      kept.forEach((id) => used.add(id));
      if (obj.confidence === "sourced" && kept.length === 0) obj.confidence = "estimated";
      obj.source_ids = kept;
    }
    for (const [k, v] of Object.entries(obj)) if (k !== "source_ids") validateCitations(v, registry, used);
  }
  return used;
}

export function formatSources(sources: Source[]): string {
  return sources.map((s) => `[${s.id}] ${s.title} — ${s.url}`).join("\n");
}
