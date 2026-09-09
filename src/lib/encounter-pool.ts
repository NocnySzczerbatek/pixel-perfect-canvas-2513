import { isLegendary } from "@/lib/base-stats";
import { findBiome, type BiomeSpecies } from "@/lib/biomes";
import { minLevelForSpecies } from "@/lib/evo-gates";
import { FULL_DEX, type DexEntry } from "@/lib/full-dex";
import { REGION_DEX_RANGES } from "@/lib/pokedex";

/** Wszystkie gatunki z Pokédexu danego regionu (bez legend blokujących start). */
export function regionDex(region: string | null | undefined): DexEntry[] {
  const range = region ? REGION_DEX_RANGES[region] : undefined;
  const dex = FULL_DEX.filter((entry) => !isLegendary(entry.id));
  if (!range) return dex;
  return dex.filter((entry) => entry.id >= range[0] && entry.id <= range[1]);
}

function toSpecies(entry: DexEntry): BiomeSpecies {
  return { id: entry.id, name: entry.name, type: entry.type };
}

const MIN_POOL = 8;

/**
 * Formy rozwinięte pojawiają się dopiero, gdy trener osiągnie ich próg ewolucji.
 * Formy bazowe zostają w puli na każdym poziomie.
 */
export function allowedForTrainer(entry: { id: number }, trainerLevel: number | null | undefined) {
  if (!trainerLevel || trainerLevel <= 0) return minLevelForSpecies(entry.id) <= 1;
  return minLevelForSpecies(entry.id) <= trainerLevel;
}

function gate<T extends { id: number }>(list: T[], trainerLevel: number | null | undefined): T[] {
  const filtered = list.filter((entry) => allowedForTrainer(entry, trainerLevel));
  return filtered.length > 0 ? filtered : list.filter((entry) => minLevelForSpecies(entry.id) <= 1);
}

/**
 * Pula dzikich spotkań: wszystkie Pokémony regionu, których typ pasuje do biomu.
 * Gdy region ma mało pasujących gatunków, pula jest dopełniana innymi z regionu,
 * żeby w biomie nigdy nie respił się tylko jeden gatunek.
 */
export function biomePool(
  biomeSlug: string,
  region: string | null | undefined,
  trainerLevel?: number | null,
): BiomeSpecies[] {
  const biome = findBiome(biomeSlug);
  const dex = gate(regionDex(region), trainerLevel);
  if (!biome) return dex.map(toSpecies);
  const affinity = biome.types.length > 0 ? biome.types : [biome.element];
  const matching = dex.filter((entry) => entry.types.some((type) => affinity.includes(type)));
  const pool = [...matching];
  if (pool.length < MIN_POOL) {
    const ids = new Set(pool.map((entry) => entry.id));
    for (const entry of dex) {
      if (pool.length >= MIN_POOL) break;
      if (ids.has(entry.id)) continue;
      pool.push(entry);
      ids.add(entry.id);
    }
  }
  const local = gate(
    biome.species.filter(
      (species) => !isLegendary(species.id) && dex.some((entry) => entry.id === species.id),
    ),
    trainerLevel,
  );
  const merged = new Map<number, BiomeSpecies>();
  for (const species of local) merged.set(species.id, species);
  for (const entry of pool) if (!merged.has(entry.id)) merged.set(entry.id, toSpecies(entry));
  return merged.size > 0 ? [...merged.values()] : dex.map(toSpecies);
}

/** Szeroka pula regionu — drużyny trenerów mieszają wszystkie typy. */
export function regionWidePool(
  region: string | null | undefined,
  trainerLevel?: number | null,
): BiomeSpecies[] {
  return gate(regionDex(region), trainerLevel).map(toSpecies);
}
