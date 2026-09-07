import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { speciesType } from "@/lib/pokedex";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const GTS_FEE = 0.05; // 5% prowizji giełdy
export const MIN_PRICE = 50;
export const MAX_PRICE = 50000;

export type Listing = {
  id: string;
  seller_id: string;
  seller_name: string;
  mine: boolean;
  species_id: number;
  species_name: string;
  species_type: string | null;
  level: number;
  price: number;
  status: string;
  created_at: string;
  snapshot: any;
};

export type GtsState = {
  catch_coins: number;
  fee_percent: number;
  min_price: number;
  listings: Listing[];
  my_listings: Listing[];
  sellable: {
    id: string;
    label: string;
    species_id: number;
    species_name: string;
    level: number;
    npc_price: number;
    suggested: number;
    is_starter: boolean;
  }[];
};

/** Wycena NPC-Kupca: szybka gotówka, bez prowizji, ale poniżej wartości rynkowej. */
export function npcPrice(row: {
  level: number;
  iv_hp: number;
  iv_atk: number;
  iv_def: number;
  iv_spa: number;
  iv_spd: number;
  iv_spe: number;
}) {
  const ivSum =
    row.iv_hp + row.iv_atk + row.iv_def + row.iv_spa + row.iv_spd + row.iv_spe;
  return Math.round(40 + row.level * 12 + ivSum * 3);
}

const MON_COLUMNS =
  "id, species_id, species_name, nickname, level, hp_current, hp_max, is_starter, in_party, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, nature, ability, training_points, friendship";

async function buildState(supabase: any, userId: string): Promise<GtsState> {
  // Nicki sprzedających pochodzą z listy publicznej — pełne profile są prywatne (RLS).
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: profile }, { data: listings }, { data: mons }, { data: names }] =
    await Promise.all([
      supabase.from("profiles").select("catch_coins").eq("id", userId).maybeSingle(),
      supabase
        .from("gts_listings")
        .select("*")
        .in("status", ["active"])
        .order("created_at", { ascending: false })
        .limit(60),
      supabase.from("player_pokemon").select(MON_COLUMNS).eq("owner_id", userId),
      (supabaseAdmin as any).rpc("public_trainers"),
    ]);
  if (!profile) throw new Error("Nie znaleziono profilu trenera.");

  const nameMap = new Map<string, string>((names ?? []).map((p: any) => [p.id, p.trainer_name]));
  const listedIds = new Set(((listings ?? []) as any[]).map((l: any) => l.pokemon_id));

  const toListing = (row: any): Listing => ({
    id: row.id,
    seller_id: row.seller_id,
    seller_name: nameMap.get(row.seller_id) ?? "Trener",
    mine: row.seller_id === userId,
    species_id: row.species_id,
    species_name: row.species_name,
    species_type: row.species_type,
    level: row.level,
    price: row.price,
    status: row.status,
    created_at: row.created_at,
    snapshot: row.snapshot,
  });

  const all: Listing[] = ((listings ?? []) as any[]).map(toListing);

  return {
    catch_coins: profile.catch_coins,
    fee_percent: Math.round(GTS_FEE * 100),
    min_price: MIN_PRICE,
    listings: all.filter((l: Listing) => !l.mine),
    my_listings: all.filter((l: Listing) => l.mine),
    sellable: (mons ?? [])
      .filter((m: any) => !m.is_starter && !listedIds.has(m.id))
      .map((m: any) => {
        const price = npcPrice(m);
        return {
          id: m.id,
          label: `${m.nickname ?? m.species_name} · Lvl ${m.level}`,
          species_id: m.species_id,
          species_name: m.species_name,
          level: m.level,
          npc_price: price,
          suggested: Math.round(price * 1.5),
          is_starter: m.is_starter,
        };
      }),
  };
}

/** Stan giełdy: oferty innych trenerów, moje oferty i Pokémony do sprzedaży. */
export const getGtsState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Wystawienie Pokémona na giełdę (startera nie można sprzedać). */
export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pokemonId: string; price: number }) => {
    if (!input?.pokemonId) throw new Error("Brak Pokémona.");
    const price = Math.floor(Number(input?.price ?? 0));
    if (price < MIN_PRICE || price > MAX_PRICE) {
      throw new Error(`Cena musi być między ${MIN_PRICE} a ${MAX_PRICE} Catch Coins.`);
    }
    return { pokemonId: input.pokemonId, price };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: mon } = await supabase
      .from("player_pokemon")
      .select(MON_COLUMNS)
      .eq("id", data.pokemonId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!mon) throw new Error("Nie znaleziono Pokémona.");
    if (mon.is_starter) {
      return {
        ok: false as const,
        reason: "Startera nie można wystawić na giełdę.",
        state: await buildState(supabase, userId),
      };
    }
    const { count } = await supabase
      .from("gts_listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", userId)
      .eq("status", "active");
    if ((count ?? 0) >= 6) {
      return {
        ok: false as const,
        reason: "Masz już 6 aktywnych ofert — najpierw którąś wycofaj.",
        state: await buildState(supabase, userId),
      };
    }

    await (await writeDb()).from("gts_listings").insert({
      seller_id: userId,
      pokemon_id: mon.id,
      species_id: mon.species_id,
      species_name: mon.species_name,
      species_type: speciesType(mon.species_id),
      level: mon.level,
      price: data.price,
      snapshot: mon,
    });
    return { ok: true as const, state: await buildState(supabase, userId) };
  });

/** Wycofanie własnej oferty. */
export const cancelListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string }) => {
    if (!input?.listingId) throw new Error("Brak oferty.");
    return { listingId: input.listingId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await (await writeDb())
      .from("gts_listings")
      .update({ status: "cancelled" })
      .eq("id", data.listingId)
      .eq("seller_id", userId)
      .eq("status", "active");
    return { ok: true as const, state: await buildState(supabase, userId) };
  });

/** Zakup Pokémona z giełdy: sprzedający dostaje cenę minus 5% prowizji. */
export const buyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string }) => {
    if (!input?.listingId) throw new Error("Brak oferty.");
    return { listingId: input.listingId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: listing } = await supabaseAdmin
      .from("gts_listings")
      .select("*")
      .eq("id", data.listingId)
      .eq("status", "active")
      .maybeSingle();
    if (!listing) {
      return {
        ok: false as const,
        reason: "Ta oferta już nie jest dostępna.",
        state: await buildState(supabase, userId),
      };
    }
    if (listing.seller_id === userId) {
      return {
        ok: false as const,
        reason: "To Twoja własna oferta.",
        state: await buildState(supabase, userId),
      };
    }

    const { data: buyer } = await supabase
      .from("profiles")
      .select("catch_coins")
      .eq("id", userId)
      .maybeSingle();
    if (!buyer) throw new Error("Nie znaleziono profilu trenera.");
    if (buyer.catch_coins < listing.price) {
      return {
        ok: false as const,
        reason: `Brakuje Catch Coins — ta oferta kosztuje ${listing.price}.`,
        state: await buildState(supabase, userId),
      };
    }

    // Pokémon nadal musi należeć do sprzedającego.
    const { data: mon } = await supabaseAdmin
      .from("player_pokemon")
      .select("id, owner_id")
      .eq("id", listing.pokemon_id as string)
      .maybeSingle();
    if (!mon || mon.owner_id !== listing.seller_id) {
      await supabaseAdmin.from("gts_listings").update({ status: "cancelled" }).eq("id", listing.id);
      return {
        ok: false as const,
        reason: "Sprzedający nie ma już tego Pokémona.",
        state: await buildState(supabase, userId),
      };
    }

    const { count } = await supabase
      .from("player_pokemon")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("in_party", true);

    const fee = Math.max(1, Math.round(listing.price * GTS_FEE));
    const payout = listing.price - fee;

    await supabaseAdmin
      .from("player_pokemon")
      .update({
        owner_id: userId,
        in_party: (count ?? 0) < 6,
        is_starter: false,
      })
      .eq("id", mon.id);

    await (await writeDb())
      .from("profiles")
      .update({ catch_coins: buyer.catch_coins - listing.price })
      .eq("id", userId);

    const { data: seller } = await supabaseAdmin
      .from("profiles")
      .select("catch_coins")
      .eq("id", listing.seller_id)
      .maybeSingle();
    if (seller) {
      await supabaseAdmin
        .from("profiles")
        .update({ catch_coins: seller.catch_coins + payout })
        .eq("id", listing.seller_id);
    }

    await supabaseAdmin
      .from("gts_listings")
      .update({ status: "sold", buyer_id: userId, sold_at: new Date().toISOString() })
      .eq("id", listing.id);

    return {
      ok: true as const,
      price: listing.price,
      fee,
      name: listing.species_name,
      state: await buildState(supabase, userId),
    };
  });

/** NPC-Kupiec: natychmiastowa sprzedaż Pokémona po wycenie, bez prowizji. */
export const sellToNpc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pokemonId: string }) => {
    if (!input?.pokemonId) throw new Error("Brak Pokémona.");
    return { pokemonId: input.pokemonId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: mon } = await supabase
      .from("player_pokemon")
      .select(MON_COLUMNS)
      .eq("id", data.pokemonId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!mon) throw new Error("Nie znaleziono Pokémona.");
    if (mon.is_starter) {
      return {
        ok: false as const,
        reason: "Startera nie sprzedasz NPC-Kupcowi.",
        state: await buildState(supabase, userId),
      };
    }
    const price = npcPrice(mon);
    const { data: profile } = await supabase
      .from("profiles")
      .select("catch_coins")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Nie znaleziono profilu trenera.");

    await (await writeDb())
      .from("gts_listings")
      .update({ status: "cancelled" })
      .eq("pokemon_id", mon.id as string)
      .eq("seller_id", userId)
      .eq("status", "active");
    await (await writeDb()).from("player_pokemon").delete().eq("id", mon.id).eq("owner_id", userId);
    await (await writeDb())
      .from("profiles")
      .update({ catch_coins: profile.catch_coins + price })
      .eq("id", userId);

    return {
      ok: true as const,
      price,
      name: mon.nickname ?? mon.species_name,
      state: await buildState(supabase, userId),
    };
  });
