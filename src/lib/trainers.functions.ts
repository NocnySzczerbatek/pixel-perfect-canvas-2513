import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { simulateTeamBattle, type BattleReport } from "@/lib/battle";
import { allyFighter, foeFighter } from "@/lib/fighters";
import { awardPokemonExp, expForDefeat } from "@/lib/leveling";
import { REGION_SPECIES, TRAINER_CLASSES, TRAINER_NAMES, speciesType } from "@/lib/pokedex";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const TRAINER_ENERGY = 6;
const BOARD_SIZE = 6;
const PARTY_COLUMNS =
  "id, species_id, species_name, nickname, level, hp_current, hp_max, fainted, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, ability, is_shiny";

/** Deterministyczny generator — ta sama plansza przeciwników przez cały dzień. */
function rngFrom(seedText: string) {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type TrainerFoe = {
  index: number;
  trainer_class: string;
  person: string;
  team: { species_id: number; species_name: string; species_type: string; level: number }[];
  reward_exp: number;
  reward_coins: number;
};

export type TrainerBoard = {
  energy: number;
  energy_cost: number;
  trainer_level: number;
  region: string;
  party_ready: number;
  day: string;
  opponents: TrainerFoe[];
};

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Plansza przeciwników wyliczana serwerowo — klient nie może podrzucić własnej drużyny. */
function buildBoard(userId: string, region: string, trainerLevel: number): TrainerFoe[] {
  const pool = REGION_SPECIES[region] ?? REGION_SPECIES["kanto"]!;
  const day = dayKey();
  const opponents: TrainerFoe[] = [];
  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const rand = rngFrom(`${userId}|${day}|${index}`);
    const trainerClass = TRAINER_CLASSES[Math.floor(rand() * TRAINER_CLASSES.length)]!;
    const person = TRAINER_NAMES[Math.floor(rand() * TRAINER_NAMES.length)]!;
    const teamSize = 1 + Math.floor(rand() * 3) + (index >= 4 ? 1 : 0);
    const team = Array.from({ length: teamSize }).map(() => {
      const species = pool[Math.floor(rand() * pool.length)]!;
      const level = Math.max(2, trainerLevel - 2 + index + Math.floor(rand() * 4));
      return {
        species_id: species.id,
        species_name: species.name,
        species_type: speciesType(species.id),
        level,
      };
    });
    const avg = Math.round(team.reduce((sum, m) => sum + m.level, 0) / team.length);
    opponents.push({
      index,
      trainer_class: typeof trainerClass === "string" ? trainerClass : (trainerClass as any).name,
      person,
      team,
      reward_exp: 8 + avg * 2 + teamSize * 3,
      reward_coins: 15 + avg * 3 + teamSize * 5,
    });
  }
  return opponents;
}

async function boardState(supabase: any, userId: string): Promise<TrainerBoard> {
  const [{ data: profile }, { data: party }] = await Promise.all([
    supabase.from("profiles").select("energy, trainer_level, trainer_exp, region").eq("id", userId).maybeSingle(),
    supabase.from("player_pokemon").select("id, fainted, hp_current").eq("owner_id", userId).eq("in_party", true),
  ]);
  if (!profile) throw new Error("Nie znaleziono profilu trenera.");
  const region = profile.region ?? "kanto";
  return {
    energy: profile.energy,
    energy_cost: TRAINER_ENERGY,
    trainer_level: profile.trainer_level,
    region,
    party_ready: ((party ?? []) as any[]).filter((p) => !p.fainted && p.hp_current > 0).length,
    day: dayKey(),
    opponents: buildBoard(userId, region, profile.trainer_level),
  };
}

/** Lista dzisiejszych przeciwników do wyzwania. */
export const getTrainerBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => boardState(context.supabase, context.userId));

/** Walka z wybranym trenerem — automatyczna, z pełnym raportem rund. */
export const fightTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { index: number }) => {
    const index = Number(input?.index);
    if (!Number.isInteger(index) || index < 0 || index >= BOARD_SIZE) {
      throw new Error("Nie ma takiego przeciwnika.");
    }
    return { index };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("energy, trainer_level, trainer_exp, catch_coins, region")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Nie znaleziono profilu trenera.");
    if (profile.energy < TRAINER_ENERGY) {
      return {
        ok: false as const,
        reason: `Potrzebujesz ${TRAINER_ENERGY} Energii na walkę z trenerem.`,
        state: await boardState(supabase, userId),
      };
    }

    const region = profile.region ?? "kanto";
    const foeData = buildBoard(userId, region, profile.trainer_level)[data.index]!;

    const { data: party } = await supabase
      .from("player_pokemon")
      .select(PARTY_COLUMNS)
      .eq("owner_id", userId)
      .eq("in_party", true);
    const allies = ((party ?? []) as any[])
      .filter((row) => !row.fainted && row.hp_current > 0)
      .map((row) => allyFighter(row));
    if (allies.length === 0) {
      return {
        ok: false as const,
        reason: "Cała drużyna jest wyczerpana — ulecz Pokémony w Centrum Pokémon.",
        state: await boardState(supabase, userId),
      };
    }

    const foes = foeData.team.map((member) => foeFighter(member, 22, 1.08));
    const result = simulateTeamBattle(allies, foes);
    const report: BattleReport = result.report;
    const label = `${foeData.trainer_class} ${foeData.person}`;
    const log = [`Walka z ${label}!`, ...result.log];

    for (const [id, hp] of Object.entries(result.allyHp)) {
      await (await writeDb())
        .from("player_pokemon")
        .update({ hp_current: hp, fainted: hp <= 0 })
        .eq("id", id)
        .eq("owner_id", userId);
    }

    const updates: Record<string, any> = {
      energy: profile.energy - TRAINER_ENERGY,
      energy_updated_at: new Date().toISOString(),
    };

    if (result.won) {
      let exp = profile.trainer_exp + foeData.reward_exp;
      let level = profile.trainer_level;
      while (exp >= Math.round(100 * Math.pow(level, 1.8))) {
        exp -= Math.round(100 * Math.pow(level, 1.8));
        level += 1;
      }
      updates['trainer_exp'] = exp;
      updates['trainer_level'] = level;
      updates['catch_coins'] = profile.catch_coins + foeData.reward_coins;
      report.trainer_exp = foeData.reward_exp;
      report.coins = foeData.reward_coins;
      if (level > profile.trainer_level) report.extras.push(`Awans trenera na Lvl ${level}!`);

      const foeLevel = Math.max(...foeData.team.map((m) => m.level));
      const gain = expForDefeat(foeLevel, "bot");
      for (const ally of allies) report.pokemon_exp.push({ name: ally.name, exp: gain });
      log.push(
        ...(await awardPokemonExp(
          supabase,
          userId,
          Object.keys(result.allyHp).map((id) => ({ id, exp: gain })),
        )),
      );

      const { progressActivities } = await import("@/lib/quests.functions");
      await progressActivities(supabase, userId, "battle", 1, "bot");
    } else {
      report.extras.push(`${label} okazał się silniejszy — ulecz drużynę i wróć.`);
    }

    await (await writeDb()).from("profiles").update(updates).eq("id", userId);

    return {
      ok: true as const,
      won: result.won,
      opponent: label,
      report,
      log,
      state: await boardState(supabase, userId),
    };
  });
