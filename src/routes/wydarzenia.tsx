import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import {
  getWeeklyEvent,
  joinWeeklyEvent,
  type WeeklyEventState,
} from "@/lib/events.functions";

export const Route = createFileRoute("/wydarzenia")({
  head: () => ({
    meta: [
      { title: "Wydarzenia tygodnia — Catch Zone" },
      {
        name: "description",
        content:
          "Wydarzenie tygodnia z bonusem do Shiny i rzadkich spotkań, nagrodą w Catch Coins i Flakonach Energii.",
      },
      { property: "og:title", content: "Wydarzenia tygodnia — Catch Zone" },
      {
        property: "og:description",
        content: "Przystąp do wydarzenia i graj z bonusem do końca tygodnia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const fetchState = useServerFn(getWeeklyEvent);
  const join = useServerFn(joinWeeklyEvent);
  const [state, setState] = useState<WeeklyEventState | null>(null);
  const [busy, setBusy] = useState(false);

  const query = useQuery({ queryKey: ["weekly-event"], queryFn: () => fetchState({}) });
  useEffect(() => {
    if (query.data) setState(query.data as WeeklyEventState);
  }, [query.data]);

  async function handleJoin() {
    setBusy(true);
    try {
      const result = await join({});
      setState(result.state as WeeklyEventState);
      if (result.ok) toast.success(`Nagroda: ${result.reward}`);
      else toast.error(result.reason);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się przystąpić.");
    } finally {
      setBusy(false);
    }
  }

  const event = state?.event;

  return (
    <GamePage
      title="Wydarzenia tygodnia"
      subtitle="Co tydzień inne wydarzenie: jednorazowa nagroda i bonus aktywny do poniedziałku."
    >
      {query.isLoading || !event ? (
        <p className="text-sm text-muted-foreground">Ładuję wydarzenie…</p>
      ) : (
        <div className="space-y-6">
          <section className="glass-panel rounded-2xl p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {state?.week_label}
            </p>
            <h2 className="mt-1 font-display text-3xl">{event.name}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{event.description}</p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <li className="rounded-xl border border-border/50 bg-background/40 p-3">
                Bonus Shiny: <span className="text-primary">+{event.shinyBonusPct}%</span>
              </li>
              <li className="rounded-xl border border-border/50 bg-background/40 p-3">
                Bonus rzadkości: <span className="text-primary">+{event.rareBonusPct}%</span>
              </li>
              <li className="rounded-xl border border-border/50 bg-background/40 p-3">
                Nagroda: {event.coins} CC
              </li>
              <li className="rounded-xl border border-border/50 bg-background/40 p-3">
                Nagroda: {event.bottles}× Flakon Energii
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button disabled={busy || state?.claimed} onClick={handleJoin}>
                {state?.claimed ? "Nagroda odebrana" : "Przystąp do wydarzenia"}
              </Button>
              {state?.reward_text ? (
                <p className="text-xs text-muted-foreground">{state.reward_text}</p>
              ) : null}
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-5">
            <h2 className="font-display text-2xl">Najbliższe tygodnie</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {(state?.upcoming ?? []).map((week) => (
                <li key={week.week_start} className="flex justify-between gap-3">
                  <span>{week.week_label}</span>
                  <span className="text-foreground">{week.name}</span>
                </li>
              ))}
            </ul>
          </section>

          {(state?.history ?? []).length > 0 ? (
            <section className="glass-panel rounded-2xl p-5">
              <h2 className="font-display text-2xl">Twoja historia</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {(state?.history ?? []).map((entry) => (
                  <li key={entry.week_start}>
                    <span className="text-foreground">{entry.week_start}</span> · {entry.reward_text}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </GamePage>
  );
}
