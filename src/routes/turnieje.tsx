import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Crown, Swords, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/time";
import {
  fightTournamentRound,
  getTournamentState,
  joinTournament,
  type TournamentState,
} from "@/lib/tournaments.functions";

export const Route = createFileRoute("/turnieje")({
  head: () => ({
    meta: [
      { title: "Turnieje tygodniowe — Catch Zone" },
      {
        name: "description",
        content:
          "Zapisz się na turniej tygodniowy, walcz z innymi trenerami o punkty i zdobądź Puchar Ligi wraz z Shiny Charm.",
      },
      { property: "og:title", content: "Turnieje tygodniowe — Catch Zone" },
      {
        property: "og:description",
        content: "Zapisy w poniedziałek i wtorek, walki od środy do niedzieli. Nagrody dla najlepszych trenerów.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TournamentPage,
});

function TournamentPage() {
  const fetchState = useServerFn(getTournamentState);
  const join = useServerFn(joinTournament);
  const fight = useServerFn(fightTournamentRound);
  const [state, setState] = useState<TournamentState | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { isLoading } = useQuery({
    queryKey: ["tournament"],
    queryFn: async () => {
      const result = await fetchState();
      setState(result);
      return result;
    },
  });

  const run = async (action: () => Promise<any>, onWin?: (result: any) => void) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await action();
      setState(result.state);
      if (!result.ok) toast.error(result.reason);
      else onWin?.(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coś poszło nie tak.");
    } finally {
      setBusy(false);
    }
  };

  const countdown = state ? formatDuration(new Date(state.phase_ends_at).getTime() - now) : "";

  return (
    <GamePage
      title="Turnieje tygodniowe"
      subtitle="Zapisy w poniedziałek i wtorek, walki od środy do niedzieli. Zwycięstwo to 3 punkty."
    >
      {isLoading || !state ? (
        <p className="text-sm text-muted-foreground">Wczytuję turniej…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl">Tydzień {state.week_label}</p>
                  <p className="text-xs text-muted-foreground">
                    {state.phase === "registration" ? "Trwają zapisy" : "Trwają walki"} ·{" "}
                    {state.entries} uczestników · {state.phase === "registration" ? "walki startują za" : "koniec za"}{" "}
                    {countdown}
                  </p>
                </div>
                {state.joined ? (
                  <Button
                    size="sm"
                    disabled={busy || state.phase === "registration" || state.battles_left === 0}
                    onClick={() =>
                      run(
                        () => fight(),
                        (result) => {
                          setLog(result.log);
                          if (result.won) toast.success(`Wygrana z ${result.opponent}! +3 punkty.`);
                          else toast.warning(`Porażka z ${result.opponent}.`);
                        },
                      )
                    }
                  >
                    <Swords className="mr-2 h-4 w-4" aria-hidden /> Walcz ({state.battles_left}/
                    {state.daily_limit})
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => run(() => join(), () => toast.success("Zapisano do turnieju!"))}
                  >
                    <Trophy className="mr-2 h-4 w-4" aria-hidden /> Zapisz się
                  </Button>
                )}
              </div>
              {state.joined ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Twoje punkty: <span className="text-foreground">{state.my_points}</span> · bilans{" "}
                  {state.my_wins}–{state.my_losses}
                  {state.my_place ? ` · miejsce ${state.my_place}` : ""}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Do startu potrzebujesz {state.min_party} Pokémonów w drużynie (masz {state.party_size}).
                </p>
              )}
            </div>

            <div className="glass-panel rounded-2xl p-5">
              <h2 className="font-display text-lg">Tabela turnieju</h2>
              {state.board.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nikt się jeszcze nie zapisał — bądź pierwszy.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {state.board.map((row) => (
                    <li
                      key={row.player_id}
                      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                        row.is_me ? "bg-primary/15 text-foreground" : "bg-muted/20"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-6 text-right font-display">{row.place}</span>
                        <span>
                          {row.trainer_name}
                          {row.is_me ? " (Ty)" : ""}
                          <span className="ml-2 text-xs text-muted-foreground">
                            poz. {row.trainer_level}
                          </span>
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.points} pkt · {row.wins}–{row.losses}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {log.length > 0 ? (
              <div className="glass-panel rounded-2xl p-5">
                <h2 className="font-display text-lg">Przebieg walki</h2>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {log.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <div className="glass-panel rounded-2xl p-5">
              <h2 className="flex items-center gap-2 font-display text-lg">
                <Crown className="h-5 w-5 text-solar" aria-hidden /> Nagrody
              </h2>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {state.rewards.map((reward) => (
                  <li key={reward}>{reward}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Nagrody wypłacane są automatycznie w poniedziałek, po zamknięciu tygodnia.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-5">
              <h2 className="font-display text-lg">Twoja historia</h2>
              {state.past.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Brak zakończonych turniejów — pierwszy wynik pojawi się po niedzieli.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {state.past.map((row) => (
                    <li key={row.week_label}>
                      <span className="text-foreground">{row.week_label}</span> — miejsce {row.place} ·{" "}
                      {row.points} pkt
                      {row.reward_text ? <span className="block text-xs">{row.reward_text}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </GamePage>
  );
}
