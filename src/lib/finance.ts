import type { Debrief, Revenue } from "./schemas";

export interface Scenario {
  key: "low" | "base" | "high";
  label: string;
  adoptionMult: number;
  priceMult: number;
}

export const SCENARIOS: Scenario[] = [
  { key: "low", label: "Low", adoptionMult: 0.6, priceMult: 0.85 },
  { key: "base", label: "Base", adoptionMult: 1, priceMult: 1 },
  { key: "high", label: "High", adoptionMult: 1.3, priceMult: 1.1 },
];

export interface YearRow {
  year: number;
  seats: number;
  netPrice: number;
  arr: number;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

// Year 2 adoption is interpolated halfway between the year 1 and year 3 inputs.
export function adoptionFor(g: Revenue["seat_groups"][number], year: number): number {
  return clampPct(g.adoption_pct_year1 + ((g.adoption_pct_year3 - g.adoption_pct_year1) * (year - 1)) / 2);
}

export function projectRevenue(rev: Revenue, s: Scenario = SCENARIOS[1]) {
  const years: YearRow[] = [1, 2, 3].map((year) => {
    const seats = rev.seat_groups.reduce(
      (sum, g) => sum + Math.round((g.headcount * clampPct(adoptionFor(g, year) * s.adoptionMult)) / 100),
      0,
    );
    const netPrice =
      rev.price_per_seat_year * s.priceMult * (1 - rev.discount_pct / 100) * Math.pow(1 + rev.annual_price_escalator_pct / 100, year - 1);
    return { year, seats, netPrice, arr: seats * netPrice };
  });
  const expansion = rev.expansion_opportunities.reduce((sum, e) => sum + e.estimated_annual_value, 0);
  const tcv = years.reduce((sum, y) => sum + y.arr, 0);
  return { years, tcv, expansion };
}

export type RoiInputs = Debrief["roi_inputs"];

export function computeRoi(i: RoiInputs) {
  // Realization haircuts gross savings: not every saved hour becomes redeployed, billable-equivalent work.
  const realization = (i.realization_pct ?? 50) / 100;
  const timeValue = i.users * i.hours_saved_per_user_per_week * i.working_weeks_per_year * i.loaded_hourly_cost * realization;
  const counselValue = ((i.outside_counsel_spend_annual * i.outside_counsel_reduction_pct) / 100) * realization;
  const annualValue = timeValue + counselValue;
  const annualCost = i.users * i.price_per_seat_year;
  const firstYearCost = annualCost + i.implementation_cost;
  const paybackMonths = annualValue > 0 ? firstYearCost / (annualValue / 12) : Infinity;
  const roiMultiple = firstYearCost > 0 ? annualValue / firstYearCost : 0;
  const hoursFreed = i.users * i.hours_saved_per_user_per_week * i.working_weeks_per_year;
  return { timeValue, counselValue, annualValue, annualCost, firstYearCost, paybackMonths, roiMultiple, hoursFreed };
}

export const usd = (n: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(n);
