import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { simulateTeamBattle, type Fighter } from "@/lib/battle";
import { allyFighter } from "@/lib/fighters";
import { speciesType } from "@/lib/pokedex";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const RAID_ENERGY = 8;

export type Rival = {
  id: string;
  trainer_name: string;
  trainer_level: number;
  catch_coins: number;
  region: string | null;
  pvp_wins: number;
  pvp_losses: number;
  shielded: boolean;
  party_size: number;
};

export type PvpState = {
  me: {
    trainer_name: string;
    trainer_level: number;
    catch_coins: number;
    energy: number;
    shield_until: string | null;
    shielded: boolean;
    pvp_wins: number;
    pvp_losses: number;
    party_size: number;
  };
  rivals: Rival[];
  history: {
    id: string;
    created_at: string;
    coins_stolen: number;
    won: boolean;
    opponent: string;
  }[];
  raid_energy: number;
};

function toFighter(row: any): Fighter {
  return allyFighter(row);
}

const PARTY_COLUMNS =
  "id, species_id, species_name, nickname, level, hp_current, hp_max, fainted, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, ability, is_shiny";

async function buildState(supabase: any, userId: string): Promise<PvpState> {
  const now = Date.now();
  // Lista rywali pochodzi z listy publicznej — pełne profile są prywatne (RLS).
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: me }, { data: allTrainers }, { data: myParty }, { data: log }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "trainer_name, trainer_level, catch_coins, energy, shield_until, pvp_wins, pvp_losses",
      )
      .eq("id", userId)
      .maybeSingle(),
    (supabaseAdmin as any).rpc("public_trainers"),
    supabase.from("player_pokemon").select("id").eq("owner_id", userId).eq("in_party", true),
    supabase
      .from("pvp_battles_log")
      .select("id, created_at, coins_stolen, winner_id, loser_id")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (!me) throw new Error("Nie znaleziono profilu trenera.");

  const names = new Map<string, string>(
    ((allTrainers ?? []) as any[]).map((p: any) => [p.id, p.trainer_name]),
  );
  names.set(userId, me.trainer_name);

  const profiles = ((allTrainers ?? []) as any[])
    .filter((p: any) => p.id !== userId)
    .sort((a: any, b: any) => b.trainer_level - a.trainer_level)
    .slice(0, 40);

  return {
    me: {
      trainer_name: me.trainer_name,
      trainer_level: me.trainer_level,
      catch_coins: me.catch_coins,
      energy: me.energy,
      shield_until: me.shield_until ?? null,
      shielded: Boolean(me.shield_until && new Date(me.shield_until).getTime() > now),
      pvp_wins: me.pvp_wins ?? 0,
      pvp_losses: me.pvp_losses ?? 0,
      party_size: (myParty ?? []).length,
    },
    rivals: (profiles ?? []).map((p: any) => ({
      id: p.id,
      trainer_name: p.trainer_name,
      trainer_level: p.trainer_level,
      catch_coins: p.catch_coins,
      region: p.region,
      pvp_wins: p.pvp_wins ?? 0,
      pvp_losses: p.pvp_losses ?? 0,
      shielded: Boolean(p.shield_until && new Date(p.shield_until).getTime() > now),
      party_size: 0,
    })),
    history: (log ?? []).map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      coins_stolen: row.coins_stolen,
      won: row.winner_id === userId,
      opponent: names.get(row.winner_id === userId ? row.loser_id : row.winner_id) ?? "Trener",
    })),
    raid_energy: RAID_ENERGY,
  };
}

/** Lista rywali, moje statystyki i historia napadów. */
export const getPvpState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Napad PvP: zwycięzca zabiera 5–10% monet przegranego (Tarcza BHP blokuje atak). */
export const raidTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rivalId: string }) => {
    if (!input?.rivalId) throw new Error("Brak rywala.");
    return { rivalId: input.rivalId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.rivalId === userId) throw new Error("Nie zaatakujesz samego siebie.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: me } = await supabase
      .from("profiles")
      .select("trainer_name, catch_coins, energy, pvp_wins, pvp_losses")
      .eq("id", userId)
      .maybeSingle();
    if (!me) throw new Error("Nie znaleziono profilu trenera.");
    if (me.energy < RAID_ENERGY) {
      return {
        ok: false as const,
        reason: `Napad kosztuje ${RAID_ENERGY} Energii — masz ${me.energy}.`,
        state: await buildState(supabase, userId),
      };
    }

    const { data: rival } = await supabaseAdmin
      .from("profiles")
      .select("id, trainer_name, catch_coins, shield_until, pvp_wins, pvp_losses")
      .eq("id", data.rivalId)
      .maybeSingle();
    if (!rival) throw new Error("Nie znaleziono rywala.");
    if (rival.shield_until && new Date(rival.shield_until).getTime() > Date.now()) {
      return {
        ok: false as const,
        reason: `${rival.trainer_name} ma aktywną Tarczę BHP — napad niemożliwy.`,
        state: await buildState(supabase, userId),
      };
    }

    const [{ data: mine }, { data: theirs }] = await Promise.all([
      supabase
        .from("player_pokemon")
        .select(PARTY_COLUMNS)
        .eq("owner_id", userId)
        .eq("in_party", true),
      supabaseAdmin
        .from("player_pokemon")
        .select(PARTY_COLUMNS)
        .eq("owner_id", data.rivalId)
        .eq("in_party", true),
    ]);

    const allies = (mine ?? []).filter((p: any) => !p.fainted && p.hp_current > 0).map(toFighter);
    if (allies.length === 0) {
      return {
        ok: false as const,
        reason: "Cała Twoja drużyna jest wyczerpana — najpierw ulecz Pokémony.",
        state: await buildState(supabase, userId),
      };
    }
    const foes =
      (theirs ?? []).length > 0
        ? (theirs as any[]).map((row) => {
            const fighter = toFighter(row);
            delete fighter.id;
            return { ...fighter, hp: row.hp_max };
          })
        : [
            {
              name: `${rival.trainer_name} — rezerwowy`,
              type: "Normalny",
              level: 5,
              hp: hpFromIv(5, 10),
              hpMax: hpFromIv(5, 10),
              atk: statFromIv(5, 10, 9),
              def: statFromIv(5, 10, 8),
              spe: statFromIv(5, 10, 8),
            } as Fighter,
          ];

    const result = simulateTeamBattle(allies, foes);
    const report = result.report;
    const percent = 5 + Math.floor(Math.random() * 6); // 5–10%

    for (const [id, hp] of Object.entries(result.allyHp)) {
      await (await writeDb())
        .from("player_pokemon")
        .update({ hp_current: hp, fainted: hp <= 0 })
        .eq("id", id)
        .eq("owner_id", userId);
    }

    let stolen = 0;
    if (result.won) {
      stolen = Math.max(1, Math.floor((rival.catch_coins * percent) / 100));
      await supabaseAdmin
        .from("profiles")
        .update({
          catch_coins: Math.max(0, rival.catch_coins - stolen),
          pvp_losses: (rival.pvp_losses ?? 0) + 1,
        })
        .eq("id", rival.id);
      await (await writeDb())
        .from("profiles")
        .update({
          catch_coins: me.catch_coins + stolen,
          energy: me.energy - RAID_ENERGY,
          pvp_wins: (me.pvp_wins ?? 0) + 1,
        })
        .eq("id", userId);
    } else {
      stolen = Math.max(1, Math.floor((me.catch_coins * percent) / 100));
      await (await writeDb())
        .from("profiles")
        .update({
          catch_coins: Math.max(0, me.catch_coins - stolen),
          energy: me.energy - RAID_ENERGY,
          pvp_losses: (me.pvp_losses ?? 0) + 1,
        })
        .eq("id", userId);
      await supabaseAdmin
        .from("profiles")
        .update({ pvp_wins: (rival.pvp_wins ?? 0) + 1 })
        .eq("id", rival.id);
    }

    await supabaseAdmin.from("pvp_battles_log").insert({
      winner_id: result.won ? userId : rival.id,
      loser_id: result.won ? rival.id : userId,
      coins_stolen: stolen,
    });

    report.coins = result.won ? stolen : 0;
    report.extras.push(
      result.won
        ? `Zabierasz rywalowi ${stolen} Catch Coins (${percent}%).`
        : `Rywal zabiera Ci ${stolen} Catch Coins (${percent}%).`,
    );

    return {
      ok: true as const,
      won: result.won,
      report,
      stolen,
      percent,
      log: [
        ...result.log,
        result.won
          ? `Zabierasz ${stolen} Catch Coins (${percent}% zapasów ${rival.trainer_name}).`
          : `${rival.trainer_name} odbija atak i zabiera Ci ${stolen} Catch Coins (${percent}%).`,
      ],
      state: await buildState(supabase, userId),
    };
  });
