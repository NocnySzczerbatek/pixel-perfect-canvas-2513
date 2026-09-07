/** Doświadczenie i awanse Pokémonów (zdobywane w walkach). */

import { hpFromIv } from "@/lib/battle";

export const MAX_POKEMON_LEVEL = 100;

/** Ile EXP potrzeba, żeby z podanego poziomu awansować na następny. */
export function pokemonExpToNext(level: number) {
  return Math.round(30 * Math.pow(Math.max(1, level), 1.55));
}

/** EXP za pokonanie przeciwnika danego poziomu. */
export function expForDefeat(foeLevel: number, kind: "wild" | "bot" | "gym" = "wild") {
  const base = 14 + foeLevel * 7;
  const mult = kind === "gym" ? 2.2 : kind === "bot" ? 1.4 : 1;
  return Math.round(base * mult);
}

type MinimalRow = {
  id: string;
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
    .select("id, species_name, nickname, level, exp, hp_current, hp_max, iv_hp")
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
    let level = row.level;
    let exp = row.exp + gain.exp;
    let levels = 0;
    while (level < MAX_POKEMON_LEVEL && exp >= pokemonExpToNext(level)) {
      exp -= pokemonExpToNext(level);
      level += 1;
      levels += 1;
    }
    if (level >= MAX_POKEMON_LEVEL) exp = 0;

    const name = row.nickname ?? row.species_name;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { exp, level };
    if (levels > 0) {
      const hpMax = hpFromIv(level, row.iv_hp);
      update.hp_max = hpMax;
      update.hp_current = Math.min(hpMax, row.hp_current + (hpMax - row.hp_max));
      log.push(`${name} awansuje na Lvl ${level}! (+${gain.exp} EXP)`);
    } else {
      log.push(`${name} zdobywa ${gain.exp} EXP (${exp}/${pokemonExpToNext(level)}).`);
    }

    await supabase.from("player_pokemon").update(update).eq("id", row.id).eq("owner_id", userId);
  }

  return log;
}
