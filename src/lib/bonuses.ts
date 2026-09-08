/**
 * System bonusów do szansy na Shiny i rzadkie spotkania.
 * Wszystkie wyliczenia wykonuje serwer — klient dostaje wyłącznie podgląd.
 */

export const SHINY_BASE_CHANCE = 1 / 512;

/** Bonus czasowy za wygraną walkę w Sali: +50% na 60 minut. */
export const GYM_BUFF = {
  key: "gym_victory",
  label: "Błogosławieństwo Lidera",
  source: "Wygrana walka w Sali",
  shiny_bonus_pct: 50,
  rare_bonus_pct: 50,
  minutes: 60,
} as const;

/** Trwałe bonusy: +3% za osiągnięcie, maksymalnie +20% łącznie. */
export const PERMANENT_BONUS_PCT = 3;
export const PERMANENT_CAP_PCT = 20;

export type BuffRow = {
  id: string;
  buff_key: string;
  label: string;
  source: string;
  shiny_bonus_pct: number;
  rare_bonus_pct: number;
  expires_at: string;
};

export type BonusRow = {
  id: string;
  bonus_key: string;
  label: string;
  shiny_bonus_pct: number;
  rare_bonus_pct: number;
  unlocked_at: string;
};

export type BonusState = {
  buffs: BuffRow[];
  permanent: BonusRow[];
  permanent_shiny_pct: number;
  permanent_cap_pct: number;
  shiny_multiplier: number;
  rare_multiplier: number;
  shiny_chance_text: string;
};

export function capPermanent(pct: number): number {
  return Math.min(PERMANENT_CAP_PCT, Math.max(0, pct));
}

/** Bonusy sumują się procentowo, a następnie mnożą bazową szansę 1/512. */
export function multiplierFromPct(totalPct: number): number {
  return 1 + Math.max(0, totalPct) / 100;
}

export function shinyDenom(multiplier: number): number {
  return Math.max(1, Math.round(1 / (SHINY_BASE_CHANCE * multiplier)));
}

export function chanceText(multiplier: number): string {
  return `1 / ${shinyDenom(multiplier)}`;
}

export type BonusHistoryRow = {
  id: string;
  kind: "timed" | "permanent" | string;
  bonus_key: string;
  label: string;
  source: string;
  shiny_bonus_pct: number;
  rare_bonus_pct: number;
  duration_minutes: number | null;
  started_at: string;
  expires_at: string | null;
  shiny_denom_before: number | null;
  shiny_denom_after: number | null;
};

export function bonusLabelForRegionSweep(region: string): string {
  return `Wszystkie Sale regionu ${region}`;
}
