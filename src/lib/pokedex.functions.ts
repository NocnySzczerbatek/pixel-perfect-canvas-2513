/** Postęp Pokédexu: co gracz spotkał, co złapał i jakie ma okazy. */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ivPercent } from "@/lib/iv";
import { effectiveRegion } from "@/lib/travel";

export type DexOwnedEntry = {
  speciesId: number;
  count: number;
  shiny: boolean;
  bestIv: number;
  maxLevel: number;
  firstCaughtAt: string;
};

export const pokedexProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: caught }, { data: seen }] = await Promise.all([
      supabase
        .from("profiles")
        .select("region, travel_region, travel_until")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("player_pokemon")
        .select(
          "species_id, level, is_shiny, caught_at, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe",
        )
        .eq("owner_id", userId),
      supabase.from("encounters").select("species_id").eq("owner_id", userId).not("species_id", "is", null),
    ]);

    const ownedMap = new Map<number, DexOwnedEntry>();
    for (const row of caught ?? []) {
      const id = row.species_id as number;
      const pct = ivPercent(row as any);
      const existing = ownedMap.get(id);
      if (!existing) {
        ownedMap.set(id, {
          speciesId: id,
          count: 1,
          shiny: Boolean(row.is_shiny),
          bestIv: pct,
          maxLevel: row.level as number,
          firstCaughtAt: row.caught_at as string,
        });
        continue;
      }
      existing.count += 1;
      existing.shiny = existing.shiny || Boolean(row.is_shiny);
      existing.bestIv = Math.max(existing.bestIv, pct);
      existing.maxLevel = Math.max(existing.maxLevel, row.level as number);
      if (new Date(row.caught_at as string) < new Date(existing.firstCaughtAt)) {
        existing.firstCaughtAt = row.caught_at as string;
      }
    }

    const caughtIds = [...ownedMap.keys()];
    const seenIds = [
      ...new Set([
        ...caughtIds,
        ...(seen ?? [])
          .map((row: { species_id: number | null }) => row.species_id)
          .filter((id): id is number => typeof id === "number"),
      ]),
    ];

    return {
      homeRegion: (profile?.region ?? null) as string | null,
      region: effectiveRegion(profile?.region ?? null, profile?.travel_region ?? null, profile?.travel_until ?? null),
      caughtIds,
      seenIds,
      owned: [...ownedMap.values()],
    };
  });
