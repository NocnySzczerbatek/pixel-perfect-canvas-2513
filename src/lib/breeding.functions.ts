/** Serwerowa logika Hodowli: tworzenie jajek i wykluwanie Pokémonów. */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hpValue } from "@/lib/battle";
import { baseStats } from "@/lib/base-stats";
import {
  BREEDING_COST_COINS,
  BREEDING_HATCH_LEVEL,
  BREEDING_HATCH_MINUTES,
  BREEDING_INHERITED_STATS,
  BREEDING_MAX_ACTIVE_EGGS,
  BREEDING_MIN_LEVEL,
  IV_KEYS,
  eggIsReady,
  type BreedingEgg,
  type BreedingParent,
  type IvKey,
} from "@/lib/breeding";
import { NATURES, abilitiesFor, speciesType } from "@/lib/pokedex";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

export type BreedingState = {
  coins: number;
  cost: number;
  min_level: number;
  hatch_minutes: number;
  max_eggs: number;
  parents: BreedingParent[];
  eggs: BreedingEgg[];
};

const PARENT_COLUMNS =
  "id, species_id, species_name, level, is_shiny, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe";

async function buildState(supabase: any, userId: string): Promise<BreedingState> {
  const [{ data: profile }, { data: mons }, { data: eggs }] = await Promise.all([
    supabase.from("profiles").select("catch_coins").eq("id", userId).maybeSingle(),
    supabase
      .from("player_pokemon")
      .select(PARENT_COLUMNS)
      .eq("owner_id", userId)
      .gte("level", BREEDING_MIN_LEVEL)
      .order("level", { ascending: false })
      .limit(60),
    supabase
      .from("breeding_eggs")
      .select(
        "id, species_id, species_name, parent_a_name, parent_b_name, level, inherited, ready_at, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe",
      )
      .eq("owner_id", userId)
      .is("hatched_at", null)
      .order("ready_at", { ascending: true }),
  ]);

  return {
    coins: (profile?.catch_coins ?? 0) as number,
    cost: BREEDING_COST_COINS,
    min_level: BREEDING_MIN_LEVEL,
    hatch_minutes: BREEDING_HATCH_MINUTES,
    max_eggs: BREEDING_MAX_ACTIVE_EGGS,
    parents: (mons ?? []) as BreedingParent[],
    eggs: ((eggs ?? []) as any[]).map((egg) => ({
      ...egg,
      inherited: Array.isArray(egg.inherited) ? (egg.inherited as string[]) : [],
      ready: eggIsReady(egg.ready_at),
    })) as BreedingEgg[],
  };
}

/** Stan hodowli: kandydaci na rodziców i aktywne jajka. */
export const getBreedingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Tworzy jajko z dwóch Pokémonów gracza. */
export const createEgg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { parentA: string; parentB: string }) => ({
    parentA: String(input?.parentA ?? ""),
    parentB: String(input?.parentB ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.parentA || !data.parentB || data.parentA === data.parentB) {
      return {
        ok: false as const,
        reason: "Wybierz dwa różne Pokémony.",
        state: await buildState(supabase, userId),
      };
    }

    const state = await buildState(supabase, userId);
    const a = state.parents.find((mon) => mon.id === data.parentA);
    const b = state.parents.find((mon) => mon.id === data.parentB);
    if (!a || !b) {
      return {
        ok: false as const,
        reason: `Rodzice muszą mieć co najmniej ${BREEDING_MIN_LEVEL} poziom.`,
        state,
      };
    }
    if (state.eggs.length >= BREEDING_MAX_ACTIVE_EGGS) {
      return {
        ok: false as const,
        reason: `Masz już ${BREEDING_MAX_ACTIVE_EGGS} jajka — najpierw je wyklu.`,
        state,
      };
    }
    if (state.coins < BREEDING_COST_COINS) {
      return {
        ok: false as const,
        reason: `Potrzebujesz ${BREEDING_COST_COINS} CC na opiekę nad jajkiem.`,
        state,
      };
    }

    const db = await writeDb();
    const { data: paid } = await db
      .from("profiles")
      .update({ catch_coins: state.coins - BREEDING_COST_COINS })
      .eq("id", userId)
      .eq("catch_coins", state.coins)
      .select("id")
      .maybeSingle();
    if (!paid) {
      return {
        ok: false as const,
        reason: "Stan monet się zmienił — spróbuj ponownie.",
        state: await buildState(supabase, userId),
      };
    }

    const inherited = [...IV_KEYS].sort(() => Math.random() - 0.5).slice(0, BREEDING_INHERITED_STATS);
    const ivs = {} as Record<IvKey, number>;
    for (const key of IV_KEYS) {
      ivs[key] = inherited.includes(key) ? Math.max(a[key], b[key]) : randInt(0, 31);
    }

    const child = Math.random() < 0.5 ? a : b;
    const readyAt = new Date(Date.now() + BREEDING_HATCH_MINUTES * 60_000).toISOString();

    await db.from("breeding_eggs").insert({
      owner_id: userId,
      parent_a: a.id,
      parent_b: b.id,
      parent_a_name: a.species_name,
      parent_b_name: b.species_name,
      species_id: child.species_id,
      species_name: child.species_name,
      level: BREEDING_HATCH_LEVEL,
      nature: pick(NATURES),
      ability: pick(abilitiesFor(speciesType(child.species_id))),
      inherited,
      ready_at: readyAt,
      ...ivs,
    });

    return {
      ok: true as const,
      message: `Jajko ${child.species_name} w inkubatorze — wykluje się za ${BREEDING_HATCH_MINUTES} min.`,
      state: await buildState(supabase, userId),
    };
  });

/** Wykluwa gotowe jajko i dodaje Pokémona do kolekcji. */
export const hatchEgg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eggId: string }) => ({ eggId: String(input?.eggId ?? "") }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: egg } = await supabase
      .from("breeding_eggs")
      .select("*")
      .eq("id", data.eggId)
      .eq("owner_id", userId)
      .is("hatched_at", null)
      .maybeSingle();

    if (!egg) {
      return {
        ok: false as const,
        reason: "Nie znaleziono jajka.",
        state: await buildState(supabase, userId),
      };
    }
    if (!eggIsReady(egg.ready_at as string)) {
      return {
        ok: false as const,
        reason: "To jajko jeszcze się nie wykluło.",
        state: await buildState(supabase, userId),
      };
    }

    const db = await writeDb();
    const { data: closed } = await db
      .from("breeding_eggs")
      .update({ hatched_at: new Date().toISOString() })
      .eq("id", egg.id)
      .is("hatched_at", null)
      .select("id")
      .maybeSingle();
    if (!closed) {
      return {
        ok: false as const,
        reason: "To jajko już się wykluło.",
        state: await buildState(supabase, userId),
      };
    }

    const { count } = await supabase
      .from("player_pokemon")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("in_party", true);

    const level = (egg.level as number) ?? BREEDING_HATCH_LEVEL;
    const hpMax = hpValue(level, baseStats(egg.species_id as number)[0], egg.iv_hp as number);

    await db.from("player_pokemon").insert({
      owner_id: userId,
      species_id: egg.species_id,
      species_name: egg.species_name,
      level,
      hp_current: hpMax,
      hp_max: hpMax,
      in_party: (count ?? 0) < 6,
      nature: egg.nature,
      ability: egg.ability,
      friendship: 120,
      iv_hp: egg.iv_hp,
      iv_atk: egg.iv_atk,
      iv_def: egg.iv_def,
      iv_spa: egg.iv_spa,
      iv_spd: egg.iv_spd,
      iv_spe: egg.iv_spe,
    });

    return {
      ok: true as const,
      message: `Z jajka wykluł się ${egg.species_name} (poziom ${level})!`,
      state: await buildState(supabase, userId),
    };
  });
