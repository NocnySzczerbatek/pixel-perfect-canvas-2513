/** Budowanie zawodników do wizualnej auto-walki (wspólne dla wszystkich trybów). */

import { hpFromIv, statFromIv, type Fighter } from "@/lib/battle";
import { battleMoves, speciesTypes } from "@/lib/pokedex";

type AnyRow = {
  id?: string;
  species_id?: number | null;
  species_name?: string | null;
  species_type?: string | null;
  nickname?: string | null;
  level: number;
  hp_current: number;
  hp_max: number;
  iv_hp?: number | null;
  iv_atk?: number | null;
  iv_def?: number | null;
  iv_spa?: number | null;
  iv_spd?: number | null;
  iv_spe?: number | null;
  ability?: string | null;
  is_shiny?: boolean | null;
};

/** Pokémon gracza (wiersz z player_pokemon). `boost` = premia z Kamienia Mega. */
export function allyFighter(row: AnyRow, boost = 0): Fighter {
  const level = row.level;
  const speciesId = row.species_id ?? 0;
  const types = speciesTypes(speciesId);
  return {
    ...(row.id ? { id: row.id } : {}),
    name: row.nickname ?? row.species_name ?? "Pokémon",
    type: types[0]!,
    types,
    species_id: speciesId,
    level,
    hp: row.hp_current,
    hpMax: row.hp_max,
    atk: Math.round(statFromIv(level, row.iv_atk ?? 0, 9) * (1 + boost)),
    def: statFromIv(level, row.iv_def ?? 0, 8),
    spa: Math.round(statFromIv(level, row.iv_spa ?? row.iv_atk ?? 0, 9) * (1 + boost)),
    spd: statFromIv(level, row.iv_spd ?? row.iv_def ?? 0, 8),
    spe: statFromIv(level, row.iv_spe ?? 0, 8),
    acc: 100,
    ability: row.ability ?? "—",
    shiny: !!row.is_shiny,
    moves: battleMoves(speciesId, level),
  };
}

/** Dziki Pokémon ze spotkania (wiersz z encounters). */
export function wildFighter(row: AnyRow): Fighter {
  const speciesId = row.species_id ?? 0;
  const level = row.level;
  const types = speciesId ? speciesTypes(speciesId) : [row.species_type ?? "Normalny"];
  return {
    name: row.species_name ?? "Dziki Pokémon",
    type: types[0]!,
    types,
    species_id: speciesId,
    level,
    hp: row.hp_current,
    hpMax: row.hp_max,
    atk: statFromIv(level, 16, 9),
    def: statFromIv(level, 16, 8),
    spa: statFromIv(level, 16, 9),
    spd: statFromIv(level, 16, 8),
    spe: statFromIv(level, 16, 8),
    acc: 100,
    ability: row.ability ?? "Dzika natura",
    shiny: !!row.is_shiny,
    moves: battleMoves(speciesId, level),
  };
}

/** Pokémon przeciwnika (bot, Lider Sali, turniej) — zadany IV i premia do statystyk. */
export function foeFighter(
  member: { species_id: number; species_name: string; level: number },
  iv = 20,
  power = 1,
  nameSuffix = "",
): Fighter {
  const types = speciesTypes(member.species_id);
  const level = member.level;
  return {
    name: `${member.species_name}${nameSuffix}`,
    type: types[0]!,
    types,
    species_id: member.species_id,
    level,
    hp: hpFromIv(level, iv),
    hpMax: hpFromIv(level, iv),
    atk: Math.round(statFromIv(level, iv, 9) * power),
    def: Math.round(statFromIv(level, iv, 8) * power),
    spa: Math.round(statFromIv(level, iv, 9) * power),
    spd: Math.round(statFromIv(level, iv, 8) * power),
    spe: statFromIv(level, iv, 8),
    acc: 100,
    ability: "Trening trenera",
    moves: battleMoves(member.species_id, level),
  };
}
