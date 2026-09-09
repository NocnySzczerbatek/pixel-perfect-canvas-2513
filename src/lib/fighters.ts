/** Budowanie zawodników do wizualnej auto-walki (wspólne dla wszystkich trybów). */

import { baseStats } from "@/lib/base-stats";
import { hpValue, statValue, type Fighter } from "@/lib/battle";
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
  train_hp?: number | null;
  train_atk?: number | null;
  train_def?: number | null;
  train_spa?: number | null;
  train_spd?: number | null;
  train_spe?: number | null;
  active_moves?: string[] | null;
  ability?: string | null;
  is_shiny?: boolean | null;
};


/** Pokémon gracza (wiersz z player_pokemon). `boost` = premia z Kamienia Mega. */
export function allyFighter(row: AnyRow, boost = 0): Fighter {
  const level = row.level;
  const speciesId = row.species_id ?? 0;
  const types = speciesTypes(speciesId);
  const [, bAtk, bDef, bSpa, bSpd, bSpe] = baseStats(speciesId);
  return {
    ...(row.id ? { id: row.id } : {}),
    name: row.nickname ?? row.species_name ?? "Pokémon",
    type: types[0]!,
    types,
    species_id: speciesId,
    level,
    hp: row.hp_current,
    hpMax: row.hp_max,
    atk: Math.round(statValue(level, bAtk, row.iv_atk ?? 0, row.train_atk ?? 0) * (1 + boost)),
    def: statValue(level, bDef, row.iv_def ?? 0, row.train_def ?? 0),
    spa: Math.round(
      statValue(level, bSpa, row.iv_spa ?? row.iv_atk ?? 0, row.train_spa ?? 0) * (1 + boost),
    ),
    spd: statValue(level, bSpd, row.iv_spd ?? row.iv_def ?? 0, row.train_spd ?? 0),
    spe: statValue(level, bSpe, row.iv_spe ?? 0, row.train_spe ?? 0),
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
  const [, bAtk, bDef, bSpa, bSpd, bSpe] = baseStats(speciesId);
  return {
    name: row.species_name ?? "Dziki Pokémon",
    type: types[0]!,
    types,
    species_id: speciesId,
    level,
    hp: row.hp_current,
    hpMax: row.hp_max,
    atk: statValue(level, bAtk, 16),
    def: statValue(level, bDef, 16),
    spa: statValue(level, bSpa, 16),
    spd: statValue(level, bSpd, 16),
    spe: statValue(level, bSpe, 16),
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
  const [bHp, bAtk, bDef, bSpa, bSpd, bSpe] = baseStats(member.species_id);
  const hp = hpValue(level, bHp, iv);
  return {
    name: `${member.species_name}${nameSuffix}`,
    type: types[0]!,
    types,
    species_id: member.species_id,
    level,
    hp,
    hpMax: hp,
    atk: Math.round(statValue(level, bAtk, iv) * power),
    def: Math.round(statValue(level, bDef, iv) * power),
    spa: Math.round(statValue(level, bSpa, iv) * power),
    spd: Math.round(statValue(level, bSpd, iv) * power),
    spe: statValue(level, bSpe, iv),
    acc: 100,
    ability: "Trening trenera",
    moves: battleMoves(member.species_id, level),
  };
}

