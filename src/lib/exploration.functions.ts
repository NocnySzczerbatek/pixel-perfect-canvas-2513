import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BIOMES, findBiome, type BiomeSpecies } from "@/lib/biomes";
import { biomePool, regionWidePool } from "@/lib/encounter-pool";
import { RAZZ, ballByKey, healByKey } from "@/lib/items";
import { awardPokemonExp, expForDefeat } from "@/lib/leveling";
import { progressActivities } from "@/lib/quests.functions";
import { effectiveRegion } from "@/lib/travel";
import {
  hpFromIv,
  simulateTeamBattle,
  statFromIv,
  typeMultiplier,
  type Fighter,
} from "@/lib/battle";
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


const MAX_ENERGY = 100;
const ENERGY_TICK_MS = 3 * 60 * 1000; // +1 Energii co 3 minuty
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
  "energy, energy_updated_at, poke_balls, great_balls, ultra_balls, master_balls, premier_balls, net_balls, dive_balls, dusk_balls, quick_balls, timer_balls, repeat_balls, luxury_balls, razz_berries, potions, super_potions, revives, catch_coins, candy_normal, candy_xl, trainer_level, trainer_exp, region, travel_region, travel_until";



/** Pula gatunków biomu: cały Pokédex regionu przefiltrowany typami biomu. */
function speciesPool(biomeSlug: string, region: string | null): BiomeSpecies[] {
  return biomePool(biomeSlug, region);
}

/** Szeroka pula regionu — drużyny trenerów mieszają typy, nie tylko element biomu. */
function regionPool(region: string | null): BiomeSpecies[] {
  return regionWidePool(region);
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

  const energy = Math.min(MAX_ENERGY, profile.energy + ticks);
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
  iv_atk: number;
  iv_def: number;
  iv_spe: number;
};

const PARTY_COLUMNS =
  "id, species_id, species_name, nickname, level, hp_current, hp_max, fainted, iv_atk, iv_def, iv_spe";

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
  return {
    id: row.id,
    name: row.nickname ?? row.species_name,
    type: speciesType(row.species_id),
    level: row.level,
    hp: row.hp_current,
    hpMax: row.hp_max,
    atk: statFromIv(row.level, row.iv_atk),
    def: statFromIv(row.level, row.iv_def),
    spe: statFromIv(row.level, row.iv_spe),
  };
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
    const pool = speciesPool(biome.slug, activeRegion);
    const trainerPool = regionPool(activeRegion);

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

    await ((await writeDb()).from("profiles") as any)
      .update({
        energy: Math.max(0, profile.energy - cost),
        energy_updated_at: new Date().toISOString(),
        ...(foundCandy === "normal" ? { candy_normal: (profile.candy_normal ?? 0) + 1 } : {}),
        ...(foundCandy === "xl" ? { candy_xl: (profile.candy_xl ?? 0) + 1 } : {}),
      })
      .eq("id", userId);

    const candyLine =
      foundCandy === "normal"
        ? "Na ścieżce leżał Zwykły Cukierek — trafił do ekwipunku."
        : foundCandy === "xl"
          ? "Znalazłeś Cukierek XL — rzadkie znalezisko!"
          : null;

    const megaSpecies = [3, 6, 9, 65, 94, 115, 127, 130, 142, 150, 181, 212, 214, 229, 248, 254, 257, 260, 282, 303, 306, 308, 310, 319, 323, 334, 354, 359, 362, 373, 376, 380, 381, 445, 448, 460, 475, 531, 719];
    const foundMegaSpecies = Math.random() < 0.08 ? pick(megaSpecies) : null;
    if (foundMegaSpecies) {
      const itemKey = `mega_shard_${foundMegaSpecies}`;
      const { data: owned } = await supabase.from("player_items").select("id, quantity").eq("owner_id", userId).eq("item_key", itemKey).maybeSingle();
      if (owned) await (await writeDb()).from("player_items").update({ quantity: owned.quantity + 1 }).eq("id", owned.id).eq("owner_id", userId);
      else await (await writeDb()).from("player_items").insert({ owner_id: userId, item_key: itemKey, quantity: 1, metadata: { species_id: foundMegaSpecies, kind: "mega_shard" } });
    }
    await progressActivities(supabase, userId, "battle", 1, "exploration");

    const trainerLevel = profile.trainer_level;
    const kind: "wild" | "bot" = Math.random() < 0.62 ? "wild" : "bot";

    const levelFor = (bonus = 0) =>
      Math.max(1, Math.min(trainerLevel + 5, trainerLevel + bonus + randInt(-1, 2)));

    let payload: { kind: "wild" | "bot" } & Record<string, unknown>;
    if (kind === "wild") {
      // Bonusy (Shiny Charm, buffy czasowe, trwałe osiągnięcia) — liczone po stronie serwera.
      const { encounterMultipliers } = await import("@/lib/bonuses.server");
      const mult = await encounterMultipliers(userId);
      const rarePool = [...pool].sort((a, b) => b.id - a.id).slice(0, Math.max(1, Math.ceil(pool.length / 4)));
      const rareChance = Math.min(0.6, 0.15 * mult.rare);
      const isRareRoll = rarePool.length > 0 && Math.random() < rareChance;
      const species: BiomeSpecies = isRareRoll ? pick(rarePool) : pick(pool);
      const level = levelFor();
      const hpMax = hpFromIv(level, 16);
      const shinyChance = SHINY_CHANCE * mult.shiny;
      const isShiny = Math.random() < shinyChance;

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
          ...(candyLine ? [candyLine] : []),
          ...(foundMegaSpecies ? ["Znalazłeś fragment Kamienia Mega!"] : []),
          ...(isShiny
            ? [`✨ Powietrze zaiskrzyło — to SHINY ${species.name}! Niezwykle rzadkie spotkanie.`]
            : []),
          `Z zarośli wyszedł dziki ${species.name} (typ ${species.type}, Lvl ${level}).`,
          "Wybierz Pokémona i atak — po pokonaniu dzikiego możesz go złapać.",
        ],
      };
    } else {
      const size = randInt(3, 4);
      const team: BotMember[] = Array.from({ length: size }, () => {
        const species: BiomeSpecies = pick(trainerPool);
        return {
          species_id: species.id,
          species_name: species.name,
          species_type: species.type,
          level: Math.max(1, trainerLevel + randInt(-2, 2)),
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
        hp_max: hpFromIv(avg, 20),
        hp_current: hpFromIv(avg, 20),
        reward_exp: 20 + avg * 12,
        reward_coins: 25 + avg * 9,
        log: [
          `Krok w biomie ${biome.name} (−${cost} Energii).`,
          ...(candyLine ? [candyLine] : []),
          ...(foundMegaSpecies ? ["Znalazłeś fragment Kamienia Mega!"] : []),
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
      state: await buildState(supabase, userId),
    };
  });

/** Jedna tura interaktywnej walki 1 na 1 z dzikim Pokémonem (gracz wybiera atak). */
export const fightWildMove = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { encounterId: string; pokemonId: string; move: string }) => {
    if (!input?.encounterId) throw new Error("Brak spotkania.");
    if (!input?.pokemonId) throw new Error("Wybierz Pokémona do walki.");
    if (!input?.move) throw new Error("Wybierz atak.");
    return {
      encounterId: input.encounterId,
      pokemonId: input.pokemonId,
      move: String(input.move).slice(0, 40),
    };
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
    const log: string[] = [...((row.log as string[]) ?? [])];
    if (!mine || mine.fainted || mine.hp_current <= 0) {
      return {
        ok: false as const,
        reason: "Ten Pokémon nie może walczyć. Wybierz innego lub ulecz drużynę.",
        state: await buildState(supabase, userId),
      };
    }

    const me = toFighter(mine);
    const myMoves = battleMoves(mine.species_id, mine.level);
    const move = myMoves.find((m) => m.name === data.move);
    if (!move) throw new Error("Ten Pokémon nie zna tego ataku.");

    const wildType = (row.species_type as string) ?? "Normalny";
    const foe: Fighter = {
      name: row.species_name ?? "Dziki Pokémon",
      type: wildType,
      level: row.level,
      hp: row.hp_current,
      hpMax: row.hp_max,
      atk: statFromIv(row.level, 16),
      def: statFromIv(row.level, 16),
      spe: statFromIv(row.level, 16),
    };

    const noteFor = (mult: number) =>
      mult > 1 ? " Super skuteczny!" : mult < 1 ? " Nieskuteczny…" : "";

    const myMult = typeMultiplier(me.type, foe.type);
    const myDmg = Math.max(
      2,
      Math.round((me.atk * (move.power / 55) - foe.def * 0.5) * myMult * (0.9 + Math.random() * 0.2)),
    );
    const wildHp = Math.max(0, foe.hp - myDmg);
    log.push(
      `${me.name} używa ${move.name} i zadaje ${myDmg} obrażeń.${noteFor(myMult)} HP ${foe.name}: ${wildHp}/${foe.hpMax}.`,
    );

    let allyHp = me.hp;
    if (wildHp > 0) {
      const foeMoves = battleMoves(row.species_id ?? 0, row.level);
      const foeMove = foeMoves.length > 0 ? pick(foeMoves) : { name: "Tackle", power: 35, level: 1 };
      const foeMult = typeMultiplier(foe.type, me.type);
      const foeDmg = Math.max(
        2,
        Math.round(
          (foe.atk * (foeMove.power / 60) - me.def * 0.5) * foeMult * (0.9 + Math.random() * 0.2),
        ),
      );
      allyHp = Math.max(0, me.hp - foeDmg);
      log.push(
        `${foe.name} odpowiada ${foeMove.name} za ${foeDmg}.${noteFor(foeMult)} HP ${me.name}: ${allyHp}/${me.hpMax}.`,
      );
    } else {
      log.push(`${foe.name} pada! Możesz rzucić Poké Ballem albo iść dalej.`);
      log.push(
        ...(await awardPokemonExp(supabase, userId, [
          { id: mine.id, exp: expForDefeat(row.level, "wild") },
        ])),
      );
    }

    if (allyHp === 0) log.push(`${me.name} jest Zemdlony — ulecz go w zakładce Drużyna.`);

    await (await writeDb())
      .from("player_pokemon")
      .update({ hp_current: allyHp, fainted: allyHp === 0 })
      .eq("id", mine.id)
      .eq("owner_id", userId);

    const lost = allyHp === 0 && wildHp > 0;
    await (await writeDb())
      .from("encounters")
      .update({
        hp_current: wildHp,
        log: log.slice(-30),
        ...(lost ? { status: "lost" } : {}),
      })
      .eq("id", row.id);

    return {
      ok: true as const,
      wildHp,
      allyHp,
      wildDefeated: wildHp === 0,
      allyFainted: allyHp === 0,
      lost,
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

    const hpFactor = (3 * row.hp_max - 2 * row.hp_current) / (3 * row.hp_max);
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 6;
    const { count: ownedSpecies } = await supabase.from("player_pokemon").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("species_id", row.species_id ?? 0);
    const turns = ((row.log as string[]) ?? []).filter((line: string) => line.includes("zadaje")).length;
    const situational = data.ball === "net" && ["Woda", "Robak"].includes(row.species_type ?? "") ? 3 / ball.multiplier
      : data.ball === "dive" && row.species_type === "Woda" ? 3 / ball.multiplier
      : data.ball === "dusk" && (isNight || row.biome === "cave") ? 3 / ball.multiplier
      : data.ball === "quick" && row.hp_current === row.hp_max ? 4 / ball.multiplier
      : data.ball === "timer" ? Math.min(3.5, 1 + turns * 0.35) / ball.multiplier
      : data.ball === "repeat" && (ownedSpecies ?? 0) > 0 ? 3 / ball.multiplier : 1;
    const chance =
      ball.multiplier >= 99
        ? 1
        : Math.max(
            0.05,
            Math.min(0.95, hpFactor * 0.9 * ball.multiplier * situational * (useRazz ? RAZZ.bonus : 1)),
          );
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
      const hpMax = hpFromIv(row.level, ivs.iv_hp);
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
        ...(data.ball === "luxury" ? { friendship: 120 } : {}),
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
      await progressActivities(supabase, userId, "catch", 1, String(speciesId));
      await (await writeDb())
        .from("encounters")
        .update({ status: "caught", log, reward_exp: gainedExp })
        .eq("id", row.id);
      return {
        ok: true as const,
        caught: true,
        chance,
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

    const team = ((row.bot_team as BotMember[] | null) ?? []).map((member) => ({
      name: `${member.species_name} bota`,
      type: member.species_type,
      level: member.level,
      hp: hpFromIv(member.level, 24),
      hpMax: hpFromIv(member.level, 24),
      atk: Math.round(statFromIv(member.level, 24) * 1.15),
      def: Math.round(statFromIv(member.level, 24) * 1.1),
      spe: statFromIv(member.level, 24),
    })) as Fighter[];

    const result = simulateTeamBattle(allies, team);
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
      log.push(...(await applyTrainerReward(supabase, userId, row.reward_exp, row.reward_coins)));
      await progressActivities(supabase, userId, "battle", 1, "bot");
      const foeLevel = Math.max(1, ...team.map((f) => f.level));
      log.push(
        ...(await awardPokemonExp(
          supabase,
          userId,
          Object.keys(result.allyHp).map((id) => ({ id, exp: expForDefeat(foeLevel, "bot") })),
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
