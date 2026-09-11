import { baseStats } from "@/lib/base-stats";
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ENERGY_TICK_MS, MAX_ENERGY, clampEnergy } from "@/lib/energy";
import { BIOMES, findBiome, type BiomeSpecies } from "@/lib/biomes";
import { biomePool, regionWidePool } from "@/lib/encounter-pool";
import {
  CATCH_BASE,
  CATCH_CAP,
  LUXURY_FRIENDSHIP,
  RAZZ,
  RAZZ_BONUS,
  TIMER_MAX,
  TIMER_PER_TURN,
  ballByKey,
  healByKey,
} from "@/lib/items";
import { awardPokemonExp, expForDefeat } from "@/lib/leveling";
import { emitQuestEvent, progressActivities } from "@/lib/quests.functions";
import { effectiveRegion } from "@/lib/travel";
import { DAY_PHASES, isNightNow, worldEncounterEffects } from "@/lib/world";
import {
  hpValue,
  pickWeather,
  simulateTeamBattle,
  
  type BattleReport,
  type Fighter,
} from "@/lib/battle";
import { allyFighter, foeFighter, wildFighter } from "@/lib/fighters";
import { FULL_DEX } from "@/lib/full-dex";
import {
  TMS,
  rollFind,
  tmDescription,
  tmItemKey,
  tmSprite,
  type FindView,
} from "@/lib/finds";
import {
  NATURES,
  TRAINER_CLASSES,
  TRAINER_NAMES,
  abilitiesFor,
  movePool,
  battleMoves,
  REGION_SPECIES,
  inRegion,
  speciesType,
} from "@/lib/pokedex";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Dopisuje przedmiot do ekwipunku gracza (albo podnosi licznik). */
async function addItem(
  supabase: any,
  userId: string,
  itemKey: string,
  metadata: Record<string, unknown>,
) {
  const { data: owned } = await supabase
    .from("player_items")
    .select("id, quantity")
    .eq("owner_id", userId)
    .eq("item_key", itemKey)
    .maybeSingle();
  if (owned) {
    await (await writeDb())
      .from("player_items")
      .update({ quantity: owned.quantity + 1 })
      .eq("id", owned.id)
      .eq("owner_id", userId);
  } else {
    await (await writeDb())
      .from("player_items")
      .insert({ owner_id: userId, item_key: itemKey, quantity: 1, metadata });
  }
}





const MIN_TRAVEL_COST = 2;
/** Bazowa szansa na Shiny: 1/512 (standard z gier). */
const SHINY_CHANCE = 1 / 512;
const MAX_TRAVEL_COST = 5;

export type EncounterView = {
  id: string;
  biome: string;
  kind: "wild" | "bot" | "pvp";
  status: string;
  species_id: number | null;
  species_name: string | null;
  species_type: string | null;
  is_shiny: boolean;
  level: number;
  hp_current: number;
  hp_max: number;
  bot_team: BotMember[] | null;
  trainer_class: string | null;
  trainer_person: string | null;
  energy_cost: number;
  reward_exp: number;
  reward_coins: number;
  log: string[];
  created_at: string;
};

export type BotMember = {
  species_id: number;
  species_name: string;
  species_type: string;
  level: number;
};

export type PartyView = {
  id: string;
  name: string;
  species_id: number;
  species_name: string;
  species_type: string;
  level: number;
  hp_current: number;
  hp_max: number;
  fainted: boolean;
  moves: { name: string; level: number; power: number }[];
};

export type ExplorationState = {
  energy: number;
  energy_max: number;
  poke_balls: number;
  great_balls: number;
  ultra_balls: number;
  master_balls: number;
  premier_balls: number;
  net_balls: number;
  dive_balls: number;
  dusk_balls: number;
  quick_balls: number;
  timer_balls: number;
  repeat_balls: number;
  luxury_balls: number;
  razz_berries: number;
  potions: number;
  super_potions: number;
  revives: number;
  /** Ile milisekund zostało do kolejnego punktu Energii (0 = pełna). */
  energy_next_ms: number;

  catch_coins: number;
  candy_normal: number;
  candy_xl: number;
  trainer_level: number;
  trainer_exp: number;
  trainer_exp_next: number;
  party_size: number;
  party: PartyView[];
  region: string | null;
  active: EncounterView | null;
  history: EncounterView[];
};


function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function expThreshold(level: number) {
  return Math.round(100 * Math.pow(level, 1.8));
}

type ProfileRow = {
  energy: number;
  energy_updated_at: string;
  energy_bottles: number;
  poke_balls: number;
  great_balls: number;
  ultra_balls: number;
  master_balls: number;
  premier_balls: number;
  net_balls: number;
  dive_balls: number;
  dusk_balls: number;
  quick_balls: number;
  timer_balls: number;
  repeat_balls: number;
  luxury_balls: number;
  razz_berries: number;
  potions: number;
  super_potions: number;
  revives: number;
  catch_coins: number;
  candy_normal: number;
  candy_xl: number;
  trainer_level: number;
  trainer_exp: number;
  region: string | null;
  travel_region: string | null;
  travel_until: string | null;
};

const PROFILE_COLUMNS =
  "energy, energy_updated_at, energy_bottles, poke_balls, great_balls, ultra_balls, master_balls, premier_balls, net_balls, dive_balls, dusk_balls, quick_balls, timer_balls, repeat_balls, luxury_balls, razz_berries, potions, super_potions, revives, catch_coins, candy_normal, candy_xl, trainer_level, trainer_exp, region, travel_region, travel_until";



/** Pula gatunków biomu: cały Pokédex regionu przefiltrowany typami biomu i poziomem trenera. */
function speciesPool(biomeSlug: string, region: string | null, trainerLevel: number): BiomeSpecies[] {
  return biomePool(biomeSlug, region, trainerLevel);
}

/** Szeroka pula regionu — drużyny trenerów mieszają typy, nie tylko element biomu. */
function regionPool(region: string | null, trainerLevel: number): BiomeSpecies[] {
  return regionWidePool(region, trainerLevel);
}

/** Dolewa Energię za miniony czas (+1 / 3 min) i zapisuje nowy znacznik. */
async function syncEnergy(supabase: any, userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("Nie znaleziono profilu trenera.");
  const profile = data as ProfileRow;

  const last = new Date(profile.energy_updated_at).getTime();
  const now = Date.now();
  if (profile.energy >= MAX_ENERGY) {
    if (now - last >= ENERGY_TICK_MS) {
      await (await writeDb())
        .from("profiles")
        .update({ energy_updated_at: new Date(now).toISOString() })
        .eq("id", userId);
      profile.energy_updated_at = new Date(now).toISOString();
    }
    return profile;
  }

  const ticks = Math.floor((now - last) / ENERGY_TICK_MS);
  if (ticks <= 0) return profile;

  const energy = clampEnergy(profile.energy + ticks);
  const consumed = energy - profile.energy;
  const stamp = new Date(last + consumed * ENERGY_TICK_MS).toISOString();
  await (await writeDb())
    .from("profiles")
    .update({ energy, energy_updated_at: stamp })
    .eq("id", userId);
  return { ...profile, energy, energy_updated_at: stamp };
}

function toView(row: any): EncounterView {
  return {
    id: row.id,
    biome: row.biome,
    kind: row.kind,
    status: row.status,
    species_id: row.species_id,
    species_name: row.species_name,
    species_type: row.species_type,
    is_shiny: !!row.is_shiny,
    level: row.level,
    hp_current: row.hp_current,
    hp_max: row.hp_max,
    bot_team: (row.bot_team as BotMember[] | null) ?? null,
    trainer_class: row.trainer_class ?? null,
    trainer_person: row.trainer_person ?? null,
    energy_cost: row.energy_cost,
    reward_exp: row.reward_exp,
    reward_coins: row.reward_coins,
    log: Array.isArray(row.log) ? (row.log as string[]) : [],
    created_at: row.created_at,
  };
}

type PartyRow = {
  id: string;
  species_id: number;
  species_name: string;
  nickname: string | null;
  level: number;
  hp_current: number;
  hp_max: number;
  fainted: boolean;
  iv_hp: number;
  iv_atk: number;
  iv_def: number;
  iv_spa: number;
  iv_spd: number;
  iv_spe: number;
  ability: string | null;
  is_shiny: boolean | null;
};

const PARTY_COLUMNS =
  "id, species_id, species_name, nickname, level, hp_current, hp_max, fainted, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, train_hp, train_atk, train_def, train_spa, train_spd, train_spe, active_moves, ability, is_shiny";

async function loadParty(supabase: any, userId: string): Promise<PartyRow[]> {
  const { data } = await supabase
    .from("player_pokemon")
    .select(PARTY_COLUMNS)
    .eq("owner_id", userId)
    .eq("in_party", true)
    .order("caught_at", { ascending: true });
  return (data ?? []) as PartyRow[];
}

function toFighter(row: PartyRow): Fighter {
  return allyFighter(row);
}


function toPartyView(row: PartyRow): PartyView {
  const type = speciesType(row.species_id);
  return {
    id: row.id,
    name: row.nickname ?? row.species_name,
    species_id: row.species_id,
    species_name: row.species_name,
    species_type: type,
    level: row.level,
    hp_current: row.hp_current,
    hp_max: row.hp_max,
    fainted: row.fainted,
    moves: battleMoves(row.species_id, row.level),
  };
}

async function buildState(supabase: any, userId: string): Promise<ExplorationState> {
  const profile = await syncEnergy(supabase, userId);
  const [{ data: encounters }, party] = await Promise.all([
    supabase
      .from("encounters")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    loadParty(supabase, userId),
  ]);

  const rows = ((encounters ?? []) as any[]).map(toView);
  const active = rows.find((row) => row.status === "active") ?? null;

  return {
    energy: profile.energy,
    energy_max: MAX_ENERGY,
    poke_balls: profile.poke_balls,
    great_balls: profile.great_balls ?? 0,
    ultra_balls: profile.ultra_balls ?? 0,
    master_balls: profile.master_balls ?? 0,
    premier_balls: profile.premier_balls ?? 0,
    net_balls: profile.net_balls ?? 0,
    dive_balls: profile.dive_balls ?? 0,
    dusk_balls: profile.dusk_balls ?? 0,
    quick_balls: profile.quick_balls ?? 0,
    timer_balls: profile.timer_balls ?? 0,
    repeat_balls: profile.repeat_balls ?? 0,
    luxury_balls: profile.luxury_balls ?? 0,
    razz_berries: profile.razz_berries ?? 0,
    potions: profile.potions ?? 0,
    super_potions: profile.super_potions ?? 0,
    revives: profile.revives ?? 0,
    energy_next_ms:
      profile.energy >= MAX_ENERGY
        ? 0
        : ENERGY_TICK_MS -
          (Math.max(0, Date.now() - new Date(profile.energy_updated_at).getTime()) %
            ENERGY_TICK_MS),

    catch_coins: profile.catch_coins,
    candy_normal: profile.candy_normal ?? 0,
    candy_xl: profile.candy_xl ?? 0,
    trainer_level: profile.trainer_level,
    trainer_exp: profile.trainer_exp,
    trainer_exp_next: expThreshold(profile.trainer_level),
    party_size: party.length,
    party: party.map(toPartyView),
    region: effectiveRegion(profile.region, profile.travel_region, profile.travel_until),
    active,
    history: rows.filter((row) => row.status !== "active").slice(0, 6),
  };
}


/** Aktualny stan eksploracji (Energia po regeneracji, aktywne spotkanie, log). */
export const getExplorationState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Krok w wybranym biomie: koszt Energii i dobór spotkania liczone serwerowo. */
export const travel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { biome: string }) => {
    const biome = BIOMES.find((b) => b.slug === input?.biome);
    if (!biome) throw new Error("Nieznany biom.");
    return { biome: biome.slug };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const biome = findBiome(data.biome)!;
    const profile = await syncEnergy(supabase, userId);
    const activeRegion = effectiveRegion(profile.region, profile.travel_region, profile.travel_until);
    const pool = speciesPool(biome.slug, activeRegion, profile.trainer_level);
    const trainerPool = regionPool(activeRegion, profile.trainer_level);

    const cost = randInt(MIN_TRAVEL_COST, MAX_TRAVEL_COST);
    if (profile.energy < cost) {
      return {
        ok: false as const,
        reason: `Brakuje Energii — ten krok kosztuje ${cost} pkt, masz ${profile.energy}.`,
        state: await buildState(supabase, userId),
      };
    }

    const { data: existingActive } = await supabase
      .from("encounters")
      .select("id")
      .eq("owner_id", userId)
      .eq("status", "active")
      .limit(1);
    if (existingActive && existingActive.length > 0) {
      return {
        ok: false as const,
        reason: "Najpierw zakończ bieżące spotkanie.",
        state: await buildState(supabase, userId),
      };
    }

    // Losowe znaleziska na szlaku: Cukierki do podnoszenia przyjaźni.
    const candyRoll = Math.random();
    const foundCandy =
      candyRoll < 0.05 ? ("xl" as const) : candyRoll < 0.2 ? ("normal" as const) : null;

    const candyLine =
      foundCandy === "normal"
        ? "Na ścieżce leżał Zwykły Cukierek — trafił do ekwipunku."
        : foundCandy === "xl"
          ? "Znalazłeś Cukierek XL — rzadkie znalezisko!"
          : null;

    // Rzadkie znaleziska: TM, fragment Kamienia Mega, Flakon Energii (max jedno na krok).
    const megaSpecies = [3, 6, 9, 65, 94, 115, 127, 130, 142, 150, 181, 212, 214, 229, 248, 254, 257, 260, 282, 303, 306, 308, 310, 319, 323, 334, 354, 359, 362, 373, 376, 380, 381, 445, 448, 460, 475, 531, 719];
    const findKind = rollFind();
    let find: FindView | null = null;

    if (findKind === "tm") {
      const tm = pick(TMS);
      await addItem(supabase, userId, tmItemKey(tm.id), { kind: "tm", move: tm.move, type: tm.type });
      find = {
        kind: "tm",
        label: tm.label,
        sprite: tmSprite(tm.type),
        description: tmDescription(tm),
        rarity: "Bardzo rzadkie",
      };
    } else if (findKind === "mega") {
      const speciesId = pick(megaSpecies);
      const speciesName = FULL_DEX.find((entry) => entry.id === speciesId)?.name ?? `#${speciesId}`;
      await addItem(supabase, userId, `mega_shard_${speciesId}`, { species_id: speciesId, kind: "mega_shard" });
      find = {
        kind: "mega",
        label: `Fragment Kamienia Mega — ${speciesName}`,
        sprite: "key-stone",
        description: `Materiał do Mega Ewolucji. Zbierz 5 fragmentów tego gatunku, a w Ekwipunku utworzysz Kamień Mega dla ${speciesName} (+30% siły ataku w walce z Liderem Sali).`,
        rarity: "Rzadkie",
      };
    } else if (findKind === "bottle") {
      find = {
        kind: "bottle",
        label: "Flakon Energii",
        sprite: "max-elixir",
        description:
          "Uzupełnia Energię do pełnych 100 punktów po zużyciu w Ekwipunku. Energia napędza każdy krok eksploracji.",
        rarity: "Nieczęste",
      };
    }

    await ((await writeDb()).from("profiles") as any)
      .update({
        energy: clampEnergy(profile.energy - cost),
        energy_updated_at: new Date().toISOString(),
        ...(foundCandy === "normal" ? { candy_normal: (profile.candy_normal ?? 0) + 1 } : {}),
        ...(foundCandy === "xl" ? { candy_xl: (profile.candy_xl ?? 0) + 1 } : {}),
        ...(findKind === "bottle" ? { energy_bottles: (profile.energy_bottles ?? 0) + 1 } : {}),
      })
      .eq("id", userId);

    const findLine = find ? `Znalezisko: ${find.label} — trafiło do ekwipunku.` : null;

    // Silnik zadań: krok eksploracji, wizyta w lokacji i znaleziska.
    const questsCompleted: string[] = [];
    questsCompleted.push(...(await emitQuestEvent(supabase, userId, "steps", { biome: biome.slug })));
    questsCompleted.push(...(await emitQuestEvent(supabase, userId, "visit", { biome: biome.slug })));
    if (find || foundCandy) {
      questsCompleted.push(...(await emitQuestEvent(supabase, userId, "find_item", { biome: biome.slug })));
    }

    const trainerLevel = profile.trainer_level;
    const kind: "wild" | "bot" = Math.random() < 0.62 ? "wild" : "bot";

    const levelFor = (bonus = 0) =>
      Math.max(1, Math.min(trainerLevel + 5, trainerLevel + bonus + randInt(-1, 2)));

    let payload: { kind: "wild" | "bot" } & Record<string, unknown>;
    if (kind === "wild") {
      // Bonusy (Shiny Charm, buffy czasowe, trwałe osiągnięcia) — liczone po stronie serwera.
      const { encounterMultipliers } = await import("@/lib/bonuses.server");
      const mult = await encounterMultipliers(userId);
      const world = worldEncounterEffects();
      const rarePool = [...pool].sort((a, b) => b.id - a.id).slice(0, Math.max(1, Math.ceil(pool.length / 4)));
      const rareChance = Math.min(0.6, 0.15 * mult.rare * world.rare);
      const isRareRoll = rarePool.length > 0 && Math.random() < rareChance;
      // Pogoda przyciąga pasujące typy — jeśli są w puli, losujemy właśnie z nich.
      const favored = pool.filter((entry) => world.favoredTypes.includes(entry.type));
      const drawPool =
        !isRareRoll && favored.length > 0 && Math.random() < world.favorChance ? favored : pool;
      const species: BiomeSpecies = isRareRoll ? pick(rarePool) : pick(drawPool);
      const level = levelFor();
      const hpMax = hpValue(level, baseStats(species.id)[0], 16);
      const shinyChance = SHINY_CHANCE * mult.shiny * world.shiny;
      const isShiny = Math.random() < shinyChance;
      if (isShiny) questsCompleted.push(...(await emitQuestEvent(supabase, userId, "shiny", { biome: biome.slug })));
      const weatherLine = `${DAY_PHASES[world.phase].icon} ${DAY_PHASES[world.phase].label} · ${world.weather.icon} ${world.weather.label} — ${world.weather.note}`;



      payload = {
        kind,
        species_id: species.id,
        species_name: species.name,
        species_type: species.type,
        is_shiny: isShiny,
        level,
        hp_max: hpMax,
        hp_current: hpMax,
        log: [
          `Krok w biomie ${biome.name} (−${cost} Energii).`,
          weatherLine,

          ...(candyLine ? [candyLine] : []),
          ...(findLine ? [findLine] : []),
          ...(isShiny
            ? [`✨ Powietrze zaiskrzyło — to SHINY ${species.name}! Niezwykle rzadkie spotkanie.`]
            : []),
          `Z zarośli wyszedł dziki ${species.name} (typ ${species.type}, Lvl ${level}).`,
          "Wybierz Pokémona i atak — po pokonaniu dzikiego możesz go złapać.",
        ],
      };
    } else {
      // Trener-bot ma być realnym wyzwaniem: pełniejsza drużyna i poziomy powyżej trenera.
      const size = Math.min(6, randInt(3, 4) + Math.floor(trainerLevel / 12));
      const team: BotMember[] = Array.from({ length: size }, () => {
        const species: BiomeSpecies = pick(trainerPool);
        return {
          species_id: species.id,
          species_name: species.name,
          species_type: species.type,
          level: Math.max(2, trainerLevel + randInt(1, 4)),
        };
      });
      const avg = Math.round(team.reduce((sum, m) => sum + m.level, 0) / team.length);
      const trainerClass = pick(TRAINER_CLASSES);
      const person = pick(TRAINER_NAMES);
      payload = {
        kind,
        level: avg,
        bot_team: team,
        trainer_class: trainerClass,
        trainer_person: person,
        hp_max: hpValue(avg, 70, 20),
        hp_current: hpValue(avg, 70, 20),
        reward_exp: 26 + avg * 14 + size * 6,
        reward_coins: 32 + avg * 11 + size * 5,

        log: [
          `Krok w biomie ${biome.name} (−${cost} Energii).`,
          (() => {
            const world = worldEncounterEffects();
            return `${DAY_PHASES[world.phase].icon} ${DAY_PHASES[world.phase].label} · ${world.weather.icon} ${world.weather.label} — ${world.weather.note}`;
          })(),

          ...(candyLine ? [candyLine] : []),
          ...(findLine ? [findLine] : []),
          `${trainerClass} ${person} wyzywa Cię na walkę: ${size} Pokémony (średni Lvl ${avg}).`,
        ],
      };
    }


    const { data: created, error } = await (await writeDb())
      .from("encounters")
      .insert({
        owner_id: userId,
        biome: biome.slug,
        status: "active",
        energy_cost: cost,
        ...payload,
        kind: payload.kind,
      })
      .select("*")
      .single();
    if (error || !created) throw new Error("Nie udało się rozpocząć spotkania.");

    return {
      ok: true as const,
      encounter: toView(created),
      find,
      questsCompleted: [...new Set(questsCompleted)],
      state: await buildState(supabase, userId),
    };
  });

/** Automatyczna walka 1 na 1 z dzikim Pokémonem — Pokémon sam wybiera ataki. */
export const autoFightWild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { encounterId: string; pokemonId: string }) => {
    if (!input?.encounterId) throw new Error("Brak spotkania.");
    if (!input?.pokemonId) throw new Error("Wybierz Pokémona do walki.");
    return { encounterId: input.encounterId, pokemonId: input.pokemonId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("encounters")
      .select("*")
      .eq("id", data.encounterId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!row || row.status !== "active" || row.kind !== "wild") {
      throw new Error("To spotkanie już się zakończyło.");
    }
    if (row.hp_current <= 0) {
      return {
        ok: false as const,
        reason: "Dziki Pokémon jest już pokonany — rzuć Ballem albo idź dalej.",
        state: await buildState(supabase, userId),
      };
    }

    const party = await loadParty(supabase, userId);
    const mine = party.find((p) => p.id === data.pokemonId);
    if (!mine || mine.fainted || mine.hp_current <= 0) {
      return {
        ok: false as const,
        reason: "Ten Pokémon nie może walczyć. Wybierz innego lub ulecz drużynę.",
        state: await buildState(supabase, userId),
      };
    }

    const me = allyFighter(mine);
    const foe = wildFighter(row);
    const result = simulateTeamBattle([me], [foe], { weather: pickWeather() });
    const report: BattleReport = result.report;

    const allyHp = result.allyHp[mine.id] ?? 0;
    const finalWildHp = report.won ? 0 : row.hp_current;
    const log: string[] = [...((row.log as string[]) ?? []), ...result.log];

    await (await writeDb())
      .from("player_pokemon")
      .update({ hp_current: allyHp, fainted: allyHp <= 0 })
      .eq("id", mine.id)
      .eq("owner_id", userId);

    if (report.won) {
      const trainerExp = Math.max(2, Math.round(row.level / 2));
      report.trainer_exp = trainerExp;
      report.extras.push(...(await applyTrainerReward(supabase, userId, trainerExp, 0)));
      const gain = expForDefeat(row.level, "wild");
      report.pokemon_exp.push({ name: me.name, exp: gain });
      log.push(...(await awardPokemonExp(supabase, userId, [{ id: mine.id, exp: gain }])));
      log.push(`${foe.name} pada! Możesz rzucić Poké Ballem albo iść dalej.`);
      report.extras.push("Dziki Pokémon jest osłabiony — teraz wybierz Poké Balla.");
    } else {
      log.push(`${me.name} jest Zemdlony — ulecz go w Centrum Pokémon.`);
    }

    await (await writeDb())
      .from("encounters")
      .update({
        hp_current: finalWildHp,
        log: log.slice(-40),
        ...(report.won ? {} : { status: "lost" }),
      })
      .eq("id", row.id);

    return {
      ok: true as const,
      report,
      wildDefeated: report.won,
      allyFainted: allyHp <= 0,
      lost: !report.won,
      state: await buildState(supabase, userId),
    };
  });


/** Rzut Poké Ballem — szansa złapania liczona serwerowo z aktualnego HP. */
export const throwBall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { encounterId: string; ball?: string; razz?: boolean }) => {
    if (!input?.encounterId) throw new Error("Brak spotkania.");
    const ball = ballByKey(String(input?.ball ?? "poke")) ? String(input!.ball ?? "poke") : "poke";
    return { encounterId: input.encounterId, ball, razz: Boolean(input?.razz) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("encounters")
      .select("*")
      .eq("id", data.encounterId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!row || row.status !== "active" || row.kind !== "wild") {
      throw new Error("To spotkanie już się zakończyło.");
    }
    const profile = await syncEnergy(supabase, userId);
    const ball = ballByKey(data.ball)!;
    const owned = (profile as any)[ball.field] ?? 0;
    if (owned <= 0) {
      return {
        ok: false as const,
        reason: `Nie masz już przedmiotu: ${ball.label}.`,
        state: await buildState(supabase, userId),
      };
    }
    const useRazz = data.razz && (profile.razz_berries ?? 0) > 0;

    const isNight = isNightNow();
    const dexTypes = FULL_DEX.find((entry) => entry.id === (row.species_id ?? 0))?.types ?? [];
    const wildTypes = [...new Set([...(row.species_type ? [row.species_type as string] : []), ...dexTypes])];
    const { count: ownedSpecies } = await supabase
      .from("player_pokemon")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("species_id", row.species_id ?? 0);
    const turns = ((row.log as string[]) ?? []).filter((line: string) => line.includes("zadaje")).length;

    /** Warunek Balla spełniony → conditionalBonus, inaczej Ball działa jak Poké Ball. */
    const conditionMet =
      data.ball === "net" ? wildTypes.some((type) => type === "Woda" || type === "Robak")
      : data.ball === "dive" ? wildTypes.includes("Woda")
      : data.ball === "dusk" ? isNight || row.biome === "jaskinia"
      : data.ball === "quick" ? row.hp_current === row.hp_max
      : data.ball === "repeat" ? (ownedSpecies ?? 0) > 0
      : false;
    const timerBonus = data.ball === "timer" ? Math.min(TIMER_MAX, turns * TIMER_PER_TURN) : 0;
    const ballBonus = ball.bonus + (conditionMet ? (ball.conditionalBonus ?? 0) : 0) + timerBonus;
    const chance = ball.guaranteed
      ? 1
      : Math.max(0.05, Math.min(CATCH_CAP, CATCH_BASE + ballBonus + (useRazz ? RAZZ_BONUS : 0)));
    const success = Math.random() < chance;
    const log: string[] = [
      ...((row.log as string[]) ?? []),
      ...(useRazz ? [`Podajesz ${RAZZ.label} — Pokémon się uspokaja.`] : []),
      `Rzut ${ball.label} (szansa ${Math.round(chance * 100)}%).`,
    ];

    const spend: Record<string, number> = { [ball.field]: owned - 1 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (useRazz) spend[RAZZ.field] = (profile.razz_berries ?? 0) - 1;
    await ((await writeDb()).from("profiles") as any).update(spend).eq("id", userId);


    if (success) {
      const { count } = await supabase
        .from("player_pokemon")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .eq("in_party", true);
      const speciesId = row.species_id ?? 0;
      const type = (row.species_type as string) ?? speciesType(speciesId);
      const ivs = {
        iv_hp: randInt(0, 31),
        iv_atk: randInt(0, 31),
        iv_def: randInt(0, 31),
        iv_spa: randInt(0, 31),
        iv_spd: randInt(0, 31),
        iv_spe: randInt(0, 31),
      };
      const hpMax = hpValue(row.level, baseStats(row.species_id ?? 0)[0], ivs.iv_hp);
      const nature = pick(NATURES);
      const ability = pick(abilitiesFor(type));
      await (await writeDb()).from("player_pokemon").insert({
        owner_id: userId,
        species_id: speciesId,
        species_name: row.species_name ?? "Nieznany Pokémon",
        level: row.level,
        hp_current: hpMax,
        hp_max: hpMax,
        in_party: (count ?? 0) < 6,
        nature,
        ability,
        ...(data.ball === "luxury" ? { friendship: LUXURY_FRIENDSHIP } : {}),
        ...(row.is_shiny ? { is_shiny: true } : {}),
        ...ivs,
      });
      log.push(
        row.is_shiny
          ? `✨ Złapano SHINY ${row.species_name}! Natura: ${nature}, umiejętność: ${ability}.`
          : `Złapano ${row.species_name}! Natura: ${nature}, umiejętność: ${ability}.`,
      );
      const gainedExp = 8 + row.level * 5;
      await applyTrainerReward(supabase, userId, gainedExp, 0);
      const questsCompleted = await progressActivities(supabase, userId, "catch", 1, String(speciesId), {
        biome: row.biome ?? null,
        typeName: type,
      });
      await (await writeDb())
        .from("encounters")
        .update({ status: "caught", log, reward_exp: gainedExp })
        .eq("id", row.id);
      return {
        ok: true as const,
        caught: true,
        chance,
        questsCompleted: [...new Set(questsCompleted)],
        state: await buildState(supabase, userId),
      };
    }

    const fled = Math.random() < (useRazz ? 0.05 : 0.15);
    log.push(fled ? `${row.species_name} uciekł.` : "Ball chybił — Pokémon nadal tu jest.");
    await (await writeDb())
      .from("encounters")
      .update({ status: fled ? "fled" : "active", log })
      .eq("id", row.id);
    return {
      ok: true as const,
      caught: false,
      fled,
      chance,
      state: await buildState(supabase, userId),
    };
  });

/** Walka z Trenerem-Botem: pełna symulacja drużyn z przewagami typów. */
export const resolveBotBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { encounterId: string }) => {
    if (!input?.encounterId) throw new Error("Brak spotkania.");
    return { encounterId: input.encounterId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("encounters")
      .select("*")
      .eq("id", data.encounterId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!row || row.status !== "active" || row.kind !== "bot") {
      throw new Error("To spotkanie już się zakończyło.");
    }

    const party = await loadParty(supabase, userId);
    const allies = party.filter((p) => !p.fainted && p.hp_current > 0).map(toFighter);
    const log: string[] = [...((row.log as string[]) ?? [])];
    const label = `${row.trainer_class ?? "Trener"} ${row.trainer_person ?? "Bot"}`;

    if (allies.length === 0) {
      log.push("Nie masz zdolnego do walki Pokémona — ulecz drużynę.");
      await (await writeDb()).from("encounters").update({ status: "lost", log }).eq("id", row.id);
      return {
        ok: false as const,
        won: false,
        reason: "Cała drużyna jest zemdlona. Ulecz Pokémony w zakładce Drużyna.",
        log,
        state: await buildState(supabase, userId),
      };
    }

    const team = ((row.bot_team as BotMember[] | null) ?? []).map((member) =>
      foeFighter(member, 30, 1.45, " bota"),
    );



    const botQuestsCompleted: string[] = [];
    const result = simulateTeamBattle(allies, team);

    const report = result.report;
    log.push(`Walka z ${label}:`);
    log.push(...result.log);

    for (const [id, hp] of Object.entries(result.allyHp)) {
      await (await writeDb())
        .from("player_pokemon")
        .update({ hp_current: hp, fainted: hp <= 0 })
        .eq("id", id)
        .eq("owner_id", userId);
    }

    if (result.won) {
      log.push(
        `Nagroda: +${row.reward_exp} EXP trenera, +${row.reward_coins} Catch Coins.`,
      );
      report.trainer_exp = row.reward_exp;
      report.coins = row.reward_coins;
      report.extras.push(...(await applyTrainerReward(supabase, userId, row.reward_exp, row.reward_coins)));
      botQuestsCompleted.push(...(await progressActivities(supabase, userId, "battle", 1, "bot")));
      const foeLevel = Math.max(1, ...team.map((f) => f.level));
      const gain = expForDefeat(foeLevel, "bot");
      for (const ally of allies) report.pokemon_exp.push({ name: ally.name, exp: gain });
      log.push(
        ...(await awardPokemonExp(
          supabase,
          userId,
          Object.keys(result.allyHp).map((id) => ({ id, exp: gain })),
        )),
      );
    } else {
      log.push(`${label} wygrywa. Bez nagrody — ulecz drużynę i wróć silniejszy.`);
    }

    await (await writeDb())
      .from("encounters")
      .update({ status: result.won ? "resolved" : "lost", log: log.slice(-40) })
      .eq("id", row.id);

    return {
      ok: true as const,
      won: result.won,
      log,
      report,
      questsCompleted: [...new Set(botQuestsCompleted)],
      state: await buildState(supabase, userId),
    };
  });

/** Zamknięcie spotkania bez akcji (np. gałąź PvP lub ucieczka gracza). */
export const dismissEncounter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { encounterId: string }) => {
    if (!input?.encounterId) throw new Error("Brak spotkania.");
    return { encounterId: input.encounterId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await (await writeDb())
      .from("encounters")
      .update({ status: "skipped" })
      .eq("id", data.encounterId)
      .eq("owner_id", userId)
      .eq("status", "active");
    return { ok: true as const, state: await buildState(supabase, userId) };
  });

async function applyTrainerReward(
  supabase: any,
  userId: string,
  exp: number,
  coins: number,
) : Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("trainer_level, trainer_exp, catch_coins, poke_balls, great_balls, ultra_balls, energy_bottles")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return [];
  const oldLevel = data.trainer_level as number;
  let level = data.trainer_level as number;
  let total = (data.trainer_exp as number) + exp;
  while (total >= expThreshold(level)) {
    total -= expThreshold(level);
    level += 1;
  }
  const gainedLevels = level - oldLevel;
  const updates: Record<string, number> = { trainer_level: level, trainer_exp: total, catch_coins: (data.catch_coins as number) + coins };
  if (gainedLevels > 0) {
    updates['poke_balls'] = data.poke_balls + gainedLevels * 5;
    updates['great_balls'] = data.great_balls + gainedLevels * Math.max(1, Math.floor(level / 5));
    updates['ultra_balls'] = data.ultra_balls + gainedLevels * Math.floor(level / 10);
    updates['energy_bottles'] = data.energy_bottles + gainedLevels * Math.max(1, Math.floor(level / 10));
  }
  await (await writeDb())
    .from("profiles")
    .update(updates)
    .eq("id", userId);
  return gainedLevels > 0 ? [`Awans trenera na Lvl ${level}: +${gainedLevels * 5} Poké Balli, +${gainedLevels * Math.max(1, Math.floor(level / 5))} Great Balli i +${gainedLevels * Math.max(1, Math.floor(level / 10))} Flakonów Energii.`] : [];
}

/** Leczenie Pokémona w trakcie walki (albo poza nią) przedmiotem z torby. */
export const useHealItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pokemonId: string; item: string; encounterId?: string }) => {
    if (!input?.pokemonId) throw new Error("Wybierz Pokémona.");
    const item = healByKey(String(input?.item ?? ""));
    if (!item) throw new Error("Nieznany przedmiot leczący.");
    return {
      pokemonId: String(input.pokemonId),
      item: item.key,
      encounterId: input?.encounterId ? String(input.encounterId) : null,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const item = healByKey(data.item)!;
    const profile = await syncEnergy(supabase, userId);
    const owned = (profile as any)[item.field] ?? 0;
    if (owned <= 0) {
      return {
        ok: false as const,
        reason: `Nie masz przedmiotu: ${item.label}.`,
        state: await buildState(supabase, userId),
      };
    }

    const { data: mon } = await supabase
      .from("player_pokemon")
      .select("id, species_name, nickname, hp_current, hp_max, fainted")
      .eq("id", data.pokemonId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!mon) throw new Error("Nie znaleziono Pokémona.");

    const name = mon.nickname ?? mon.species_name;
    if (item.revive) {
      if (!mon.fainted && mon.hp_current > 0) {
        return {
          ok: false as const,
          reason: `${name} nie jest zemdlony.`,
          state: await buildState(supabase, userId),
        };
      }
    } else if (mon.fainted || mon.hp_current <= 0) {
      return {
        ok: false as const,
        reason: `${name} jest zemdlony — użyj Eliksiru Życia.`,
        state: await buildState(supabase, userId),
      };
    } else if (mon.hp_current >= mon.hp_max) {
      return {
        ok: false as const,
        reason: `${name} ma pełne HP.`,
        state: await buildState(supabase, userId),
      };
    }

    const healed = item.revive
      ? Math.max(1, Math.round(mon.hp_max / 2))
      : Math.min(mon.hp_max, mon.hp_current + item.heal);

    await (await writeDb())
      .from("player_pokemon")
      .update({ hp_current: healed, fainted: false })
      .eq("id", mon.id)
      .eq("owner_id", userId);
    await ((await writeDb()).from("profiles") as any)
      .update({ [item.field]: owned - 1 })
      .eq("id", userId);

    const line = item.revive
      ? `Używasz ${item.label}: ${name} wraca do walki z ${healed} HP.`
      : `Używasz ${item.label}: ${name} ma teraz ${healed}/${mon.hp_max} HP.`;

    if (data.encounterId) {
      const { data: row } = await supabase
        .from("encounters")
        .select("id, status, log")
        .eq("id", data.encounterId)
        .eq("owner_id", userId)
        .maybeSingle();
      if (row && row.status === "active") {
        const log = [...(((row.log as string[]) ?? [])), line];
        await (await writeDb()).from("encounters").update({ log: log.slice(-30) }).eq("id", row.id);
      }
    }

    return {
      ok: true as const,
      hp: healed,
      message: line,
      state: await buildState(supabase, userId),
    };
  });
