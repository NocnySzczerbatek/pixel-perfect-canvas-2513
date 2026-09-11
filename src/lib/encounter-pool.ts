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

const DEX_BY_ID = new Map<number, DexEntry>(FULL_DEX.map((entry) => [entry.id, entry]));

function matchesBiome(id: number, affinity: string[]): boolean {
  const entry = DEX_BY_ID.get(id);
  if (!entry) return false;
  return entry.types.some((type) => affinity.includes(type));
}

/**
 * Pula dzikich spotkań: WYŁĄCZNIE Pokémony, których Typ 1 lub Typ 2 pasuje do biomu.
 * Najpierw gatunki z regionu, potem (gdy region ma za mało pasujących) pasujące
 * typem gatunki z pełnego Pokédexu. Nigdy nie dopełniamy puli obcymi typami.
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

  const merged = new Map<number, BiomeSpecies>();

  // 1. Kuratorowane gatunki biomu — tylko te, które faktycznie mają pasujący typ.
  const local = gate(
    biome.species.filter(
      (species) =>
        !isLegendary(species.id) &&
        matchesBiome(species.id, affinity) &&
        dex.some((entry) => entry.id === species.id),
    ),
    trainerLevel,
  );
  for (const species of local) merged.set(species.id, species);

  // 2. Wszystkie pasujące typem gatunki z regionu.
  for (const entry of dex) {
    if (!entry.types.some((type) => affinity.includes(type))) continue;
    if (!merged.has(entry.id)) merged.set(entry.id, toSpecies(entry));
  }

  // 3. Nigdy nie dopełniamy gatunkami z innych regionów. Gdy region nie ma
  //    ani jednego pasującego typem gatunku, wracamy do całego dexu regionu.
  if (merged.size === 0) return dex.map(toSpecies);

  return [...merged.values()];
}



/** Szeroka pula regionu — drużyny trenerów mieszają wszystkie typy. */
export function regionWidePool(
  region: string | null | undefined,
  trainerLevel?: number | null,
): BiomeSpecies[] {
  return gate(regionDex(region), trainerLevel).map(toSpecies);
}
