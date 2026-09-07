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
  trainerName: z.string().min(1),
});

function validateTrainerName(name: string): { ok: true; name: string } | { ok: false; reason: string } {
  const trimmed = name.trim();
  if (trimmed.length < 3) return { ok: false, reason: "Nick musi mieć co najmniej 3 znaki." };
  if (trimmed.length > 20) return { ok: false, reason: "Nick może mieć maksymalnie 20 znaków." };
  if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    return { ok: false, reason: "Nick może zawierać tylko litery, cyfry, myślnik i podkreślenie." };
  }
  return { ok: true, name: trimmed };
}

export const createTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const region = findRegion(data.region);
    const starter = region?.starters.find((s) => s.id === data.starterId);
    if (!region || !starter) return { ok: false as const, reason: "Nieprawidłowy wybór startera." };

    const nameCheck = validateTrainerName(data.trainerName);
    if (!nameCheck.ok) return { ok: false as const, reason: nameCheck.reason };

    const db = await writeDb();
    const { data: existing } = await db
      .from("player_pokemon")
      .select("id")
      .eq("owner_id", context.userId)
      .limit(1);
    if (existing && existing.length > 0) {
      return { ok: false as const, reason: "Masz już swojego pierwszego Pokémona." };
    }

    const { data: nameTaken } = await db
      .from("profiles")
      .select("id")
      .eq("trainer_name", nameCheck.name)
      .limit(1);
    if (nameTaken && nameTaken.length > 0) {
      return { ok: false as const, reason: "Ten nick jest już zajęty. Wybierz inny." };
    }

    const { error: profileError } = await db.from("profiles").upsert(
      {
        id: context.userId,
        trainer_name: nameCheck.name,
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
