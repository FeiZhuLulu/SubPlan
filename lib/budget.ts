import { convertPriceToCny } from "./data";
import type { Plan } from "./types";

export function getMonthlyPriceCny(plan: Plan): number {
  // For metered API options, fixed monthly price is often 0; runtime code
  // estimates usable quota from an assigned API budget.
  if (plan.pricingModel === "metered") {
    return 0;
  }

  const base =
    plan.fixedMonthlyPrice !== undefined
      ? plan.fixedMonthlyPrice
      : plan.originalPrice;

  if (base === undefined || base === null) return 0;

  return convertPriceToCny(base, plan.originalCurrency);
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
