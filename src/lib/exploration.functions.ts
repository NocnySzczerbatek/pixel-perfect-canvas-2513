import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BIOMES, findBiome, type BiomeSpecies } from "@/lib/biomes";

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

function hpForLevel(level: number) {
  return 20 + level * 4;
}

type ProfileRow = {
  energy: number;
  energy_updated_at: string;
  poke_balls: number;
  catch_coins: number;
  trainer_level: number;
  trainer_exp: number;
};

const PROFILE_COLUMNS =
  "energy, energy_updated_at, poke_balls, catch_coins, trainer_level, trainer_exp";

type SupabaseClient = Parameters<typeof identity>[0];
function identity<T>(value: T) {
  return value;
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
    energy_cost: row.energy_cost,
    reward_exp: row.reward_exp,
    reward_coins: row.reward_coins,
    log: Array.isArray(row.log) ? (row.log as string[]) : [],
    created_at: row.created_at,
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
    const kind: "wild" | "bot" | "pvp" = roll < 0.5 ? "wild" : roll < 0.85 ? "bot" : "pvp";

    const levelFor = () =>
      Math.max(1, Math.min(trainerLevel + 5, trainerLevel + randInt(-2, 2)));

    let payload: { kind: "wild" | "bot" | "pvp" } & Record<string, unknown>;
    if (kind === "wild") {
      const species: BiomeSpecies = pick(biome.species);
      const level = levelFor();
      const hpMax = hpForLevel(level);
      payload = {
        kind,
        species_id: species.id,
        species_name: species.name,
        species_type: species.type,
        level,
        hp_max: hpMax,
        hp_current: Math.max(1, Math.round(hpMax * (randInt(40, 100) / 100))),
        log: [
          `Krok w biomie ${biome.name} (−${cost} Energii).`,
          `Z zarośli wyszedł dziki ${species.name} (typ ${species.type}, Lvl ${level}).`,
        ],
      };
    } else if (kind === "bot") {
      const size = randInt(2, 4);
      const team: BotMember[] = Array.from({ length: size }, () => {
        const species: BiomeSpecies = pick(biome.species);
        return {
          species_id: species.id,
          species_name: species.name,
          species_type: species.type,
          level: levelFor(),
        };
      });
      const avg = Math.round(team.reduce((sum, m) => sum + m.level, 0) / team.length);
      payload = {
        kind,
        level: avg,
        bot_team: team,
        hp_max: hpForLevel(avg),
        hp_current: hpForLevel(avg),
        reward_exp: 12 + avg * 8,
        reward_coins: 15 + avg * 6,
        log: [
          `Krok w biomie ${biome.name} (−${cost} Energii).`,
          `Trener-Bot wyzywa Cię na walkę: ${size} Pokémony (średni Lvl ${avg}).`,
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

/** Rzut Poké Ballem — szansa złapania liczona serwerowo. */
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
      await supabase.from("player_pokemon").insert({
        owner_id: userId,
        species_id: row.species_id,
        species_name: row.species_name,
        level: row.level,
        hp_current: row.hp_max,
        hp_max: row.hp_max,
        in_party: (count ?? 0) < 6,
      });
      log.push(`Złapano ${row.species_name}!`);
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

    const fled = Math.random() < 0.25;
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

/** Auto-walka z Trenerem-Botem: bezpieczne EXP i Catch Coins, bez ryzyka strat. */
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

    const { data: party } = await supabase
      .from("player_pokemon")
      .select("species_name, level")
      .eq("owner_id", userId)
      .eq("in_party", true);

    const team = (row.bot_team as BotMember[] | null) ?? [];
    const mine = (party ?? []) as { species_name: string; level: number }[];
    const log: string[] = [...((row.log as string[]) ?? [])];
    const lead = mine[0]?.species_name ?? "Twój Pokémon";

    team.forEach((member, index) => {
      const ally = mine[index % Math.max(1, mine.length)]?.species_name ?? lead;
      log.push(`Tura ${index + 1}: ${ally} pokonuje ${member.species_name} (Lvl ${member.level}).`);
    });
    log.push(
      `Wygrana: +${row.reward_exp} EXP trenera, +${row.reward_coins} Catch Coins. Twoje Pokémony wracają bez obrażeń.`,
    );

    await applyTrainerReward(supabase, userId, row.reward_exp, row.reward_coins);
    await supabase.from("encounters").update({ status: "resolved", log }).eq("id", row.id);

    return {
      ok: true as const,
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
