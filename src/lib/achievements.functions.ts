import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ACHIEVEMENTS,
  isYesterday,
  loginReward,
  warsawDate,
  type AchievementDef,
} from "@/lib/achievements";
import { clampEnergy, MAX_ENERGY } from "@/lib/energy";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type AchievementView = {
  key: string;
  label: string;
  description: string;
  category: string;
  progress: number;
  target: number;
  done: boolean;
  claimed: boolean;
  reward_coins: number;
  reward_bottles: number;
  permanent_bonus: boolean;
};

export type LoginView = {
  day: number;
  streak: number;
  best_streak: number;
  claimed_today: boolean;
  reward: { day: number; coins: number; bottles: number; balls: number };
};

export type AchievementsState = {
  achievements: AchievementView[];
  login: LoginView;
  coins: number;
  bottles: number;
};

type Metrics = Record<AchievementDef["metric"], number>;

async function metricsFor(supabase: any, userId: string): Promise<Metrics> {
  const [pokemon, badges, encounters, trainerBattles, visits, run] = await Promise.all([
    supabase.from("player_pokemon").select("species_id, is_shiny").eq("owner_id", userId),
    supabase.from("gym_badges").select("id").eq("owner_id", userId),
    supabase
      .from("encounters")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("kind", "wild")
      .eq("status", "defeated"),
    supabase
      .from("trainer_battles")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("won", true),
    supabase.from("region_visits").select("region").eq("owner_id", userId),
    supabase.from("league_runs").select("champion").eq("owner_id", userId).maybeSingle(),
  ]);

  const rows = (pokemon.data ?? []) as { species_id: number; is_shiny: boolean }[];
  const species = new Set(rows.map((row) => row.species_id));
  return {
    caught: rows.length,
    species: species.size,
    shiny: rows.filter((row) => row.is_shiny).length,
    wins: encounters.count ?? 0,
    trainer_wins: trainerBattles.count ?? 0,
    badges: (badges.data ?? []).length,
    regions: new Set(((visits.data ?? []) as { region: string }[]).map((r) => r.region)).size,
    champion: run.data?.champion ? 1 : 0,
  };
}

async function buildState(supabase: any, userId: string): Promise<AchievementsState> {
  const [metrics, { data: claimed }, { data: profile }, { data: login }] = await Promise.all([
    metricsFor(supabase, userId),
    supabase.from("achievements").select("achievement_key").eq("owner_id", userId),
    supabase.from("profiles").select("catch_coins, energy_bottles").eq("id", userId).maybeSingle(),
    supabase
      .from("daily_login")
      .select("streak, best_streak, last_claim_date")
      .eq("owner_id", userId)
      .maybeSingle(),
  ]);

  const claimedKeys = new Set(
    ((claimed ?? []) as { achievement_key: string }[]).map((row) => row.achievement_key),
  );

  const today = warsawDate();
  const last = (login?.last_claim_date as string | null) ?? null;
  const claimedToday = last === today;
  let day = 1;
  if (last && claimedToday) day = Math.max(1, ((login?.streak ?? 1) - 1) % 7) + 1;
  else if (last && isYesterday(last, today)) day = (((login?.streak ?? 0) % 7) || 0) + 1;

  return {
    coins: profile?.catch_coins ?? 0,
    bottles: profile?.energy_bottles ?? 0,
    login: {
      day: Math.min(day, 7),
      streak: login?.streak ?? 0,
      best_streak: login?.best_streak ?? 0,
      claimed_today: claimedToday,
      reward: { ...loginReward(day), day: Math.min(day, 7) },
    },
    achievements: ACHIEVEMENTS.map((def) => {
      const progress = Math.min(metrics[def.metric] ?? 0, def.target);
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        category: def.category,
        progress,
        target: def.target,
        done: (metrics[def.metric] ?? 0) >= def.target,
        claimed: claimedKeys.has(def.key),
        reward_coins: def.rewardCoins,
        reward_bottles: def.rewardBottles,
        permanent_bonus: def.permanentBonus,
      };
    }),
  };
}

export const getAchievementsState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

export const claimAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => input)
  .handler(async ({ data, context }) => {
    const def = ACHIEVEMENTS.find((entry) => entry.key === data.key);
    if (!def) throw new Error("Nie znam takiego osiągnięcia.");

    const metrics = await metricsFor(context.supabase, context.userId);
    if ((metrics[def.metric] ?? 0) < def.target) {
      throw new Error("To osiągnięcie nie jest jeszcze ukończone.");
    }

    const db = await writeDb();
    const { error } = await db
      .from("achievements")
      .insert({ owner_id: context.userId, achievement_key: def.key, label: def.label });
    if (error) throw new Error("Nagroda za to osiągnięcie została już odebrana.");

    const { data: profile } = await db
      .from("profiles")
      .select("catch_coins, energy_bottles")
      .eq("id", context.userId)
      .maybeSingle();

    await db
      .from("profiles")
      .update({
        catch_coins: (profile?.catch_coins ?? 0) + def.rewardCoins,
        energy_bottles: (profile?.energy_bottles ?? 0) + def.rewardBottles,
      })
      .eq("id", context.userId);

    if (def.permanentBonus) {
      const { grantPermanentBonus } = await import("@/lib/bonuses.server");
      await grantPermanentBonus(context.userId, `ach_${def.key}`, def.label);
    }

    return {
      message: `${def.label}: +${def.rewardCoins} CC, +${def.rewardBottles} Flakonów.`,
      state: await buildState(context.supabase, context.userId),
    };
  });

export const claimDailyLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await writeDb();
    const today = warsawDate();

    const { data: login } = await db
      .from("daily_login")
      .select("id, streak, best_streak, last_claim_date")
      .eq("owner_id", context.userId)
      .maybeSingle();

    if (login?.last_claim_date === today) {
      throw new Error("Dzisiejszą nagrodę już odebrałeś. Wróć jutro!");
    }

    const continued = login?.last_claim_date
      ? isYesterday(login.last_claim_date as string, today)
      : false;
    const streak = continued ? (login?.streak ?? 0) + 1 : 1;
    const day = ((streak - 1) % 7) + 1;
    const reward = loginReward(day);

    if (login) {
      const { data: updated } = await db
        .from("daily_login")
        .update({
          streak,
          best_streak: Math.max(login.best_streak ?? 0, streak),
          last_claim_date: today,
        })
        .eq("id", login.id)
        .neq("last_claim_date", today)
        .select("id");
      if (!Array.isArray(updated) || updated.length === 0) {
        throw new Error("Dzisiejszą nagrodę już odebrałeś. Wróć jutro!");
      }
    } else {
      await db.from("daily_login").insert({
        owner_id: context.userId,
        streak,
        best_streak: streak,
        last_claim_date: today,
      });
    }

    const { data: profile } = await db
      .from("profiles")
      .select("catch_coins, energy_bottles, poke_balls, energy")
      .eq("id", context.userId)
      .maybeSingle();

    await db
      .from("profiles")
      .update({
        catch_coins: (profile?.catch_coins ?? 0) + reward.coins,
        energy_bottles: (profile?.energy_bottles ?? 0) + reward.bottles,
        poke_balls: (profile?.poke_balls ?? 0) + reward.balls,
        energy: clampEnergy(Math.min(profile?.energy ?? 0, MAX_ENERGY)),
      })
      .eq("id", context.userId);

    return {
      message: `Dzień ${day}: +${reward.coins} CC, +${reward.bottles} Flakonów, +${reward.balls} Poké Balli.`,
      state: await buildState(context.supabase, context.userId),
    };
  });
