/** Podgląd EXP Pokémonów po stronie klienta (bez logiki serwerowej). */

export const GROWTH_MULTIPLIER: Record<string, number> = {
  fast: 0.8,
  "medium-fast": 1,
  "medium-slow": 1.15,
  slow: 1.3,
  "slow-then-very-fast": 0.95,
  "fast-then-very-slow": 1.2,
};

export const GROWTH_LABEL: Record<string, string> = {
  fast: "Szybka",
  "medium-fast": "Średnia",
  "medium-slow": "Średnio-wolna",
  slow: "Wolna",
  "slow-then-very-fast": "Nieregularna",
  "fast-then-very-slow": "Zmienna",
};

export const MAX_POKEMON_LEVEL = 100;

const cache = new Map<number, string>();

/** Krzywa wzrostu gatunku (growth_rate z PokéAPI) z cache w pamięci. */
export async function loadGrowthRate(speciesId: number): Promise<string> {
  const hit = cache.get(speciesId);
  if (hit) return hit;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}`);
    if (!res.ok) throw new Error("PokéAPI");
    const json = (await res.json()) as { growth_rate: { name: string } | null };
    const name = json.growth_rate?.name ?? "medium-fast";
    cache.set(speciesId, name);
    return name;
  } catch {
    return "medium-fast";
  }
}

export function expToNext(level: number, growthRate = "medium-fast") {
  const mult = GROWTH_MULTIPLIER[growthRate] ?? 1;
  return Math.round(30 * Math.pow(Math.max(1, level), 1.55) * mult);
}
