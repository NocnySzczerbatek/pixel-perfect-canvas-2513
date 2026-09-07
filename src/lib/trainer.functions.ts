import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

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
  train_hp: number;
  train_atk: number;
  train_def: number;
  train_spa: number;
  train_spd: number;
  train_spe: number;
  nature: string | null;
  ability: string | null;
  training_points: number;
  friendship: number;
  is_shiny: boolean;
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
    great_balls: number;
    ultra_balls: number;
    master_balls: number;
    premier_balls: number;
    net_balls: number;
    dive_balls: number;
    dusk_balls: number;
    quick_balls: number;
    timer_balls: number;
    repeat_balls: number;
    luxury_balls: number;
    travel_tickets: number;
    master_ball_bought_at: string | null;
    razz_berries: number;
    potions: number;
    super_potions: number;
    revives: number;
    mega_stones: number;
    shield_until: string | null;
    pvp_wins: number;
    pvp_losses: number;
    catch_coins: number;
    candy_normal: number;
    candy_xl: number;
    region: string | null;
    featured_badge: string | null;
    created_at: string;
  };
  pokemon: PokemonRow[];
  badges: {
    region: string;
    gym_index: number;
    badge_key: string;
    badge_name: string;
    leader_name: string;
  }[];
  items: { item_key: string; quantity: number }[];
  ball_price: number;
  bottle_energy: number;
};

const POKEMON_COLUMNS =
  "id, species_id, species_name, nickname, level, exp, hp_current, hp_max, fainted, in_party, is_starter, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, train_hp, train_atk, train_def, train_spa, train_spd, train_spe, nature, ability, training_points, friendship, is_shiny";


function expThreshold(level: number) {
  return Math.round(100 * Math.pow(level, 1.8));
}

async function buildTrainerData(supabase: any, userId: string): Promise<TrainerData> {
  const [{ data: profile }, { data: pokemon }, { data: badges }, { data: items }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "trainer_name, trainer_level, trainer_exp, energy, energy_bottles, poke_balls, great_balls, ultra_balls, master_balls, premier_balls, net_balls, dive_balls, dusk_balls, quick_balls, timer_balls, repeat_balls, luxury_balls, travel_tickets, master_ball_bought_at, razz_berries, potions, super_potions, revives, mega_stones, shield_until, pvp_wins, pvp_losses, catch_coins, candy_normal, candy_xl, region, featured_badge, created_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("player_pokemon")
      .select(POKEMON_COLUMNS)
      .eq("owner_id", userId)
      .order("caught_at", { ascending: true }),
    supabase
      .from("gym_badges")
      .select("region, gym_index, badge_key, badge_name, leader_name")
      .eq("owner_id", userId)
      .order("gym_index", { ascending: true }),
    supabase.from("player_items").select("item_key, quantity").eq("owner_id", userId).gt("quantity", 0),
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
      great_balls: profile.great_balls ?? 0,
      ultra_balls: profile.ultra_balls ?? 0,
      master_balls: profile.master_balls ?? 0,
      premier_balls: profile.premier_balls ?? 0,
      net_balls: profile.net_balls ?? 0,
      dive_balls: profile.dive_balls ?? 0,
      dusk_balls: profile.dusk_balls ?? 0,
      quick_balls: profile.quick_balls ?? 0,
      timer_balls: profile.timer_balls ?? 0,
      repeat_balls: profile.repeat_balls ?? 0,
      luxury_balls: profile.luxury_balls ?? 0,
      travel_tickets: profile.travel_tickets ?? 0,
      master_ball_bought_at: profile.master_ball_bought_at ?? null,
      razz_berries: profile.razz_berries ?? 0,
      potions: profile.potions ?? 0,
      super_potions: profile.super_potions ?? 0,
      revives: profile.revives ?? 0,
      mega_stones: profile.mega_stones ?? 0,
      shield_until: profile.shield_until ?? null,
      pvp_wins: profile.pvp_wins ?? 0,
      pvp_losses: profile.pvp_losses ?? 0,
      catch_coins: profile.catch_coins,
      candy_normal: profile.candy_normal ?? 0,
      candy_xl: profile.candy_xl ?? 0,
      region: profile.region,
      featured_badge: profile.featured_badge ?? null,
      created_at: profile.created_at,
    },
    pokemon: (pokemon ?? []) as PokemonRow[],
    badges: (badges ?? []) as TrainerData["badges"],
    items: (items ?? []) as TrainerData["items"],
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
    await (await writeDb())
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
      await (await writeDb())
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
    await (await writeDb())
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
    await (await writeDb()).from("player_pokemon").delete().eq("id", data.id).eq("owner_id", userId);
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
    await (await writeDb()).from("profiles").update({ trainer_name: data.name }).eq("id", userId);
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
    await (await writeDb())
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
    await (await writeDb())
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
    // Ranking pokazuje tylko dane publiczne — pełne profile są prywatne (RLS).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).rpc("public_trainers");
    const rows = ((data ?? []) as RankingRow[])
      .sort((a, b) => b.trainer_level - a.trainer_level || b.trainer_exp - a.trainer_exp)
      .slice(0, 25);
    return {
      rows,
      me: context.userId,
    };
  });

/** Trwałe usunięcie konta trenera wraz z danymi. */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await (await writeDb()).from("player_pokemon").delete().eq("owner_id", userId);
    await (await writeDb()).from("encounters").delete().eq("owner_id", userId);
    await (await writeDb()).from("profiles").delete().eq("id", userId);
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
    await (await writeDb())
      .from("player_pokemon")
      .update({ friendship })
      .eq("id", data.id)
      .eq("owner_id", userId);
    await ((await writeDb()).from("profiles") as any)
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

    await ((await writeDb()).from("player_pokemon") as any)
      .update({
        [field]: currentIv + 1,
        training_points: points,
        level,
        hp_max: hpMax,
        hp_current: Math.min(hpMax, pokemon.hp_current + (hpMax - pokemon.hp_max)),
      })
      .eq("id", data.id)
      .eq("owner_id", userId);

    await (await writeDb())
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

/** Wykonuje dostępną ewolucję, ponownie sprawdzając warunki po stronie serwera. */
export const evolvePokemon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Brak Pokémona.");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: mon } = await supabase.from("player_pokemon").select(POKEMON_COLUMNS).eq("id", data.id).eq("owner_id", userId).maybeSingle();
    if (!mon) throw new Error("Nie znaleziono Pokémona.");
    const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${mon.species_id}`);
    if (!speciesResponse.ok) throw new Error("Nie udało się sprawdzić ewolucji.");
    const species = await speciesResponse.json() as { evolution_chain: { url: string } | null; name: string };
    if (!species.evolution_chain) return { ok: false as const, reason: "Ten Pokémon nie ma dalszej ewolucji.", data: await buildTrainerData(supabase, userId) };
    const chainResponse = await fetch(species.evolution_chain.url);
    if (!chainResponse.ok) throw new Error("Nie udało się sprawdzić łańcucha ewolucji.");
    type Node = { species: { name: string; url: string }; evolves_to: Node[]; evolution_details: { min_level: number | null; min_happiness: number | null; item: { name: string } | null }[] };
    const chain = await chainResponse.json() as { chain: Node };
    const stack = [chain.chain]; let next: Node | null = null;
    while (stack.length) { const node = stack.pop(); if (!node) break; if (node.species.name === species.name) { next = node.evolves_to[0] ?? null; break; } stack.push(...node.evolves_to); }
    if (!next) return { ok: false as const, reason: "Ten Pokémon nie ma dalszej ewolucji.", data: await buildTrainerData(supabase, userId) };
    const detail = next.evolution_details[0];
    if ((detail?.min_level ?? 0) > mon.level) return { ok: false as const, reason: `Wymagany poziom: ${detail?.min_level}.`, data: await buildTrainerData(supabase, userId) };
    if ((detail?.min_happiness ?? 0) > mon.friendship) return { ok: false as const, reason: `Wymagana przyjaźń: ${detail?.min_happiness}.`, data: await buildTrainerData(supabase, userId) };
    if (detail?.item) {
      const itemKey = `evolution_${detail.item.name}`;
      const { data: item } = await supabase.from("player_items").select("id, quantity").eq("owner_id", userId).eq("item_key", itemKey).maybeSingle();
      if (!item || item.quantity < 1) return { ok: false as const, reason: `Potrzebujesz przedmiotu: ${detail.item.name}.`, data: await buildTrainerData(supabase, userId) };
      if (item.quantity === 1) await (await writeDb()).from("player_items").delete().eq("id", item.id).eq("owner_id", userId);
      else await (await writeDb()).from("player_items").update({ quantity: item.quantity - 1 }).eq("id", item.id).eq("owner_id", userId);
    }
    const toId = Number(next.species.url.split("/").filter(Boolean).pop() ?? 0);
    const name = next.species.name.charAt(0).toUpperCase() + next.species.name.slice(1);
    await (await writeDb()).from("player_pokemon").update({ species_id: toId, species_name: name }).eq("id", mon.id).eq("owner_id", userId);
    return { ok: true as const, name, data: await buildTrainerData(supabase, userId) };
  });

export const craftMegaStone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { speciesId: number }) => {
    const speciesId = Math.floor(Number(input?.speciesId));
    if (!Number.isFinite(speciesId) || speciesId < 1) throw new Error("Nieznany gatunek.");
    return { speciesId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const shardKey = `mega_shard_${data.speciesId}`;
    const stoneKey = `mega_stone_${data.speciesId}`;
    const { data: shard } = await supabase.from("player_items").select("id, quantity, metadata").eq("owner_id", userId).eq("item_key", shardKey).maybeSingle();
    if (!shard || shard.quantity < 5) return { ok: false as const, reason: "Potrzebujesz 5 fragmentów tego gatunku.", data: await buildTrainerData(supabase, userId) };
    const { data: stone } = await supabase.from("player_items").select("id, quantity").eq("owner_id", userId).eq("item_key", stoneKey).maybeSingle();
    await (await writeDb()).from("player_items").update({ quantity: shard.quantity - 5 }).eq("id", shard.id).eq("owner_id", userId);
    if (stone) await (await writeDb()).from("player_items").update({ quantity: stone.quantity + 1 }).eq("id", stone.id).eq("owner_id", userId);
    else await (await writeDb()).from("player_items").insert({ owner_id: userId, item_key: stoneKey, quantity: 1, metadata: { species_id: data.speciesId, kind: "mega_stone" } });
    return { ok: true as const, data: await buildTrainerData(supabase, userId) };
  });
