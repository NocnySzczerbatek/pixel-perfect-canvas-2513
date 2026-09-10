/** Mistrzostwo regionu: procent złapanych gatunków dostępnych w danym regionie. */

import { BIOMES } from "@/lib/biomes";
import { REGIONS } from "@/lib/game-data";
import { inRegion, REGION_SPECIES } from "@/lib/pokedex";

export const MASTERY_TIERS = [25, 50, 75, 100] as const;
export type MasteryTier = (typeof MASTERY_TIERS)[number];

export type MasteryReward = {
  coins: number;
  bottles: number;
  megaStones: number;
  travelTickets: number;
  permanentBonus: boolean;
  label: string;
};

export const MASTERY_REWARDS: Record<number, MasteryReward> = {
  25: {
    coins: 1500,
    bottles: 2,
    megaStones: 0,
    travelTickets: 0,
    permanentBonus: false,
    label: "1 500 CC i 2× Flakon Energii",
  },
  50: {
    coins: 3000,
    bottles: 3,
    megaStones: 0,
    travelTickets: 0,
    permanentBonus: true,
    label: "3 000 CC, 3× Flakon i trwały bonus do Shiny",
  },
  75: {
    coins: 5000,
    bottles: 5,
    megaStones: 1,
    travelTickets: 0,
    permanentBonus: false,
    label: "5 000 CC, 5× Flakon i Kamień Mega",
  },
  100: {
    coins: 10000,
    bottles: 8,
    megaStones: 1,
    travelTickets: 1,
    permanentBonus: true,
    label: "10 000 CC, 8× Flakon, Kamień Mega, Bilet Podróży i trwały bonus",
  },
};

/** Gatunki, które faktycznie da się złapać w regionie (biomy + pula zapasowa). */
export function regionSpeciesPool(region: string): number[] {
  const ids = new Set<number>();
  for (const biome of BIOMES) {
    for (const species of biome.species) {
      if (inRegion(species.id, region)) ids.add(species.id);
    }
  }
  for (const species of REGION_SPECIES[region] ?? []) ids.add(species.id);
  for (const starter of REGIONS.find((entry) => entry.slug === region)?.starters ?? []) {
    ids.add(starter.id);
  }
  return [...ids].sort((a, b) => a - b);
}

export function masteryPercent(caught: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.floor((caught / total) * 100));
}

export function reachedTiers(percent: number): number[] {
  return MASTERY_TIERS.filter((tier) => percent >= tier);
}

export function masteryBonusKey(region: string, tier: number) {
  return `mastery_${region}_${tier}`;
}

export type MasteryRegionState = {
  region: string;
  name: string;
  total: number;
  caught: number;
  percent: number;
  tiers: {
    tier: number;
    reached: boolean;
    claimed: boolean;
    reward: string;
  }[];
};
