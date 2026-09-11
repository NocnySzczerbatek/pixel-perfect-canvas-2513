import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, CalendarPlus, CheckCircle2, Dices, MapPin, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import oakPortrait from "@/assets/pixel/profesor-oak.png";
import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { findBiome } from "@/lib/biomes";
import {
  DIFFICULTIES,
  DIFFICULTY_INFO,
  OAK_INFO,
  OAK_STAGES,
  QUEST_PRESETS,
  QUEST_TYPE_LABELS,
  rewardItemLabel,
  type QuestDifficulty,
  type QuestType,
} from "@/lib/quests";
import { claimDailyQuest, claimOakResearch, getQuestsState, rerollDailyQuest, startDailyQuestDay, startOakResearch } from "@/lib/quests.functions";

export const Route = createFileRoute("/zadania")({
  head: () => ({ meta: [
    { title: "Zadania i badania Oaka — Catch Zone" },
    { name: "description", content: "9 zadań dziennych w trzech poziomach trudności, jedno wspólne przelosowanie i badania Profesora Oaka." },
    { property: "og:title", content: "Zadania — Catch Zone" },
    { property: "og:description", content: "Dzienne wyzwania, przelosowanie zadań i badania Profesora Oaka z nagrodami." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ]}), component: QuestsPage,
});

type QuestRow = {
  id: string;
  slot: number | null;
  quest_type: QuestType;
  difficulty: QuestDifficulty;
  title: string | null;
  description: string | null;
  biome: string | null;
  target: number;
  progress: number;
  status: string;
  rerolled: boolean;
  reward_coins: number;
  reward_item_key: string | null;
  reward_item_quantity: number;
};

const DIFFICULTY_DOT: Record<QuestDifficulty, string> = { easy: "🟢", medium: "🔵", hard: "🔴" };

function QuestsPage() {
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const fetchState = useServerFn(getQuestsState);
  const claim = useServerFn(claimDailyQuest);
  const reroll = useServerFn(rerollDailyQuest);
  const startDay = useServerFn(startDailyQuestDay);
  const startOak = useServerFn(startOakResearch);
  const claimOak = useServerFn(claimOakResearch);
  const [state, setState] = useState<Awaited<ReturnType<typeof getQuestsState>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<QuestDifficulty>("easy");
  // Zadania wymagają zalogowania — bez sesji nie wołamy serwera (brak nagłówka autoryzacji).
  const { isLoading } = useQuery({
    queryKey: ["quests"],
    enabled: !sessionLoading && Boolean(session),
    queryFn: async () => { const result = await fetchState(); setState(result); return result; },
  });

  useEffect(() => {
    if (!sessionLoading && !session) void navigate({ to: "/" });
  }, [sessionLoading, session, navigate]);

  if (!sessionLoading && !session) {
    return <GamePage title="Zadania" subtitle="Zaloguj się, aby zobaczyć zadania."><p className="text-sm text-muted-foreground">Przenoszę na stronę główną…</p></GamePage>;
  }

  const run = async (action: () => Promise<any>, success: string) => {
    setBusy(true);
    try {
      const result = await action();
      if (result.state) setState(result.state);
      if (!result.ok) toast.error(result.reason);
      else toast.success(success, result.rewards?.length ? { description: `Otrzymujesz: ${result.rewards.join(", ")}.` } : undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się wykonać akcji.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !state) {
    return <GamePage title="Zadania" subtitle="Wczytuję wyzwania…"><p className="text-sm text-muted-foreground">Chwila…</p></GamePage>;
  }

  const quests = (state.quests as unknown as QuestRow[]).filter((quest) => quest.difficulty === tab);
  const nextOak = OAK_STAGES.find((stage) => stage.stage === state.oak_stage);
  const doneCount = (state.quests as unknown as QuestRow[]).filter((q) => q.status === "claimed").length;

  return (
    <GamePage title="Zadania" subtitle={`Dzienny zestaw na ${state.date} według czasu polskiego · odebrane: ${doneCount}/${state.quests.length}`}>
      <div className="space-y-8">
        <section>
          <h2 className="flex items-center gap-2 font-display text-2xl"><Target className="h-5 w-5" /> Zadania dzienne</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Codziennie czeka 9 zadań — po 3 łatwe, średnie i trudne. Postęp zapisuje się sam podczas gry
            (łapanie, walki, kroki, lokacje, znaleziska, ewolucje, Shiny), a nagrodę odbierasz przyciskiem.
            Masz jedno darmowe przelosowanie na cały zestaw. Nowy dzień zaczyna się o 24:00 czasu polskiego.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button disabled={busy || state.day_started} onClick={() => void run(() => startDay(), "Dzisiejszy zestaw jest gotowy!")}>
              <CalendarPlus /> {state.day_started ? "Dzisiejszy dzień rozpoczęty" : "Rozpocznij nowy dzień"}
            </Button>
            <span className="text-xs text-muted-foreground">Darmowe przelosowanie: {state.reroll_used ? "wykorzystane" : "dostępne"}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {DIFFICULTIES.map((difficulty) => (
              <Button key={difficulty} size="sm" variant={tab === difficulty ? "default" : "outline"} onClick={() => setTab(difficulty)}>
                {DIFFICULTY_DOT[difficulty]} {QUEST_PRESETS[difficulty].label}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{DIFFICULTY_INFO[tab]}</p>
          {!state.day_started ? <p className="mt-6 text-sm text-muted-foreground">Rozpocznij nowy dzień, aby otrzymać zestaw zadań.</p> : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {quests.map((quest) => {
              const biome = quest.biome ? findBiome(quest.biome) : null;
              const percent = Math.min(100, (quest.progress / Math.max(1, quest.target)) * 100);
              return (
                <div key={quest.id} className="glass-panel flex flex-col gap-2 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg">{quest.title ?? QUEST_TYPE_LABELS[quest.quest_type]}</h3>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {QUEST_TYPE_LABELS[quest.quest_type]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{quest.description}</p>
                  <p className="text-sm">Postęp: {quest.progress}/{quest.target}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-aurora" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nagroda: {quest.reward_coins} CC + {quest.reward_item_quantity}× {rewardItemLabel(quest.reward_item_key)}
                  </p>
                  {biome ? (
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link to="/eksploracja" search={{ biome: biome.slug }}>
                        <MapPin className="h-4 w-4" /> Udaj się do lokacji: {biome.name}
                      </Link>
                    </Button>
                  ) : null}
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {quest.status === "completed" ? (
                      <Button size="sm" disabled={busy} onClick={() => void run(() => claim({ data: { id: quest.id } }), "Nagroda odebrana!")}>
                        <CheckCircle2 className="h-4 w-4" /> Odbierz
                      </Button>
                    ) : quest.status === "claimed" ? (
                      <span className="text-xs text-muted-foreground">Nagroda odebrana</span>
                    ) : (
                      <Button size="sm" variant="outline" disabled={busy || state.reroll_used} onClick={() => void run(() => reroll({ data: { id: quest.id } }), "Zadanie przelosowane.")}>
                        <Dices className="h-4 w-4" /> {state.reroll_used ? "Przelosowanie wykorzystane" : "Losuj ponownie"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-display text-2xl"><BookOpen className="h-5 w-5" /> Badania Profesora Oaka</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{OAK_INFO}</p>
          <div className="glass-panel mt-4 grid gap-5 rounded-2xl p-5 sm:grid-cols-[96px_1fr]">
            <img src={oakPortrait} alt="Profesor Oak" width={192} height={192} className="h-24 w-24 rounded-xl object-cover" />
            <div>
              {state.research ? (
                <>
                  <p className="text-sm">„{state.research.status === "completed" ? state.research.dialog_complete : state.research.dialog_intro}”</p>
                  <p className="mt-3 font-medium">Postęp: {state.research.progress}/{state.research.target}</p>
                  {state.research.status === "completed" ? (
                    <Button className="mt-3" disabled={busy} onClick={() => void run(() => claimOak(), "Badanie ukończone, nagroda odebrana!")}>Odbierz nagrodę</Button>
                  ) : null}
                </>
              ) : nextOak ? (
                <>
                  <p className="text-sm">„{nextOak.intro}”</p>
                  <p className="mt-2 text-xs text-muted-foreground">Poziom badań: {nextOak.stage} · wymagany poziom trenera: {nextOak.level}</p>
                  <Button className="mt-3" disabled={busy || state.trainer_level < nextOak.level} onClick={() => void run(() => startOak(), "Profesor Oak rozpoczął nowe badanie.")}>
                    {state.trainer_level < nextOak.level ? `Zablokowane — poziom ${nextOak.level}` : "Rozpocznij badanie"}
                  </Button>
                </>
              ) : (
                <p>Ukończyłeś wszystkie dostępne badania.</p>
              )}
            </div>
          </div>

          <h3 className="mt-6 font-display text-lg">Wszystkie etapy badań ({OAK_STAGES.length})</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Etapy odblokowują się kolejno wraz z poziomem trenera (masz poziom {state.trainer_level}).
          </p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {OAK_STAGES.map((stage) => {
              const done = stage.stage < state.oak_stage;
              const current = stage.stage === state.oak_stage;
              const locked = current ? state.trainer_level < stage.level : !done;
              return (
                <li key={stage.stage} className={`rounded-2xl border p-3 text-sm ${done ? "border-aurora/50" : current && !locked ? "border-border" : "border-border/40 opacity-70"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Etap {stage.stage}</span>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {done ? "Ukończone" : locked ? `Poziom ${stage.level}` : "Dostępne"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stage.type === "catch_species" ? `Złap ${stage.target} Pokémonów` : stage.type === "win_battles" ? `Wygraj ${stage.target} walk` : `Dostarcz ${stage.target}× Cukierek`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nagroda: {stage.coins} CC + {stage.quantity}× {rewardItemLabel(stage.item)}
                  </p>
                  {!done && !locked ? <p className="mt-1 text-xs">„{stage.intro}”</p> : null}
                </li>
              );
            })}
          </ol>
        </section>

      </div>
    </GamePage>
  );
}
