import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  OAK_STAGES,
  generateDailyQuests,
  generateReplacementQuest,
  rewardItemLabel,
  type GeneratedQuest,
  type QuestDifficulty,
  type QuestType,
} from "@/lib/quests";
import { warsawClock } from "@/lib/time";

async function writeDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type QuestEvent = "catch" | "battle" | "steps" | "visit" | "find_item" | "evolve" | "shiny";

type QuestEventContext = {
  amount?: number;
  /** Biom, w którym doszło do zdarzenia (eksploracja). */
  biome?: string | null;
  /** Typ złapanego Pokémona — dla zadań „Specjalista”. */
  typeName?: string | null;
  /** Klucz celu dla badań Oaka (id gatunku, "bot", "exploration"). */
  targetKey?: string;
};

/** Które zadania dzienne reagują na dane zdarzenie. */
function questTypesForEvent(event: QuestEvent): QuestType[] {
  if (event === "catch") return ["catch", "catch_type"];
  if (event === "battle") return ["battle"];
  if (event === "steps") return ["steps"];
  if (event === "visit") return ["visit"];
  if (event === "find_item") return ["find_item"];
  if (event === "evolve") return ["evolve"];
  return ["shiny"];
}

/**
 * Jeden uniwersalny silnik zadań: przelicza postęp wszystkich aktywnych zadań dziennych
 * pasujących do zdarzenia oraz aktywnych badań Profesora Oaka.
 */
export async function emitQuestEvent(
  supabase: any,
  userId: string,
  event: QuestEvent,
  ctx: QuestEventContext = {},
): Promise<string[]> {
  const amount = ctx.amount ?? 1;
  const today = warsawClock().dateKey;
  const types = questTypesForEvent(event);
  const { data: quests } = await supabase
    .from("daily_quests")
    .select("id, quest_type, target_key, biome, progress, target, status, title")
    .eq("owner_id", userId)
    .eq("quest_date", today)
    .eq("status", "active")
    .in("quest_type", types);

  const completed: string[] = [];
  const db = await writeDb();
  for (const quest of quests ?? []) {
    if (quest.biome && ctx.biome && quest.biome !== ctx.biome) continue;
    if (quest.biome && !ctx.biome) continue;
    if (quest.quest_type === "catch_type" && quest.target_key && quest.target_key !== ctx.typeName) continue;
    const progress = Math.min(quest.target, quest.progress + amount);
    const done = progress >= quest.target;
    if (done) completed.push(String(quest.title ?? "Zadanie dzienne"));
    await db
      .from("daily_quests")
      .update({ progress, status: done ? "completed" : "active" })
      .eq("id", quest.id)
      .eq("owner_id", userId);
  }


  if (event !== "catch" && event !== "battle") return completed;
  const researchType = event === "catch" ? "catch_species" : "win_battles";
  const { data: research } = await supabase
    .from("oak_research")
    .select("id, target_key, progress, target, status")
    .eq("owner_id", userId)
    .eq("research_type", researchType)
    .eq("status", "active");
  for (const row of research ?? []) {
    if (row.target_key !== "any" && row.target_key !== (ctx.targetKey ?? "any")) continue;
    const progress = Math.min(row.target, row.progress + amount);
    const done = progress >= row.target;
    if (done) completed.push("Badanie Profesora Oaka");
    await db
      .from("oak_research")
      .update({ progress, status: done ? "completed" : "active" })
      .eq("id", row.id)
      .eq("owner_id", userId);
  }
  return completed;
}

/** Zgodność ze starymi wywołaniami (łapanie i walki). */
export async function progressActivities(
  supabase: any,
  userId: string,
  event: "catch" | "battle",
  amount = 1,
  targetKey = "any",
  extra: { biome?: string | null; typeName?: string | null } = {},
): Promise<string[]> {
  return emitQuestEvent(supabase, userId, event, { amount, targetKey, ...extra });
}


function questRow(userId: string, date: string, quest: GeneratedQuest) {
  return {
    owner_id: userId,
    quest_date: date,
    slot: quest.slot,
    quest_type: quest.quest_type,
    difficulty: quest.difficulty,
    target: quest.target,
    target_key: quest.target_key,
    biome: quest.biome,
    title: quest.title,
    description: quest.description,
    reward_coins: quest.reward_coins,
    reward_item_key: quest.reward_item_key,
    reward_item_quantity: quest.reward_item_quantity,
  };
}

async function buildState(supabase: any, userId: string) {
  const today = warsawClock().dateKey;
  const [{ data: profile }, { data: quests }, { data: research }, { data: day }] = await Promise.all([
    supabase.from("profiles").select("trainer_level, catch_coins, oak_stage, candy_normal").eq("id", userId).maybeSingle(),
    supabase.from("daily_quests").select("*").eq("owner_id", userId).eq("quest_date", today).order("slot"),
    supabase.from("oak_research").select("*").eq("owner_id", userId).order("stage", { ascending: false }).limit(1),
    supabase.from("daily_quest_days").select("reroll_used").eq("owner_id", userId).eq("quest_date", today).maybeSingle(),
  ]);
  if (!profile) throw new Error("Nie znaleziono profilu trenera.");
  return {
    date: today,
    trainer_level: profile.trainer_level,
    catch_coins: profile.catch_coins,
    candy_normal: profile.candy_normal,
    oak_stage: profile.oak_stage ?? 1,
    quests: quests ?? [],
    research: research?.[0] ?? null,
    day_started: Boolean(day),
    reroll_used: Boolean(day?.reroll_used),
  };
}

export const getQuestsState = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => buildState(context.supabase, context.userId));

/** Rozpoczyna zestaw dokładnie raz na polski dzień. */
export const startDailyQuestDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = warsawClock().dateKey;
    const db = await writeDb();
    const { data: reserved, error: reserveError } = await db
      .from("daily_quest_days")
      .insert({ owner_id: context.userId, quest_date: today })
      .select("id")
      .maybeSingle();
    if (reserveError || !reserved) {
      return { ok: false as const, reason: "Dzisiejszy zestaw został już rozpoczęty.", state: await buildState(context.supabase, context.userId) };
    }
    const quests = generateDailyQuests(`${context.userId}:${today}`);
    const { error: deleteError } = await db.from("daily_quests").delete().eq("owner_id", context.userId).eq("quest_date", today);
    const { error: insertError } = deleteError
      ? { error: deleteError }
      : await db.from("daily_quests").insert(quests.map((quest) => questRow(context.userId, today, quest)));
    if (insertError) {
      await db.from("daily_quest_days").delete().eq("id", reserved.id).eq("owner_id", context.userId);
      throw new Error("Nie udało się utworzyć dzisiejszych zadań.");
    }
    return { ok: true as const, state: await buildState(context.supabase, context.userId) };
  });

/** Jednorazowe przelosowanie konkretnego zadania (ta sama trudność, inne zadanie). */
export const rerollDailyQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("daily_quests")
      .select("id, slot, difficulty, quest_type, biome, target_key, status, rerolled, quest_date")
      .eq("id", data.id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!row) return { ok: false as const, reason: "Nie znaleziono zadania.", state: await buildState(supabase, userId) };
    if (row.status !== "active") return { ok: false as const, reason: "Ukończonego zadania nie można przelosować.", state: await buildState(supabase, userId) };
    const today = warsawClock().dateKey;
    if (row.quest_date !== today) return { ok: false as const, reason: "Można przelosować tylko dzisiejsze zadanie.", state: await buildState(supabase, userId) };
    const db = await writeDb();
    const { data: claimedReroll } = await db
      .from("daily_quest_days")
      .update({ reroll_used: true })
      .eq("owner_id", userId)
      .eq("quest_date", today)
      .eq("reroll_used", false)
      .select("id")
      .maybeSingle();
    if (!claimedReroll) return { ok: false as const, reason: "Dzisiejsze darmowe przelosowanie zostało już wykorzystane.", state: await buildState(supabase, userId) };
    const replacement = generateReplacementQuest(
      `${userId}:${row.quest_date}`,
      row.slot ?? 0,
      row.difficulty as QuestDifficulty,
      `${row.quest_type}:${row.biome ?? ""}:${row.target_key ?? ""}`,
    );
    await db
      .from("daily_quests")
      .update({ ...questRow(userId, row.quest_date, replacement), progress: 0, status: "active", rerolled: true })
      .eq("id", row.id)
      .eq("owner_id", userId);
    return { ok: true as const, state: await buildState(supabase, userId) };
  });

async function grantReward(supabase: any, userId: string, coins: number, item: string | null, quantity: number): Promise<string[]> {
  const fields = ["poke_balls", "great_balls", "ultra_balls", "energy_bottles"];
  const select = item && fields.includes(item) ? `catch_coins, ${item}` : "catch_coins";
  const { data: profile } = await supabase.from("profiles").select(select).eq("id", userId).maybeSingle();
  if (!profile) throw new Error("Nie znaleziono profilu.");
  const update: Record<string, number> = { catch_coins: profile.catch_coins + coins };
  if (item && fields.includes(item)) update[item] = (profile[item] ?? 0) + quantity;
  await (await writeDb()).from("profiles").update(update).eq("id", userId);
  const rewards: string[] = [];
  if (coins > 0) rewards.push(`${coins} Catch Coins`);
  if (item && fields.includes(item) && quantity > 0) rewards.push(`${quantity}× ${rewardItemLabel(item)}`);
  return rewards;
}

export const claimDailyQuest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") })).handler(async ({ data, context }) => {
  const { data: row } = await context.supabase.from("daily_quests").select("*").eq("id", data.id).eq("owner_id", context.userId).eq("status", "completed").maybeSingle();
  if (!row) return { ok: false as const, reason: "Nagroda nie jest jeszcze gotowa.", state: await buildState(context.supabase, context.userId) };
  // Znacznik "claimed" ustawiamy przed wypłatą, więc podwójne kliknięcie nie wypłaci nagrody dwa razy.
  const { data: locked } = await (await writeDb())
    .from("daily_quests")
    .update({ status: "claimed" })
    .eq("id", row.id)
    .eq("owner_id", context.userId)
    .eq("status", "completed")
    .select("id");
  if (!locked || locked.length === 0) return { ok: false as const, reason: "Nagroda została już odebrana.", state: await buildState(context.supabase, context.userId) };
  const rewards = await grantReward(context.supabase, context.userId, row.reward_coins, row.reward_item_key, row.reward_item_quantity);
  return { ok: true as const, rewards, state: await buildState(context.supabase, context.userId) };
});

export const startOakResearch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const state = await buildState(context.supabase, context.userId);
  const stage = OAK_STAGES.find((entry) => entry.stage === state.oak_stage);
  if (!stage) return { ok: false as const, reason: "Wszystkie dostępne badania są ukończone.", state };
  if (state.trainer_level < stage.level) return { ok: false as const, reason: `Badanie odblokuje się na poziomie trenera ${stage.level}.`, state };
  const { error } = await (await writeDb()).from("oak_research").insert({ owner_id: context.userId, stage: stage.stage, research_type: stage.type, target_key: stage.targetKey, target: stage.target, reward_coins: stage.coins, reward_item_key: stage.item, reward_item_quantity: stage.quantity, dialog_intro: stage.intro, dialog_complete: stage.complete });
  if (error) return { ok: false as const, reason: "Badanie jest już rozpoczęte.", state: await buildState(context.supabase, context.userId) };
  return { ok: true as const, state: await buildState(context.supabase, context.userId) };
});

export const claimOakResearch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const state = await buildState(context.supabase, context.userId);
  const row = state.research;
  if (!row || row.status !== "completed") return { ok: false as const, reason: "Badanie nie jest jeszcze ukończone.", state };
  const { data: locked } = await (await writeDb())
    .from("oak_research")
    .update({ status: "claimed" })
    .eq("id", row.id)
    .eq("owner_id", context.userId)
    .eq("status", "completed")
    .select("id");
  if (!locked || locked.length === 0) return { ok: false as const, reason: "Nagroda została już odebrana.", state: await buildState(context.supabase, context.userId) };
  if (row.research_type === "deliver_item") {
    if (state.candy_normal < row.target) {
      await (await writeDb()).from("oak_research").update({ status: "completed" }).eq("id", row.id).eq("owner_id", context.userId);
      return { ok: false as const, reason: "Nie masz wymaganych przedmiotów.", state };
    }
    await (await writeDb()).from("profiles").update({ candy_normal: state.candy_normal - row.target }).eq("id", context.userId);
  }
  const rewards = await grantReward(context.supabase, context.userId, row.reward_coins, row.reward_item_key, row.reward_item_quantity);
  if (row.research_type === "deliver_item") rewards.unshift(`oddano ${row.target}× Cukierek`);
  await (await writeDb()).from("profiles").update({ oak_stage: state.oak_stage + 1 }).eq("id", context.userId);
  return { ok: true as const, rewards, state: await buildState(context.supabase, context.userId) };
});
