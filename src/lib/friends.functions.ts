/** Serwerowa logika Znajomych: szukanie trenerów, zaproszenia i lista znajomych. */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type FriendTrainer = {
  id: string;
  trainer_name: string;
  trainer_level: number;
  region: string | null;
};

export type FriendsState = {
  friends: FriendTrainer[];
  incoming: (FriendTrainer & { request_id: string })[];
  outgoing: (FriendTrainer & { request_id: string })[];
};

async function buildState(supabase: any, userId: string): Promise<FriendsState> {
  const { data: rows } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(200);

  const links = (rows ?? []) as any[];
  const otherIds = [
    ...new Set(
      links.map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id)),
    ),
  ];

  const trainers = new Map<string, FriendTrainer>();
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase.rpc("public_trainers");
    for (const row of (profiles ?? []) as any[]) {
      if (otherIds.includes(row.id)) {
        trainers.set(row.id, {
          id: row.id,
          trainer_name: row.trainer_name,
          trainer_level: row.trainer_level,
          region: row.region ?? null,
        });
      }
    }
  }

  const state: FriendsState = { friends: [], incoming: [], outgoing: [] };
  for (const row of links) {
    const otherId = row.requester_id === userId ? row.addressee_id : row.requester_id;
    const trainer = trainers.get(otherId);
    if (!trainer) continue;
    if (row.status === "accepted") state.friends.push(trainer);
    else if (row.status === "pending" && row.addressee_id === userId) {
      state.incoming.push({ ...trainer, request_id: row.id });
    } else if (row.status === "pending") {
      state.outgoing.push({ ...trainer, request_id: row.id });
    }
  }
  return state;
}

/** Znajomi oraz zaproszenia przychodzące i wysłane. */
export const getFriendsState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Wyszukiwanie trenerów po nazwie (bez własnego konta). */
export const searchTrainers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => ({ query: String(input?.query ?? "").trim() }))
  .handler(async ({ data, context }) => {
    if (data.query.length < 2) return { trainers: [] as FriendTrainer[] };
    const { data: rows } = await context.supabase.rpc("public_trainers");
    const needle = data.query.toLowerCase();
    const trainers = ((rows ?? []) as any[])
      .filter(
        (row) =>
          row.id !== context.userId &&
          String(row.trainer_name ?? "").toLowerCase().includes(needle),
      )
      .slice(0, 20)
      .map((row) => ({
        id: row.id as string,
        trainer_name: row.trainer_name as string,
        trainer_level: row.trainer_level as number,
        region: (row.region ?? null) as string | null,
      }));
    return { trainers };
  });

/** Wysyła zaproszenie do znajomych. */
export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { trainerId: string }) => ({
    trainerId: String(input?.trainerId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.trainerId || data.trainerId === userId) {
      return {
        ok: false as const,
        reason: "Nieprawidłowy trener.",
        state: await buildState(supabase, userId),
      };
    }

    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status, requester_id")
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${data.trainerId}),and(requester_id.eq.${data.trainerId},addressee_id.eq.${userId})`,
      )
      .maybeSingle();

    const db = await writeDb();
    if (existing) {
      if (existing.status === "accepted") {
        return {
          ok: false as const,
          reason: "Ten trener jest już Twoim znajomym.",
          state: await buildState(supabase, userId),
        };
      }
      if (existing.requester_id === data.trainerId) {
        await db.from("friendships").update({ status: "accepted" }).eq("id", existing.id);
        return {
          ok: true as const,
          message: "Zaproszenie przyjęte — macie się nawzajem na liście.",
          state: await buildState(supabase, userId),
        };
      }
      return {
        ok: false as const,
        reason: "Zaproszenie już wysłane.",
        state: await buildState(supabase, userId),
      };
    }

    await db
      .from("friendships")
      .insert({ requester_id: userId, addressee_id: data.trainerId, status: "pending" });
    return {
      ok: true as const,
      message: "Zaproszenie wysłane.",
      state: await buildState(supabase, userId),
    };
  });

/** Odpowiedź na zaproszenie: przyjęcie lub odrzucenie. */
export const respondFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { requestId: string; accept: boolean }) => ({
    requestId: String(input?.requestId ?? ""),
    accept: Boolean(input?.accept),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("friendships")
      .select("id, addressee_id, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!row || row.addressee_id !== userId || row.status !== "pending") {
      return {
        ok: false as const,
        reason: "Nie ma takiego zaproszenia.",
        state: await buildState(supabase, userId),
      };
    }
    const db = await writeDb();
    if (data.accept) {
      await db.from("friendships").update({ status: "accepted" }).eq("id", row.id);
    } else {
      await db.from("friendships").update({ status: "declined" }).eq("id", row.id);
    }
    return {
      ok: true as const,
      message: data.accept ? "Macie się na liście znajomych." : "Zaproszenie odrzucone.",
      state: await buildState(supabase, userId),
    };
  });

/** Usuwa znajomego z listy. */
export const removeFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { trainerId: string }) => ({
    trainerId: String(input?.trainerId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const db = await writeDb();
    await db
      .from("friendships")
      .update({ status: "removed" })
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${data.trainerId}),and(requester_id.eq.${data.trainerId},addressee_id.eq.${userId})`,
      );
    return {
      ok: true as const,
      message: "Znajomy usunięty z listy.",
      state: await buildState(supabase, userId),
    };
  });
