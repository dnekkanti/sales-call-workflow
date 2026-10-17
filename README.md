# Deal Desk: AI sales call prep workflow

A working prototype for the **Sales call prep memo** workflow. Enter your product and a prospect, and six Claude agents research the account live, map the buyers, and build a SPIN-based pre-call memo. After the call, paste your notes to generate prospect-facing collateral with an ROI calculator, an explicit call to action, and a 30-day follow-up plan you can import to your calendar.

Demo case: **Harvey** (legal AI) selling to **Moderna's legal department**.

## Workflow

| Stage | Agent | What it does | Tools |
|---|---|---|---|
| 1 | Prospect research | Financials, strategy, legal function, litigation, AI posture, trigger events | Claude Opus 5.5 + web search/fetch |
| 2 | Buyer ecosystem map | Named, verified stakeholders with buying roles, stance, influence, messaging | Claude + web search |
| 2 | Competitive & objections | Pricing signals, incumbent tools, battlecard, objections with SPIN reframes | Claude + web search |
| 3 | Account revenue model | Bottoms-up seat model, low/base/high scenarios, expansion. Math is computed in code | Claude reasoning |
| 3 | SPIN playbook & roadmap | Buying-process roadmap, SPIN questions per stakeholder, call agenda | Claude reasoning |
| 3 | Independent fact-check | Re-opens cited pages to verify claims, lists failure modes | Claude + web fetch |
| Post-call | Debrief | SPIN coverage scorecard, ROI inputs from the call, collateral, CTA, follow-up cadence | Claude reasoning |

**Trust design**
- Every URL the research agents actually open is captured server-side. The structuring step can only cite those ids, and any citation that is not in the list is removed. A "sourced" claim that loses its sources is downgraded to "estimated."
- Each claim is labeled Sourced, Estimated or Assumption.
- A separate fact-check agent re-fetches the cited pages and reports what it could and could not verify.
- Revenue and ROI numbers are calculated in code from editable assumptions, not by the model.

**Outputs:** pre-call memo (print to PDF), Excel revenue model with live formulas, prospect one-pager with an interactive ROI calculator (print to PDF), follow-up plan as an `.ics` calendar file, and the full run as JSON.

## Run locally

```bash
npm install
cp .env.example .env.local   # then paste your Anthropic API key
npm run dev
```

Open http://localhost:3000. A full pre-call run takes about 4-6 minutes and costs a few dollars in API usage. The app shows the cost per agent.

## Deploy to Vercel

1. Import this GitHub repo at https://vercel.com/new.
2. Add the environment variable `ANTHROPIC_API_KEY`.
3. Deploy. Each agent is a separate streaming request with a 300-second limit.

## Demo safety

Click **Export** after a good run and save the file as `public/sample-run.json`. A **Load saved run** button then appears, so you can demo instantly without waiting on live API calls.
