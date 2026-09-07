/** Tworzenie trenera i zakończenie samouczka — wyłącznie po stronie serwera. */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REGIONS, findRegion } from "@/lib/game-data";
import { NATURES, abilitiesFor } from "@/lib/pokedex";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const schema = z.object({
  region: z.enum(REGIONS.map((r) => r.slug) as [string, ...string[]]),
  starterId: z.number().int().positive(),
});

export const createTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const region = findRegion(data.region);
    const starter = region?.starters.find((s) => s.id === data.starterId);
    if (!region || !starter) return { ok: false as const, reason: "Nieprawidłowy wybór startera." };

    const db = await writeDb();
    const { data: existing } = await db
      .from("player_pokemon")
      .select("id")
      .eq("owner_id", context.userId)
      .limit(1);
    if (existing && existing.length > 0) {
      return { ok: false as const, reason: "Masz już swojego pierwszego Pokémona." };
    }

    const claims = context.claims as Record<string, any> | undefined;
    const base =
      (claims?.["user_metadata"]?.["full_name"] as string | undefined)?.split(" ")[0] ??
      (claims?.["email"] as string | undefined)?.split("@")[0] ??
      "Trener";
    const trainerName = `${base.slice(0, 14)}-${context.userId.slice(0, 4)}`;

    const { error: profileError } = await db.from("profiles").upsert(
      {
        id: context.userId,
        trainer_name: trainerName,
        region: region.slug,
        featured_badge: `${region.slug}_champion`,
      },
      { onConflict: "id" },
    );
    if (profileError) return { ok: false as const, reason: "Nie udało się zapisać profilu trenera." };

    const iv = () => Math.floor(Math.random() * 32);
    const ivHp = iv();
    const hp = 20 + 5 * 4 + Math.round(ivHp * 0.8);
    const abilities = abilitiesFor(starter.type);
    const { error: pokemonError } = await db.from("player_pokemon").insert({
      owner_id: context.userId,
      species_id: starter.id,
      species_name: starter.name,
      level: 5,
      hp_current: hp,
      hp_max: hp,
      is_starter: true,
      iv_hp: ivHp,
      iv_atk: iv(),
      iv_def: iv(),
      iv_spa: iv(),
      iv_spd: iv(),
      iv_spe: iv(),
      nature: NATURES[Math.floor(Math.random() * NATURES.length)] ?? "Hardy",
      ability: abilities[Math.floor(Math.random() * abilities.length)] ?? "Adaptability",
    });
    if (pokemonError) return { ok: false as const, reason: "Nie udało się przypisać startera." };

    return { ok: true as const };
  });

export const completeTutorial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await writeDb();
    const { data: profile } = await db
      .from("profiles")
      .select("tutorial_completed, trainer_level")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile) return { ok: false as const, reason: "Nie znaleziono profilu trenera." };
    if (profile.tutorial_completed) return { ok: true as const };
    await db
      .from("profiles")
      .update({ tutorial_completed: true, trainer_level: Math.max(2, profile.trainer_level ?? 1) })
      .eq("id", context.userId);
    return { ok: true as const };
  });
