import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BALLS, HEAL_ITEMS, RAZZ, SHIELD_COST, SHIELD_HOURS, ballByKey, healByKey } from "@/lib/items";
import { TRAVEL_TICKET_PRICE } from "@/lib/travel";

/** Master Ball da się też kupić za monety — bardzo drogo. */
export const MASTER_BALL_CC = 2500;
export const MASTER_BALL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type Purchase = { field: string; unit: number; label: string };

function resolve(kind: string): Purchase | null {
  if (kind === "razz") {
    return { field: RAZZ.field, unit: RAZZ.price, label: RAZZ.label };
  }
  if (kind === "master") {
    return { field: "master_balls", unit: MASTER_BALL_CC, label: "Master Ball" };
  }
  if (kind === "travel_ticket") return { field: "travel_tickets", unit: TRAVEL_TICKET_PRICE, label: "Bilet Podróży" };
  const heal = healByKey(kind);
  if (heal) return { field: heal.field, unit: heal.price, label: heal.label };
  const ball = ballByKey(kind);
  if (!ball || ball.price === null) return null;
  return { field: ball.field, unit: ball.price, label: ball.label };
}

/** Kupno przedmiotów (Balle, Razz Berry) za Catch Coins. */
export const buyItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: string; amount: number }) => {
    const kind = String(input?.kind ?? "");
    const amount = Math.floor(Number(input?.amount ?? 1));
    if (![1, 5, 10].includes(amount)) throw new Error("Nieprawidłowa liczba sztuk.");
    if (!resolve(kind)) throw new Error("Tego przedmiotu nie ma w sprzedaży.");
    return { kind, amount };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const item = resolve(data.kind)!;
    const { data: profile } = await (supabase.from("profiles") as any)
      .select(`catch_coins, master_ball_bought_at, ${item.field}`)
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Nie znaleziono profilu trenera.");
    if (data.kind === "master" && profile.master_ball_bought_at) {
      const availableAt = new Date(profile.master_ball_bought_at).getTime() + MASTER_BALL_COOLDOWN_MS;
      if (availableAt > Date.now()) return { ok: false as const, reason: "Master Ball jest jeszcze objęty czasem odnowienia.", availableAt: new Date(availableAt).toISOString() };
    }
    const cost = item.unit * data.amount;
    if (profile.catch_coins < cost) {
      return {
        ok: false as const,
        reason: `Brakuje Catch Coins — potrzebujesz ${cost}, masz ${profile.catch_coins}.`,
      };
    }
    await (supabase.from("profiles") as any)
      .update({
        catch_coins: profile.catch_coins - cost,
        [item.field]: (profile[item.field] ?? 0) + data.amount,
        ...(data.kind === "master" ? { master_ball_bought_at: new Date().toISOString() } : {}),
      })
      .eq("id", userId);
    return { ok: true as const, cost, label: item.label, amount: data.amount };
  });

/** Tarcza BHP: 8 godzin ochrony przed napadami PvP za 100 Catch Coins. */
export const buyShield = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("catch_coins, shield_until")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Nie znaleziono profilu trenera.");
    if (profile.catch_coins < SHIELD_COST) {
      return { ok: false as const, reason: `Tarcza BHP kosztuje ${SHIELD_COST} Catch Coins.` };
    }
    const now = Date.now();
    const base = profile.shield_until ? new Date(profile.shield_until).getTime() : 0;
    const from = Math.max(now, base);
    const until = new Date(from + SHIELD_HOURS * 3600 * 1000).toISOString();
    await supabase
      .from("profiles")
      .update({ catch_coins: profile.catch_coins - SHIELD_COST, shield_until: until })
      .eq("id", userId);
    return { ok: true as const, until, cost: SHIELD_COST };
  });

export const BALL_CATALOG = BALLS;
export const HEAL_CATALOG = HEAL_ITEMS;
