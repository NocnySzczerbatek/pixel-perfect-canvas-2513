/**
 * Bazar i aukcje przedmiotów między graczami.
 * Wszystkie zapisy są serwerowe: przedmiot schodzi z ekwipunku w momencie
 * wystawienia, monety licytującego są blokowane (escrow) i zwracane przy
 * przebiciu, a rozliczenie aukcji następuje po upływie 24 godzin.
 */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  AUCTION_HOURS,
  MARKET_FEE,
  MARKET_MAX_PRICE,
  MARKET_MIN_PRICE,
  MAX_ACTIVE_PER_PLAYER,
  describeMarketItem,
  minNextBid,
  payoutAfterFee,
} from "@/lib/market";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type MarketListing = {
  id: string;
  kind: "fixed" | "auction";
  item_key: string;
  label: string;
  sprite: string;
  note: string;
  quantity: number;
  price: number;
  current_bid: number | null;
  min_bid: number;
  ends_at: string | null;
  seller_id: string;
  seller_name: string;
  mine: boolean;
  i_lead: boolean;
  bids: number;
  can_cancel: boolean;
};

export type MarketState = {
  catch_coins: number;
  fee_percent: number;
  min_price: number;
  auction_hours: number;
  max_active: number;
  my_active: number;
  bazaar: MarketListing[];
  auctions: MarketListing[];
  mine: MarketListing[];
  sellable: { item_key: string; label: string; sprite: string; note: string; count: number }[];
};

/** +N sztuk przedmiotu w ekwipunku gracza. */
async function addItems(db: any, userId: string, itemKey: string, quantity: number) {
  const { data: row } = await db
    .from("player_items")
    .select("id, quantity")
    .eq("owner_id", userId)
    .eq("item_key", itemKey)
    .maybeSingle();
  if (row) {
    await db
      .from("player_items")
      .update({ quantity: row.quantity + quantity })
      .eq("id", row.id)
      .eq("owner_id", userId);
  } else {
    await db
      .from("player_items")
      .insert({ owner_id: userId, item_key: itemKey, quantity, metadata: {} });
  }
}

async function addCoins(db: any, userId: string, delta: number) {
  const { data: profile } = await db
    .from("profiles")
    .select("catch_coins")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return;
  await db
    .from("profiles")
    .update({ catch_coins: Math.max(0, profile.catch_coins + delta) })
    .eq("id", userId);
}

/** Rozlicza aukcje, którym upłynął czas: zwycięzca dostaje przedmiot, sprzedający monety. */
async function settleExpiredAuctions(db: any) {
  const nowIso = new Date().toISOString();
  const { data: due } = await db
    .from("item_listings")
    .select("*")
    .eq("kind", "auction")
    .eq("status", "active")
    .lte("ends_at", nowIso)
    .limit(25);

  for (const listing of (due ?? []) as any[]) {
    const won = Boolean(listing.current_bidder_id && listing.current_bid);
    const { data: closed } = await db
      .from("item_listings")
      .update({
        status: won ? "sold" : "expired",
        buyer_id: won ? listing.current_bidder_id : null,
        settled_at: nowIso,
      })
      .eq("id", listing.id)
      .eq("status", "active")
      .select("id");
    // Inna równoległa próba rozliczenia wygrała — nic nie robimy.
    if (!closed || closed.length === 0) continue;

    if (won) {
      await addItems(db, listing.current_bidder_id, listing.item_key, listing.quantity);
      const { payout } = payoutAfterFee(listing.current_bid as number);
      await addCoins(db, listing.seller_id, payout);
    } else {
      await addItems(db, listing.seller_id, listing.item_key, listing.quantity);
    }
  }
}

async function buildState(supabase: any, userId: string): Promise<MarketState> {
  const db = await writeDb();
  await settleExpiredAuctions(db);

  const [{ data: profile }, { data: rows }, { data: items }, { data: names }] = await Promise.all([
    supabase.from("profiles").select("catch_coins").eq("id", userId).maybeSingle(),
    supabase
      .from("item_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase.from("player_items").select("item_key, quantity").eq("owner_id", userId).gt("quantity", 0),
    db.rpc("public_trainers"),
  ]);
  if (!profile) throw new Error("Nie znaleziono profilu trenera.");

  const nameMap = new Map<string, string>(
    ((names ?? []) as any[]).map((p: any) => [p.id, p.trainer_name]),
  );

  const listingIds = ((rows ?? []) as any[]).map((r: any) => r.id);
  const bidCounts = new Map<string, number>();
  if (listingIds.length > 0) {
    const { data: bids } = await db.from("item_bids").select("listing_id").in("listing_id", listingIds);
    for (const bid of (bids ?? []) as any[]) {
      bidCounts.set(bid.listing_id, (bidCounts.get(bid.listing_id) ?? 0) + 1);
    }
  }

  const toListing = (row: any): MarketListing => {
    const info = describeMarketItem(row.item_key);
    const bids = bidCounts.get(row.id) ?? 0;
    return {
      id: row.id,
      kind: row.kind,
      item_key: row.item_key,
      label: info.label,
      sprite: info.sprite,
      note: info.note,
      quantity: row.quantity,
      price: row.price,
      current_bid: row.current_bid,
      min_bid: minNextBid(row.price, row.current_bid),
      ends_at: row.ends_at,
      seller_id: row.seller_id,
      seller_name: nameMap.get(row.seller_id) ?? "Trener",
      mine: row.seller_id === userId,
      i_lead: row.current_bidder_id === userId,
      bids,
      can_cancel: row.seller_id === userId && (row.kind === "fixed" || bids === 0),
    };
  };

  const all = ((rows ?? []) as any[]).map(toListing);

  return {
    catch_coins: profile.catch_coins,
    fee_percent: Math.round(MARKET_FEE * 100),
    min_price: MARKET_MIN_PRICE,
    auction_hours: AUCTION_HOURS,
    max_active: MAX_ACTIVE_PER_PLAYER,
    my_active: all.filter((l) => l.mine).length,
    bazaar: all.filter((l) => l.kind === "fixed" && !l.mine),
    auctions: all.filter((l) => l.kind === "auction" && !l.mine),
    mine: all.filter((l) => l.mine),
    sellable: ((items ?? []) as any[]).map((row: any) => {
      const info = describeMarketItem(row.item_key);
      return { item_key: row.item_key, count: row.quantity, ...info };
    }),
  };
}

/** Stan bazaru: oferty stałocenowe, aukcje, moje oferty i przedmioty do wystawienia. */
export const getMarketState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Wystawienie przedmiotu: na bazar za stałą cenę albo na aukcję (24 h). */
export const createItemListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemKey: string; quantity: number; price: number; kind: "fixed" | "auction" }) => {
    const itemKey = String(input?.itemKey ?? "");
    const kind = input?.kind === "auction" ? "auction" : "fixed";
    const quantity = Math.floor(Number(input?.quantity ?? 1));
    const price = Math.floor(Number(input?.price ?? 0));
    if (!itemKey) throw new Error("Brak przedmiotu.");
    if (quantity < 1 || quantity > 99) throw new Error("Ilość musi być od 1 do 99.");
    if (price < MARKET_MIN_PRICE || price > MARKET_MAX_PRICE) {
      throw new Error(`Cena musi być między ${MARKET_MIN_PRICE} a ${MARKET_MAX_PRICE} CC.`);
    }
    return { itemKey, quantity, price, kind };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await writeDb();

    const { data: row } = await supabase
      .from("player_items")
      .select("id, quantity")
      .eq("owner_id", userId)
      .eq("item_key", data.itemKey)
      .maybeSingle();
    if (!row || row.quantity < data.quantity) {
      return {
        ok: false as const,
        reason: "Nie masz tyle sztuk tego przedmiotu.",
        state: await buildState(supabase, userId),
      };
    }

    const { count } = await supabase
      .from("item_listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", userId)
      .eq("status", "active");
    if ((count ?? 0) >= MAX_ACTIVE_PER_PLAYER) {
      return {
        ok: false as const,
        reason: `Masz już ${MAX_ACTIVE_PER_PLAYER} aktywnych ofert — najpierw którąś wycofaj.`,
        state: await buildState(supabase, userId),
      };
    }

    // Przedmiot schodzi z ekwipunku od razu, żeby nie dało się sprzedać go dwa razy.
    const { data: taken } = await db
      .from("player_items")
      .update({ quantity: row.quantity - data.quantity })
      .eq("id", row.id)
      .eq("owner_id", userId)
      .eq("quantity", row.quantity)
      .select("id");
    if (!taken || taken.length === 0) {
      return {
        ok: false as const,
        reason: "Ekwipunek zmienił się w trakcie. Odśwież i spróbuj ponownie.",
        state: await buildState(supabase, userId),
      };
    }

    await db.from("item_listings").insert({
      seller_id: userId,
      kind: data.kind,
      item_key: data.itemKey,
      quantity: data.quantity,
      price: data.price,
      ends_at:
        data.kind === "auction"
          ? new Date(Date.now() + AUCTION_HOURS * 3600_000).toISOString()
          : null,
    });

    return { ok: true as const, state: await buildState(supabase, userId) };
  });

/** Wycofanie własnej oferty — aukcję tylko wtedy, gdy nikt nie licytował. */
export const cancelItemListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string }) => {
    if (!input?.listingId) throw new Error("Brak oferty.");
    return { listingId: String(input.listingId) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await writeDb();

    const { data: listing } = await db
      .from("item_listings")
      .select("*")
      .eq("id", data.listingId)
      .eq("seller_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (!listing) {
      return {
        ok: false as const,
        reason: "Nie znaleziono aktywnej oferty.",
        state: await buildState(supabase, userId),
      };
    }
    if (listing.kind === "auction" && listing.current_bidder_id) {
      return {
        ok: false as const,
        reason: "Aukcji z ofertą nie można wycofać — poczekaj na koniec licytacji.",
        state: await buildState(supabase, userId),
      };
    }

    const { data: closed } = await db
      .from("item_listings")
      .update({ status: "cancelled", settled_at: new Date().toISOString() })
      .eq("id", listing.id)
      .eq("status", "active")
      .select("id");
    if (closed && closed.length > 0) {
      await addItems(db, userId, listing.item_key, listing.quantity);
    }
    return { ok: true as const, state: await buildState(supabase, userId) };
  });

/** Zakup z bazaru po stałej cenie: sprzedający dostaje cenę minus 5% prowizji. */
export const buyItemListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string }) => {
    if (!input?.listingId) throw new Error("Brak oferty.");
    return { listingId: String(input.listingId) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await writeDb();

    const { data: listing } = await db
      .from("item_listings")
      .select("*")
      .eq("id", data.listingId)
      .eq("kind", "fixed")
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

    const { data: closed } = await db
      .from("item_listings")
      .update({ status: "sold", buyer_id: userId, settled_at: new Date().toISOString() })
      .eq("id", listing.id)
      .eq("status", "active")
      .select("id");
    if (!closed || closed.length === 0) {
      return {
        ok: false as const,
        reason: "Ktoś kupił to przed Tobą.",
        state: await buildState(supabase, userId),
      };
    }

    await db
      .from("profiles")
      .update({ catch_coins: buyer.catch_coins - listing.price })
      .eq("id", userId);
    const { fee, payout } = payoutAfterFee(listing.price);
    await addCoins(db, listing.seller_id, payout);
    await addItems(db, userId, listing.item_key, listing.quantity);

    const info = describeMarketItem(listing.item_key);
    return {
      ok: true as const,
      name: info.label,
      price: listing.price,
      fee,
      state: await buildState(supabase, userId),
    };
  });

/** Licytacja: monety są blokowane od razu, poprzedni licytujący dostaje zwrot. */
export const placeBid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { listingId: string; amount: number }) => {
    if (!input?.listingId) throw new Error("Brak aukcji.");
    const amount = Math.floor(Number(input?.amount ?? 0));
    if (amount < MARKET_MIN_PRICE || amount > MARKET_MAX_PRICE) {
      throw new Error(`Oferta musi być między ${MARKET_MIN_PRICE} a ${MARKET_MAX_PRICE} CC.`);
    }
    return { listingId: String(input.listingId), amount };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await writeDb();
    await settleExpiredAuctions(db);

    const { data: listing } = await db
      .from("item_listings")
      .select("*")
      .eq("id", data.listingId)
      .eq("kind", "auction")
      .eq("status", "active")
      .maybeSingle();
    if (!listing) {
      return {
        ok: false as const,
        reason: "Ta aukcja już się zakończyła.",
        state: await buildState(supabase, userId),
      };
    }
    if (listing.seller_id === userId) {
      return {
        ok: false as const,
        reason: "Nie możesz licytować własnej aukcji.",
        state: await buildState(supabase, userId),
      };
    }
    if (listing.current_bidder_id === userId) {
      return {
        ok: false as const,
        reason: "Już prowadzisz w tej aukcji.",
        state: await buildState(supabase, userId),
      };
    }
    const minimum = minNextBid(listing.price, listing.current_bid);
    if (data.amount < minimum) {
      return {
        ok: false as const,
        reason: `Minimalna oferta to ${minimum} CC.`,
        state: await buildState(supabase, userId),
      };
    }

    const { data: bidder } = await supabase
      .from("profiles")
      .select("catch_coins")
      .eq("id", userId)
      .maybeSingle();
    if (!bidder) throw new Error("Nie znaleziono profilu trenera.");
    if (bidder.catch_coins < data.amount) {
      return {
        ok: false as const,
        reason: "Nie masz tyle Catch Coins — przy licytacji monety są blokowane.",
        state: await buildState(supabase, userId),
      };
    }

    // Optimistyczna kontrola współbieżności: `is` przyjmuje tylko null/true/false,
    // więc przy istniejącej ofercie numerycznej używamy `eq`.
    let bidQuery = db
      .from("item_listings")
      .update({ current_bid: data.amount, current_bidder_id: userId })
      .eq("id", listing.id)
      .eq("status", "active");
    bidQuery =
      listing.current_bid === null
        ? bidQuery.is("current_bid", null)
        : bidQuery.eq("current_bid", listing.current_bid);
    const { data: updated } = await bidQuery.select("id");
    if (!updated || updated.length === 0) {
      return {
        ok: false as const,
        reason: "Ktoś przebił ofertę w tej samej chwili — spróbuj ponownie.",
        state: await buildState(supabase, userId),
      };
    }

    // Blokada monet licytującego i zwrot poprzedniemu prowadzącemu.
    await db
      .from("profiles")
      .update({ catch_coins: bidder.catch_coins - data.amount })
      .eq("id", userId);
    if (listing.current_bidder_id && listing.current_bid) {
      await addCoins(db, listing.current_bidder_id, listing.current_bid);
    }
    await db.from("item_bids").insert({
      listing_id: listing.id,
      bidder_id: userId,
      amount: data.amount,
    });

    return { ok: true as const, amount: data.amount, state: await buildState(supabase, userId) };
  });
