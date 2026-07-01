import { getQuota, defaultCacheHitRate } from "./data";
import type { Plan } from "./types";

export function getEffectiveTextQuota(plan: Plan): number {
  const q = getQuota(plan.id);
  if (!q) return 0;

  // For fixed subscriptions, use the estimated text workload capacity.
  if (q.estimatedTextWorkloadCapacityMTokens !== undefined && q.estimatedTextWorkloadCapacityMTokens !== null) {
    return q.estimatedTextWorkloadCapacityMTokens;
  }

  // For metered API options, no fixed quota (handled separately via API budget).
  return 0;
}

export function getCacheHitRate(plan: Plan): number {
  const q = getQuota(plan.id);
  return q?.cacheHitRateAssumption ?? defaultCacheHitRate;
}

export function classifyCoverage(
  coverageRatio: number
): "sufficient" | "tight" | "insufficient" {
  if (coverageRatio >= 1) return "sufficient";
  if (coverageRatio >= 0.9) return "tight";
  return "insufficient";
}
