import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import type { Source, StepEvent } from "./types";

/**
 * Runs agent steps through the local Claude Code CLI (`claude -p`) instead of the paid API.
 * It authenticates with the user's Claude subscription login, so it only works where Claude
 * Code is installed and signed in (your own machine, not Vercel).
 */

type Emit = (e: StepEvent) => void;

// An empty working directory so the CLI never picks up project files, CLAUDE.md or memories.
const WORKDIR = mkdtempSync(path.join(tmpdir(), "deal-desk-"));

const ISOLATION = ["--strict-mcp-config", "--no-session-persistence", "--disable-slash-commands", "--setting-sources", ""];

interface CliResult {
  type: "result";
  is_error: boolean;
  result?: string;
  structured_output?: unknown;
  total_cost_usd?: number;
  api_error_status?: number | null;
}

function runClaude(args: string[], stdin: string, onLine?: (event: Record<string, unknown>) => void): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    // Drop the API key so the CLI uses the subscription login rather than the (unfunded) API account.
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const child = spawn(process.env.CLAUDE_BIN || "claude", ["-p", ...args, ...ISOLATION], { cwd: WORKDIR, env });

    let buffer = "";
    let stderr = "";
    let final: CliResult | null = null;
    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === "result") final = event;
          onLine?.(event);
        } catch {
          // Non-JSON output (warnings); ignore.
        }
      }
    });
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (err) => reject(new Error(`Could not start Claude Code CLI: ${err.message}. Is \`claude\` installed and on PATH?`)));
    child.on("close", (code) => {
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          if (event.type === "result") final = event;
        } catch {}
      }
      if (!final) return reject(new Error(`Claude Code exited (${code}) without a result. ${stderr.slice(0, 400)}`));
      if (final.is_error) return reject(new Error(`Claude Code error: ${final.result ?? stderr.slice(0, 400)}`));
      resolve(final);
    });
    child.stdin.end(stdin);
  });
}

// Claude Code's WebSearch tool returns results as `Links: [{"title":"…","url":"…"}, …]`.
const LINK_RE = /\{"title":"((?:[^"\\]|\\.)*)","url":"((?:[^"\\]|\\.)*)"\}/g;

function toolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => (c && typeof c === "object" && "text" in c ? String(c.text) : "")).join("\n");
  return "";
}

export async function cliResearch(opts: {
  system: string;
  prompt: string;
  emit: Emit;
  idPrefix: string;
  maxSearches?: number;
  maxFetches?: number;
}): Promise<{ notes: string; sources: Source[]; costUsd: number }> {
  const byUrl = new Map<string, Source>();
  const addSource = (url: string, title: string) => {
    if (!url || byUrl.has(url)) return;
    byUrl.set(url, { id: `${opts.idPrefix}${byUrl.size + 1}`, url, title: title || url });
  };
  const fetchedTitles = new Map<string, string>();

  const prompt = `${opts.prompt}

Budget: use at most ${opts.maxSearches ?? 8} web searches and ${opts.maxFetches ?? 4} page fetches.`;

  const result = await runClaude(
    ["--output-format", "stream-json", "--verbose", "--tools", "WebSearch", "WebFetch", "--allowedTools", "WebSearch", "WebFetch", "--system-prompt", opts.system],
    prompt,
    (event) => {
      const message = event.message as { content?: unknown } | undefined;
      if (!message || !Array.isArray(message.content)) return;
      for (const block of message.content as Record<string, unknown>[]) {
        if (event.type === "assistant" && block.type === "text" && typeof block.text === "string" && block.text.trim()) {
          const line = block.text.trim().split("\n")[0].slice(0, 140);
          opts.emit({ type: "log", message: line });
        } else if (event.type === "assistant" && block.type === "tool_use") {
          const input = block.input as { query?: string; url?: string };
          if (block.name === "WebSearch" && input.query) opts.emit({ type: "search", query: input.query });
          if (block.name === "WebFetch" && input.url) {
            opts.emit({ type: "fetch", url: input.url });
            addSource(input.url, fetchedTitles.get(input.url) ?? input.url);
          }
        } else if (event.type === "user" && block.type === "tool_result") {
          const text = toolResultText(block.content);
          for (const m of text.matchAll(LINK_RE)) {
            try {
              const title = JSON.parse(`"${m[1]}"`);
              const url = JSON.parse(`"${m[2]}"`);
              fetchedTitles.set(url, title);
              addSource(url, title);
            } catch {}
          }
        }
      }
    },
  );

  return { notes: result.result ?? "", sources: [...byUrl.values()], costUsd: result.total_cost_usd ?? 0 };
}

export async function cliStructure<S extends z.ZodType>(opts: { system: string; prompt: string; schema: S }): Promise<{ data: z.infer<S>; costUsd: number }> {
  // The CLI's validator doesn't resolve the draft-2020-12 meta-schema URL, so drop the $schema header.
  const { $schema: _meta, ...jsonSchema } = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  void _meta;
  const schema = JSON.stringify(jsonSchema);
  const result = await runClaude(["--output-format", "json", "--json-schema", schema, "--tools", "", "--system-prompt", opts.system], opts.prompt);
  const raw = result.structured_output ?? JSON.parse(result.result ?? "null");
  return { data: opts.schema.parse(raw), costUsd: result.total_cost_usd ?? 0 };
}
