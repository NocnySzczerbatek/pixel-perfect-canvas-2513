import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REGIONS } from "@/lib/game-data";
import { TRAVEL_TICKET_PRICE, effectiveRegion, travelWindowState } from "@/lib/travel";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type RegionVisit = {
  region: string;
  visits: number;
  first_visit_at: string;
  last_visit_at: string;
};

async function buildTravelState(supabase: any, userId: string) {
  const [{ data: profile }, { data: visitRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("region, travel_tickets, travel_region, travel_until, catch_coins")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("region_visits")
      .select("region, visits, first_visit_at, last_visit_at")
      .eq("owner_id", userId),
  ]);
  if (!profile) throw new Error("Nie znaleziono profilu trenera.");
  const activeRegion = effectiveRegion(profile.region, profile.travel_region, profile.travel_until);
  if (profile.travel_region && activeRegion === profile.region) {
    await (await writeDb()).from("profiles").update({ travel_region: null, travel_until: null }).eq("id", userId);
  }
  return {
    home_region: profile.region,
    active_region: activeRegion,
    travel_region: activeRegion === profile.region ? null : activeRegion,
    travel_until: activeRegion === profile.region ? null : profile.travel_until,
    travel_tickets: profile.travel_tickets ?? 0,
    catch_coins: profile.catch_coins,
    ticket_price: TRAVEL_TICKET_PRICE,
    visits: ((visitRows ?? []) as any[]).map((row) => ({
      region: row.region,
      visits: row.visits,
      first_visit_at: row.first_visit_at,
      last_visit_at: row.last_visit_at,
    })) as RegionVisit[],
  };
}

/** Dziennik odwiedzin — pierwsza wizyta zostaje, kolejne podbijają licznik. */
async function recordVisit(userId: string, region: string) {
  const db = await writeDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("region_visits")
    .select("id, visits")
    .eq("owner_id", userId)
    .eq("region", region)
    .maybeSingle();
  if (existing) {
    await db
      .from("region_visits")
      .update({ visits: (existing.visits ?? 0) + 1, last_visit_at: now })
      .eq("id", existing.id);
    return;
  }
  await db.from("region_visits").insert({
    owner_id: userId,
    region,
    visits: 1,
    first_visit_at: now,
    last_visit_at: now,
  });
}


export const getTravelState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildTravelState(context.supabase, context.userId));

export const flyToRegion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { region: string }) => {
    const region = String(input?.region ?? "");
    if (!REGIONS.some((entry) => entry.slug === region)) throw new Error("Nieznany region.");
    return { region };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("region, travel_tickets, travel_region, travel_until")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Nie znaleziono profilu trenera.");
    if (profile.region === data.region) return { ok: false as const, reason: "To Twój region domowy.", state: await buildTravelState(supabase, userId) };
    if ((profile.travel_tickets ?? 0) < 1) return { ok: false as const, reason: "Potrzebujesz Biletu Podróży.", state: await buildTravelState(supabase, userId) };
    const window = travelWindowState(data.region);
    if (!window?.open) return { ok: false as const, reason: "Okno tego regionu jest teraz zamknięte.", state: await buildTravelState(supabase, userId) };
    const until = new Date(Date.now() + window.msUntilClose).toISOString();
    await (await writeDb()).from("profiles").update({
      travel_tickets: profile.travel_tickets - 1,
      travel_region: data.region,
      travel_until: until,
    }).eq("id", userId);
    await recordVisit(userId, data.region);
    return { ok: true as const, until, state: await buildTravelState(supabase, userId) };

  });