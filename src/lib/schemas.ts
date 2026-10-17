import { z } from "zod";

// Every factual claim carries the ids of the sources it came from and how much we trust it.
// "sourced" = stated in a cited source, "estimated" = derived from sourced data, "assumption" = judgment call.
const confidence = z.enum(["sourced", "estimated", "assumption"]);

const fact = z.object({
  text: z.string(),
  source_ids: z.array(z.string()),
  confidence,
});

export const ProfileSchema = z.object({
  company_name: z.string(),
  one_liner: z.string(),
  key_metrics: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      source_ids: z.array(z.string()),
      confidence,
    }),
  ),
  strategic_priorities: z.array(fact),
  legal_function: z.object({
    overview: z.array(fact),
    estimated_legal_headcount: z.object({
      attorneys: z.number(),
      legal_professionals_total: z.number(),
      basis: z.string(),
      confidence,
    }),
    key_matters: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        relevance_to_seller: z.string(),
        source_ids: z.array(z.string()),
      }),
    ),
  }),
  ai_and_tech_posture: z.array(fact),
  trigger_events: z.array(
    z.object({
      date: z.string(),
      event: z.string(),
      implication: z.string(),
      source_ids: z.array(z.string()),
    }),
  ),
  deal_risks: z.array(z.string()),
});

export const BuyersSchema = z.object({
  stakeholders: z.array(
    z.object({
      name: z.string(),
      is_named: z.boolean(),
      title: z.string(),
      function: z.string(),
      buying_role: z.enum([
        "economic_buyer",
        "champion",
        "technical_evaluator",
        "user_buyer",
        "gatekeeper",
        "influencer",
        "blocker",
      ]),
      influence: z.enum(["high", "medium", "low"]),
      likely_stance: z.enum(["supporter", "neutral", "skeptic"]),
      reports_to: z.string(),
      priorities: z.array(z.string()),
      what_they_need_to_hear: z.string(),
      source_ids: z.array(z.string()),
      confidence,
    }),
  ),
  buying_committee_notes: z.array(z.string()),
  access_strategy: z.array(z.string()),
});

export const CompetitiveSchema = z.object({
  seller_pricing: z.object({
    model: z.string(),
    estimated_price_per_seat_per_year: z.number(),
    basis: z.string(),
    source_ids: z.array(z.string()),
    confidence,
  }),
  incumbent_tools: z.array(fact),
  competitors: z.array(
    z.object({
      name: z.string(),
      positioning: z.string(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      how_to_win: z.string(),
      source_ids: z.array(z.string()),
    }),
  ),
  objections: z.array(
    z.object({
      objection: z.string(),
      likely_from: z.string(),
      category: z.enum(["security", "price", "status_quo", "competitor", "accuracy", "adoption", "procurement"]),
      response: z.string(),
      proof_point: z.string(),
      spin_reframe: z.string(),
    }),
  ),
  differentiators: z.array(fact),
});

export const RevenueSchema = z.object({
  seat_groups: z.array(
    z.object({
      group: z.string(),
      headcount: z.number(),
      adoption_pct_year1: z.number(),
      adoption_pct_year3: z.number(),
      rationale: z.string(),
    }),
  ),
  price_per_seat_year: z.number(),
  price_rationale: z.string(),
  discount_pct: z.number(),
  annual_price_escalator_pct: z.number(),
  expansion_opportunities: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      estimated_annual_value: z.number(),
    }),
  ),
  notes: z.array(z.string()),
});

export const PlaybookSchema = z.object({
  exec_summary: z.array(z.string()),
  deal_thesis: z.string(),
  roadmap: z.array(
    z.object({
      stage: z.string(),
      start_week: z.number(),
      duration_weeks: z.number(),
      owners: z.array(z.string()),
      seller_actions: z.array(z.string()),
      buyer_actions: z.array(z.string()),
      exit_criteria: z.string(),
      risks: z.string(),
    }),
  ),
  spin: z.array(
    z.object({
      stakeholder: z.string(),
      situation: z.array(z.string()),
      problem: z.array(z.string()),
      implication: z.array(z.string()),
      need_payoff: z.array(z.string()),
    }),
  ),
  call_agenda: z.array(
    z.object({
      minutes: z.number(),
      segment: z.string(),
      goal: z.string(),
    }),
  ),
  call_objectives: z.array(z.string()),
});

export const FactCheckSchema = z.object({
  checks: z.array(
    z.object({
      claim: z.string(),
      verdict: z.enum(["verified", "partially_verified", "unverified", "contradicted"]),
      evidence: z.string(),
      source_url: z.string(),
    }),
  ),
  failure_modes: z.array(
    z.object({
      area: z.string(),
      issue: z.string(),
      mitigation: z.string(),
    }),
  ),
  overall_note: z.string(),
});

export const DebriefSchema = z.object({
  call_summary: z.array(z.string()),
  pains_confirmed: z.array(
    z.object({
      pain: z.string(),
      evidence: z.string(),
      stakeholder: z.string(),
    }),
  ),
  spin_coverage: z.object({
    situation: z.string(),
    problem: z.string(),
    implication: z.string(),
    need_payoff: z.string(),
    gaps_to_close: z.array(z.string()),
  }),
  roi_inputs: z.object({
    users: z.number(),
    loaded_hourly_cost: z.number(),
    hours_saved_per_user_per_week: z.number(),
    working_weeks_per_year: z.number(),
    outside_counsel_spend_annual: z.number(),
    outside_counsel_reduction_pct: z.number(),
    price_per_seat_year: z.number(),
    implementation_cost: z.number(),
    realization_pct: z.number(),
    basis: z.array(z.string()),
  }),
  collateral: z.object({
    headline: z.string(),
    subheadline: z.string(),
    what_we_heard: z.array(z.string()),
    priorities: z.array(
      z.object({
        priority: z.string(),
        capability: z.string(),
        outcome: z.string(),
      }),
    ),
    proof_points: z.array(z.string()),
    pilot: z.object({
      scope: z.string(),
      duration_weeks: z.number(),
      success_metrics: z.array(z.string()),
      participants: z.array(z.string()),
    }),
    cta: z.object({
      headline: z.string(),
      ask: z.string(),
      deadline: z.string(),
    }),
  }),
  follow_up: z.array(
    z.object({
      day_offset: z.number(),
      duration_minutes: z.number(),
      channel: z.enum(["email", "meeting", "call", "task"]),
      title: z.string(),
      owner: z.string(),
      attendees: z.array(z.string()),
      purpose: z.string(),
      email_subject: z.string(),
      email_body: z.string(),
    }),
  ),
  forecast: z.object({
    stage: z.string(),
    probability_pct: z.number(),
    rationale: z.string(),
  }),
  deal_risk_updates: z.array(z.string()),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Buyers = z.infer<typeof BuyersSchema>;
export type Competitive = z.infer<typeof CompetitiveSchema>;
export type Revenue = z.infer<typeof RevenueSchema>;
export type Playbook = z.infer<typeof PlaybookSchema>;
export type FactCheck = z.infer<typeof FactCheckSchema>;
export type Debrief = z.infer<typeof DebriefSchema>;
