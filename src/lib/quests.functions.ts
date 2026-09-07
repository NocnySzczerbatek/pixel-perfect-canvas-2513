import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OAK_STAGES, QUEST_PRESETS, type QuestDifficulty } from "@/lib/quests";
import { warsawClock } from "@/lib/time";

export async function progressActivities(supabase: any, userId: string, event: "catch" | "battle", amount = 1, targetKey = "any") {
  const today = warsawClock().dateKey;
  const { data: quests } = await supabase.from("daily_quests").select("id, quest_type, progress, target, status").eq("owner_id", userId).eq("quest_date", today).eq("quest_type", event).eq("status", "active");
  for (const quest of quests ?? []) {
    const progress = Math.min(quest.target, quest.progress + amount);
    await supabase.from("daily_quests").update({ progress, status: progress >= quest.target ? "completed" : "active" }).eq("id", quest.id).eq("owner_id", userId);
  }
  const researchType = event === "catch" ? "catch_species" : "win_battles";
  const { data: research } = await supabase.from("oak_research").select("id, target_key, progress, target, status").eq("owner_id", userId).eq("research_type", researchType).eq("status", "active");
  for (const row of research ?? []) {
    if (row.target_key !== "any" && row.target_key !== targetKey) continue;
    const progress = Math.min(row.target, row.progress + amount);
    await supabase.from("oak_research").update({ progress, status: progress >= row.target ? "completed" : "active" }).eq("id", row.id).eq("owner_id", userId);
  }
}

async function buildState(supabase: any, userId: string) {
  const today = warsawClock().dateKey;
  const [{ data: profile }, { data: quests }, { data: research }] = await Promise.all([
    supabase.from("profiles").select("trainer_level, catch_coins, oak_stage, candy_normal").eq("id", userId).maybeSingle(),
    supabase.from("daily_quests").select("*").eq("owner_id", userId).eq("quest_date", today).order("quest_type"),
    supabase.from("oak_research").select("*").eq("owner_id", userId).order("stage", { ascending: false }).limit(1),
  ]);
  if (!profile) throw new Error("Nie znaleziono profilu trenera.");
  return { date: today, trainer_level: profile.trainer_level, catch_coins: profile.catch_coins, candy_normal: profile.candy_normal, oak_stage: profile.oak_stage ?? 1, quests: quests ?? [], research: research?.[0] ?? null };
}

export const getQuestsState = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => buildState(context.supabase, context.userId));

export const chooseDailyQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { type: "catch" | "battle"; difficulty: QuestDifficulty }) => {
    if (!(["catch", "battle"] as string[]).includes(input?.type)) throw new Error("Nieznany typ zadania.");
    if (!(["easy", "medium", "hard"] as string[]).includes(input?.difficulty)) throw new Error("Nieznana trudność.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const preset = QUEST_PRESETS[data.difficulty];
    const date = warsawClock().dateKey;
    const { error } = await context.supabase.from("daily_quests").insert({ owner_id: context.userId, quest_date: date, quest_type: data.type, difficulty: data.difficulty, target: data.type === "catch" ? preset.catchTarget : preset.battleTarget, reward_coins: preset.coins, reward_item_key: preset.item, reward_item_quantity: preset.quantity });
    if (error) return { ok: false as const, reason: "Ten rodzaj zadania został już dziś wybrany.", state: await buildState(context.supabase, context.userId) };
    return { ok: true as const, state: await buildState(context.supabase, context.userId) };
  });

async function grantReward(supabase: any, userId: string, coins: number, item: string | null, quantity: number) {
  const fields = ["poke_balls", "great_balls", "ultra_balls", "energy_bottles"];
  const select = item && fields.includes(item) ? `catch_coins, ${item}` : "catch_coins";
  const { data: profile } = await supabase.from("profiles").select(select).eq("id", userId).maybeSingle();
  if (!profile) throw new Error("Nie znaleziono profilu.");
  const update: Record<string, number> = { catch_coins: profile.catch_coins + coins };
  if (item && fields.includes(item)) update[item] = (profile[item] ?? 0) + quantity;
  await supabase.from("profiles").update(update).eq("id", userId);
}

export const claimDailyQuest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") })).handler(async ({ data, context }) => {
  const { data: row } = await context.supabase.from("daily_quests").select("*").eq("id", data.id).eq("owner_id", context.userId).eq("status", "completed").maybeSingle();
  if (!row) return { ok: false as const, reason: "Nagroda nie jest jeszcze gotowa.", state: await buildState(context.supabase, context.userId) };
  await grantReward(context.supabase, context.userId, row.reward_coins, row.reward_item_key, row.reward_item_quantity);
  await context.supabase.from("daily_quests").update({ status: "claimed" }).eq("id", row.id).eq("owner_id", context.userId);
  return { ok: true as const, state: await buildState(context.supabase, context.userId) };
});

export const startOakResearch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const state = await buildState(context.supabase, context.userId);
  const stage = OAK_STAGES.find((entry) => entry.stage === state.oak_stage);
  if (!stage) return { ok: false as const, reason: "Wszystkie dostępne badania są ukończone.", state };
  if (state.trainer_level < stage.level) return { ok: false as const, reason: `Badanie odblokuje się na poziomie trenera ${stage.level}.`, state };
  const { error } = await context.supabase.from("oak_research").insert({ owner_id: context.userId, stage: stage.stage, research_type: stage.type, target_key: stage.targetKey, target: stage.target, reward_coins: stage.coins, reward_item_key: stage.item, reward_item_quantity: stage.quantity, dialog_intro: stage.intro, dialog_complete: stage.complete });
  if (error) return { ok: false as const, reason: "Badanie jest już rozpoczęte.", state: await buildState(context.supabase, context.userId) };
  return { ok: true as const, state: await buildState(context.supabase, context.userId) };
});

export const claimOakResearch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const state = await buildState(context.supabase, context.userId);
  const row = state.research;
  if (!row || row.status !== "completed") return { ok: false as const, reason: "Badanie nie jest jeszcze ukończone.", state };
  if (row.research_type === "deliver_item") {
    if (state.candy_normal < row.target) return { ok: false as const, reason: "Nie masz wymaganych przedmiotów.", state };
    await context.supabase.from("profiles").update({ candy_normal: state.candy_normal - row.target }).eq("id", context.userId);
  }
  await grantReward(context.supabase, context.userId, row.reward_coins, row.reward_item_key, row.reward_item_quantity);
  await context.supabase.from("oak_research").update({ status: "claimed" }).eq("id", row.id).eq("owner_id", context.userId);
  await context.supabase.from("profiles").update({ oak_stage: state.oak_stage + 1 }).eq("id", context.userId);
  return { ok: true as const, state: await buildState(context.supabase, context.userId) };
});