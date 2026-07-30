import plansData from "@/data/plans.json";
import scoresData from "@/data/scores.json";
import quotasData from "@/data/quotas.json";
import relationsData from "@/data/relations.json";
import presetsData from "@/data/presets.json";
import fxRatesData from "@/data/fx-rates.json";
import apiOptionsData from "@/data/api-options.json";
import modelTiersData from "@/data/model-tiers.json";
import modelAccessProfilesData from "@/data/model-access-profiles.json";
import regionalPricesData from "@/data/regional-prices.json";

import type {
  Plan,
  CapabilityScoreRecord,
  Quota,
  PlanRelation,
  Presets,
  FxRate,
  ModelTierRecord,
  ModelAccessProfile,
  RegionalPriceApp,
} from "./types";

type DataFile = Record<string, unknown>;
type PlansFile = DataFile & { plans?: Plan[] };
type ApiOptionsFile = DataFile & { apiOptions?: Plan[] };
type ScoresFile = DataFile & { planCapabilityScores?: CapabilityScoreRecord[] };
type QuotasFile = DataFile & { quotas?: Quota[] };
type RelationsFile = DataFile & { planRelations?: PlanRelation[] };
type FxRatesFile = DataFile & { rates?: FxRate[] };
type ModelTiersFile = DataFile & { tiers?: ModelTierRecord[] };
type ModelAccessProfilesFile = DataFile & { profiles?: ModelAccessProfile[] };
type RegionalPricesFile = DataFile & { apps?: RegionalPriceApp[] };

// Static definitions for client-side bundle or build-time fallback
const staticPlans: Plan[] = (plansData as unknown as PlansFile).plans ?? [];
const staticApiOptions: Plan[] = (apiOptionsData as unknown as ApiOptionsFile).apiOptions ?? [];
const staticAllPlans: Plan[] = [...staticPlans, ...staticApiOptions];
const staticCapabilityScores: CapabilityScoreRecord[] =
  (scoresData as unknown as ScoresFile).planCapabilityScores ?? [];
const staticQuotas: Quota[] = (quotasData as unknown as QuotasFile).quotas ?? [];
const staticPlanRelations: PlanRelation[] =
  (relationsData as unknown as RelationsFile).planRelations ?? [];
const staticModelTiers: ModelTierRecord[] =
  (modelTiersData as unknown as ModelTiersFile).tiers ?? [];
const staticModelAccessProfiles: ModelAccessProfile[] =
  (modelAccessProfilesData as unknown as ModelAccessProfilesFile).profiles ?? [];
const staticRegionalPriceApps: RegionalPriceApp[] =
  (regionalPricesData as unknown as RegionalPricesFile).apps ?? [];

export const presets: Presets = presetsData as unknown as Presets;
export const fxRates: FxRate[] = (fxRatesData as unknown as FxRatesFile).rates ?? [];

function readDataFileOnServer<T extends DataFile>(filename: string): T | null {
  if (typeof window === "undefined") {
    try {
      const nodeRequire = eval("require") as NodeRequire;
      const fs = nodeRequire("fs") as typeof import("fs");
      const path = nodeRequire("path") as typeof import("path");
      const filepath = path.join(process.cwd(), "data", filename);
      const content = fs.readFileSync(filepath, "utf-8");
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`Failed to read dynamic file ${filename}, using static fallback.`, error);
    }
  }
  return null;
}

export function getAllPlans(): Plan[] {
  const dynamicPlansFile = readDataFileOnServer<PlansFile>("plans.json");
  const dynamicApiOptionsFile = readDataFileOnServer<ApiOptionsFile>("api-options.json");
  if (dynamicPlansFile && dynamicApiOptionsFile) {
    return [
      ...(dynamicPlansFile.plans || []),
      ...(dynamicApiOptionsFile.apiOptions || [])
    ];
  }
  return staticAllPlans;
}

export function getPlanRelations(): PlanRelation[] {
  const dynamicRelationsFile = readDataFileOnServer<RelationsFile>("relations.json");
  if (dynamicRelationsFile) {
    return dynamicRelationsFile.planRelations || [];
  }
  return staticPlanRelations;
}

export function getCapabilityScore(planId: string): CapabilityScoreRecord | undefined {
  const dynamicScoresFile = readDataFileOnServer<ScoresFile>("scores.json");
  const scores: CapabilityScoreRecord[] = dynamicScoresFile 
    ? (dynamicScoresFile.planCapabilityScores || []) 
    : staticCapabilityScores;
  return scores.find((s) => s.planId === planId);
}

export function getQuota(planId: string): Quota | undefined {
  const dynamicQuotasFile = readDataFileOnServer<QuotasFile>("quotas.json");
  const qList: Quota[] = dynamicQuotasFile 
    ? (dynamicQuotasFile.quotas || []) 
    : staticQuotas;
  return qList.find((q) => q.planId === planId);
}

export function getModelTier(planId: string): ModelTierRecord | undefined {
  const dynamicTiersFile = readDataFileOnServer<ModelTiersFile>("model-tiers.json");
  const tiers: ModelTierRecord[] = dynamicTiersFile 
    ? (dynamicTiersFile.tiers || []) 
    : staticModelTiers;
  return tiers.find((t) => t.planId === planId);
}

export function getAllModelTiers(): ModelTierRecord[] {
  const dynamicTiersFile = readDataFileOnServer<ModelTiersFile>("model-tiers.json");
  if (dynamicTiersFile) {
    return dynamicTiersFile.tiers || [];
  }
  return staticModelTiers;
}

export function getModelAccessProfile(planId: string): ModelAccessProfile | undefined {
  const dynamicProfilesFile = readDataFileOnServer<ModelAccessProfilesFile>(
    "model-access-profiles.json"
  );
  const profiles: ModelAccessProfile[] = dynamicProfilesFile
    ? dynamicProfilesFile.profiles || []
    : staticModelAccessProfiles;
  return profiles.find((profile) => profile.planId === planId);
}

// App Store products whose planIdHint does not equal the plan id in plans.json.
const REGIONAL_PRICE_HINT_ALIASES: Record<string, string> = {
  google_ai_ultra_20x_us: "google_ai_ultra_us",
};

/**
 * Monthly App Store regional list price (CNY) for a plan, from
 * data/regional-prices.json. Only US / JP are exposed per product.
 * A single hint often maps to several IAP products (storage tiers,
 * annual vs monthly, promos), so we take the most common monthly
 * priceCny (mode; ties resolve to the lower price).
 */
export function getRegionalMonthlyPriceCny(
  planId: string,
  region: string
): number | null {
  if (region !== "US" && region !== "JP") return null;

  const dynamicRegionalFile = readDataFileOnServer<RegionalPricesFile>(
    "regional-prices.json"
  );
  const apps: RegionalPriceApp[] = dynamicRegionalFile
    ? dynamicRegionalFile.apps || []
    : staticRegionalPriceApps;

  const hint = REGIONAL_PRICE_HINT_ALIASES[planId] ?? planId;
  const priceKey = region === "US" ? "usPrice" : "jpPrice";

  const counts = new Map<number, number>();
  for (const app of apps) {
    for (const product of app.products) {
      if (product.planIdHint !== hint || product.period !== "P1M") continue;
      const priceCny = product[priceKey]?.priceCny;
      if (typeof priceCny !== "number" || priceCny <= 0) continue;
      counts.set(priceCny, (counts.get(priceCny) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return null;

  let best: number | null = null;
  for (const [priceCny, count] of counts) {
    if (
      best === null ||
      count > counts.get(best)! ||
      (count === counts.get(best)! && priceCny < best)
    ) {
      best = priceCny;
    }
  }
  return best;
}

const fxMap = new Map<string, number>();
fxRates.forEach((r) => fxMap.set(r.currency, r.rateToCny));

export function getFxRateToCny(currency: string): number {
  return fxMap.get(currency) ?? 7.2;
}

export function convertPriceToCny(amount: number, currency: string): number {
  if (!amount || amount <= 0) return 0;
  const rate = getFxRateToCny(currency);
  return amount * rate;
}

export const defaultCacheHitRate: number = 0.95;
export const budgetToleranceDefault: number = 0.15;
