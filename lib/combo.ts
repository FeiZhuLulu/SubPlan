import type { ScoredCombo } from "./types";

/** Stable identity of a combo across server/client boundaries. */
export function comboKey(r: ScoredCombo): string {
  return r.combo.plans
    .map((p) => p.id)
    .sort()
    .join(",");
}
