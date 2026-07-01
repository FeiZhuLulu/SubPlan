import { recommend as scoreAndRecommend } from "./scoring";
import { buildNeedWeights, ALL_CAPABILITY_KEYS } from "./scoring";
import type { UserInput, ScoredCombo, CapabilityKey } from "./types";

export { buildNeedWeights, ALL_CAPABILITY_KEYS };
export type { UserInput, ScoredCombo, CapabilityKey };

export function recommend(input: UserInput): ScoredCombo[] {
  return scoreAndRecommend(input);
}
