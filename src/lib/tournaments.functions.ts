import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { simulateTeamBattle, statFromIv, type Fighter } from "@/lib/battle";
import { speciesType } from "@/lib/pokedex";
import { warsawClock } from "@/lib/time";
import {
  TOURNAMENT_DAILY_BATTLES,
  TOURNAMENT_MIN_PARTY,
  TOURNAMENT_WIN_POINTS,
  rewardFor,
  weekBounds,
} from "@/lib/tournaments";

const PARTY_COLUMNS =
  "id, species_id, species_name, species_type, nickname, level, hp_current, hp_max, fainted, iv_atk, iv_def, iv_spe, iv_hp, is_shiny";

async function admin(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function toFighter(row: any, freshHp = false): Fighter {
  const type = (row.species_type as string) ?? speciesType(row.species_id);
  return {
    id: row.id,
    name: row.nickname ?? row.species_name,
    type,
    level: row.level,
    hp: freshHp ? row.hp_max : row.hp_current,
    hpMax: row.hp_max,
    atk: statFromIv(row.level, row.iv_atk ?? 0, 9),
    def: statFromIv(row.level, row.iv_def ?? 0, 8),
    spe: statFromIv(row.level, row.iv_spe ?? 0, 8),
  };
}

export type TournamentRow = {
  place: number;
  player_id: string;
  trainer_name: string;
  trainer_level: number;
  points: number;
  wins: number;
  losses: number;
  is_me: boolean;
};

export type TournamentState = {
  week_label: string;
  phase: "registration" | "active";
  phase_ends_at: string;
  joined: boolean;
  my_points: number;
  my_wins: number;
  my_losses: number;
  battles_left: number;
  daily_limit: number;
  min_party: number;
  party_size: number;
  entries: number;
  board: TournamentRow[];
  my_place: number | null;
  past: { week_label: string; place: number | null; points: number; reward_text: string | null }[];
  rewards: string[];
};

async function trainerNames(db: any) {
  const { data } = await db.rpc("public_trainers");
  const map = new Map<string, { name: string; level: number }>();
  for (const row of (data ?? []) as any[]) {
    map.set(row.id, { name: row.trainer_name, level: row.trainer_level });
  }
  return map;
}

/** Rozlicza wszystkie zakończone turnieje, których nagrody nie zostały jeszcze wypłacone. */
async function settleFinishedTournaments(db: any, currentWeekStart: string) {
  const { data: stale } = await db
    .from("tournaments")
    .select("id, week_start, week_end")
    .neq("status", "finished")
    .lt("week_start", currentWeekStart);

  for (const tournament of (stale ?? []) as any[]) {
    const { data: entries } = await db
      .from("tournament_entries")
      .select("id, player_id, points, wins, losses")
      .eq("tournament_id", tournament.id)
      .order("points", { ascending: false })
      .order("wins", { ascending: false });

    let place = 0;
    for (const entry of (entries ?? []) as any[]) {
      place += 1;
      const reward = rewardFor(place);
      const { data: profile } = await db
        .from("profiles")
        .select("catch_coins, energy_bottles, poke_balls")
        .eq("id", entry.player_id)
        .maybeSingle();
      if (profile) {
        await db
          .from("profiles")
          .update({
            catch_coins: (profile.catch_coins ?? 0) + reward.coins,
            energy_bottles: (profile.energy_bottles ?? 0) + reward.bottles,
            poke_balls: (profile.poke_balls ?? 0) + reward.balls,
          })
          .eq("id", entry.player_id);
      }
      if (reward.charm) {
        const { data: existing } = await db
          .from("player_items")
          .select("id, quantity")
          .eq("owner_id", entry.player_id)
          .eq("item_key", "shiny_charm")
          .maybeSingle();
        if (existing) {
          await db
            .from("player_items")
            .update({ quantity: (existing.quantity ?? 0) + 1 })
            .eq("id", existing.id);
        } else {
          await db
            .from("player_items")
            .insert({ owner_id: entry.player_id, item_key: "shiny_charm", quantity: 1 });
        }
      }
      if (reward.badge) {
        await db.from("gym_badges").insert({
          owner_id: entry.player_id,
          region: "turniej",
          gym_index: 0,
          badge_key: `tournament_${tournament.week_start}`,
          badge_name: `Puchar Ligi ${tournament.week_start}`,
          leader_name: "Liga Catch Zone",
        });
      }
      await db
        .from("tournament_entries")
        .update({ final_place: place, reward_text: reward.text })
        .eq("id", entry.id);
    }

    await db.from("tournaments").update({ status: "finished" }).eq("id", tournament.id);
  }
}

async function ensureTournament(db: any) {
  const week = weekBounds();
  await settleFinishedTournaments(db, week.weekStart);
  const { data: existing } = await db
    .from("tournaments")
    .select("id, week_start, week_end, status")
    .eq("week_start", week.weekStart)
    .maybeSingle();
  if (existing) {
    if (existing.status !== week.phase) {
      await db.from("tournaments").update({ status: week.phase }).eq("id", existing.id);
    }
    return { week, tournamentId: existing.id as string };
  }
  const { data: created } = await db
    .from("tournaments")
    .insert({ week_start: week.weekStart, week_end: week.weekEnd, status: week.phase })
    .select("id")
    .single();
  return { week, tournamentId: created.id as string };
}

async function buildState(db: any, userId: string): Promise<TournamentState> {
  const { week, tournamentId } = await ensureTournament(db);
  const today = warsawClock().dateKey;

  const [{ data: entries }, { data: myParty }, names, { data: pastEntries }] = await Promise.all([
    db
      .from("tournament_entries")
      .select("player_id, points, wins, losses, battles_today, last_battle_at")
      .eq("tournament_id", tournamentId)
      .order("points", { ascending: false })
      .order("wins", { ascending: false }),
    db.from("player_pokemon").select("id").eq("owner_id", userId).eq("in_party", true),
    trainerNames(db),
    db
      .from("tournament_entries")
      .select("points, final_place, reward_text, tournaments!inner(week_start, week_end)")
      .eq("player_id", userId)
      .not("final_place", "is", null)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const rows = (entries ?? []) as any[];
  const board: TournamentRow[] = rows.slice(0, 30).map((row, index) => ({
    place: index + 1,
    player_id: row.player_id,
    trainer_name: names.get(row.player_id)?.name ?? "Trener",
    trainer_level: names.get(row.player_id)?.level ?? 1,
    points: row.points,
    wins: row.wins,
    losses: row.losses,
    is_me: row.player_id === userId,
  }));

  const mineIndex = rows.findIndex((row) => row.player_id === userId);
  const mine = mineIndex >= 0 ? rows[mineIndex] : null;
  const usedToday =
    mine && mine.last_battle_at && warsawClock(new Date(mine.last_battle_at)).dateKey === today
      ? mine.battles_today
      : 0;

  return {
    week_label: week.weekLabel,
    phase: week.phase,
    phase_ends_at: week.phaseEndsAt,
    joined: Boolean(mine),
    my_points: mine?.points ?? 0,
    my_wins: mine?.wins ?? 0,
    my_losses: mine?.losses ?? 0,
    battles_left: Math.max(0, TOURNAMENT_DAILY_BATTLES - usedToday),
    daily_limit: TOURNAMENT_DAILY_BATTLES,
    min_party: TOURNAMENT_MIN_PARTY,
    party_size: (myParty ?? []).length,
    entries: rows.length,
    board,
    my_place: mineIndex >= 0 ? mineIndex + 1 : null,
    past: ((pastEntries ?? []) as any[]).map((row) => ({
      week_label: `${row.tournaments?.week_start} – ${row.tournaments?.week_end}`,
      place: row.final_place ?? null,
      points: row.points,
      reward_text: row.reward_text ?? null,
    })),
    rewards: [1, 2, 5, 15].map((place) => rewardFor(place).text),
  };
}

/** Stan bieżącego turnieju tygodniowego: tabela, moje wyniki i historia. */
export const getTournamentState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(await admin(), context.userId));

/** Zapis do bieżącego turnieju (wymaga co najmniej 3 Pokémonów w drużynie). */
export const joinTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { userId } = context;
    const { tournamentId } = await ensureTournament(db);

    const { data: party } = await db
      .from("player_pokemon")
      .select("id")
      .eq("owner_id", userId)
      .eq("in_party", true);
    if ((party ?? []).length < TOURNAMENT_MIN_PARTY) {
      return {
        ok: false as const,
        reason: `Do turnieju potrzebujesz ${TOURNAMENT_MIN_PARTY} Pokémonów w drużynie.`,
        state: await buildState(db, userId),
      };
    }

    const { data: existing } = await db
      .from("tournament_entries")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("player_id", userId)
      .maybeSingle();
    if (!existing) {
      await db.from("tournament_entries").insert({ tournament_id: tournamentId, player_id: userId });
    }
    return { ok: true as const, state: await buildState(db, userId) };
  });

/** Pojedyncza walka turniejowa z losowym uczestnikiem. Zwycięstwo = 3 punkty. */
export const fightTournamentRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { userId } = context;
    const { week, tournamentId } = await ensureTournament(db);

    if (week.phase === "registration") {
      return {
        ok: false as const,
        reason: "Trwają zapisy — walki turniejowe startują w środę.",
        state: await buildState(db, userId),
      };
    }

    const { data: mine } = await db
      .from("tournament_entries")
      .select("id, points, wins, losses, battles_today, last_battle_at")
      .eq("tournament_id", tournamentId)
      .eq("player_id", userId)
      .maybeSingle();
    if (!mine) {
      return {
        ok: false as const,
        reason: "Najpierw zapisz się do turnieju.",
        state: await buildState(db, userId),
      };
    }

    const today = warsawClock().dateKey;
    const usedToday =
      mine.last_battle_at && warsawClock(new Date(mine.last_battle_at)).dateKey === today
        ? mine.battles_today
        : 0;
    if (usedToday >= TOURNAMENT_DAILY_BATTLES) {
      return {
        ok: false as const,
        reason: `Na dziś limit walk turniejowych (${TOURNAMENT_DAILY_BATTLES}) jest wykorzystany.`,
        state: await buildState(db, userId),
      };
    }

    const { data: rivals } = await db
      .from("tournament_entries")
      .select("id, player_id, points, wins, losses")
      .eq("tournament_id", tournamentId)
      .neq("player_id", userId);
    if ((rivals ?? []).length === 0) {
      return {
        ok: false as const,
        reason: "Brak innych uczestników — zajrzyj tu ponownie później.",
        state: await buildState(db, userId),
      };
    }
    const rival = (rivals as any[])[Math.floor(Math.random() * (rivals as any[]).length)];

    const [{ data: myMons }, { data: theirMons }, names] = await Promise.all([
      db.from("player_pokemon").select(PARTY_COLUMNS).eq("owner_id", userId).eq("in_party", true),
      db
        .from("player_pokemon")
        .select(PARTY_COLUMNS)
        .eq("owner_id", rival.player_id)
        .eq("in_party", true),
      trainerNames(db),
    ]);

    const allies = ((myMons ?? []) as any[])
      .filter((row) => !row.fainted && row.hp_current > 0)
      .map((row) => toFighter(row));
    if (allies.length === 0) {
      return {
        ok: false as const,
        reason: "Twoja drużyna jest wyczerpana — najpierw ulecz Pokémony.",
        state: await buildState(db, userId),
      };
    }
    const foes = ((theirMons ?? []) as any[]).map((row) => {
      const fighter = toFighter(row, true);
      delete fighter.id;
      return fighter;
    });
    if (foes.length === 0) {
      return {
        ok: false as const,
        reason: "Losowy rywal nie wystawił drużyny — spróbuj ponownie.",
        state: await buildState(db, userId),
      };
    }

    const result = simulateTeamBattle(allies, foes);

    for (const [id, hp] of Object.entries(result.allyHp)) {
      await db
        .from("player_pokemon")
        .update({ hp_current: hp, fainted: hp <= 0 })
        .eq("id", id)
        .eq("owner_id", userId);
    }

    await db
      .from("tournament_entries")
      .update({
        points: mine.points + (result.won ? TOURNAMENT_WIN_POINTS : 0),
        wins: mine.wins + (result.won ? 1 : 0),
        losses: mine.losses + (result.won ? 0 : 1),
        battles_today: usedToday + 1,
        last_battle_at: new Date().toISOString(),
      })
      .eq("id", mine.id);

    await db
      .from("tournament_entries")
      .update({
        points: rival.points + (result.won ? 0 : TOURNAMENT_WIN_POINTS),
        wins: rival.wins + (result.won ? 0 : 1),
        losses: rival.losses + (result.won ? 1 : 0),
      })
      .eq("id", rival.id);

    const rivalName = names.get(rival.player_id)?.name ?? "Trener";
    return {
      ok: true as const,
      won: result.won,
      opponent: rivalName,
      log: [
        `Runda turniejowa: ${rivalName}.`,
        ...result.log,
        result.won
          ? `Zwycięstwo! +${TOURNAMENT_WIN_POINTS} punkty turniejowe.`
          : `Porażka — punkty trafiają do ${rivalName}.`,
      ],
      state: await buildState(db, userId),
    };
  });
