/** Serwerowa logika Wydarzeń tygodnia. */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { grantTimedBuff } from "@/lib/bonuses.server";
import {
  eventForWeek,
  warsawWeekStart,
  weekEndIso,
  weekLabel,
  WEEKLY_EVENTS,
  type WeeklyEvent,
} from "@/lib/events";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type WeeklyEventState = {
  week_start: string;
  week_label: string;
  ends_at: string;
  event: WeeklyEvent;
  claimed: boolean;
  reward_text: string | null;
  upcoming: { week_start: string; week_label: string; name: string }[];
  history: { week_start: string; event_key: string; reward_text: string }[];
};

function nextWeeks(weekStart: string, count: number) {
  const out: { week_start: string; week_label: string; name: string }[] = [];
  for (let i = 1; i <= count; i += 1) {
    const date = new Date(`${weekStart}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 7 * i);
    const key = date.toISOString().slice(0, 10);
    out.push({ week_start: key, week_label: weekLabel(key), name: eventForWeek(key).name });
  }
  return out;
}

async function buildState(supabase: any, userId: string): Promise<WeeklyEventState> {
  const weekStart = warsawWeekStart();
  const [{ data: claim }, { data: history }] = await Promise.all([
    supabase
      .from("weekly_event_claims")
      .select("reward_text")
      .eq("owner_id", userId)
      .eq("week_start", weekStart)
      .maybeSingle(),
    supabase
      .from("weekly_event_claims")
      .select("week_start, event_key, reward_text")
      .eq("owner_id", userId)
      .order("week_start", { ascending: false })
      .limit(8),
  ]);

  return {
    week_start: weekStart,
    week_label: weekLabel(weekStart),
    ends_at: weekEndIso(weekStart),
    event: eventForWeek(weekStart),
    claimed: Boolean(claim),
    reward_text: (claim?.reward_text ?? null) as string | null,
    upcoming: nextWeeks(weekStart, 3),
    history: (history ?? []) as WeeklyEventState["history"],
  };
}

/** Aktualne wydarzenie tygodnia i stan odbioru nagrody. */
export const getWeeklyEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Przystąpienie do wydarzenia: raz w tygodniu nagroda i buff do końca tygodnia. */
export const joinWeeklyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const state = await buildState(supabase, userId);
    if (state.claimed) {
      return { ok: false as const, reason: "Nagrodę tego tygodnia już odebrałeś.", state };
    }

    const event = state.event;
    const rewardText = `+${event.coins} CC · ${event.bottles}× Flakon · +${event.shinyBonusPct}% Shiny, +${event.rareBonusPct}% rzadkość do końca tygodnia`;

    const db = await writeDb();
    const { error } = await db.from("weekly_event_claims").insert({
      owner_id: userId,
      week_start: state.week_start,
      event_key: event.key,
      reward_text: rewardText,
    });
    if (error) {
      return {
        ok: false as const,
        reason: "Nagrodę tego tygodnia już odebrałeś.",
        state: await buildState(supabase, userId),
      };
    }

    const { data: profile } = await db
      .from("profiles")
      .select("catch_coins, energy_bottles")
      .eq("id", userId)
      .maybeSingle();
    await db
      .from("profiles")
      .update({
        catch_coins: (profile?.catch_coins ?? 0) + event.coins,
        energy_bottles: (profile?.energy_bottles ?? 0) + event.bottles,
      })
      .eq("id", userId);

    const minutes = Math.max(
      30,
      Math.round((Date.parse(state.ends_at) - Date.now()) / 60_000),
    );
    await grantTimedBuff(userId, {
      key: `event_${state.week_start}`,
      label: `Wydarzenie: ${event.name}`,
      source: "Wydarzenie tygodnia",
      shiny_bonus_pct: event.shinyBonusPct,
      rare_bonus_pct: event.rareBonusPct,
      minutes,
    });

    return {
      ok: true as const,
      reward: rewardText,
      state: await buildState(supabase, userId),
    };
  });

export { WEEKLY_EVENTS };
