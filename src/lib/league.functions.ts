import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { simulateTeamBattle, type Fighter } from "@/lib/battle";
import { spendEnergy } from "@/lib/energy";
import { allyFighter, foeFighter } from "@/lib/fighters";
import { LEAGUE_ENERGY, LEAGUE_STAGES, leagueRewards, leagueStage } from "@/lib/league";
import { awardPokemonExp, expForDefeat } from "@/lib/leveling";
import { speciesType } from "@/lib/pokedex";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const PARTY_COLUMNS =
  "id, species_id, species_name, nickname, level, hp_current, hp_max, fainted, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, train_hp, train_atk, train_def, train_spa, train_spd, train_spe, active_moves, ability, is_shiny";

export type LeagueStageView = {
  stage: number;
  name: string;
  title: string;
  type: string;
  cleared: boolean;
  locked: boolean;
  team: { species_id: number; species_name: string; species_type: string; level: number }[];
  rewards: { coins: number; exp: number; bottles: number };
};

export type LeagueState = {
  region: string;
  badges: number;
  unlocked: boolean;
  energy: number;
  league_energy: number;
  cleared_stages: number;
  champion: boolean;
  attempts: number;
  stages: LeagueStageView[];
};

async function buildState(supabase: any, userId: string): Promise<LeagueState> {
  const [{ data: profile }, { data: badges }, { data: run }] = await Promise.all([
    supabase.from("profiles").select("region, energy").eq("id", userId).maybeSingle(),
    supabase.from("gym_badges").select("region").eq("owner_id", userId),
    supabase
      .from("league_runs")
      .select("region, cleared_stages, champion, attempts")
      .eq("owner_id", userId)
      .maybeSingle(),
  ]);
  if (!profile) throw new Error("Nie znaleziono profilu trenera.");
  const region = profile.region ?? "kanto";
  const badgeCount = ((badges ?? []) as { region: string }[]).filter((b) => b.region === region)
    .length;
  const cleared = run?.region === region ? (run?.cleared_stages ?? 0) : 0;
  const champion = run?.region === region ? Boolean(run?.champion) : false;

  return {
    region,
    badges: badgeCount,
    unlocked: badgeCount >= 8,
    energy: profile.energy,
    league_energy: LEAGUE_ENERGY,
    cleared_stages: cleared,
    champion,
    attempts: run?.attempts ?? 0,
    stages: LEAGUE_STAGES.map((entry) => ({
      stage: entry.stage,
      name: entry.name,
      title: entry.title,
      type: entry.type,
      cleared: entry.stage <= cleared,
      locked: badgeCount < 8 || entry.stage > cleared + 1,
      team: entry.team.map((member) => ({
        species_id: member.species_id,
        species_name: member.species_name,
        species_type: speciesType(member.species_id),
        level: member.level,
      })),
      rewards: leagueRewards(entry.stage),
    })),
  };
}

/** Stan Ligi: odznaki, postęp, przeciwnicy i nagrody. */
export const getLeagueState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Walka z kolejnym przeciwnikiem Ligi. Porażka cofa cały przebieg do początku. */
export const challengeLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { stage: number }) => {
    const stage = Math.floor(Number(input?.stage ?? 0));
    if (stage < 1 || stage > 5) throw new Error("Nieznany przeciwnik Ligi.");
    return { stage };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const state = await buildState(supabase, userId);
    if (!state.unlocked) {
      return { ok: false as const, reason: "Ligę odblokujesz po zdobyciu 8 odznak regionu.", state };
    }
    if (data.stage !== state.cleared_stages + 1) {
      return { ok: false as const, reason: "Przeciwników Ligi pokonujesz po kolei.", state };
    }
    if (state.energy < LEAGUE_ENERGY) {
      return {
        ok: false as const,
        reason: `Wyzwanie kosztuje ${LEAGUE_ENERGY} Energii — masz ${state.energy}.`,
        state,
      };
    }
    const stage = leagueStage(data.stage)!;

    const { data: party } = await supabase
      .from("player_pokemon")
      .select(PARTY_COLUMNS)
      .eq("owner_id", userId)
      .eq("in_party", true);
    const allies: Fighter[] = (party ?? [])
      .filter((p: any) => !p.fainted && p.hp_current > 0)
      .map((p: any) => allyFighter(p));
    if (allies.length === 0) {
      return { ok: false as const, reason: "Cała drużyna jest wyczerpana — ulecz Pokémony.", state };
    }

    // Liga jest mocniejsza od Sal: wyższe IV i większy mnożnik siły.
    const foes = stage.team.map((member) => foeFighter(member, 31, 1.3));
    const result = simulateTeamBattle(allies, foes);
    const report = result.report;
    const log = [`${stage.title}: ${stage.name} staje do walki!`, ...result.log];

    const db = await writeDb();
    for (const [id, hp] of Object.entries(result.allyHp)) {
      await db
        .from("player_pokemon")
        .update({ hp_current: hp, fainted: hp <= 0 })
        .eq("id", id)
        .eq("owner_id", userId);
    }

    const spent = await spendEnergy(db, userId, state.energy, LEAGUE_ENERGY);
    if (!spent) {
      return {
        ok: false as const,
        reason: "Energia zmieniła się w trakcie — odśwież i spróbuj ponownie.",
        state: await buildState(supabase, userId),
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("catch_coins, trainer_exp, trainer_level, energy_bottles")
      .eq("id", userId)
      .maybeSingle();

    if (result.won) {
      const rewards = leagueRewards(stage.stage);
      let exp = (profile?.trainer_exp ?? 0) + rewards.exp;
      let level = profile?.trainer_level ?? 1;
      while (exp >= Math.round(100 * Math.pow(level, 1.8))) {
        exp -= Math.round(100 * Math.pow(level, 1.8));
        level += 1;
      }
      await db
        .from("profiles")
        .update({
          catch_coins: (profile?.catch_coins ?? 0) + rewards.coins,
          energy_bottles: (profile?.energy_bottles ?? 0) + rewards.bottles,
          trainer_exp: exp,
          trainer_level: level,
        })
        .eq("id", userId);

      await db.from("league_runs").upsert(
        {
          owner_id: userId,
          region: state.region,
          stage: Math.min(5, stage.stage + 1),
          cleared_stages: stage.stage,
          champion: stage.stage === 5 ? true : state.champion,
          attempts: state.attempts + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id,region" },
      );

      report.coins = rewards.coins;
      report.trainer_exp = rewards.exp;
      report.extras.push(`+${rewards.coins} CC, ${rewards.bottles}× Flakon Energii.`);
      log.push(
        `Pokonujesz ${stage.name}! +${rewards.exp} EXP, +${rewards.coins} CC, ${rewards.bottles}× Flakon Energii.`,
      );
      if (stage.stage === 5) {
        report.extras.push("Zostajesz Mistrzem Ligi Pokémon!");
        log.push("Zostajesz Mistrzem Ligi Pokémon — Twoje imię trafia do Sali Sław.");
      }

      const gain = expForDefeat(Math.max(...stage.team.map((t) => t.level)), "gym");
      for (const ally of allies) report.pokemon_exp.push({ name: ally.name, exp: gain });
      log.push(
        ...(await awardPokemonExp(
          supabase,
          userId,
          Object.keys(result.allyHp).map((id) => ({ id, exp: gain })),
        )),
      );
    } else {
      // Porażka kończy przebieg — Ligę zaczynasz od pierwszego przeciwnika.
      await db.from("league_runs").upsert(
        {
          owner_id: userId,
          region: state.region,
          stage: 1,
          cleared_stages: 0,
          champion: state.champion,
          attempts: state.attempts + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id,region" },
      );
      log.push("Przegrywasz — przebieg Ligi zaczynasz od nowa.");
    }

    return {
      ok: true as const,
      won: result.won,
      report,
      log,
      state: await buildState(supabase, userId),
    };
  });
