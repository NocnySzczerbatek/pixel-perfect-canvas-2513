import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, CheckCircle2, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { OAK_STAGES, QUEST_PRESETS, type QuestDifficulty } from "@/lib/quests";
import { chooseDailyQuest, claimDailyQuest, claimOakResearch, getQuestsState, startOakResearch } from "@/lib/quests.functions";

export const Route = createFileRoute("/zadania")({
  head: () => ({ meta: [
    { title: "Zadania i badania Oaka — Catch Zone" },
    { name: "description", content: "Wybieraj trudność zadań dziennych i prowadź badania Profesora Oaka." },
    { property: "og:title", content: "Zadania — Catch Zone" },
    { property: "og:description", content: "Dzienne wyzwania i badania Profesora Oaka z nagrodami." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ]}), component: QuestsPage,
});

function QuestsPage() {
  const fetchState = useServerFn(getQuestsState); const choose = useServerFn(chooseDailyQuest); const claim = useServerFn(claimDailyQuest); const startOak = useServerFn(startOakResearch); const claimOak = useServerFn(claimOakResearch);
  const [state, setState] = useState<Awaited<ReturnType<typeof getQuestsState>> | null>(null); const [busy, setBusy] = useState(false);
  const { isLoading } = useQuery({ queryKey: ["quests"], queryFn: async () => { const result = await fetchState(); setState(result); return result; } });
  const run = async (action: () => Promise<any>, success: string) => { setBusy(true); try { const result = await action(); if (result.state) setState(result.state); if (!result.ok) toast.error(result.reason); else toast.success(success); } catch (error) { toast.error(error instanceof Error ? error.message : "Nie udało się wykonać akcji."); } finally { setBusy(false); } };
  if (isLoading || !state) return <GamePage title="Zadania" subtitle="Wczytuję wyzwania…"><p className="text-sm text-muted-foreground">Chwila…</p></GamePage>;
  const activeTypes = new Set(state.quests.map((q: any) => q.quest_type)); const nextOak = OAK_STAGES.find((stage) => stage.stage === state.oak_stage);
  return <GamePage title="Zadania" subtitle={`Dzienny zestaw na ${state.date} według czasu polskiego.`}><div className="space-y-8">
    <section><h2 className="flex items-center gap-2 font-display text-2xl"><Target className="h-5 w-5" /> Zadania dzienne</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{(["catch", "battle"] as const).map((type) => { const quest = state.quests.find((q: any) => q.quest_type === type); return <div key={type} className="glass-panel rounded-2xl p-5"><h3 className="font-display text-xl">{type === "catch" ? "Łowca Pokémonów" : "Szlak wojownika"}</h3>{quest ? <><p className="mt-2 text-sm">Postęp: {quest.progress}/{quest.target}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-aurora" style={{ width: `${Math.min(100, quest.progress / quest.target * 100)}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">Nagroda: {quest.reward_coins} CC + {quest.reward_item_quantity} przedmioty</p>{quest.status === "completed" ? <Button className="mt-3" disabled={busy} onClick={() => void run(() => claim({ data: { id: quest.id } }), "Nagroda odebrana!")}><CheckCircle2 className="h-4 w-4" /> Odbierz</Button> : <p className="mt-3 text-xs text-muted-foreground">{quest.status === "claimed" ? "Nagroda odebrana" : "W trakcie"}</p>}</> : <div className="mt-4 flex flex-wrap gap-2">{(Object.keys(QUEST_PRESETS) as QuestDifficulty[]).map((difficulty) => <Button key={difficulty} size="sm" variant="outline" disabled={busy || activeTypes.has(type)} onClick={() => void run(() => choose({ data: { type, difficulty } }), "Zadanie rozpoczęte.")}>{QUEST_PRESETS[difficulty].label}</Button>)}</div>}</div>; })}</div></section>
    <section><h2 className="flex items-center gap-2 font-display text-2xl"><BookOpen className="h-5 w-5" /> Badania Profesora Oaka</h2><div className="glass-panel mt-4 grid gap-5 rounded-2xl p-5 sm:grid-cols-[96px_1fr]"><img src={oakPortrait.url} alt="Profesor Oak" width={192} height={192} className="h-24 w-24 rounded-xl object-cover" /><div>{state.research ? <><p className="text-sm">„{state.research.status === "completed" ? state.research.dialog_complete : state.research.dialog_intro}”</p><p className="mt-3 font-medium">Postęp: {state.research.progress}/{state.research.target}</p>{state.research.status === "completed" ? <Button className="mt-3" disabled={busy} onClick={() => void run(() => claimOak(), "Badanie ukończone, nagroda odebrana!")}>Odbierz nagrodę</Button> : null}</> : nextOak ? <><p className="text-sm">„{nextOak.intro}”</p><p className="mt-2 text-xs text-muted-foreground">Wymagany poziom trenera: {nextOak.level}</p><Button className="mt-3" disabled={busy || state.trainer_level < nextOak.level} onClick={() => void run(() => startOak(), "Profesor Oak rozpoczął nowe badanie.")}>Rozpocznij badanie</Button></> : <p>Ukończyłeś wszystkie dostępne badania.</p>}</div></div></section>
  </div></GamePage>;
}