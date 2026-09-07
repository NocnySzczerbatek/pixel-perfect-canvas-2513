/** Postęp Pokédexu: co gracz spotkał i co złapał. */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { effectiveRegion } from "@/lib/travel";

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
      supabase.from("player_pokemon").select("species_id").eq("owner_id", userId),
      supabase.from("encounters").select("species_id").eq("owner_id", userId).not("species_id", "is", null),
    ]);

    const caughtIds = [...new Set((caught ?? []).map((row: { species_id: number }) => row.species_id))];
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
    };
  });
