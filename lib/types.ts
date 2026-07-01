export type CapabilityKey =
  | "frontend"
  | "backend"
  | "agentCoding"
  | "debugging"
  | "codeReview"
  | "chineseWriting"
  | "englishWriting"
  | "research"
  | "chat"
  | "imageGeneration"
  | "multimodal"
  | "ecosystem";

export type PlanCategory =
  | "chat_subscription"
  | "coding_subscription"
  | "agent_subscription"
  | "api_router"
  | "local_model"
  | "cloud_model"
  | "bundle";

export type RecommendationRole =
  | "primary_subscription"
  | "supplementary_api"
  | "local_option"
  | "team_plan"
  | "bundle";

export type AccessMode =
  | "web_app"
  | "mobile_app"
  | "cli"
  | "api"
  | "ide"
  | "ide_plugin"
  | "desktop"
  | "desktop_app"
  | "office_suite"
  | "local_runtime"
  | "local";

export type BillingCycle =
  | "monthly"
  | "monthly_per_user"
  | "annual"
  | "free"
  | "first_month"
  | "pay_as_you_go"
  | "unknown";

export type CurrencyCode = "CNY" | "USD" | "EUR" | "JPY";

export type Plan = {
  id: string;
  provider: string;
  name: string;
  region: string;
  recommendationRole: RecommendationRole;
  category: PlanCategory;
  accessModes: AccessMode[];
  originalPrice: number;
  originalCurrency: CurrencyCode | string;
  billingCycle: BillingCycle;
  priceStatus: string;
  sourceStatus: string;
  sourceUrl: string;
  lastCheckedAt: string;
  enabledForRecommendation: boolean;
  notes?: string;
  usageMultiplierLabel?: string;
  discountPrices?: Array<{
    billingCycle: string;
    displayMonthlyPrice: number;
    totalPrice: number;
    currency: CurrencyCode | string;
    discountLabel: string;
  }>;
  // API-specific fields
  pricingModel?: "metered" | "fixed";
  fixedMonthlyPrice?: number;
  requiresUserAcceptsApiBilling?: boolean;
  pricesPerMToken?: {
    inputCacheHit?: number;
    inputCacheMiss?: number;
    output?: number;
  };
  creditPurchaseFee?: {
    type: string;
    percentage: number;
    minimum: number;
    currency: CurrencyCode | string;
  };
};

export type CapabilityScores = Record<CapabilityKey, number>;

export type CapabilityScoreRecord = {
  planId: string;
  scores: CapabilityScores;
  scoreConfidence: string;
  scoreBasis: string;
  notes?: string;
};

export type Quota = {
  planId: string;
  estimatedTextWorkloadCapacityMTokens?: number | null;
  quotaBasis: string;
  quotaConfidence: string;
  capacityMultiplier?: string | null;
  cacheHitRateAssumption: number;
  source: string;
  notes?: string;
  billingValueUsd?: number;
  billingEquivalentMTokens?: number;
};

export type PlanRelation = {
  planA: string;
  planB: string;
  overlapScore: number;
  complementScore: number;
  explanation: string;
};

export type UseCasePreset = {
  id: string;
  label: string;
  weights: Partial<Record<CapabilityKey, number>>;
};

export type Presets = {
  schemaVersion: string;
  lastUpdatedAt: string;
  capabilityKeys: CapabilityKey[];
  capabilityLabels: Record<CapabilityKey, string>;
  primaryUseCases: UseCasePreset[];
  secondaryUseCases: UseCasePreset[];
  addOnWeights: Partial<Record<CapabilityKey | string, number>>;
};

export type FxRate = {
  currency: string;
  rateToCny: number;
  source: string;
  asOf: string;
};

export type HighIntelligenceRatioPreset = "low" | "medium" | "high" | "extreme";

export type UserInput = {
  budgetCny: number;
  budgetTolerance?: 0 | 0.15 | 0.25;
  monthlyDemandMTokens: number;
  primaryUseCase: string;
  secondaryUseCase?: string;
  region: "CN" | "GLOBAL" | "US" | "JP";
  acceptsApiBilling: boolean;
  hasForeignCard: boolean;
  existingPlanIds?: string[];
  addOns?: string[];
  highIntelligenceRatioPreset?: HighIntelligenceRatioPreset; // Added for v0.2
};

export type NeedWeights = Partial<Record<CapabilityKey, number>>;

export type IntelligenceTier = "S" | "A" | "B" | "C" | "D"; // Added for v0.2

export type ModelTierRecord = { // Added for v0.2
  planId: string;
  tierByCapability: Partial<Record<CapabilityKey, IntelligenceTier>>;
  evidenceLevel: "high" | "medium" | "low";
  notes?: string;
};

export type PlanInCombo = Plan & {
  scoreRecord: CapabilityScoreRecord;
  quota: Quota | null;
  priceCny: number;
  textQuota: number; // effective monthly MTokens
  isExisting?: boolean;
  isUpgrade?: boolean;
  upgradeFromPlanName?: string;
  upgradeDeltaCny?: number;
  modelTier?: ModelTierRecord; // Added for v0.2
  highIntelligenceQuotaByCapability?: Record<CapabilityKey, number>; // Added for v0.2
};

export type Combo = {
  plans: PlanInCombo[];
  totalPriceCny: number;
  newPriceCny: number;
  totalTextQuota: number;
  usageCoverage: number; // totalTextQuota / demand
  highIntelligenceEffectiveQuota?: number; // Added for v0.2
  highIntelligenceDemand?: number; // Added for v0.2
  highIntelligenceCoverage?: number; // Added for v0.2
  generalQuota?: number; // Added for v0.2
  generalDemand?: number; // Added for v0.2
  generalCoverage?: number; // Added for v0.2
};

export type AllocationDetail = {
  capability: CapabilityKey;
  planId: string;
  planName: string;
  allocatedMTokens: number;
  score: number;
};

export type ScoredCombo = {
  combo: Combo;
  capabilityScore: number;
  adjustment: number;
  finalScore: number;
  allocationDetails: AllocationDetail[];
  coverageStatus: "sufficient" | "tight" | "insufficient";
  budgetStatus: "within" | "slightlyOver" | "over";
  reasons: string[];
  cautions: string[];
  capabilityBreakdown: Partial<Record<CapabilityKey, { primaryPlan: string; allocated: number; score: number }>>;
};

export type RecommendResponse = {
  results: ScoredCombo[];
  assumptions: string[];
  dataVersion: string;
};
