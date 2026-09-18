import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPlayerStatistics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 91 * 86400000).toISOString();
    // Page through source rows rather than silently accepting the API row limit.
    async function collect<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
      const rows: T[] = [];
      for (let offset = 0; ; offset += 500) {
        const result = await page(offset, offset + 499);
        if (result.error) throw new Error("Nie udało się wczytać historii gracza.");
        rows.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 500) return rows;
      }
    }
    const [profile, encounters, trainers, pvp] = await Promise.all([
      supabase.from("profiles").select("trainer_level, trainer_exp, catch_coins").eq("id", userId).single(),
      collect((from, to) => supabase.from("encounters").select("id, kind, status, species_name, level, is_shiny, biome, hp_current, created_at, updated_at").eq("owner_id", userId).gte("created_at", since).order("created_at").order("id").range(from, to)),
      collect((from, to) => supabase.from("trainer_battles").select("id, opponent, won, reward_exp, reward_coins, created_at, log").eq("owner_id", userId).gte("created_at", since).order("created_at").order("id").range(from, to)),
      collect((from, to) => supabase.from("pvp_battles_log").select("id, winner_id, coins_stolen, created_at").or(`winner_id.eq.${userId},loser_id.eq.${userId}`).gte("created_at", since).order("created_at").order("id").range(from, to)),
    ]);
    if (profile.error) throw new Error("Nie udało się wczytać profilu.");
    return { profile: profile.data, encounters, trainers, pvp: pvp.map(row => ({ id: row.id, won: row.winner_id === userId, coins: row.coins_stolen * (row.winner_id === userId ? 1 : -1), created_at: row.created_at })), now: new Date().toISOString() };
  });
