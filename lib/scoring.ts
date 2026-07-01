import { getAllPlans, getPlanRelations, getCapabilityScore, getModelTier } from "./data";
import { buildNeedWeights } from "./normalize";
import { getMonthlyPriceCny, classifyBudgetStatus } from "./budget";
import { getEffectiveTextQuota, classifyCoverage } from "./quota";
import {
  type CapabilityKey,
  type UserInput,
  type Plan,
  type PlanInCombo,
  type Combo,
  type ScoredCombo,
  type AllocationDetail,
  type NeedWeights,
  type IntelligenceTier,
} from "./types";

const MAX_COMBO_ITEMS = 3;
const MAX_ADDITIONAL_ITEMS_WITH_EXISTING = 2;
const COMBO_ADJUSTMENT_RANGE = 5;
const MIN_HIGH_INTELLIGENCE_COVERAGE = 0.9;
const MIN_IMPLICIT_CAPABILITY_WEIGHT_FOR_NEW_PLAN = 0.2;
const MIN_MATERIAL_NEW_PLAN_ALLOCATION_RATIO = 0.12;

const ALL_CAPABILITY_KEYS: CapabilityKey[] = [
  "frontend",
  "backend",
  "agentCoding",
  "debugging",
  "codeReview",
  "chineseWriting",
  "englishWriting",
  "research",
  "chat",
  "imageGeneration",
  "multimodal",
  "ecosystem",
];

const CORE_HIGH_INTELLIGENCE_CAPS = new Set<CapabilityKey>([
  "agentCoding",
  "backend",
  "debugging",
  "codeReview",
  "research",
]);

const HIGH_INTELLIGENCE_QUOTA_FACTOR: Record<IntelligenceTier, number> = {
  S: 1,
  A: 0.85,
  B: 0.45,
  C: 0.15,
  D: 0,
};

type DemandLayer = "high" | "general";

type CapabilityDemand = {
  capability: CapabilityKey;
  weight: number;
  highDemand: number;
  generalDemand: number;
  allocatedHigh: number;
  allocatedGeneral: number;
};

type DemandAllocationResult = {
  allocationDetails: AllocationDetail[];
  capabilityBreakdown: ScoredCombo["capabilityBreakdown"];
  totalQuality: number;
  highDemand: number;
  allocatedHigh: number;
  highCoverage: number;
  generalDemand: number;
  allocatedGeneral: number;
  generalCoverage: number;
};

function getExplicitCapabilitySelections(input: UserInput): Set<CapabilityKey> {
  const explicit = new Set<CapabilityKey>();
  if (input.secondaryUseCase && ALL_CAPABILITY_KEYS.includes(input.secondaryUseCase as CapabilityKey)) {
    explicit.add(input.secondaryUseCase as CapabilityKey);
  }
  for (const addOn of input.addOns ?? []) {
    if (ALL_CAPABILITY_KEYS.includes(addOn as CapabilityKey)) {
      explicit.add(addOn as CapabilityKey);
    }
  }
  return explicit;
}

function isMinorImplicitCapability(
  capability: CapabilityKey,
  weights: NeedWeights,
  explicitCapabilities: Set<CapabilityKey>
): boolean {
  return (
    (weights[capability] ?? 0) < MIN_IMPLICIT_CAPABILITY_WEIGHT_FOR_NEW_PLAN &&
    !explicitCapabilities.has(capability)
  );
}

function estimateApiQuota(plan: Plan, budgetForApiCny: number): number {
  if (plan.pricingModel !== "metered" || !plan.pricesPerMToken) {
    return getEffectiveTextQuota(plan);
  }

  const cacheHitRate = 0.95;
  const inputRatio = 0.7;
  const outputRatio = 0.3;

  const costPerMToken =
    plan.pricesPerMToken.inputCacheHit! * cacheHitRate * inputRatio +
    plan.pricesPerMToken.inputCacheMiss! * (1 - cacheHitRate) * inputRatio +
    plan.pricesPerMToken.output! * outputRatio;

  if (costPerMToken <= 0) return 0;

  const budgetInPlanCurrency =
    plan.originalCurrency === "USD" ? budgetForApiCny / 6.798 : budgetForApiCny;

  return budgetInPlanCurrency / costPerMToken;
}

function isExistingPlan(plan: Plan, input: UserInput): boolean {
  return input.existingPlanIds?.includes(plan.id) ?? false;
}

function isFreePrimarySubscription(plan: Plan): boolean {
  return plan.recommendationRole === "primary_subscription" && plan.originalPrice === 0;
}

function planIsEligible(plan: Plan, input: UserInput): boolean {
  if (!plan.enabledForRecommendation) return false;

  if (isExistingPlan(plan, input)) return true;

  if (isFreePrimarySubscription(plan)) return false;

  if (input.region !== "GLOBAL" && plan.region !== "GLOBAL" && plan.region !== input.region) {
    return false;
  }

  if (plan.recommendationRole === "supplementary_api" || plan.requiresUserAcceptsApiBilling) {
    if (!input.acceptsApiBilling) return false;
  }

  return true;
}

function getHighIntelligenceRatio(preset?: UserInput["highIntelligenceRatioPreset"]): number {
  switch (preset) {
    case "low":
      return 0.2;
    case "medium":
      return 0.5;
    case "high":
      return 0.8;
    case "extreme":
      return 0.95;
    default:
      return 0.5;
  }
}

function planWithRuntime(plan: Plan, input: UserInput): PlanInCombo {
  const scoreRecord = getCapabilityScore(plan.id) ?? {
    planId: plan.id,
    scores: Object.fromEntries(ALL_CAPABILITY_KEYS.map((key) => [key, 50])) as Record<
      CapabilityKey,
      number
    >,
    scoreConfidence: "low",
    scoreBasis: "fallback",
  };

  const priceCny = getMonthlyPriceCny(plan);
  const textQuota = getEffectiveTextQuota(plan);
  const modelTier = getModelTier(plan.id);
  const highIntelligenceQuotaByCapability = {} as Record<CapabilityKey, number>;

  for (const capability of ALL_CAPABILITY_KEYS) {
    const defaultTier: IntelligenceTier = CORE_HIGH_INTELLIGENCE_CAPS.has(capability) ? "C" : "B";
    const tier = modelTier?.tierByCapability?.[capability] ?? defaultTier;
    highIntelligenceQuotaByCapability[capability] =
      textQuota * (HIGH_INTELLIGENCE_QUOTA_FACTOR[tier] ?? HIGH_INTELLIGENCE_QUOTA_FACTOR.C);
  }

  return {
    ...plan,
    scoreRecord,
    quota: null,
    priceCny,
    textQuota,
    isExisting: isExistingPlan(plan, input),
    modelTier,
    highIntelligenceQuotaByCapability,
  };
}

function* generateCombos(plans: PlanInCombo[], maxItems: number): Generator<PlanInCombo[]> {
  const n = plans.length;
  for (let r = 1; r <= maxItems && r <= n; r++) {
    const indices = new Array(r).fill(0).map((_, index) => index);
    while (true) {
      yield indices.map((index) => plans[index]);

      let pos = r - 1;
      while (pos >= 0 && indices[pos] === n - r + pos) pos--;
      if (pos < 0) break;
      indices[pos]++;
      for (let j = pos + 1; j < r; j++) indices[j] = indices[j - 1] + 1;
    }
  }
}

function* generateCombosWithExistingBase(
  plans: PlanInCombo[],
  input: UserInput
): Generator<PlanInCombo[]> {
  const existingPlans = plans.filter((plan) => input.existingPlanIds?.includes(plan.id));

  if (existingPlans.length === 0) {
    yield* generateCombos(plans, MAX_COMBO_ITEMS);
    return;
  }

  const existingIds = new Set(existingPlans.map((plan) => plan.id));
  const existingPrimaryByProvider = new Map<string, PlanInCombo>(
    existingPlans
      .filter((plan) => plan.recommendationRole === "primary_subscription")
      .map((plan) => [plan.provider, plan])
  );

  const additionalPlans = plans.filter((plan) => {
    if (existingIds.has(plan.id)) return false;
    if (isFreePrimarySubscription(plan)) return false;

    const existingPrimary = existingPrimaryByProvider.get(plan.provider);
    if (plan.recommendationRole === "primary_subscription" && existingPrimary) {
      return plan.priceCny > existingPrimary.priceCny;
    }

    return true;
  });

  yield existingPlans;

  const maxAdditionalItems = Math.min(MAX_ADDITIONAL_ITEMS_WITH_EXISTING, additionalPlans.length);
  for (const additions of generateCombos(additionalPlans, maxAdditionalItems)) {
    const primaryProvidersInAdditions = new Set<string>();
    let hasDuplicatePrimaryProvider = false;

    for (const addition of additions) {
      if (addition.recommendationRole !== "primary_subscription") continue;
      if (primaryProvidersInAdditions.has(addition.provider)) {
        hasDuplicatePrimaryProvider = true;
        break;
      }
      primaryProvidersInAdditions.add(addition.provider);
    }

    if (hasDuplicatePrimaryProvider) continue;

    const upgradeProviders = new Set(
      additions
        .filter(
          (addition) =>
            addition.recommendationRole === "primary_subscription" &&
            existingPrimaryByProvider.has(addition.provider)
        )
        .map((addition) => addition.provider)
    );
    const basePlans = existingPlans.filter(
      (plan) =>
        plan.recommendationRole !== "primary_subscription" ||
        !upgradeProviders.has(plan.provider)
    );
    const additionsWithUpgradeMeta = additions.map((addition) => {
      const existingPrimary = existingPrimaryByProvider.get(addition.provider);
      if (
        addition.recommendationRole === "primary_subscription" &&
        existingPrimary &&
        addition.priceCny > existingPrimary.priceCny
      ) {
        return {
          ...addition,
          isUpgrade: true,
          upgradeFromPlanName: existingPrimary.name,
          upgradeDeltaCny: addition.priceCny - existingPrimary.priceCny,
        };
      }
      return addition;
    });

    yield [...basePlans, ...additionsWithUpgradeMeta];
  }
}

function buildCombo(selectedPlans: PlanInCombo[], input: UserInput): Combo | null {
  const fixedCost = selectedPlans
    .filter((plan) => plan.pricingModel !== "metered")
    .reduce((sum, plan) => sum + plan.priceCny, 0);
  const newFixedCost = selectedPlans
    .filter((plan) => plan.pricingModel !== "metered" && !plan.isExisting)
    .reduce(
      (sum, plan) => sum + (plan.isUpgrade ? plan.upgradeDeltaCny ?? plan.priceCny : plan.priceCny),
      0
    );

  const meteredPlans = selectedPlans.filter((plan) => plan.pricingModel === "metered");
  const remainingForApi = Math.max(0, input.budgetCny - fixedCost);
  const budgetPerApi = meteredPlans.length > 0 ? remainingForApi / meteredPlans.length : 0;

  let totalPriceCny = fixedCost;
  let newPriceCny = newFixedCost;
  let totalTextQuota = selectedPlans
    .filter((plan) => plan.pricingModel !== "metered")
    .reduce((sum, plan) => sum + plan.textQuota, 0);

  for (const apiPlan of meteredPlans) {
    const apiQuota = estimateApiQuota(apiPlan, budgetPerApi);
    totalTextQuota += apiQuota;
    totalPriceCny += budgetPerApi;
    if (!apiPlan.isExisting) {
      newPriceCny += budgetPerApi;
    }
  }

  return {
    plans: selectedPlans,
    totalPriceCny,
    newPriceCny,
    totalTextQuota,
    usageCoverage:
      input.monthlyDemandMTokens > 0 ? totalTextQuota / input.monthlyDemandMTokens : 1,
  };
}

function buildCapabilityDemands(
  weights: NeedWeights,
  totalDemand: number,
  highRatio: number
): CapabilityDemand[] {
  return (Object.keys(weights) as CapabilityKey[])
    .filter((capability) => (weights[capability] ?? 0) > 0)
    .sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0))
    .map((capability) => {
      const weight = weights[capability] ?? 0;
      const demand = weight * totalDemand;
      const highDemand = CORE_HIGH_INTELLIGENCE_CAPS.has(capability) ? demand * highRatio : 0;
      const generalDemand = CORE_HIGH_INTELLIGENCE_CAPS.has(capability)
        ? demand * (1 - highRatio)
        : demand;

      return {
        capability,
        weight,
        highDemand,
        generalDemand,
        allocatedHigh: 0,
        allocatedGeneral: 0,
      };
    });
}

function addAllocationDetail(
  allocationDetails: AllocationDetail[],
  detail: AllocationDetail
): void {
  const existing = allocationDetails.find(
    (item) => item.capability === detail.capability && item.planId === detail.planId
  );

  if (existing) {
    existing.allocatedMTokens += detail.allocatedMTokens;
    existing.score = Math.max(existing.score, detail.score);
    return;
  }

  allocationDetails.push(detail);
}

function allocateDemandLayer(
  combo: Combo,
  capDemand: CapabilityDemand,
  layer: DemandLayer,
  remainingPhysical: Map<string, number>,
  allocationDetails: AllocationDetail[]
): { allocatedTotal: number; qualityPoints: number } {
  const demand = layer === "high" ? capDemand.highDemand : capDemand.generalDemand;
  let remainingDemand = demand;
  let allocatedTotal = 0;
  let qualityPoints = 0;

  const rankedPlans = [...combo.plans]
    .filter((plan) => (remainingPhysical.get(plan.id) ?? 0) > 0)
    .sort((a, b) => {
      const scoreDelta =
        (b.scoreRecord.scores[capDemand.capability] ?? 0) -
        (a.scoreRecord.scores[capDemand.capability] ?? 0);
      if (scoreDelta !== 0) return scoreDelta;
      return b.textQuota - a.textQuota;
    });

  for (const plan of rankedPlans) {
    if (remainingDemand <= 0) break;

    const physical = remainingPhysical.get(plan.id) ?? 0;
    const highQuota =
      layer === "high"
        ? plan.highIntelligenceQuotaByCapability?.[capDemand.capability] ?? 0
        : Number.POSITIVE_INFINITY;
    const maxAllocatable = Math.min(physical, highQuota);

    if (maxAllocatable <= 0) continue;

    const allocated = Math.min(remainingDemand, maxAllocatable);
    const rawScore = plan.scoreRecord.scores[capDemand.capability] ?? 0;
    const qualityFactor =
      layer === "high" && plan.textQuota > 0
        ? highQuota / plan.textQuota
        : 1;

    remainingPhysical.set(plan.id, physical - allocated);
    remainingDemand -= allocated;
    allocatedTotal += allocated;
    qualityPoints += allocated * rawScore * qualityFactor;

    addAllocationDetail(allocationDetails, {
      capability: capDemand.capability,
      planId: plan.id,
      planName: plan.name,
      allocatedMTokens: allocated,
      score: rawScore,
    });
  }

  return { allocatedTotal, qualityPoints };
}

function allocateDemand(
  combo: Combo,
  weights: NeedWeights,
  totalDemand: number,
  highRatio: number
): DemandAllocationResult {
  const allocationDetails: AllocationDetail[] = [];
  const capabilityBreakdown: ScoredCombo["capabilityBreakdown"] = {};
  const remainingPhysical = new Map<string, number>();

  for (const plan of combo.plans) {
    remainingPhysical.set(plan.id, plan.textQuota);
  }

  const capDemands = buildCapabilityDemands(weights, totalDemand, highRatio);
  let totalQuality = 0;

  for (const capDemand of capDemands) {
    if (capDemand.highDemand <= 0) continue;
    const highAllocation = allocateDemandLayer(
      combo,
      capDemand,
      "high",
      remainingPhysical,
      allocationDetails
    );
    capDemand.allocatedHigh = highAllocation.allocatedTotal;
    totalQuality += highAllocation.qualityPoints;
  }

  for (const capDemand of capDemands) {
    if (capDemand.generalDemand <= 0) continue;
    const generalAllocation = allocateDemandLayer(
      combo,
      capDemand,
      "general",
      remainingPhysical,
      allocationDetails
    );
    capDemand.allocatedGeneral = generalAllocation.allocatedTotal;
    totalQuality += generalAllocation.qualityPoints;
  }

  for (const capDemand of capDemands) {
    const totalAllocated = capDemand.allocatedHigh + capDemand.allocatedGeneral;
    if (totalAllocated <= 0) continue;

    const details = allocationDetails.filter(
      (detail) => detail.capability === capDemand.capability
    );
    const primaryDetail = details.reduce(
      (max, detail) => (detail.allocatedMTokens > max.allocatedMTokens ? detail : max),
      details[0]
    );

    capabilityBreakdown[capDemand.capability] = {
      primaryPlan: primaryDetail.planName,
      allocated: totalAllocated,
      score: primaryDetail.score,
    };
  }

  const highDemand = capDemands.reduce((sum, demand) => sum + demand.highDemand, 0);
  const allocatedHigh = capDemands.reduce((sum, demand) => sum + demand.allocatedHigh, 0);
  const generalDemand = capDemands.reduce((sum, demand) => sum + demand.generalDemand, 0);
  const allocatedGeneral = capDemands.reduce((sum, demand) => sum + demand.allocatedGeneral, 0);

  return {
    allocationDetails,
    capabilityBreakdown,
    totalQuality,
    highDemand,
    allocatedHigh,
    highCoverage: highDemand > 0 ? allocatedHigh / highDemand : 1,
    generalDemand,
    allocatedGeneral,
    generalCoverage: generalDemand > 0 ? allocatedGeneral / generalDemand : 1,
  };
}

function applyAllocationToCombo(combo: Combo, allocation: DemandAllocationResult): Combo {
  combo.highIntelligenceDemand = allocation.highDemand;
  combo.highIntelligenceEffectiveQuota = allocation.allocatedHigh;
  combo.highIntelligenceCoverage = allocation.highCoverage;
  combo.generalDemand = allocation.generalDemand;
  combo.generalQuota = allocation.allocatedGeneral;
  combo.generalCoverage = allocation.generalCoverage;
  return combo;
}

function computeComboAdjustment(combo: Combo): number {
  let adjustment = 0;

  for (let i = 0; i < combo.plans.length; i++) {
    for (let j = i + 1; j < combo.plans.length; j++) {
      const a = combo.plans[i].id;
      const b = combo.plans[j].id;
      const rel = getPlanRelations().find(
        (relation) =>
          (relation.planA === a && relation.planB === b) ||
          (relation.planA === b && relation.planB === a)
      );
      if (rel) {
        adjustment += rel.complementScore * 0.05;
        adjustment -= rel.overlapScore * 0.05;
      }
    }
  }

  const categories = combo.plans.map((plan) => plan.category);
  const chatCount = categories.filter((category) => category === "chat_subscription").length;
  const codingCount = categories.filter((category) => category === "coding_subscription").length;

  if (chatCount > 1) adjustment -= 2;
  if (codingCount > 1) adjustment -= 2;
  if (chatCount >= 1 && codingCount >= 1) adjustment += 2;

  const allFree = combo.plans.every((plan) => plan.originalPrice === 0);
  if (allFree && combo.totalTextQuota < 100) adjustment -= 2;

  const accessModes = new Set(combo.plans.flatMap((plan) => plan.accessModes));
  if (accessModes.has("api") && accessModes.has("ide") && accessModes.has("web_app")) {
    adjustment -= 1;
  }

  return Math.max(-COMBO_ADJUSTMENT_RANGE, Math.min(COMBO_ADJUSTMENT_RANGE, adjustment));
}

function generateReasons(combo: Combo, weights: NeedWeights, adjustment: number): string[] {
  const reasons: string[] = [];
  const topCapability = (Object.entries(weights).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "chat") as CapabilityKey;

  const bestPlan = [...combo.plans].sort(
    (a, b) =>
      (b.scoreRecord.scores[topCapability] ?? 0) -
      (a.scoreRecord.scores[topCapability] ?? 0)
  )[0];

  if (bestPlan) {
    reasons.push(`在核心需求「${topCapability}」上，${bestPlan.name} 能力较强。`);
  }

  const totalDemand = (combo.highIntelligenceDemand ?? 0) + (combo.generalDemand ?? 0);
  const percent =
    totalDemand > 0 ? Math.round(((combo.highIntelligenceDemand ?? 0) / totalDemand) * 100) : 0;
  const highCapabilityOwners = combo.plans
    .filter((plan) => {
      const tier = plan.modelTier?.tierByCapability;
      return tier && Object.values(tier).some((value) => value === "S" || value === "A");
    })
    .map((plan) => plan.name);
  const plansStr =
    highCapabilityOwners.length > 0 ? highCapabilityOwners.join(" / ") : "高分档订阅";

  if ((combo.highIntelligenceDemand ?? 0) > 0) {
    reasons.push(
      `核心复杂任务中约 ${percent}% 需要高智能模型，该组合已分配约 ${Math.round(
        combo.highIntelligenceEffectiveQuota ?? 0
      )} MTokens 高智能额度，主要由 ${plansStr} 承担。`
    );
  }

  if (combo.plans.length > 1) {
    reasons.push(`组合共 ${combo.plans.length} 个订阅，覆盖不同使用场景。`);
  }

  if (adjustment > 1) {
    reasons.push("订阅之间互补性较好，重复支出较少。");
  }

  reasons.push("用量来源为社区统计与 AI 估算，不承诺 100% 准确。");

  return reasons;
}

function generateCautions(
  combo: Combo,
  budgetStatus: ScoredCombo["budgetStatus"],
  coverageStatus: ScoredCombo["coverageStatus"]
): string[] {
  const cautions: string[] = [];
  if (budgetStatus === "slightlyOver") {
    cautions.push("该组合总月成本略超预算，但性价比更高。");
  }
  if (coverageStatus === "tight") {
    cautions.push("额度刚好覆盖你的用量，建议留一些余量。");
  }
  if (
    combo.highIntelligenceCoverage !== undefined &&
    combo.highIntelligenceCoverage < 1 &&
    combo.highIntelligenceCoverage >= MIN_HIGH_INTELLIGENCE_COVERAGE
  ) {
    cautions.push("总额度充足，但复杂 Agent/后端任务的高智能额度偏紧。");
  }
  if (combo.plans.some((plan) => plan.originalCurrency === "USD")) {
    cautions.push("部分订阅为美元定价，需确认支付方式。");
  }
  return cautions;
}

function dedupeRegionalApiPlans(plans: PlanInCombo[], input: UserInput): PlanInCombo[] {
  return plans.filter((plan, _, arr) => {
    if (plan.isExisting) return true;
    if (plan.region === "GLOBAL" && input.region !== "GLOBAL") {
      const hasExactRegionMatch = arr.some(
        (other) =>
          other.name === plan.name &&
          other.provider === plan.provider &&
          other.region === input.region
      );
      if (hasExactRegionMatch) return false;
    }
    return true;
  });
}

export function recommend(input: UserInput): ScoredCombo[] {
  const weights = buildNeedWeights(input);
  const explicitCapabilities = getExplicitCapabilitySelections(input);
  const highRatio = getHighIntelligenceRatio(input.highIntelligenceRatioPreset);
  const eligiblePlans = getAllPlans()
    .filter((plan) => planIsEligible(plan, input))
    .map((plan) => planWithRuntime(plan, input));
  const dedupedPlans = dedupeRegionalApiPlans(eligiblePlans, input);
  const candidates: ScoredCombo[] = [];

  for (const comboPlans of generateCombosWithExistingBase(dedupedPlans, input)) {
    const combo = buildCombo(comboPlans, input);
    if (!combo) continue;

    const allocation = allocateDemand(combo, weights, input.monthlyDemandMTokens, highRatio);
    applyAllocationToCombo(combo, allocation);

    const budgetStatus = classifyBudgetStatus(
      combo.totalPriceCny,
      input.budgetCny,
      input.budgetTolerance ?? 0.15
    );
    if (budgetStatus === "over") continue;

    const coverageStatus = classifyCoverage(combo.usageCoverage);
    if (coverageStatus === "insufficient") continue;

    if ((combo.highIntelligenceCoverage ?? 1) < MIN_HIGH_INTELLIGENCE_COVERAGE) {
      continue;
    }

    if (combo.plans.length > 1 && input.monthlyDemandMTokens > 0) {
      const planAllocations = new Map<string, number>();
      const materialPlanAllocations = new Map<string, number>();
      for (const plan of combo.plans) {
        planAllocations.set(plan.id, 0);
        materialPlanAllocations.set(plan.id, 0);
      }
      for (const detail of allocation.allocationDetails) {
        planAllocations.set(
          detail.planId,
          (planAllocations.get(detail.planId) ?? 0) + detail.allocatedMTokens
        );
        if (!isMinorImplicitCapability(detail.capability, weights, explicitCapabilities)) {
          materialPlanAllocations.set(
            detail.planId,
            (materialPlanAllocations.get(detail.planId) ?? 0) + detail.allocatedMTokens
          );
        }
      }

      const hasRedundantPlan = combo.plans.some((plan) => {
        if (plan.isExisting) return false;
        const allocated = planAllocations.get(plan.id) ?? 0;
        const materialAllocated = materialPlanAllocations.get(plan.id) ?? 0;
        if (allocated === 0) return true;
        if (materialAllocated === 0) return true;
        if (plan.recommendationRole === "supplementary_api") {
          return materialAllocated < 5 && materialAllocated < 0.05 * input.monthlyDemandMTokens;
        }
        return materialAllocated < MIN_MATERIAL_NEW_PLAN_ALLOCATION_RATIO * input.monthlyDemandMTokens;
      });

      if (hasRedundantPlan) continue;
    }

    const capabilityScore =
      input.monthlyDemandMTokens > 0 ? allocation.totalQuality / input.monthlyDemandMTokens : 0;
    const adjustment = computeComboAdjustment(combo);
    const finalScore = capabilityScore + adjustment;

    candidates.push({
      combo,
      capabilityScore,
      adjustment,
      finalScore,
      allocationDetails: allocation.allocationDetails,
      coverageStatus,
      budgetStatus,
      reasons: generateReasons(combo, weights, adjustment),
      cautions: generateCautions(combo, budgetStatus, coverageStatus),
      capabilityBreakdown: allocation.capabilityBreakdown,
    });
  }

  const seen = new Set<string>();
  const unique: ScoredCombo[] = [];
  for (const candidate of candidates.sort((a, b) => b.finalScore - a.finalScore)) {
    const key = candidate.combo.plans
      .map((plan) => plan.id)
      .sort()
      .join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(candidate);
    }
  }

  return unique.slice(0, 30);
}

export { buildNeedWeights, ALL_CAPABILITY_KEYS };
