import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getFriendsState,
  removeFriend,
  respondFriendRequest,
  searchTrainers,
  sendFriendRequest,
  type FriendTrainer,
  type FriendsState,
} from "@/lib/friends.functions";

export const Route = createFileRoute("/znajomi")({
  head: () => ({
    meta: [
      { title: "Znajomi — Catch Zone" },
      {
        name: "description",
        content:
          "Szukaj trenerów po nazwie, wysyłaj zaproszenia i zarządzaj listą znajomych w Catch Zone.",
      },
      { property: "og:title", content: "Znajomi — Catch Zone" },
      {
        property: "og:description",
        content: "Zaproszenia, lista znajomych i wyszukiwanie trenerów.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  const fetchState = useServerFn(getFriendsState);
  const search = useServerFn(searchTrainers);
  const invite = useServerFn(sendFriendRequest);
  const respond = useServerFn(respondFriendRequest);
  const drop = useServerFn(removeFriend);

  const [state, setState] = useState<FriendsState | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendTrainer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const stateQuery = useQuery({ queryKey: ["friends"], queryFn: () => fetchState({}) });
  useEffect(() => {
    if (stateQuery.data) setState(stateQuery.data as FriendsState);
  }, [stateQuery.data]);

  async function run<T>(key: string, action: () => Promise<T>) {
    setBusy(key);
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coś poszło nie tak.");
    } finally {
      setBusy(null);
    }
  }

  const handleSearch = () =>
    run("search", async () => {
      const result = await search({ data: { query } });
      setResults(result.trainers);
      if (result.trainers.length === 0) toast.info("Nie znaleziono trenerów o tej nazwie.");
    });

  const handleInvite = (trainerId: string) =>
    run(`invite:${trainerId}`, async () => {
      const result = await invite({ data: { trainerId } });
      setState(result.state);
      if (result.ok) toast.success(result.message);
      else toast.error(result.reason);
    });

  const handleRespond = (requestId: string, accept: boolean) =>
    run(`respond:${requestId}`, async () => {
      const result = await respond({ data: { requestId, accept } });
      setState(result.state);
      if (result.ok) toast.success(result.message);
      else toast.error(result.reason);
    });

  const handleRemove = (trainerId: string) =>
    run(`remove:${trainerId}`, async () => {
      const result = await drop({ data: { trainerId } });
      setState(result.state);
      toast.success(result.message);
    });

  return (
    <GamePage
      title="Znajomi"
      subtitle="Szukaj innych trenerów, wysyłaj zaproszenia i trzymaj listę znajomych."
    >
      <section className="glass-panel rounded-2xl p-5">
        <h2 className="font-display text-2xl">Szukaj trenera</h2>
        <p className="mt-1 text-sm text-muted-foreground">Wpisz co najmniej 2 znaki nazwy.</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSearch();
          }}
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nazwa trenera"
            aria-label="Nazwa trenera"
            maxLength={18}
          />
          <Button type="submit" disabled={busy === "search" || query.trim().length < 2}>
            Szukaj
          </Button>
        </form>
        {results.length > 0 ? (
          <ul className="mt-4 grid gap-2">
            {results.map((trainer) => (
              <li
                key={trainer.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
              >
                <TrainerLine trainer={trainer} />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === `invite:${trainer.id}`}
                  onClick={() => void handleInvite(trainer.id)}
                >
                  Zaproś
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {stateQuery.isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Ładuję listę znajomych…</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="glass-panel rounded-2xl p-5">
            <h2 className="font-display text-2xl">Zaproszenia</h2>
            {(state?.incoming ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Brak nowych zaproszeń.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {state?.incoming.map((trainer) => (
                  <li key={trainer.request_id} className="rounded-xl border border-border/60 p-3">
                    <TrainerLine trainer={trainer} />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy === `respond:${trainer.request_id}`}
                        onClick={() => void handleRespond(trainer.request_id, true)}
                      >
                        Przyjmij
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `respond:${trainer.request_id}`}
                        onClick={() => void handleRespond(trainer.request_id, false)}
                      >
                        Odrzuć
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass-panel rounded-2xl p-5">
            <h2 className="font-display text-2xl">Wysłane</h2>
            {(state?.outgoing ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nie czekasz na żadną odpowiedź.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {state?.outgoing.map((trainer) => (
                  <li key={trainer.request_id} className="rounded-xl border border-border/60 p-3">
                    <TrainerLine trainer={trainer} />
                    <p className="mt-1 text-xs text-muted-foreground">Czeka na odpowiedź.</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass-panel rounded-2xl p-5">
            <h2 className="font-display text-2xl">Twoi znajomi</h2>
            {(state?.friends ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nikogo tu jeszcze nie ma — wyszukaj trenera powyżej.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {state?.friends.map((trainer) => (
                  <li
                    key={trainer.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                  >
                    <TrainerLine trainer={trainer} />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `remove:${trainer.id}`}
                      onClick={() => void handleRemove(trainer.id)}
                    >
                      Usuń
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </GamePage>
  );
}

function TrainerLine({ trainer }: { trainer: FriendTrainer }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-display text-lg">{trainer.trainer_name}</p>
      <p className="text-xs text-muted-foreground">
        Poziom {trainer.trainer_level}
        {trainer.region ? ` · ${trainer.region}` : ""}
      </p>
    </div>
  );
}
