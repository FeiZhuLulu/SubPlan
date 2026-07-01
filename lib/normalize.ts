import { presets } from "./data";
import type { CapabilityKey, NeedWeights, UserInput } from "./types";

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

export function normalizeWeights(weights: Partial<Record<CapabilityKey, number>>): NeedWeights {
  const positive: Partial<Record<CapabilityKey, number>> = {};
  let sum = 0;

  for (const key of ALL_CAPABILITY_KEYS) {
    const v = weights[key] ?? 0;
    if (v > 0) {
      positive[key] = v;
      sum += v;
    }
  }

  if (sum === 0) {
    // Fallback to general chat if nothing selected
    return { chat: 1 };
  }

  const normalized: NeedWeights = {};
  for (const key of Object.keys(positive) as CapabilityKey[]) {
    normalized[key] = positive[key]! / sum;
  }
  return normalized;
}

export function buildNeedWeights(input: UserInput): NeedWeights {
  const primary = presets.primaryUseCases.find((p) => p.id === input.primaryUseCase);
  const secondary = presets.secondaryUseCases.find((p) => p.id === input.secondaryUseCase);

  const merged: Partial<Record<CapabilityKey, number>> = {};

  // Primary use case contributes 70% of the final weight mass
  if (primary) {
    for (const [key, value] of Object.entries(primary.weights)) {
      merged[key as CapabilityKey] = (merged[key as CapabilityKey] ?? 0) + value * 0.7;
    }
  }

  // Secondary use case contributes 30%
  if (secondary && Object.keys(secondary.weights).length > 0) {
    for (const [key, value] of Object.entries(secondary.weights)) {
      merged[key as CapabilityKey] = (merged[key as CapabilityKey] ?? 0) + value * 0.3;
    }
  }

  // Add-ons add small bumps
  if (input.addOns) {
    for (const addOn of input.addOns) {
      const bump = presets.addOnWeights[addOn as CapabilityKey];
      if (bump && bump > 0) {
        merged[addOn as CapabilityKey] = (merged[addOn as CapabilityKey] ?? 0) + bump;
      }
    }
  }

  return normalizeWeights(merged);
}

export function formatWeights(weights: NeedWeights): string {
  return Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${presets.capabilityLabels[k as CapabilityKey] ?? k}: ${(v * 100).toFixed(0)}%`)
    .join("，");
}
