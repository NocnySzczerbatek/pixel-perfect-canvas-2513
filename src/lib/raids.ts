/**
 * Raidy — codzienna rotacja Bossów. Boss ma zwiększone HP i siłę (Tier 1–5),
 * limit tur oraz osobne nagrody. Legendy pojawiają się wyłącznie tutaj (Tier 5),
 * nigdy jako zwykłe spotkanie w eksploracji.
 */

import { warsawDate } from "@/lib/achievements";

export const RAID_ENERGY = 8;
/** Maksymalna liczba walk raidowych na dobę (reset o północy, czas polski). */
export const RAID_ATTEMPTS_PER_DAY = 3;
/** Limit tur — po nim Boss ucieka i raid przepada. */
export const RAID_TURN_LIMIT = 25;

export type RaidBossDef = {
  key: string;
  name: string;
  species_id: number;
  tier: 1 | 2 | 3 | 4 | 5;
  level: number;
  legendary: boolean;
};

export const RAID_BOSSES: RaidBossDef[] = [
  { key: "gyarados", name: "Gyarados", species_id: 130, tier: 1, level: 30, legendary: false },
  { key: "snorlax", name: "Snorlax", species_id: 143, tier: 2, level: 36, legendary: false },
  { key: "arcanine", name: "Arcanine", species_id: 59, tier: 2, level: 34, legendary: false },
  { key: "gengar", name: "Gengar", species_id: 94, tier: 2, level: 35, legendary: false },
  { key: "machamp", name: "Machamp", species_id: 68, tier: 1, level: 32, legendary: false },
  { key: "tyranitar", name: "Tyranitar", species_id: 248, tier: 3, level: 44, legendary: false },
  { key: "metagross", name: "Metagross", species_id: 376, tier: 3, level: 45, legendary: false },
  { key: "salamence", name: "Salamence", species_id: 373, tier: 3, level: 46, legendary: false },
  { key: "garchomp", name: "Garchomp", species_id: 445, tier: 4, level: 50, legendary: false },
  { key: "dragonite", name: "Dragonite", species_id: 149, tier: 4, level: 50, legendary: false },
  { key: "hydreigon", name: "Hydreigon", species_id: 635, tier: 4, level: 52, legendary: false },
  { key: "articuno", name: "Articuno", species_id: 144, tier: 5, level: 60, legendary: true },
  { key: "zapdos", name: "Zapdos", species_id: 145, tier: 5, level: 60, legendary: true },
  { key: "moltres", name: "Moltres", species_id: 146, tier: 5, level: 60, legendary: true },
  { key: "raikou", name: "Raikou", species_id: 243, tier: 5, level: 62, legendary: true },
  { key: "entei", name: "Entei", species_id: 244, tier: 5, level: 62, legendary: true },
  { key: "suicune", name: "Suicune", species_id: 245, tier: 5, level: 62, legendary: true },
  { key: "latios", name: "Latios", species_id: 381, tier: 5, level: 64, legendary: true },
  { key: "rayquaza", name: "Rayquaza", species_id: 384, tier: 5, level: 70, legendary: true },
  { key: "giratina", name: "Giratina", species_id: 487, tier: 5, level: 70, legendary: true },
];

/** Mnożnik statystyk Bossa i mnożnik HP według Tieru. */
export function raidScaling(tier: number): { power: number; hpMult: number } {
  const table: Record<number, { power: number; hpMult: number }> = {
    1: { power: 1.1, hpMult: 3 },
    2: { power: 1.2, hpMult: 4 },
    3: { power: 1.3, hpMult: 5 },
    4: { power: 1.4, hpMult: 6 },
    5: { power: 1.55, hpMult: 8 },
  };
  return table[Math.min(5, Math.max(1, tier))] ?? table[1]!;
}

/** Nagrody za pokonanie Bossa danego Tieru. */
export function raidRewards(tier: number) {
  const t = Math.min(5, Math.max(1, tier));
  return {
    coins: 1500 * t,
    bottles: t >= 4 ? 4 : t >= 2 ? 2 : 1,
    exp: 120 * t,
    candyXl: t >= 3 ? 1 : 0,
    /** Szansa na TM oraz na fragment Mega — rośnie z Tierem. */
    tmChance: 0.15 + t * 0.09,
    megaChance: 0.05 + t * 0.05,
  };
}

/** Deterministyczna liczba z ziarna tekstowego — ta sama rotacja dla wszystkich graczy. */
function seedNumber(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Trzy Bossy na dany dzień: jeden łatwy (Tier 1–2), jeden średni (Tier 3–4)
 * i jeden legendarny (Tier 5).
 */
export function raidsForDay(date = warsawDate()): RaidBossDef[] {
  const pools: RaidBossDef[][] = [
    RAID_BOSSES.filter((b) => b.tier <= 2),
    RAID_BOSSES.filter((b) => b.tier === 3 || b.tier === 4),
    RAID_BOSSES.filter((b) => b.tier === 5),
  ];
  return pools.map((pool, index) => {
    const pick = seedNumber(`${date}|raid|${index}`) % pool.length;
    return pool[pick]!;
  });
}

export function raidBoss(key: string): RaidBossDef | undefined {
  return RAID_BOSSES.find((boss) => boss.key === key);
}
