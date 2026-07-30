import { convertPriceToCny, getRegionalMonthlyPriceCny } from "./data";
import type { Plan } from "./types";

export type MonthlyPrice = {
  priceCny: number;
  priceSource: "official" | "regional_app_store";
};

export function resolveMonthlyPrice(plan: Plan, region?: string): MonthlyPrice {
  // For metered API options, fixed monthly price is often 0; runtime code
  // estimates usable quota from an assigned API budget.
  if (plan.pricingModel === "metered") {
    return { priceCny: 0, priceSource: "official" };
  }

  // US / JP users see local App Store list prices when we have them
  // (appstoreprice.org scrape); everything else uses the official baseline.
  if (region) {
    const regionalPriceCny = getRegionalMonthlyPriceCny(plan.id, region);
    if (regionalPriceCny !== null) {
      return { priceCny: regionalPriceCny, priceSource: "regional_app_store" };
    }
  }

  const base =
    plan.fixedMonthlyPrice !== undefined
      ? plan.fixedMonthlyPrice
      : plan.originalPrice;

  if (base === undefined || base === null) {
    return { priceCny: 0, priceSource: "official" };
  }

  return {
    priceCny: convertPriceToCny(base, plan.originalCurrency),
    priceSource: "official",
  };
}

export function getMonthlyPriceCny(plan: Plan, region?: string): number {
  return resolveMonthlyPrice(plan, region).priceCny;
}

export function classifyBudgetStatus(
  totalPriceCny: number,
  budgetCny: number,
  tolerance: number
): "within" | "slightlyOver" | "over" {
  if (totalPriceCny <= budgetCny) return "within";
  if (totalPriceCny <= budgetCny * (1 + tolerance)) return "slightlyOver";
  return "over";
}

export function formatPriceCny(amount: number): string {
  if (amount === 0) return "免费";
  if (amount < 1) return `¥${amount.toFixed(2)}`;
  return `¥${Math.round(amount)}`;
}
