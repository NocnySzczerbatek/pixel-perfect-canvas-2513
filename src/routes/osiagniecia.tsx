import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, Gift, Sparkles, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import {
  claimAchievement,
  claimDailyLogin,
  getAchievementsState,
  type AchievementsState,
} from "@/lib/achievements.functions";
import { LOGIN_REWARDS } from "@/lib/achievements";

export const Route = createFileRoute("/osiagniecia")({
  head: () => ({
    meta: [
      { title: "Osiągnięcia i codzienna nagroda — Catch Zone" },
      {
        name: "description",
        content:
          "Odbieraj nagrody za codzienne logowanie i zdobywaj osiągnięcia za łapanie, walki, Shiny i odznaki.",
      },
      { property: "og:title", content: "Osiągnięcia — Catch Zone" },
      {
        property: "og:description",
        content: "Seria logowań 1–7 dni i osiągnięcia z trwałymi bonusami.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AchievementsPage,
});

const CATEGORIES = ["Wszystkie", "Łapanie", "Kolekcja", "Shiny", "Walka", "Sale", "Liga", "Eksploracja"];

function AchievementsPage() {
  const fetchState = useServerFn(getAchievementsState);
  const claim = useServerFn(claimAchievement);
  const claimLogin = useServerFn(claimDailyLogin);
  const [state, setState] = useState<AchievementsState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [category, setCategory] = useState("Wszystkie");

  const query = useQuery({
    queryKey: ["achievements"],
    queryFn: () => fetchState({}),
  });

  useEffect(() => {
    if (query.data) setState(query.data as AchievementsState);
  }, [query.data]);

  const list = (state?.achievements ?? []).filter(
    (item) => category === "Wszystkie" || item.category === category,
  );
  const doneCount = (state?.achievements ?? []).filter((item) => item.claimed).length;

  async function handleClaim(key: string) {
    setBusy(key);
    try {
      const result = await claim({ data: { key } });
      setState(result.state as AchievementsState);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się odebrać nagrody.");
    } finally {
      setBusy(null);
    }
  }

  async function handleLogin() {
    setBusy("login");
    try {
      const result = await claimLogin({});
      setState(result.state as AchievementsState);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się odebrać nagrody.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <GamePage
      title="Osiągnięcia"
      subtitle="Codzienna nagroda za logowanie i trwałe bonusy za kamienie milowe."
    >
      <section className="rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarCheck className="h-5 w-5 text-primary" /> Codzienne logowanie
          </h2>
          <p className="text-sm text-muted-foreground">
            Seria: {state?.login.streak ?? 0} dni · rekord: {state?.login.best_streak ?? 0}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {LOGIN_REWARDS.map((reward) => {
            const current = state?.login.day === reward.day;
            const collected =
              !!state && ((state.login.streak - 1) % 7) + 1 >= reward.day && state.login.claimed_today;
            return (
              <div
                key={reward.day}
                className={`rounded-xl border p-3 text-sm ${
                  current
                    ? "border-primary/70 bg-primary/10"
                    : collected
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-border/50 bg-background/40"
                }`}
              >
                <p className="font-semibold">Dzień {reward.day}</p>
                <p className="text-xs text-muted-foreground">{reward.coins} CC</p>
                <p className="text-xs text-muted-foreground">
                  {reward.bottles > 0 ? `${reward.bottles} Flakon` : "—"} · {reward.balls} Balli
                </p>
              </div>
            );
          })}
        </div>

        <Button
          className="mt-4"
          disabled={!state || state.login.claimed_today || busy === "login"}
          onClick={handleLogin}
        >
          <Gift className="mr-2 h-4 w-4" />
          {state?.login.claimed_today
            ? "Dzisiejsza nagroda odebrana"
            : `Odbierz nagrodę dnia ${state?.login.day ?? 1}`}
        </Button>
      </section>

      <section className="mt-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="h-5 w-5 text-primary" /> Osiągnięcia
          </h2>
          <p className="text-sm text-muted-foreground">
            Odebrane: {doneCount}/{state?.achievements.length ?? 0}
          </p>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full border px-3 py-1 text-xs ${
                category === item
                  ? "border-primary/70 bg-primary/15 text-primary"
                  : "border-border/50 text-muted-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((item) => {
            const pct = Math.round((item.progress / item.target) * 100);
            return (
              <article
                key={item.key}
                className={`rounded-2xl border p-4 ${
                  item.claimed
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : item.done
                      ? "border-primary/60 bg-primary/5"
                      : "border-border/60 bg-card/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{item.label}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {item.category}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/60">
                  <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.progress}/{item.target}
                </p>

                <p className="mt-2 text-xs text-muted-foreground">
                  Nagroda: {item.reward_coins} CC · {item.reward_bottles} Flakonów
                  {item.permanent_bonus ? " · trwały bonus Shiny" : ""}
                </p>

                <Button
                  size="sm"
                  variant={item.claimed ? "secondary" : "default"}
                  className="mt-3 w-full"
                  disabled={item.claimed || !item.done || busy === item.key}
                  onClick={() => handleClaim(item.key)}
                >
                  {item.claimed ? (
                    "Odebrane"
                  ) : item.done ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" /> Odbierz nagrodę
                    </>
                  ) : (
                    "W trakcie"
                  )}
                </Button>
              </article>
            );
          })}
        </div>
      </section>
    </GamePage>
  );
}
