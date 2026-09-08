import { useEffect, useState } from "react";

import { GROWTH_LABEL, MAX_POKEMON_LEVEL, expToNext, loadGrowthRate } from "@/lib/pokemon-exp";

/** Pasek EXP Pokémona: postęp do następnego poziomu i ile EXP brakuje. */
export function ExpBar({
  speciesId,
  level,
  exp,
  className = "",
}: {
  speciesId: number;
  level: number;
  exp: number;
  className?: string;
}) {
  const [growth, setGrowth] = useState("medium-fast");

  useEffect(() => {
    let active = true;
    void loadGrowthRate(speciesId).then((name) => {
      if (active) setGrowth(name);
    });
    return () => {
      active = false;
    };
  }, [speciesId]);

  if (level >= MAX_POKEMON_LEVEL) {
    return (
      <p className={`text-xs text-muted-foreground ${className}`}>Maksymalny poziom — 100</p>
    );
  }

  const need = expToNext(level, growth);
  const pct = Math.max(0, Math.min(100, Math.round((exp / Math.max(1, need)) * 100)));
  const missing = Math.max(0, need - exp);

  return (
    <div className={className}>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
        title={`Krzywa wzrostu: ${GROWTH_LABEL[growth] ?? growth}`}
      >
        <div className="h-full rounded-full bg-aurora transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        EXP {exp}/{need} · brakuje {missing} do Lvl {level + 1}
      </p>
    </div>
  );
}
