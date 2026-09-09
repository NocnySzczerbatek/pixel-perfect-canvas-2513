/** Doświadczenie i awanse Pokémonów (zdobywane w walkach). */

import { baseStats } from "@/lib/base-stats";
import { hpValue } from "@/lib/battle";

export const MAX_POKEMON_LEVEL = 100;

/** Mnożniki krzywych wzrostu EXP (jak w PokéAPI: growth_rate). */
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

const growthCache = new Map<number, string>();

/** Krzywa wzrostu gatunku z PokéAPI (z cache w pamięci; fallback: średnia). */
export async function fetchGrowthRate(speciesId: number): Promise<string> {
  const hit = growthCache.get(speciesId);
  if (hit) return hit;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}`);
    if (!res.ok) throw new Error("PokéAPI");
    const json = (await res.json()) as { growth_rate: { name: string } | null };
    const name = json.growth_rate?.name ?? "medium-fast";
    growthCache.set(speciesId, name);
    return name;
  } catch {
    return "medium-fast";
  }
}

/** Ile EXP potrzeba, żeby z podanego poziomu awansować na następny. */
export function pokemonExpToNext(level: number, growthRate = "medium-fast") {
  const mult = GROWTH_MULTIPLIER[growthRate] ?? 1;
  return Math.round(30 * Math.pow(Math.max(1, level), 1.55) * mult);
}


/** EXP za pokonanie przeciwnika danego poziomu. */
export function expForDefeat(foeLevel: number, kind: "wild" | "bot" | "gym" = "wild") {
  const base = 14 + foeLevel * 7;
  const mult = kind === "gym" ? 2.2 : kind === "bot" ? 1.4 : 1;
  return Math.round(base * mult);
}

type MinimalRow = {
  id: string;
  species_id: number;
  species_name: string;
  nickname: string | null;
  level: number;
  exp: number;
  hp_current: number;
  hp_max: number;
  iv_hp: number;
};

/**
 * Dopisuje EXP wybranym Pokémonom i awansuje je, jeśli przekroczą próg.
 * Zwraca linijki do dziennika walki.
 */
export async function awardPokemonExp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  gains: { id: string; exp: number }[],
): Promise<string[]> {
  const wanted = gains.filter((gain) => gain.exp > 0);
  if (wanted.length === 0) return [];

  const { data } = await supabase
    .from("player_pokemon")
    .select("id, species_id, species_name, nickname, level, exp, hp_current, hp_max, iv_hp")
    .eq("owner_id", userId)
    .in(
      "id",
      wanted.map((gain) => gain.id),
    );

  const rows = (data ?? []) as MinimalRow[];
  const log: string[] = [];

  for (const row of rows) {
    const gain = wanted.find((item) => item.id === row.id);
    if (!gain) continue;
    const growth = await fetchGrowthRate(row.species_id);
    let level = row.level;
    let exp = row.exp + gain.exp;
    let levels = 0;
    while (level < MAX_POKEMON_LEVEL && exp >= pokemonExpToNext(level, growth)) {
      exp -= pokemonExpToNext(level, growth);
      level += 1;
      levels += 1;
    }
    if (level >= MAX_POKEMON_LEVEL) exp = 0;

    const name = row.nickname ?? row.species_name;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { exp, level };
    if (levels > 0) {
      const hpMax = hpValue(level, baseStats(row.species_id)[0], row.iv_hp);
      update['hp_max'] = hpMax;
      update['hp_current'] = Math.min(hpMax, row.hp_current + (hpMax - row.hp_max));
      log.push(`${name} awansuje na Lvl ${level}! (+${gain.exp} EXP)`);
    } else {
      log.push(`${name} zdobywa ${gain.exp} EXP (${exp}/${pokemonExpToNext(level, growth)}).`);
    }


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("player_pokemon").update(update).eq("id", row.id).eq("owner_id", userId);
  }

  return log;
}
