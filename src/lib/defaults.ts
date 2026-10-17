import type { Setup } from "./types";

export const DEFAULT_SETUP: Setup = {
  seller: "Harvey",
  prospect: "Moderna",
  productBrief: `Harvey is a domain-specific generative AI platform for legal and professional services teams.
- Assistant: drafting, redlining, summarization and Q&A over uploaded documents, grounded in legal reasoning.
- Vault: secure workspaces to analyze thousands of documents at once (contracts, discovery sets, diligence data rooms) with tabular review.
- Knowledge: research across legal, regulatory and tax sources.
- Workflows and agents: pre-built and custom multi-step legal workflows (for example contract playbook review, chronology building, patent and regulatory analysis).
- Integrations with Microsoft Word and Outlook and document management systems.
- Enterprise security: SOC 2 Type II and ISO 27001, customer data is not used to train models, data residency options.
Sold to law firms and in-house legal departments, typically as annual per-seat enterprise licenses.`,
  context: "First discovery call with Moderna's legal department. Goal: qualify the opportunity and earn a scoped pilot.",
};

// A made-up call for the demo. Speakers are identified by role only so nothing is attributed to real people.
export const SAMPLE_CALL_NOTES = `[SIMULATED DISCOVERY CALL: for demo purposes only]
Date: today. 30 minutes, Zoom.
Attendees (Moderna): Deputy General Counsel, IP & Litigation; Head of Legal Operations. Joined late: Director, Commercial Contracts.
Attendees (Harvey): Account Executive, Solutions Lead.

SITUATION
- Legal Ops: "We're around 140 people across legal, compliance and IP, roughly 80 of them attorneys." Contracts team handles clinical trial agreements, CRO/CDMO supply agreements, and partnering deals. Says CTA volume is "a few thousand agreements a year across sites."
- Company-wide ChatGPT Enterprise rollout already in place. Legal uses it for first drafts of non-privileged memos and summaries, but policy bars uploading privileged material or patent strategy documents.
- Contract lifecycle tool in place; review is still manual against a Word playbook.

PROBLEM
- Deputy GC: patent litigation and licensing work is the biggest outside-counsel line. "Document review and chronology building is where the bills pile up."
- Contracts Director: CTA turnaround averages ~3 weeks; site activation for trials gets delayed waiting on legal. Team is flat on headcount while volume is up.
- Legal Ops: under the company-wide cost reduction push, legal was asked to cut outside counsel spend meaningfully next year. Rough outside counsel spend: "well north of $50M a year," most of it IP and litigation.

IMPLICATION
- Each week of CTA delay pushes trial site activation; Contracts Director agreed delays "show up in enrollment timelines," which the business notices.
- Deputy GC: if they can't bring more review in-house, the cost target "probably means cutting matters we'd rather fight."
- Attorneys spending an estimated 6-8 hours a week on first-pass review and summarization that they consider low value.

NEED-PAYOFF
- Deputy GC would value something that can safely work on privileged litigation and patent documents. "If I could do chronologies in-house in days, that's real money."
- Contracts Director: "If first-pass CTA review against our playbook took an hour instead of days, I'd take it tomorrow."
- Legal Ops wants hard numbers: hours saved and outside counsel dollars avoided, measurable in a pilot.

OBJECTIONS / CONCERNS RAISED
- "Why not just extend ChatGPT Enterprise? We already pay for it." (Deputy GC)
- InfoSec and the AI governance committee must approve any tool touching privileged data; last vendor review took ~10 weeks.
- Budget for new tools this year is tight; anything new needs to show payback inside 12 months. CFO office signs off above $250K.
- Concern about hallucinated citations in legal work.

BUYING PROCESS SIGNALS
- Deputy GC would sponsor a pilot; GC must approve. Legal Ops runs the business case.
- AI governance committee meets monthly; next meeting in about 3 weeks.
- They'd want 15-25 users in a pilot across IP/litigation and contracts.

NEXT STEPS DISCUSSED
- Harvey to send security package and a pilot proposal with success metrics.
- Legal Ops to share anonymized CTA turnaround data.
- Tentative follow-up with the GC in two weeks if the pilot proposal lands.`;
