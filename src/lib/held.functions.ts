/**
 * Zakładanie i zdejmowanie Przedmiotów Trzymanych.
 * Wszystkie sprawdzenia są serwerowe: właściciel Pokémona, kategoria przedmiotu
 * i posiadana ilość w `player_items`. Gracz nie może założyć czegoś, czego nie ma.
 */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { catalogItem, isHeldItem } from "@/lib/held-items";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** +1 sztuka przedmiotu w ekwipunku gracza. */
async function addItem(db: any, userId: string, itemKey: string) {
  const { data: row } = await db
    .from("player_items")
    .select("id, quantity")
    .eq("owner_id", userId)
    .eq("item_key", itemKey)
    .maybeSingle();
  if (row) {
    await db.from("player_items").update({ quantity: row.quantity + 1 }).eq("id", row.id).eq("owner_id", userId);
  } else {
    await db.from("player_items").insert({ owner_id: userId, item_key: itemKey, quantity: 1, metadata: {} });
  }
}

/** Zakłada przedmiot na Pokémona: -1 z ekwipunku, zapis w `player_pokemon.held_item`. */
export const equipHeldItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pokemonId: string; itemKey: string }) => {
    const pokemonId = String(input?.pokemonId ?? "");
    const itemKey = String(input?.itemKey ?? "");
    if (!pokemonId) throw new Error("Brak Pokémona.");
    if (!isHeldItem(itemKey)) throw new Error("Ten przedmiot nie jest Przedmiotem Trzymanym.");
    return { pokemonId, itemKey };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await writeDb();

    const { data: pokemon } = await supabase
      .from("player_pokemon")
      .select("id, held_item, nickname, species_name")
      .eq("id", data.pokemonId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!pokemon) return { ok: false as const, reason: "Nie znaleziono Twojego Pokémona." };

    const { data: stock } = await supabase
      .from("player_items")
      .select("id, quantity")
      .eq("owner_id", userId)
      .eq("item_key", data.itemKey)
      .maybeSingle();
    if (!stock || stock.quantity <= 0) {
      return { ok: false as const, reason: "Nie masz tego przedmiotu w ekwipunku." };
    }

    // Zdejmowany przedmiot wraca do ekwipunku, żeby nie przepadł.
    if (pokemon.held_item) await addItem(db, userId, pokemon.held_item);

    const { data: taken } = await db
      .from("player_items")
      .update({ quantity: stock.quantity - 1 })
      .eq("id", stock.id)
      .eq("owner_id", userId)
      .gt("quantity", 0)
      .select("id")
      .maybeSingle();
    if (!taken) return { ok: false as const, reason: "Nie udało się pobrać przedmiotu z ekwipunku." };

    await db
      .from("player_pokemon")
      .update({ held_item: data.itemKey })
      .eq("id", pokemon.id)
      .eq("owner_id", userId);

    const item = catalogItem(data.itemKey)!;
    return {
      ok: true as const,
      message: `${pokemon.nickname ?? pokemon.species_name} trzyma teraz ${item.label}.`,
      heldItem: data.itemKey,
    };
  });

/** Zdejmuje przedmiot: `held_item` = NULL, +1 sztuka wraca do ekwipunku. */
export const unequipHeldItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pokemonId: string }) => {
    const pokemonId = String(input?.pokemonId ?? "");
    if (!pokemonId) throw new Error("Brak Pokémona.");
    return { pokemonId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await writeDb();

    const { data: pokemon } = await supabase
      .from("player_pokemon")
      .select("id, held_item, nickname, species_name")
      .eq("id", data.pokemonId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!pokemon) return { ok: false as const, reason: "Nie znaleziono Twojego Pokémona." };
    if (!pokemon.held_item) return { ok: false as const, reason: "Ten Pokémon nic nie trzyma." };

    const { data: cleared } = await db
      .from("player_pokemon")
      .update({ held_item: null })
      .eq("id", pokemon.id)
      .eq("owner_id", userId)
      .eq("held_item", pokemon.held_item)
      .select("id")
      .maybeSingle();
    if (!cleared) return { ok: false as const, reason: "Przedmiot został już zdjęty." };

    await addItem(db, userId, pokemon.held_item);
    const item = catalogItem(pokemon.held_item);
    return {
      ok: true as const,
      message: `${item?.label ?? "Przedmiot"} wrócił do ekwipunku.`,
      heldItem: null,
    };
  });

/**
 * Osobny slot na Kamień Mega Ewolucji.
 * Można wpiąć wyłącznie gatunkowy Kamień Mega pasujący do gatunku tego Pokémona,
 * i tylko jeśli gracz faktycznie ma go w ekwipunku.
 */
export const equipMegaStone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pokemonId: string; itemKey: string }) => {
    const pokemonId = String(input?.pokemonId ?? "");
    const itemKey = String(input?.itemKey ?? "");
    if (!pokemonId) throw new Error("Brak Pokémona.");
    if (!/^mega_stone_\d+$/.test(itemKey)) throw new Error("To nie jest Kamień Mega.");
    return { pokemonId, itemKey };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await writeDb();

    const { data: pokemon } = await supabase
      .from("player_pokemon")
      .select("id, species_id, species_name, nickname, mega_stone")
      .eq("id", data.pokemonId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!pokemon) return { ok: false as const, reason: "Nie znaleziono Twojego Pokémona." };

    const stoneSpecies = Number(data.itemKey.replace("mega_stone_", ""));
    if (stoneSpecies !== pokemon.species_id) {
      return { ok: false as const, reason: "Ten Kamień Mega należy do innego gatunku." };
    }

    const { data: stock } = await supabase
      .from("player_items")
      .select("id, quantity")
      .eq("owner_id", userId)
      .eq("item_key", data.itemKey)
      .maybeSingle();
    if (!stock || stock.quantity <= 0) {
      return { ok: false as const, reason: "Nie masz tego Kamienia Mega w ekwipunku." };
    }

    if (pokemon.mega_stone) await addItem(db, userId, pokemon.mega_stone);

    const { data: taken } = await db
      .from("player_items")
      .update({ quantity: stock.quantity - 1 })
      .eq("id", stock.id)
      .eq("owner_id", userId)
      .gt("quantity", 0)
      .select("id")
      .maybeSingle();
    if (!taken) return { ok: false as const, reason: "Nie udało się pobrać Kamienia z ekwipunku." };

    await db
      .from("player_pokemon")
      .update({ mega_stone: data.itemKey })
      .eq("id", pokemon.id)
      .eq("owner_id", userId);

    return {
      ok: true as const,
      message: `${pokemon.nickname ?? pokemon.species_name} ma wpięty Kamień Mega.`,
      megaStone: data.itemKey,
    };
  });

/** Wyjmuje Kamień Mega ze slotu i zwraca go do ekwipunku. */
export const unequipMegaStone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pokemonId: string }) => {
    const pokemonId = String(input?.pokemonId ?? "");
    if (!pokemonId) throw new Error("Brak Pokémona.");
    return { pokemonId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await writeDb();

    const { data: pokemon } = await supabase
      .from("player_pokemon")
      .select("id, mega_stone")
      .eq("id", data.pokemonId)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!pokemon) return { ok: false as const, reason: "Nie znaleziono Twojego Pokémona." };
    if (!pokemon.mega_stone) return { ok: false as const, reason: "Slot Kamienia Mega jest pusty." };

    const { data: cleared } = await db
      .from("player_pokemon")
      .update({ mega_stone: null })
      .eq("id", pokemon.id)
      .eq("owner_id", userId)
      .eq("mega_stone", pokemon.mega_stone)
      .select("id")
      .maybeSingle();
    if (!cleared) return { ok: false as const, reason: "Kamień został już wyjęty." };

    await addItem(db, userId, pokemon.mega_stone);
    return { ok: true as const, message: "Kamień Mega wrócił do ekwipunku.", megaStone: null };
  });
