/** Serwerowa logika Mistrzostwa regionu — postęp i odbiór nagród. */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { grantPermanentBonus } from "@/lib/bonuses.server";
import { REGIONS } from "@/lib/game-data";
import {
  MASTERY_REWARDS,
  MASTERY_TIERS,
  masteryBonusKey,
  masteryPercent,
  regionSpeciesPool,
  type MasteryRegionState,
} from "@/lib/mastery";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type MasteryState = {
  regions: MasteryRegionState[];
  home_region: string | null;
};

async function buildState(supabase: any, userId: string): Promise<MasteryState> {
  const [{ data: profile }, { data: caught }, { data: claims }] = await Promise.all([
    supabase.from("profiles").select("region").eq("id", userId).maybeSingle(),
    supabase.from("player_pokemon").select("species_id").eq("owner_id", userId),
    supabase.from("region_mastery_claims").select("region, tier").eq("owner_id", userId),
  ]);

  const caughtIds = new Set<number>((caught ?? []).map((row: any) => row.species_id as number));
  const claimed = new Set<string>(
    (claims ?? []).map((row: any) => `${row.region}:${row.tier}`),
  );

  return {
    home_region: (profile?.region ?? null) as string | null,
    regions: REGIONS.map((region) => {
      const pool = regionSpeciesPool(region.slug);
      const hit = pool.filter((id) => caughtIds.has(id)).length;
      const percent = masteryPercent(hit, pool.length);
      return {
        region: region.slug,
        name: region.name,
        total: pool.length,
        caught: hit,
        percent,
        tiers: MASTERY_TIERS.map((tier) => ({
          tier,
          reached: percent >= tier,
          claimed: claimed.has(`${region.slug}:${tier}`),
          reward: MASTERY_REWARDS[tier]!.label,
        })),
      };
    }),
  };
}

/** Postęp Mistrzostwa we wszystkich regionach. */
export const getMasteryState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Odbiór nagrody za osiągnięty próg Mistrzostwa (raz na region i próg). */
export const claimMastery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { region: string; tier: number }) => ({
    region: String(input?.region ?? ""),
    tier: Number(input?.tier ?? 0),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const state = await buildState(supabase, userId);
    const region = state.regions.find((entry) => entry.region === data.region);
    const reward = MASTERY_REWARDS[data.tier];
    const tier = region?.tiers.find((entry) => entry.tier === data.tier);

    if (!region || !reward || !tier) {
      return { ok: false as const, reason: "Nieznany próg Mistrzostwa.", state };
    }
    if (!tier.reached) {
      return {
        ok: false as const,
        reason: `Najpierw złap ${data.tier}% gatunków regionu ${region.name}.`,
        state,
      };
    }
    if (tier.claimed) {
      return { ok: false as const, reason: "Ta nagroda została już odebrana.", state };
    }

    const db = await writeDb();
    const { error } = await db.from("region_mastery_claims").insert({
      owner_id: userId,
      region: region.region,
      tier: data.tier,
      reward_text: reward.label,
    });
    if (error) {
      return {
        ok: false as const,
        reason: "Ta nagroda została już odebrana.",
        state: await buildState(supabase, userId),
      };
    }

    const { data: profileRow } = await db
      .from("profiles")
      .select("catch_coins, energy_bottles, mega_stones, travel_tickets")
      .eq("id", userId)
      .maybeSingle();

    await db
      .from("profiles")
      .update({
        catch_coins: (profileRow?.catch_coins ?? 0) + reward.coins,
        energy_bottles: (profileRow?.energy_bottles ?? 0) + reward.bottles,
        mega_stones: (profileRow?.mega_stones ?? 0) + reward.megaStones,
        travel_tickets: (profileRow?.travel_tickets ?? 0) + reward.travelTickets,
      })
      .eq("id", userId);

    if (reward.permanentBonus) {
      await grantPermanentBonus(
        userId,
        masteryBonusKey(region.region, data.tier),
        `Mistrzostwo ${region.name} ${data.tier}%`,
      );
    }

    return {
      ok: true as const,
      reward: reward.label,
      state: await buildState(supabase, userId),
    };
  });
