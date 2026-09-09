import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { warsawDate } from "@/lib/achievements";
import { simulateTeamBattle, type BattleReport, type Fighter } from "@/lib/battle";
import { spendEnergy } from "@/lib/energy";
import { allyFighter, foeFighter } from "@/lib/fighters";
import { TMS, tmItemKey } from "@/lib/finds";
import { awardPokemonExp } from "@/lib/leveling";
import { speciesType } from "@/lib/pokedex";
import {
  RAID_ATTEMPTS_PER_DAY,
  RAID_ENERGY,
  raidBoss,
  raidRewards,
  raidScaling,
  raidsForDay,
} from "@/lib/raids";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const PARTY_COLUMNS =
  "id, species_id, species_name, nickname, level, exp, hp_current, hp_max, fainted, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, train_hp, train_atk, train_def, train_spa, train_spd, train_spe, active_moves, ability, is_shiny";

export type RaidBossView = {
  key: string;
  name: string;
  species_id: number;
  species_type: string;
  tier: number;
  level: number;
  legendary: boolean;
  hp: number;
  defeated_today: boolean;
  rewards: { coins: number; bottles: number; exp: number; candyXl: number };
};

export type RaidsState = {
  date: string;
  energy: number;
  raid_energy: number;
  attempts_used: number;
  attempts_left: number;
  bosses: RaidBossView[];
  history: {
    id: string;
    boss_name: string;
    tier: number;
    won: boolean;
    reward_coins: number;
    created_at: string;
  }[];
};

async function buildState(supabase: any, userId: string): Promise<RaidsState> {
  const date = warsawDate();
  const [{ data: profile }, { data: today }, { data: history }] = await Promise.all([
    supabase.from("profiles").select("energy").eq("id", userId).maybeSingle(),
    supabase
      .from("raid_runs")
      .select("boss_key, won")
      .eq("owner_id", userId)
      .eq("raid_date", date),
    supabase
      .from("raid_runs")
      .select("id, boss_name, tier, won, reward_coins, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const runs = (today ?? []) as { boss_key: string; won: boolean }[];
  const beaten = new Set(runs.filter((r) => r.won).map((r) => r.boss_key));

  return {
    date,
    energy: profile?.energy ?? 0,
    raid_energy: RAID_ENERGY,
    attempts_used: runs.length,
    attempts_left: Math.max(0, RAID_ATTEMPTS_PER_DAY - runs.length),
    bosses: raidsForDay(date).map((boss) => {
      const scale = raidScaling(boss.tier);
      const foe = foeFighter({ ...boss, species_name: boss.name }, 31, scale.power);
      const rewards = raidRewards(boss.tier);
      return {
        key: boss.key,
        name: boss.name,
        species_id: boss.species_id,
        species_type: speciesType(boss.species_id),
        tier: boss.tier,
        level: boss.level,
        legendary: boss.legendary,
        hp: Math.round(foe.hpMax * scale.hpMult),
        defeated_today: beaten.has(boss.key),
        rewards: {
          coins: rewards.coins,
          bottles: rewards.bottles,
          exp: rewards.exp,
          candyXl: rewards.candyXl,
        },
      };
    }),
    history: (history ?? []) as RaidsState["history"],
  };
}

/** Dzisiejsi Bossowie Raidów, limit prób i historia walk. */
export const getRaidsState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Walka z Bossem Raidu. Jedna próba = 8 Energii, maksymalnie 3 na dobę. */
export const fightRaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => ({ key: String(input?.key ?? "") }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const state = await buildState(supabase, userId);
    const boss = raidBoss(data.key);
    if (!boss || !state.bosses.some((entry) => entry.key === data.key)) {
      return { ok: false as const, reason: "Ten Boss nie jest dziś dostępny.", state };
    }
    if (state.attempts_left <= 0) {
      return {
        ok: false as const,
        reason: `Dzienny limit ${RAID_ATTEMPTS_PER_DAY} raidów wykorzystany — wróć jutro.`,
        state,
      };
    }
    if (state.bosses.find((entry) => entry.key === data.key)?.defeated_today) {
      return { ok: false as const, reason: "Tego Bossa już dziś pokonałeś.", state };
    }
    if (state.energy < RAID_ENERGY) {
      return {
        ok: false as const,
        reason: `Raid kosztuje ${RAID_ENERGY} Energii — masz ${state.energy}.`,
        state,
      };
    }

    const { data: party } = await supabase
      .from("player_pokemon")
      .select(PARTY_COLUMNS)
      .eq("owner_id", userId)
      .eq("in_party", true);
    const alive = (party ?? []).filter((p: any) => !p.fainted && p.hp_current > 0);
    const allies: Fighter[] = alive.map((p: any) => allyFighter(p));
    if (allies.length === 0) {
      return { ok: false as const, reason: "Cała drużyna jest wyczerpana — ulecz Pokémony.", state };
    }

    const scale = raidScaling(boss.tier);
    const bossFighter = foeFighter(
      { ...boss, species_name: boss.name },
      31,
      scale.power,
      ` (Boss T${boss.tier})`,
    );
    bossFighter.hpMax = Math.round(bossFighter.hpMax * scale.hpMult);
    bossFighter.hp = bossFighter.hpMax;

    const result = simulateTeamBattle(allies, [bossFighter]);
    const report: BattleReport = result.report;
    const log = [
      `Raid Tier ${boss.tier}: ${boss.name} (poz. ${boss.level}, ${bossFighter.hpMax} HP) wyłania się z gniazda!`,
      ...result.log,
    ];

    const db = await writeDb();
    for (const [id, hp] of Object.entries(result.allyHp)) {
      await db
        .from("player_pokemon")
        .update({ hp_current: hp, fainted: hp <= 0 })
        .eq("id", id)
        .eq("owner_id", userId);
    }

    const spent = await spendEnergy(db, userId, state.energy, RAID_ENERGY);
    if (!spent) {
      return {
        ok: false as const,
        reason: "Energia zmieniła się w trakcie — odśwież i spróbuj ponownie.",
        state: await buildState(supabase, userId),
      };
    }

    const rewards = raidRewards(boss.tier);
    const drops: string[] = [];
    let coins = 0;

    if (result.won) {
      coins = rewards.coins;
      const { data: profile } = await db
        .from("profiles")
        .select("catch_coins, energy_bottles, candy_xl, mega_stones, trainer_exp, trainer_level")
        .eq("id", userId)
        .maybeSingle();

      let exp = (profile?.trainer_exp ?? 0) + rewards.exp;
      let level = profile?.trainer_level ?? 1;
      while (exp >= Math.round(100 * Math.pow(level, 1.8))) {
        exp -= Math.round(100 * Math.pow(level, 1.8));
        level += 1;
      }

      const megaDrop = Math.random() < rewards.megaChance;
      await db
        .from("profiles")
        .update({
          catch_coins: (profile?.catch_coins ?? 0) + rewards.coins,
          energy_bottles: (profile?.energy_bottles ?? 0) + rewards.bottles,
          candy_xl: (profile?.candy_xl ?? 0) + rewards.candyXl,
          mega_stones: (profile?.mega_stones ?? 0) + (megaDrop ? 1 : 0),
          trainer_exp: exp,
          trainer_level: level,
        })
        .eq("id", userId);

      drops.push(`+${rewards.coins} CC`, `${rewards.bottles}× Flakon Energii`);
      if (rewards.candyXl > 0) drops.push(`${rewards.candyXl}× Cukierek XL`);
      if (megaDrop) drops.push("1× Kamień Mega");

      if (Math.random() < rewards.tmChance && TMS.length > 0) {
        const tm = TMS[Math.floor(Math.random() * TMS.length)]!;
        const key = tmItemKey(tm.id);
        const { data: owned } = await db
          .from("player_items")
          .select("id, quantity")
          .eq("owner_id", userId)
          .eq("item_key", key)
          .maybeSingle();
        if (owned) {
          await db
            .from("player_items")
            .update({ quantity: owned.quantity + 1 })
            .eq("id", owned.id);
        } else {
          await db
            .from("player_items")
            .insert({ owner_id: userId, item_key: key, quantity: 1, metadata: { tm_id: tm.id } });
        }
        drops.push(`TM ${tm.label}`);
      }

      // EXP dla Pokémonów, które przetrwały walkę.
      await awardPokemonExp(
        db,
        userId,
        alive
          .filter((row: any) => (result.allyHp[row.id] ?? 0) > 0)
          .map((row: any) => ({ id: row.id, exp: rewards.exp })),
      );

      report.coins = rewards.coins;
      report.trainer_exp = rewards.exp;
      report.extras.push(...drops);
      log.push(`${boss.name} pada! Łup: ${drops.join(", ")}.`);
    } else {
      log.push(`${boss.name} odpiera atak i wraca do gniazda. Raid przepada.`);
    }

    await db.from("raid_runs").insert({
      owner_id: userId,
      raid_date: state.date,
      boss_key: boss.key,
      boss_name: boss.name,
      species_id: boss.species_id,
      level: boss.level,
      tier: boss.tier,
      won: result.won,
      damage_done: Math.max(0, bossFighter.hpMax - Math.max(0, bossFighter.hp)),
      turns: report.rounds.length,
      reward_coins: coins,
      rewards: drops,
      log,
    });

    return {
      ok: true as const,
      won: result.won,
      report,
      log,
      drops,
      state: await buildState(supabase, userId),
    };
  });
