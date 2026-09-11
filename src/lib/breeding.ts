/** Hodowla: łączenie dwóch Pokémonów w jajko, które dziedziczy IV rodziców. */

export const BREEDING_COST_COINS = 2500;
export const BREEDING_MIN_LEVEL = 20;
export const BREEDING_HATCH_MINUTES = 60;
export const BREEDING_MAX_ACTIVE_EGGS = 3;
export const BREEDING_HATCH_LEVEL = 5;
/** Ile statystyk dziedziczy najlepszą wartość rodziców. */
export const BREEDING_INHERITED_STATS = 3;

export const IV_KEYS = ["iv_hp", "iv_atk", "iv_def", "iv_spa", "iv_spd", "iv_spe"] as const;
export type IvKey = (typeof IV_KEYS)[number];

export const IV_LABEL: Record<IvKey, string> = {
  iv_hp: "HP",
  iv_atk: "Atak",
  iv_def: "Obrona",
  iv_spa: "Atak sp.",
  iv_spd: "Obrona sp.",
  iv_spe: "Szybkość",
};

export type BreedingParent = {
  id: string;
  species_id: number;
  species_name: string;
  level: number;
  is_shiny: boolean;
} & Record<IvKey, number>;

export type BreedingEgg = {
  id: string;
  species_id: number;
  species_name: string;
  parent_a_name: string;
  parent_b_name: string;
  level: number;
  inherited: string[];
  ready_at: string;
  ready: boolean;
} & Record<IvKey, number>;

export function eggIsReady(readyAt: string, now: Date = new Date()) {
  return Date.parse(readyAt) <= now.getTime();
}
