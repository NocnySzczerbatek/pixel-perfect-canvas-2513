import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_ENERGY = 100;
const MAX_PARTY = 6;
export const BALL_PRICE = 20; // Catch Coins za 1 Poké Balla
export const BOTTLE_ENERGY = 25; // Energia z jednego Flakonu

export type PokemonRow = {
  id: string;
  species_id: number;
  species_name: string;
  nickname: string | null;
  level: number;
  exp: number;
  hp_current: number;
  hp_max: number;
  fainted: boolean;
  in_party: boolean;
  is_starter: boolean;
  iv_hp: number;
  iv_atk: number;
  iv_def: number;
  iv_spa: number;
  iv_spd: number;
  iv_spe: number;
  nature: string | null;
  ability: string | null;
  training_points: number;
  friendship: number;
};

export type TrainerData = {
  profile: {
    trainer_name: string;
    trainer_level: number;
    trainer_exp: number;
    trainer_exp_next: number;
    energy: number;
    energy_max: number;
    energy_bottles: number;
    poke_balls: number;
    catch_coins: number;
    candy_normal: number;
    candy_xl: number;
    region: string | null;
    created_at: string;
  };
  pokemon: PokemonRow[];
  ball_price: number;
  bottle_energy: number;
};

const POKEMON_COLUMNS =
  "id, species_id, species_name, nickname, level, exp, hp_current, hp_max, fainted, in_party, is_starter, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, nature, ability, training_points, friendship";


function expThreshold(level: number) {
  return Math.round(100 * Math.pow(level, 1.8));
}

async function buildTrainerData(supabase: any, userId: string): Promise<TrainerData> {
  const [{ data: profile }, { data: pokemon }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "trainer_name, trainer_level, trainer_exp, energy, energy_bottles, poke_balls, catch_coins, candy_normal, candy_xl, region, created_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("player_pokemon")
      .select(POKEMON_COLUMNS)
      .eq("owner_id", userId)
      .order("caught_at", { ascending: true }),
  ]);
  if (!profile) throw new Error("Nie znaleziono profilu trenera.");

  return {
    profile: {
      trainer_name: profile.trainer_name,
      trainer_level: profile.trainer_level,
      trainer_exp: profile.trainer_exp,
      trainer_exp_next: expThreshold(profile.trainer_level),
      energy: profile.energy,
      energy_max: MAX_ENERGY,
      energy_bottles: profile.energy_bottles,
      poke_balls: profile.poke_balls,
      catch_coins: profile.catch_coins,
      candy_normal: profile.candy_normal ?? 0,
      candy_xl: profile.candy_xl ?? 0,
      region: profile.region,
      created_at: profile.created_at,
    },
    pokemon: (pokemon ?? []) as PokemonRow[],
    ball_price: BALL_PRICE,
    bottle_energy: BOTTLE_ENERGY,
  };
}


/** Profil trenera + wszystkie Pokémony (drużyna i PC Box). */
export const getTrainerData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildTrainerData(context.supabase, context.userId));

/** Przenosi Pokémona między drużyną (max 6) i PC Boxem. */
export const setInParty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; inParty: boolean }) => {
    if (!input?.id) throw new Error("Brak Pokémona.");
    return { id: input.id, inParty: Boolean(input.inParty) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.inParty) {
      const { count } = await supabase
        .from("player_pokemon")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .eq("in_party", true);
      if ((count ?? 0) >= MAX_PARTY) {
        return {
          ok: false as const,
          reason: "Drużyna jest pełna — najpierw odeślij kogoś do PC Boxa.",
          data: await buildTrainerData(supabase, userId),
        };
      }
    }
    await supabase
      .from("player_pokemon")
      .update({ in_party: data.inParty })
      .eq("id", data.id)
      .eq("owner_id", userId);
    return { ok: true as const, data: await buildTrainerData(supabase, userId) };
  });

/** Darmowe leczenie całej drużyny, bez limitu. */
export const healParty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("player_pokemon")
      .select("id, hp_max")
      .eq("owner_id", userId)
      .eq("in_party", true);
    for (const row of (rows ?? []) as { id: string; hp_max: number }[]) {
      await supabase
        .from("player_pokemon")
        .update({ hp_current: row.hp_max, fainted: false })
        .eq("id", row.id)
        .eq("owner_id", userId);
    }
    return {
      ok: true as const,
      healed: (rows ?? []).length,
      data: await buildTrainerData(supabase, userId),
    };
  });

/** Nadaje lub czyści pseudonim Pokémona. */
export const renamePokemon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; nickname: string }) => {
    if (!input?.id) throw new Error("Brak Pokémona.");
    const nickname = (input.nickname ?? "").trim().slice(0, 20);
    return { id: input.id, nickname };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("player_pokemon")
      .update({ nickname: data.nickname.length > 0 ? data.nickname : null })
      .eq("id", data.id)
      .eq("owner_id", userId);
    return { ok: true as const, data: await buildTrainerData(supabase, userId) };
  });

/** Wypuszcza Pokémona (startera nie można wypuścić). */
export const releasePokemon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Brak Pokémona.");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("player_pokemon")
      .select("id, is_starter")
      .eq("id", data.id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Nie znaleziono Pokémona.");
    if (row.is_starter) {
      return {
        ok: false as const,
        reason: "Startera nie można wypuścić.",
        data: await buildTrainerData(supabase, userId),
      };
    }
    await supabase.from("player_pokemon").delete().eq("id", data.id).eq("owner_id", userId);
    return { ok: true as const, data: await buildTrainerData(supabase, userId) };
  });

/** Zmiana nicku trenera. */
export const renameTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => {
    const name = (input?.name ?? "").trim();
    if (name.length < 3 || name.length > 18) {
      throw new Error("Nick musi mieć od 3 do 18 znaków.");
    }
    return { name };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("profiles").update({ trainer_name: data.name }).eq("id", userId);
    return { ok: true as const, data: await buildTrainerData(supabase, userId) };
  });

/** Zużywa Flakon Energii (+25 Energii, cap 100). */
export const useEnergyBottle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("energy, energy_bottles")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Nie znaleziono profilu trenera.");
    if (profile.energy_bottles <= 0) {
      return {
        ok: false as const,
        reason: "Nie masz Flakonów Energii.",
        data: await buildTrainerData(supabase, userId),
      };
    }
    if (profile.energy >= MAX_ENERGY) {
      return {
        ok: false as const,
        reason: "Energia jest już pełna.",
        data: await buildTrainerData(supabase, userId),
      };
    }
    await supabase
      .from("profiles")
      .update({
        energy: Math.min(MAX_ENERGY, profile.energy + BOTTLE_ENERGY),
        energy_bottles: profile.energy_bottles - 1,
        energy_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    return { ok: true as const, data: await buildTrainerData(supabase, userId) };
  });

/** Kupno Poké Balli za Catch Coins. */
export const buyPokeBalls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { amount: number }) => {
    const amount = Math.floor(Number(input?.amount ?? 0));
    if (![1, 5, 10].includes(amount)) throw new Error("Nieprawidłowa liczba Balli.");
    return { amount };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("poke_balls, catch_coins")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Nie znaleziono profilu trenera.");
    const cost = data.amount * BALL_PRICE;
    if (profile.catch_coins < cost) {
      return {
        ok: false as const,
        reason: `Brakuje Catch Coins — potrzebujesz ${cost}, masz ${profile.catch_coins}.`,
        data: await buildTrainerData(supabase, userId),
      };
    }
    await supabase
      .from("profiles")
      .update({
        poke_balls: profile.poke_balls + data.amount,
        catch_coins: profile.catch_coins - cost,
      })
      .eq("id", userId);
    return { ok: true as const, cost, data: await buildTrainerData(supabase, userId) };
  });

/** Ranking trenerów: poziom, EXP, monety. */
export type RankingRow = {
  id: string;
  trainer_name: string;
  trainer_level: number;
  trainer_exp: number;
  catch_coins: number;
  featured_badge: string | null;
};

export const getRanking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("id, trainer_name, trainer_level, trainer_exp, catch_coins, featured_badge")
      .order("trainer_level", { ascending: false })
      .order("trainer_exp", { ascending: false })
      .limit(25);
    return {
      rows: (data ?? []) as RankingRow[],
      me: context.userId,
    };
  });

/** Trwałe usunięcie konta trenera wraz z danymi. */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("player_pokemon").delete().eq("owner_id", userId);
    await supabase.from("encounters").delete().eq("owner_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { ok: true as const };
  });

/** Koszt jednego punktu treningu danego staty (rośnie wykładniczo z poziomem treningu). */
export const TRAINING_LEVEL_STEP = 5; // co 5 punktów treningu = +1 poziom
export const MAX_IV = 31;
export const TRAINING_DISPLAY_MAX = 1000; // gracz widzi skalę 0–1000
export const MAX_FRIENDSHIP = 255;

export function trainingCost(currentIv: number) {
  return Math.round(25 + Math.pow(currentIv, 1.85) * 4);
}

/** Przelicza wewnętrzne IV (0–31) na "Poziom Treningu" widoczny dla gracza (0–1000). */
export function trainingLevel(iv: number) {
  return Math.round((Math.min(MAX_IV, Math.max(0, iv)) / MAX_IV) * TRAINING_DISPLAY_MAX);
}

/** Rodzaje Cukierków znajdowanych podczas eksploracji (przyjaźń). */
export const CANDIES = {
  normal: { field: "candy_normal", label: "Zwykły Cukierek", sprite: "rare-candy", friendship: 8 },
  xl: { field: "candy_xl", label: "Cukierek XL", sprite: "exp-candy-xl", friendship: 35 },
} as const;

export type CandyKind = keyof typeof CANDIES;

/** Użycie Cukierka na Pokémonie — podnosi przyjaźń (max 255). */
export const useCandy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; kind: CandyKind }) => {
    if (!input?.id) throw new Error("Brak Pokémona.");
    if (!(input.kind in CANDIES)) throw new Error("Nieznany cukierek.");
    return { id: input.id, kind: input.kind };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const candy = CANDIES[data.kind];
    const [{ data: profile }, { data: row }] = await Promise.all([
      supabase.from("profiles").select("candy_normal, candy_xl").eq("id", userId).maybeSingle(),
      supabase
        .from("player_pokemon")
        .select("id, friendship")
        .eq("id", data.id)
        .eq("owner_id", userId)
        .maybeSingle(),
    ]);
    if (!profile || !row) throw new Error("Nie znaleziono danych trenera.");
    const owned = (profile as Record<string, number>)[candy.field] ?? 0;
    if (owned <= 0) {
      return {
        ok: false as const,
        reason: `Nie masz już ${candy.label.toLowerCase()}ów.`,
        data: await buildTrainerData(supabase, userId),
      };
    }
    const friendship = Math.min(MAX_FRIENDSHIP, (row.friendship as number) + candy.friendship);
    await supabase
      .from("player_pokemon")
      .update({ friendship })
      .eq("id", data.id)
      .eq("owner_id", userId);
    await (supabase.from("profiles") as any)
      .update({ [candy.field]: owned - 1 })
      .eq("id", userId);
    return {
      ok: true as const,
      friendship,
      gained: candy.friendship,
      data: await buildTrainerData(supabase, userId),
    };
  });


const IV_FIELDS = {
  hp: "iv_hp",
  atk: "iv_atk",
  def: "iv_def",
  spa: "iv_spa",
  spd: "iv_spd",
  spe: "iv_spe",
} as const;

/** Trening: 1 punkt = +1 IV wybranego staty; co 5 punktów Pokémon zyskuje poziom. */
export const trainPokemon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; stat: keyof typeof IV_FIELDS }) => {
    if (!input?.id) throw new Error("Brak Pokémona.");
    if (!(input.stat in IV_FIELDS)) throw new Error("Nieznana statystyka.");
    return { id: input.id, stat: input.stat };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const field = IV_FIELDS[data.stat];
    const { data: row } = await supabase
      .from("player_pokemon")
      .select(POKEMON_COLUMNS)
      .eq("id", data.id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Nie znaleziono Pokémona.");
    const pokemon = row as PokemonRow;
    const currentIv = pokemon[field as keyof PokemonRow] as number;

    if (currentIv >= 31) {
      return {
        ok: false as const,
        reason: "Ta statystyka jest już na maksimum (31).",
        data: await buildTrainerData(supabase, userId),
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("catch_coins, trainer_level")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Nie znaleziono profilu trenera.");
    const cost = trainingCost(currentIv);
    if (profile.catch_coins < cost) {
      return {
        ok: false as const,
        reason: `Brakuje Catch Coins — ten trening kosztuje ${cost}, masz ${profile.catch_coins}.`,
        data: await buildTrainerData(supabase, userId),
      };
    }

    const points = pokemon.training_points + 1;
    const gainedLevels =
      Math.floor(points / TRAINING_LEVEL_STEP) -
      Math.floor(pokemon.training_points / TRAINING_LEVEL_STEP);
    const maxLevel = (profile.trainer_level as number) + 5;
    const level = Math.min(maxLevel, pokemon.level + gainedLevels);
    const newIvHp = data.stat === "hp" ? currentIv + 1 : pokemon.iv_hp;
    const hpMax = Math.round(20 + level * 4 + newIvHp * 0.8);

    await (supabase.from("player_pokemon") as any)
      .update({
        [field]: currentIv + 1,
        training_points: points,
        level,
        hp_max: hpMax,
        hp_current: Math.min(hpMax, pokemon.hp_current + (hpMax - pokemon.hp_max)),
      })
      .eq("id", data.id)
      .eq("owner_id", userId);

    await supabase
      .from("profiles")
      .update({ catch_coins: profile.catch_coins - cost })
      .eq("id", userId);

    return {
      ok: true as const,
      cost,
      leveledUp: level > pokemon.level,
      level,
      cappedByTrainer: level === maxLevel && pokemon.level + gainedLevels > maxLevel,
      data: await buildTrainerData(supabase, userId),
    };
  });
