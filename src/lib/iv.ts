/** Ocena IV (Individual Values) — wpływa TYLKO na statystyki, nigdy na poziom. */

export const IV_MAX_PER_STAT = 31;
export const IV_MAX_TOTAL = IV_MAX_PER_STAT * 6;

export type IvSource = {
  iv_hp: number;
  iv_atk: number;
  iv_def: number;
  iv_spa: number;
  iv_spd: number;
  iv_spe: number;
};

export function ivTotal(mon: IvSource): number {
  return (
    (mon.iv_hp ?? 0) +
    (mon.iv_atk ?? 0) +
    (mon.iv_def ?? 0) +
    (mon.iv_spa ?? 0) +
    (mon.iv_spd ?? 0) +
    (mon.iv_spe ?? 0)
  );
}

/** IV w procentach (0–100). */
export function ivPercent(mon: IvSource): number {
  return Math.max(0, Math.min(100, Math.round((ivTotal(mon) / IV_MAX_TOTAL) * 100)));
}

export type IvRating = {
  key: "common" | "good" | "great" | "excellent" | "hundo";
  label: string;
  className: string;
};

/** Etykieta jakości Pokémona wg IV%. */
export function ivRating(percent: number): IvRating {
  if (percent >= 100) {
    return { key: "hundo", label: "Hundo (100%)", className: "text-amber-300 ring-amber-300/50 bg-amber-400/15" };
  }
  if (percent >= 90) {
    return { key: "excellent", label: "Doskonały", className: "text-fuchsia-300 ring-fuchsia-300/50 bg-fuchsia-400/15" };
  }
  if (percent >= 75) {
    return { key: "great", label: "Bardzo dobry", className: "text-sky-300 ring-sky-300/50 bg-sky-400/15" };
  }
  if (percent >= 50) {
    return { key: "good", label: "Dobry", className: "text-emerald-300 ring-emerald-300/50 bg-emerald-400/15" };
  }
  return { key: "common", label: "Pospolity", className: "text-muted-foreground ring-border/60 bg-muted/40" };
}
