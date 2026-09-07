import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BIOMES, findBiome, type BiomeSpecies } from "@/lib/biomes";
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
  REGION_SPECIES,
  inRegion,
  speciesType,
} from "@/lib/pokedex";

const MAX_ENERGY = 100;
const ENERGY_TICK_MS = 3 * 60 * 1000; // +1 Energii co 3 minuty
const MIN_TRAVEL_COST = 2;
const MAX_TRAVEL_COST = 5;

export type EncounterView = {
  id: string;
  biome: string;
  kind: "wild" | "bot" | "pvp";
  status: string;
  species_id: number | null;
  species_name: string | null;
  species_type: string | null;
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

export type ExplorationState = {
  energy: number;
  energy_max: number;
  poke_balls: number;
  catch_coins: number;
  trainer_level: number;
  trainer_exp: number;
  trainer_exp_next: number;
  party_size: number;
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
  catch_coins: number;
  trainer_level: number;
  trainer_exp: number;
  region: string | null;
};

const PROFILE_COLUMNS =
  "energy, energy_updated_at, poke_balls, catch_coins, trainer_level, trainer_exp, region";

/** Pula gatunków biomu ograniczona do regionu wybranego przez gracza. */
function speciesPool(biomeSlug: string, region: string | null): BiomeSpecies[] {
  const biome = findBiome(biomeSlug)!;
  const local = biome.species.filter((s) => inRegion(s.id, region));
  if (local.length > 0) return local;
  const regional = [
    ...BIOMES.flatMap((b) => b.species),
    ...Object.values(REGION_SPECIES).flat(),
  ].filter((s) => inRegion(s.id, region));
  const sameElement = regional.filter((s) => s.type === biome.element);
  if (sameElement.length > 0) return sameElement;
  return regional.length > 0 ? regional : biome.species;
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
      await supabase
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
  await supabase
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

async function buildState(supabase: any, userId: string): Promise<ExplorationState> {
  const profile = await syncEnergy(supabase, userId);
  const [{ data: encounters }, { count }] = await Promise.all([
    supabase
      .from("encounters")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("player_pokemon")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("in_party", true),
  ]);

  const rows = ((encounters ?? []) as any[]).map(toView);
  const active = rows.find((row) => row.status === "active") ?? null;

  return {
    energy: profile.energy,
    energy_max: MAX_ENERGY,
    poke_balls: profile.poke_balls,
    catch_coins: profile.catch_coins,
    trainer_level: profile.trainer_level,
    trainer_exp: profile.trainer_exp,
    trainer_exp_next: expThreshold(profile.trainer_level),
    party_size: count ?? 0,
    region: profile.region,
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
    const pool = speciesPool(biome.slug, profile.region);

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

    await supabase
      .from("profiles")
      .update({
        energy: Math.max(0, profile.energy - cost),
        energy_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    const trainerLevel = profile.trainer_level;
    const roll = Math.random();
    const kind: "wild" | "bot" | "pvp" = roll < 0.6 ? "wild" : roll < 0.92 ? "bot" : "pvp";

    const levelFor = (bonus = 0) =>
      Math.max(1, Math.min(trainerLevel + 5, trainerLevel + bonus + randInt(-1, 2)));

    let payload: { kind: "wild" | "bot" | "pvp" } & Record<string, unknown>;
    if (kind === "wild") {
      const species: BiomeSpecies = pick(pool);
      const level = levelFor();
      const hpMax = hpFromIv(level, 16);
      payload = {
        kind,
        species_id: species.id,
        species_name: species.name,
        species_type: species.type,
        level,
        hp_max: hpMax,
        hp_current: hpMax,
        log: [
          `Krok w biomie ${biome.name} (−${cost} Energii).`,
          `Z zarośli wyszedł dziki ${species.name} (typ ${species.type}, Lvl ${level}).`,
          "Osłab go w walce, a potem rzuć Poké Ballem — im mniej HP, tym większa szansa.",
        ],
      };
    } else if (kind === "bot") {
      const size = randInt(3, 4);
      const team: BotMember[] = Array.from({ length: size }, () => {
        const species: BiomeSpecies = pick(pool);
        return {
          species_id: species.id,
          species_name: species.name,
          species_type: species.type,
          level: levelFor(2),
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
          `${trainerClass} ${person} wyzywa Cię na walkę: ${size} Pokémony (średni Lvl ${avg}).`,
        ],
      };
    } else {
      payload = {
        kind,
        level: trainerLevel,
        log: [
          `Krok w biomie ${biome.name} (−${cost} Energii).`,
          "Na szlaku pojawił się żywy gracz — PvP dochodzi w kolejnym etapie.",
        ],
      };
    }

    const { data: created, error } = await supabase
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

/** Runda walki z dzikim Pokémonem — osłabia go przed rzutem Ballem. */
export const fightWild = createServerFn({ method: "POST" })
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
    if (!row || row.status !== "active" || row.kind !== "wild") {
      throw new Error("To spotkanie już się zakończyło.");
    }

    const party = await loadParty(supabase, userId);
    const lead = party.find((p) => !p.fainted && p.hp_current > 0);
    const log: string[] = [...((row.log as string[]) ?? [])];
    if (!lead) {
      log.push("Cała drużyna jest zemdlona — ulecz Pokémony w zakładce Drużyna.");
      await supabase.from("encounters").update({ status: "lost", log }).eq("id", row.id);
      return {
        ok: false as const,
        reason: "Cała drużyna jest zemdlona. Ulecz Pokémony i wracaj na szlak.",
        state: await buildState(supabase, userId),
      };
    }

    const me = toFighter(lead);
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

    const myMult = typeMultiplier(me.type, foe.type);
    const foeMult = typeMultiplier(foe.type, me.type);
    const myDmg = Math.max(2, Math.round((me.atk * 1.05 - foe.def * 0.5) * myMult));
    const foeDmg = Math.max(2, Math.round((foe.atk * 0.9 - me.def * 0.5) * foeMult));

    const wildHp = Math.max(1, foe.hp - myDmg);
    const allyHp = Math.max(0, me.hp - foeDmg);

    log.push(
      `${me.name} atakuje ${foe.name} za ${myDmg}${myMult > 1 ? " (super skuteczne!)" : myMult < 1 ? " (niewiele dało)" : ""}. HP dzikiego: ${wildHp}/${foe.hpMax}.`,
    );
    log.push(
      `${foe.name} kontratakuje za ${foeDmg}. HP ${me.name}: ${allyHp}/${me.hpMax}.`,
    );
    if (allyHp === 0) log.push(`${me.name} pada — wysyłasz kolejnego Pokémona.`);

    await supabase
      .from("player_pokemon")
      .update({ hp_current: allyHp, fainted: allyHp === 0 })
      .eq("id", lead.id)
      .eq("owner_id", userId);

    await supabase
      .from("encounters")
      .update({ hp_current: wildHp, log: log.slice(-30) })
      .eq("id", row.id);

    return {
      ok: true as const,
      wildHp,
      allyHp,
      state: await buildState(supabase, userId),
    };
  });

/** Rzut Poké Ballem — szansa złapania liczona serwerowo z aktualnego HP. */
export const throwBall = createServerFn({ method: "POST" })
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
    if (!row || row.status !== "active" || row.kind !== "wild") {
      throw new Error("To spotkanie już się zakończyło.");
    }
    const profile = await syncEnergy(supabase, userId);
    if (profile.poke_balls <= 0) {
      return {
        ok: false as const,
        reason: "Nie masz już Poké Balli.",
        state: await buildState(supabase, userId),
      };
    }

    const hpFactor = (3 * row.hp_max - 2 * row.hp_current) / (3 * row.hp_max);
    const chance = Math.max(0.05, Math.min(0.95, hpFactor * 0.9));
    const success = Math.random() < chance;
    const log: string[] = [
      ...((row.log as string[]) ?? []),
      `Rzut Poké Ballem (szansa ${Math.round(chance * 100)}%).`,
    ];

    await supabase
      .from("profiles")
      .update({ poke_balls: profile.poke_balls - 1 })
      .eq("id", userId);

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
      await supabase.from("player_pokemon").insert({
        owner_id: userId,
        species_id: speciesId,
        species_name: row.species_name ?? "Nieznany Pokémon",
        level: row.level,
        hp_current: hpMax,
        hp_max: hpMax,
        in_party: (count ?? 0) < 6,
        nature,
        ability,
        ...ivs,
      });
      log.push(`Złapano ${row.species_name}! Natura: ${nature}, umiejętność: ${ability}.`);
      const gainedExp = 8 + row.level * 5;
      await applyTrainerReward(supabase, userId, gainedExp, 0);
      await supabase
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

    const fled = Math.random() < 0.15;
    log.push(fled ? `${row.species_name} uciekł.` : "Ball chybił — Pokémon nadal tu jest.");
    await supabase
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
      await supabase.from("encounters").update({ status: "lost", log }).eq("id", row.id);
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
      await supabase
        .from("player_pokemon")
        .update({ hp_current: hp, fainted: hp <= 0 })
        .eq("id", id)
        .eq("owner_id", userId);
    }

    if (result.won) {
      log.push(
        `Nagroda: +${row.reward_exp} EXP trenera, +${row.reward_coins} Catch Coins.`,
      );
      await applyTrainerReward(supabase, userId, row.reward_exp, row.reward_coins);
    } else {
      log.push(`${label} wygrywa. Bez nagrody — ulecz drużynę i wróć silniejszy.`);
    }

    await supabase
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
    await supabase
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
) {
  const { data } = await supabase
    .from("profiles")
    .select("trainer_level, trainer_exp, catch_coins")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return;
  let level = data.trainer_level as number;
  let total = (data.trainer_exp as number) + exp;
  while (total >= expThreshold(level)) {
    total -= expThreshold(level);
    level += 1;
  }
  await supabase
    .from("profiles")
    .update({
      trainer_level: level,
      trainer_exp: total,
      catch_coins: (data.catch_coins as number) + coins,
    })
    .eq("id", userId);
}
