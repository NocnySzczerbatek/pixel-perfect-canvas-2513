import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hpFromIv, simulateTeamBattle, statFromIv, type Fighter } from "@/lib/battle";
import { gymsForRegion, type Gym } from "@/lib/gyms";
import { MEGA_STONE } from "@/lib/items";
import { speciesType } from "@/lib/pokedex";
import { awardPokemonExp, expForDefeat } from "@/lib/leveling";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const GYM_ENERGY = 10;

export type BadgeRow = {
  id: string;
  region: string;
  gym_index: number;
  badge_key: string;
  badge_name: string;
  leader_name: string;
  earned_at: string;
};

export type GymView = Gym & {
  earned: boolean;
  locked: boolean;
  team: { species_id: number; species_name: string; species_type: string; level: number }[];
};

export type GymsState = {
  region: string | null;
  energy: number;
  gym_energy: number;
  mega_stones: number;
  featured_badge: string | null;
  badges: BadgeRow[];
  gyms: GymView[];
};

/** Drużyna Lidera jak w serialu — stała, prosto z danych regionu. */
function leaderTeam(gym: Gym) {
  return gym.team.map((member) => ({
    species_id: member.species_id,
    species_name: member.species_name,
    species_type: speciesType(member.species_id),
    level: member.level,
  }));
}

function toFoe(member: { species_name: string; species_type: string; level: number }): Fighter {
  return {
    name: member.species_name,
    type: member.species_type,
    level: member.level,
    hp: hpFromIv(member.level, 12),
    hpMax: hpFromIv(member.level, 12),
    atk: statFromIv(member.level, 12, 9),
    def: statFromIv(member.level, 10, 8),
    spe: statFromIv(member.level, 10, 8),
  };
}

function toAlly(row: any, boost: number): Fighter {
  const type = speciesType(row.species_id);
  return {
    id: row.id,
    name: row.nickname ?? row.species_name,
    type,
    level: row.level,
    hp: row.hp_current,
    hpMax: row.hp_max,
    atk: Math.round(statFromIv(row.level, row.iv_atk ?? 0, 9) * (1 + boost)),
    def: statFromIv(row.level, row.iv_def ?? 0, 8),
    spe: statFromIv(row.level, row.iv_spe ?? 0, 8),
  };
}

const PARTY_COLUMNS =
  "id, species_id, species_name, nickname, level, hp_current, hp_max, fainted, iv_atk, iv_def, iv_spe";

async function buildState(supabase: any, userId: string): Promise<GymsState> {
  const [{ data: profile }, { data: badges }] = await Promise.all([
    supabase
      .from("profiles")
      .select("region, energy, mega_stones, featured_badge")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("gym_badges")
      .select("id, region, gym_index, badge_key, badge_name, leader_name, earned_at")
      .eq("owner_id", userId)
      .order("gym_index", { ascending: true }),
  ]);
  if (!profile) throw new Error("Nie znaleziono profilu trenera.");

  const region = profile.region ?? "kanto";
  const owned = new Set(
    ((badges ?? []) as BadgeRow[]).filter((b) => b.region === region).map((b) => b.gym_index),
  );

  return {
    region: profile.region,
    energy: profile.energy,
    gym_energy: GYM_ENERGY,
    mega_stones: profile.mega_stones ?? 0,
    featured_badge: profile.featured_badge ?? null,
    badges: (badges ?? []) as BadgeRow[],
    gyms: gymsForRegion(region).map((gym) => ({
      ...gym,
      earned: owned.has(gym.index),
      locked: gym.index > 1 && !owned.has(gym.index - 1),
      team: leaderTeam(gym),
    })),
  };
}

/** Sale regionu, moje odznaki i Kamienie Mega. */
export const getGymsState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Walka z Liderem Sali. Kamień Mega daje +30% siły ataku i jest zużywany. */
export const challengeGym = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { gymIndex: number; useMega?: boolean }) => {
    const gymIndex = Math.floor(Number(input?.gymIndex ?? 0));
    if (gymIndex < 1 || gymIndex > 8) throw new Error("Nieznana Sala.");
    return { gymIndex, useMega: Boolean(input?.useMega) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("region, energy, mega_stones, trainer_level, trainer_exp, catch_coins")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Nie znaleziono profilu trenera.");

    const region = profile.region ?? "kanto";
    const gym = gymsForRegion(region).find((g) => g.index === data.gymIndex)!;

    const { data: badges } = await supabase
      .from("gym_badges")
      .select("gym_index")
      .eq("owner_id", userId)
      .eq("region", region);
    const owned = new Set(((badges ?? []) as any[]).map((b) => b.gym_index));

    if (owned.has(gym.index)) {
      return {
        ok: false as const,
        reason: "Tę odznakę już masz.",
        state: await buildState(supabase, userId),
      };
    }
    if (gym.index > 1 && !owned.has(gym.index - 1)) {
      return {
        ok: false as const,
        reason: "Najpierw zdobądź odznakę z poprzedniej Sali.",
        state: await buildState(supabase, userId),
      };
    }
    if (profile.energy < GYM_ENERGY) {
      return {
        ok: false as const,
        reason: `Wyzwanie kosztuje ${GYM_ENERGY} Energii — masz ${profile.energy}.`,
        state: await buildState(supabase, userId),
      };
    }

    const useMega = data.useMega && (profile.mega_stones ?? 0) > 0;
    const boost = useMega ? MEGA_STONE.boost : 0;

    const { data: party } = await supabase
      .from("player_pokemon")
      .select(PARTY_COLUMNS)
      .eq("owner_id", userId)
      .eq("in_party", true);
    const allies = (party ?? [])
      .filter((p: any) => !p.fainted && p.hp_current > 0)
      .map((p: any) => toAlly(p, boost));
    if (allies.length === 0) {
      return {
        ok: false as const,
        reason: "Cała drużyna jest wyczerpana — ulecz Pokémony.",
        state: await buildState(supabase, userId),
      };
    }

    const foes = leaderTeam(gym).map(toFoe);
    const result = simulateTeamBattle(allies, foes);
    const log = [
      `${gym.leader} (Sala ${gym.index}, typ ${gym.type}) przyjmuje wyzwanie!`,
      ...(useMega ? [`Aktywujesz ${MEGA_STONE.label}: +30% siły ataku.`] : []),
      ...result.log,
    ];

    for (const [id, hp] of Object.entries(result.allyHp)) {
      await (await writeDb())
        .from("player_pokemon")
        .update({ hp_current: hp, fainted: hp <= 0 })
        .eq("id", id)
        .eq("owner_id", userId);
    }

    const updates: any = {
      energy: profile.energy - GYM_ENERGY,
      energy_updated_at: new Date().toISOString(),
    };
    if (useMega) updates.mega_stones = (profile.mega_stones ?? 0) - 1;

    if (result.won) {
      await (await writeDb()).from("gym_badges").insert({
        owner_id: userId,
        region,
        gym_index: gym.index,
        badge_key: gym.badgeKey,
        badge_name: gym.badgeName,
        leader_name: gym.leader,
      });
      updates.catch_coins = profile.catch_coins + gym.rewardCoins;
      let exp = profile.trainer_exp + gym.rewardExp;
      let level = profile.trainer_level;
      while (exp >= Math.round(100 * Math.pow(level, 1.8))) {
        exp -= Math.round(100 * Math.pow(level, 1.8));
        level += 1;
      }
      updates.trainer_exp = exp;
      updates.trainer_level = level;
      // Ósma Sala nagradza Kamieniem Mega.
      if (gym.index === 8) {
        updates.mega_stones = (updates.mega_stones ?? profile.mega_stones ?? 0) + 1;
      }
      log.push(
        `Zdobywasz ${gym.badgeName}! +${gym.rewardExp} EXP, +${gym.rewardCoins} Catch Coins.`,
      );
      if (gym.index === 8) log.push(`${gym.leader} wręcza Ci ${MEGA_STONE.label}.`);
      log.push(
        ...(await awardPokemonExp(
          supabase,
          userId,
          Object.keys(result.allyHp).map((id) => ({ id, exp: expForDefeat(gym.level, "gym") })),
        )),
      );

      // Bonusy: buff czasowy za wygraną w Sali + trwały bonus za komplet odznak regionu.
      const { grantTimedBuff, grantPermanentBonus } = await import("@/lib/bonuses.server");
      const { GYM_BUFF, PERMANENT_BONUS_PCT } = await import("@/lib/bonuses");
      await grantTimedBuff(userId, {
        key: GYM_BUFF.key,
        label: GYM_BUFF.label,
        source: GYM_BUFF.source,
        shiny_bonus_pct: GYM_BUFF.shiny_bonus_pct,
        rare_bonus_pct: GYM_BUFF.rare_bonus_pct,
        minutes: GYM_BUFF.minutes,
      });
      log.push(
        `${GYM_BUFF.label}: +${GYM_BUFF.shiny_bonus_pct}% szansy na Shiny i rzadkie spotkania na ${GYM_BUFF.minutes} minut.`,
      );

      const { count: badgeCount } = await (await writeDb())
        .from("gym_badges")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .eq("region", region);
      if ((badgeCount ?? 0) >= 8) {
        const granted = await grantPermanentBonus(
          userId,
          `region_sweep_${region}`,
          `Wszystkie Sale regionu ${region}`,
        );
        if (granted) {
          log.push(
            `Komplet odznak regionu ${region}! Trwały bonus +${PERMANENT_BONUS_PCT}% do szansy na Shiny i rzadkie spotkania.`,
          );
        }
      }
    }


    await ((await writeDb()).from("profiles") as any).update(updates).eq("id", userId);

    return {
      ok: true as const,
      won: result.won,
      badge: result.won ? gym.badgeName : null,
      log,
      state: await buildState(supabase, userId),
    };
  });

/** Odznaka wyróżniona, widoczna w rankingu. */
export const setFeaturedBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { badgeKey: string }) => ({
    badgeKey: String(input?.badgeKey ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await (await writeDb())
      .from("profiles")
      .update({ featured_badge: data.badgeKey || null })
      .eq("id", userId);
    return { ok: true as const, state: await buildState(supabase, userId) };
  });
