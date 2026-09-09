/**
 * Nagrody za pokonanie Lidera Sali — jedno źródło prawdy.
 * Gwarantowane: odznaka (zapisywana osobno), zastrzyk Catch Coins, Flakony Energii,
 * awans Badań Profesora Oaka. Losowe: kamień ewolucyjny w typie Sali, Ultra Balle, TM.
 */

import { TMS, tmItemKey, type TmDef } from "@/lib/finds";

/** Polskie nazwy typów z danych Sal → angielskie klucze typów ruchów/kamieni. */
const TYPE_MAP: Record<string, string> = {
  Normalny: "normal",
  Ogień: "fire",
  Woda: "water",
  Trawa: "grass",
  Elektryczny: "electric",
  Lód: "ice",
  Walka: "fighting",
  Trucizna: "poison",
  Ziemia: "ground",
  Lot: "flying",
  Psychiczny: "psychic",
  Robak: "bug",
  Skała: "rock",
  Duch: "ghost",
  Smok: "dragon",
  Mrok: "dark",
  Stal: "steel",
  Wróżka: "fairy",
};

/** Kamień ewolucyjny pasujący do typu Sali (tylko część typów ma swój kamień). */
const STONE_BY_TYPE: Record<string, string> = {
  fire: "fire_stone",
  water: "water_stone",
  electric: "thunder_stone",
  grass: "leaf_stone",
  psychic: "moon_stone",
  fairy: "moon_stone",
  rock: "sun_stone",
  ground: "sun_stone",
};

export function gymTypeKey(plType: string): string {
  return TYPE_MAP[plType] ?? "normal";
}

/** Gwarantowane monety: 2000 CC w pierwszej Sali, 3000 CC w ósmej. */
export function gymCoinReward(index: number): number {
  return 2000 + Math.round(((Math.min(8, Math.max(1, index)) - 1) / 7) * 1000);
}

/** Gwarantowane Flakony Energii: 3 przy pierwszej Sali, 5 przy ósmej. */
export function gymBottleReward(index: number): number {
  return index >= 7 ? 5 : index >= 4 ? 4 : 3;
}

export type GymDrop =
  | { kind: "stone"; itemKey: string; label: string }
  | { kind: "balls"; count: number }
  | { kind: "tm"; itemKey: string; tm: TmDef };

const STONE_LABELS: Record<string, string> = {
  fire_stone: "Kamień Ognia",
  water_stone: "Kamień Wody",
  thunder_stone: "Kamień Gromu",
  leaf_stone: "Kamień Liścia",
  moon_stone: "Kamień Księżyca",
  sun_stone: "Kamień Słońca",
};

/**
 * Losowe dropy po wygranej. Każdy losowany niezależnie, więc czasem wypadnie
 * kilka rzeczy, a czasem nic poza gwarantowanym pakietem.
 */
export function rollGymDrops(plType: string, index: number, rng = Math.random): GymDrop[] {
  const type = gymTypeKey(plType);
  const drops: GymDrop[] = [];

  const stone = STONE_BY_TYPE[type];
  if (stone && rng() < 0.35) {
    drops.push({ kind: "stone", itemKey: stone, label: STONE_LABELS[stone] ?? "Kamień ewolucyjny" });
  }

  if (rng() < 0.5) {
    drops.push({ kind: "balls", count: rng() < 0.5 ? 2 : 3 });
  }

  // TM z atakiem Lidera — im dalsza Sala, tym większa szansa (20% → 45%).
  const tm = TMS.find((entry) => entry.type === type);
  if (tm && rng() < 0.2 + (Math.min(8, index) - 1) * 0.035) {
    drops.push({ kind: "tm", itemKey: tmItemKey(tm.id), tm });
  }

  return drops;
}
