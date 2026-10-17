import { formatSources, research, structure, validateCitations } from "./llm";
import {
  BuyersSchema,
  CompetitiveSchema,
  DebriefSchema,
  FactCheckSchema,
  PlaybookSchema,
  ProfileSchema,
  RevenueSchema,
} from "./schemas";
import type { Source, StepEvent, StepRequest } from "./types";

type Emit = (e: StepEvent) => void;

interface StepOutput {
  data: unknown;
  sources: Source[];
  costUsd: number;
}

function baseSystem(req: StepRequest): string {
  const { seller, productBrief, prospect, context } = req.setup;
  return `You are a senior enterprise sales strategist and research analyst supporting an account executive at ${seller}. Today's date is ${req.today}. The AE is preparing to sell to ${prospect}. The team runs the SPIN Selling methodology (Situation, Problem, Implication, Need-payoff).

Seller product brief (written by the seller; treat it as accurate about the product):
${productBrief}

Additional context from the AE: ${context || "none"}

Standards:
- Be specific and quantitative. Prefer primary sources (SEC filings, company press releases, official leadership pages, earnings call transcripts) over aggregators.
- Separate facts found in sources from your own estimates, and say which is which.
- Never invent people. If you cannot find a named person for a role, say the role is unnamed.
- Note the date of each fact and flag anything older than 18 months as possibly stale.`;
}

const STRUCTURE_RULES = `Rules for the JSON:
- Cite only ids from the numbered source list, like "P3". Never cite an id that is not in the list.
- confidence = "sourced" only when a listed source directly supports the claim; "estimated" for numbers you derived; "assumption" for judgment calls.
- Keep each string tight: one sentence, about 25 words at most, unless a field says otherwise. Write for a busy account executive.
- Do not put tags like [sourced] or source ids inside prose; citations go only in source_ids.`;

function json(value: unknown): string {
  return JSON.stringify(value, null, 1);
}

async function researchThenStructure<T>(
  req: StepRequest,
  emit: Emit,
  opts: {
    idPrefix: string;
    researchPrompt: string;
    structurePrompt: string;
    schema: Parameters<typeof structure>[0]["schema"];
    maxSearches?: number;
    maxFetches?: number;
  },
): Promise<StepOutput> {
  const system = baseSystem(req);
  emit({ type: "log", message: "Planning research and searching the web…" });
  const r = await research({
    system,
    prompt: opts.researchPrompt,
    emit,
    idPrefix: opts.idPrefix,
    maxSearches: opts.maxSearches,
    maxFetches: opts.maxFetches,
  });
  emit({ type: "log", message: `Read ${r.sources.length} pages. Structuring findings and checking citations…` });

  const s = await structure({
    system,
    schema: opts.schema,
    prompt: `${opts.structurePrompt}

${STRUCTURE_RULES}

<research_notes>
${r.notes}
</research_notes>

<sources>
${formatSources(r.sources)}
</sources>`,
  });

  const registry = new Map(r.sources.map((src) => [src.id, src]));
  const used = validateCitations(s.data, registry);
  return {
    data: s.data as T,
    sources: r.sources.filter((src) => used.has(src.id)),
    costUsd: r.costUsd + s.costUsd,
  };
}

async function profile(req: StepRequest, emit: Emit) {
  const { seller, prospect } = req.setup;
  return researchThenStructure(req, emit, {
    idPrefix: "P",
    schema: ProfileSchema,
    researchPrompt: `Research ${prospect} as a sales prospect for ${seller}. Find:
1. Company snapshot: latest annual revenue, net income or loss, cash position, employee count, HQ, and current strategic priorities and cost programs (latest 10-K / annual report and recent earnings calls).
2. The legal function: General Counsel / Chief Legal Officer and legal leadership, any public signal of legal team size (articles, job postings, filings), major litigation (especially IP and patent disputes), and regulatory and contracting load.
3. AI and technology posture: enterprise AI deployments, AI vendors and partners, statements by leadership about AI.
4. Trigger events in the last 12 months: leadership changes, restructuring or cost cuts, litigation milestones, product launches or approvals.

Use web search, and fetch the most important primary pages. End with organized markdown notes that put the source URL in parentheses after every fact.`,
    structurePrompt: `Convert these research notes on ${prospect} into the JSON schema. Give 6-8 key metrics, 3-5 strategic priorities, 3-6 key legal matters with why each matters to ${seller}, 3-5 AI/tech posture facts, and 3-6 dated trigger events. estimated_legal_headcount must be your best numeric estimate with its basis.`,
  });
}

async function buyers(req: StepRequest, emit: Emit) {
  const { seller, prospect } = req.setup;
  return researchThenStructure(req, emit, {
    idPrefix: "B",
    schema: BuyersSchema,
    researchPrompt: `Map the buying ecosystem at ${prospect} for a purchase of ${seller}.

What we already know about the account:
${json(req.results.profile ?? {})}

Identify current (2025-2026) leaders in: Legal (GC/CLO, deputy GCs, heads of IP, litigation, commercial/transactions, compliance, legal operations), IT and Digital (CIO, Chief Digital / AI officer, CISO), Finance (CFO), Procurement, and any executive sponsor of AI. Confirm each name is current using the company's leadership page, press releases or reputable news. Note reporting lines where known. End with markdown notes that put the source URL after every fact.`,
    structurePrompt: `Convert these notes into a buyer map of 8-12 stakeholders for ${seller} at ${prospect}. Include unnamed roles that matter to the deal (set is_named=false and name like "Unnamed — Head of Legal Operations"). Assign exactly one economic_buyer, and at least one champion candidate and one technical_evaluator. reports_to is a name or title from this list, or "" if unknown. Add 3-5 buying committee notes and 3-5 concrete access strategy steps (who to approach first and how).`,
  });
}

async function competitive(req: StepRequest, emit: Emit) {
  const { seller, prospect } = req.setup;
  return researchThenStructure(req, emit, {
    idPrefix: "C",
    schema: CompetitiveSchema,
    researchPrompt: `Research the competitive landscape for ${seller} at ${prospect}.

What we already know about the account:
${json(req.results.profile ?? {})}

Find:
1. ${seller} pricing and packaging signals (reported per-seat prices, minimums, enterprise deal sizes).
2. Tools ${prospect} already uses that overlap (enterprise ChatGPT or Copilot, CLM, e-discovery, legal research providers, in-house builds).
3. The main competitors and alternatives (for example Thomson Reuters CoCounsel, Lexis+ AI, Legora, Microsoft Copilot, ChatGPT Enterprise, building in-house), with recent news, strengths and weaknesses.
4. Public proof points for ${seller}: customer logos (especially in-house legal and life sciences), security certifications, funding and scale.
End with markdown notes that put the source URL after every fact.`,
    structurePrompt: `Convert these notes into competitive positioning for ${seller} at ${prospect}. Include 5-7 competitors or alternatives (include "status quo / in-house build"), 8-10 objections spread across the categories, each with a response, a proof point, and a SPIN-style reframe question. estimated_price_per_seat_per_year is a number in USD; if pricing is not public, give your best estimate and mark it estimated.`,
  });
}

async function revenue(req: StepRequest, emit: Emit) {
  const { seller, prospect } = req.setup;
  emit({ type: "log", message: "Building a bottoms-up seat model from research…" });
  const s = await structure({
    system: baseSystem(req),
    schema: RevenueSchema,
    effort: "medium",
    prompt: `Build a bottoms-up account revenue model for ${seller} at ${prospect}.

<profile>${json(req.results.profile)}</profile>
<competitive>${json(req.results.competitive)}</competitive>

Seat groups: start from the legal headcount estimate (attorneys, paralegals and legal professionals, contracts and compliance staff) and add adjacent teams only if they plausibly use the product (for example patent agents or regulatory writers). Adoption percentages are 0-100 for year 1 and year 3. Use the seller pricing estimate as price_per_seat_year. Typical enterprise discount_pct and annual_price_escalator_pct as numbers (for example 10 means 10%). List 2-4 expansion opportunities with an annual dollar value. Notes: 3-5 key assumptions a skeptical manager would challenge. Do not compute totals; the app computes them.`,
  });
  return { data: s.data, sources: [], costUsd: s.costUsd };
}

async function playbook(req: StepRequest, emit: Emit) {
  const { seller, prospect } = req.setup;
  emit({ type: "log", message: "Writing the buying roadmap, SPIN question bank and call plan…" });
  const s = await structure({
    system: baseSystem(req),
    schema: PlaybookSchema,
    effort: "medium",
    prompt: `Write the sales playbook for a first discovery call with ${prospect}. Never put tags like [sourced] in the text.

<profile>${json(req.results.profile)}</profile>
<buyers>${json(req.results.buyers)}</buyers>
<competitive>${json(req.results.competitive)}</competitive>

Produce:
- exec_summary: 5 bullets an AE reads in 30 seconds before the call, each under 25 words.
- deal_thesis: why ${prospect} should buy ${seller} now, in under 70 words.
- roadmap: 7-9 stages of this company's likely buying process (discovery, champion building, security and AI governance review, pilot, business case, legal and procurement, signature, rollout), with short stage names (under 6 words, no numbering), start_week and duration_weeks from today, owners named from the buyer map, and concrete seller and buyer actions.
- spin: for the 5-6 most important stakeholders (stakeholder = name and title only), 2-3 questions per SPIN letter, each under 30 words, specific to facts in the research (cite real matters, initiatives and numbers). Implication questions should grow the cost of the problem; Need-payoff questions should get the buyer to state the value.
- call_agenda: a 30-minute agenda in SPIN order.
- call_objectives: 3-4 outcomes that define a successful first call.`,
  });
  return { data: s.data, sources: [], costUsd: s.costUsd };
}

// Pulls the claims worth checking (those that cite a source) along with their URLs.
function claimsToCheck(req: StepRequest): string {
  const byId = new Map(req.sources.map((s) => [s.id, s]));
  const lines: string[] = [];
  const add = (text: string, ids: string[]) => {
    const urls = ids.map((id) => byId.get(id)?.url).filter(Boolean);
    if (urls.length) lines.push(`- ${text} (cited: ${urls.join(", ")})`);
  };
  const p = req.results.profile;
  p?.key_metrics.forEach((m) => add(`${m.label}: ${m.value}`, m.source_ids));
  p?.legal_function.overview.forEach((f) => add(f.text, f.source_ids));
  req.results.buyers?.stakeholders.filter((s) => s.is_named).forEach((s) => add(`${s.name} is ${s.title} at ${req.setup.prospect}`, s.source_ids));
  const c = req.results.competitive;
  if (c) add(`${req.setup.seller} pricing: ${c.seller_pricing.basis}`, c.seller_pricing.source_ids);
  c?.incumbent_tools.forEach((f) => add(f.text, f.source_ids));
  return lines.slice(0, 12).join("\n");
}

async function factcheck(req: StepRequest, emit: Emit) {
  const claims = claimsToCheck(req);
  return researchThenStructure(req, emit, {
    idPrefix: "F",
    schema: FactCheckSchema,
    maxSearches: 4,
    maxFetches: 12,
    researchPrompt: `You are an independent fact-checker. Verify each claim below by fetching its cited URL with web_fetch (use web search only if a page fails to load or is out of date). Be strict: a claim is verified only if the page states it; partially verified if the page supports part of it or the figure differs slightly; contradicted if the page or newer reporting says otherwise; unverified if you could not confirm it. Watch especially for people who have left their roles and for stale figures.

<claims>
${claims || "- (no cited claims were found)"}
</claims>

Then list the ways this research workflow could fail or mislead an AE for this account. End with markdown notes giving a verdict, evidence and URL for each claim.`,
    structurePrompt: `Convert the fact-check notes into the JSON schema. One entry per claim checked. Add 4-6 failure_modes (for example stale headcount, unnamed stakeholders, private pricing, paywalled sources) each with a mitigation. overall_note is a one-paragraph trust summary for the AE.`,
  });
}

async function debrief(req: StepRequest, emit: Emit) {
  const { seller, prospect } = req.setup;
  emit({ type: "log", message: "Reading call notes and drafting collateral, ROI model and follow-up plan…" });
  const s = await structure({
    system: baseSystem(req),
    schema: DebriefSchema,
    effort: "medium",
    prompt: `The AE just finished the discovery call with ${prospect}. Using the call notes and the pre-call research, produce the post-call package.

<call_notes>
${req.callNotes}
</call_notes>

<profile>${json(req.results.profile)}</profile>
<buyers>${json(req.results.buyers)}</buyers>
<competitive>${json(req.results.competitive)}</competitive>
<revenue_model>${json(req.results.revenue)}</revenue_model>
<playbook>${json(req.results.playbook)}</playbook>

Produce:
- call_summary (4-6 bullets), pains_confirmed (with evidence from the notes), and spin_coverage: how well each SPIN stage was covered and the gaps to close next time.
- roi_inputs: use numbers the buyer said on the call wherever possible, otherwise research estimates. Be conservative, because a CFO will discount anything that looks inflated: use the low end of any range the buyer gave, keep outside_counsel_reduction_pct modest (1-3% unless the buyer committed to more), set realization_pct (0-100, typically 40-60) for how much gross savings actually turns into value, and use ${seller}'s realistic enterprise price. users is the year-one seat count you would propose after the pilot. All percentages are 0-100. basis lists where each number came from ("call: ...", "research: ...", "assumption: ...").
- collateral: a one-page follow-up for the prospect, written to them (second person), in their own language from the call. Priorities map each stated pain to a ${seller} capability and a measurable outcome. Proof points must be public facts from the research, not invented customer quotes (3-5 points, each under 30 words). Propose a scoped pilot: scope under 60 words, participants as short role labels (for example "Deputy GC, IP & Litigation"), 3-4 success metrics. The CTA must be one explicit ask with a specific date.
- follow_up: 7-9 touches over the next 30 days. day_offset 0 is today's recap email. Include internal tasks (security questionnaire prep, champion coaching), meetings with the right stakeholders, and fully written emails (email_subject and email_body; empty strings for non-email items). Sign emails as "[Your name], ${seller}".
- forecast and deal_risk_updates based on what was learned.`,
  });
  return { data: s.data, sources: [], costUsd: s.costUsd };
}

export const STEPS = { profile, buyers, competitive, revenue, playbook, factcheck, debrief } as const;
