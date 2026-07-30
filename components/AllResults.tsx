"use client";

import { useState } from "react";
import ComboCard from "./ComboCard";
import { comboKey } from "@/lib/combo";
import { dict, type Locale } from "@/lib/locales";
import type { ScoredCombo } from "@/lib/types";

const INITIAL_COUNT = 4;

/**
 * Full ranked list of remaining combos. Picks shown in the highlight
 * sections above are excluded via `excludeKeys`; the rest starts
 * collapsed to keep the page scannable.
 */
export default function AllResults({
  results,
  excludeKeys,
  lang,
}: {
  results: ScoredCombo[];
  excludeKeys: string[];
  lang: Locale;
}) {
  const t = dict[lang];
  const [expanded, setExpanded] = useState(false);

  const excluded = new Set(excludeKeys);
  const remaining = results.filter((r) => !excluded.has(comboKey(r)));
  if (remaining.length === 0) return null;

  const visible = expanded ? remaining : remaining.slice(0, INITIAL_COUNT);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-extrabold text-neutral-800 tracking-tight">
        {t.otherCandidates}
        <span className="ml-2 text-sm font-bold text-stone-400 tnum">
          {remaining.length}
        </span>
      </h2>

      <div className="space-y-5">
        {visible.map((r) => (
          <ComboCard
            key={comboKey(r)}
            r={r}
            rank={results.indexOf(r) + 1}
            lang={lang}
          />
        ))}
      </div>

      {remaining.length > INITIAL_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-neutral-800 shadow-sm transition-all hover:border-stone-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 cursor-pointer"
        >
          {expanded
            ? t.showLess
            : `${t.viewAllCombos.replace("{count}", remaining.length.toString())} ↓`}
        </button>
      )}
    </section>
  );
}
