import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Swords, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BattleTheatre } from "@/components/game/BattleTheatre";
import { GamePage } from "@/components/game/GamePage";
import { TrainerAvatar } from "@/components/game/TrainerAvatar";
import { Button } from "@/components/ui/button";
import type { BattleReport } from "@/lib/battle";
import { artworkUrl } from "@/lib/game-data";
import { fightTrainer, getTrainerBoard, type TrainerBoard } from "@/lib/trainers.functions";

export const Route = createFileRoute("/trenerzy")({
  head: () => ({
    meta: [
      { title: "Trenerzy — Catch Zone" },
      {
        name: "description",
        content:
          "Wybierz rywala z dzisiejszej listy trenerów, walcz automatycznie i odbierz doświadczenie oraz Catch Coins.",
      },
      { property: "og:title", content: "Trenerzy — Catch Zone" },
      {
        property: "og:description",
        content: "Codzienna lista trenerów dopasowana do Twojego poziomu, pełny przebieg walki i nagrody.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrenerzyPage,
});

function TrenerzyPage() {
  const fetchBoard = useServerFn(getTrainerBoard);
  const fight = useServerFn(fightTrainer);
  const [board, setBoard] = useState<TrainerBoard | null>(null);
  const [report, setReport] = useState<BattleReport | null>(null);
  const [opponent, setOpponent] = useState<string>("Rywal");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["trainer-board"],
    queryFn: async () => {
      const result = await fetchBoard();
      setBoard(result);
      return result;
    },
  });

  const challenge = async (index: number) => {
    if (busy) return;
    setBusy(true);
    setReport(null);
    try {
      const result = await fight({ data: { index } });
      setBoard(result.state);
      if (!result.ok) {
        toast.error(result.reason);
      } else {
        setReport(result.report);
        setOpponent(result.opponent);
        setLog(result.log);
        if (result.won) toast.success(`Wygrana z ${result.opponent}!`);
        else toast.warning(`Porażka z ${result.opponent}.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Błąd walki.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePage
      title="Trenerzy"
      subtitle="Codzienna lista rywali dopasowana do Twojego poziomu. Walka toczy się automatycznie — Pokémony same wybierają ataki."
    >
      {isLoading || !board ? (
        <p className="text-sm text-muted-foreground">Wczytuję listę trenerów…</p>
      ) : (
        <div className="space-y-6">
          <div className="glass-panel flex flex-wrap items-center gap-4 rounded-2xl p-4 text-sm">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-300" aria-hidden /> Energia: {board.energy} · koszt
              walki {board.energy_cost}
            </span>
            <span className="text-muted-foreground">Poziom trenera: {board.trainer_level}</span>
            <span className="text-muted-foreground">
              Gotowe Pokémony: {board.party_ready}
            </span>
          </div>

          {report ? (
            <BattleTheatre report={report} allyLabel="Twoja drużyna" foeLabel={opponent}>
              <Button variant="outline" onClick={() => setReport(null)} disabled={busy}>
                Wróć do listy trenerów
              </Button>
            </BattleTheatre>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {board.opponents.map((foe) => (
                <article key={foe.index} className="glass-panel rounded-2xl p-5">
                  <div className="flex items-center gap-3">
                    <TrainerAvatar trainerClass={foe.trainer_class} className="h-20 w-20" />
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-xl">
                        {foe.trainer_class} {foe.person}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {foe.team.length} Pokémonów · Lvl{" "}
                        {Math.min(...foe.team.map((m) => m.level))}–
                        {Math.max(...foe.team.map((m) => m.level))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {foe.team.map((member, idx) => (
                      <div key={idx} className="rounded-xl border border-border/60 p-2 text-center">
                        <img
                          src={artworkUrl(member.species_id)}
                          alt={member.species_name}
                          loading="lazy"
                          width={48}
                          height={48}
                          className="mx-auto h-12 w-12 object-contain"
                        />
                        <p className="text-[11px]">{member.species_name}</p>
                        <p className="text-[10px] text-muted-foreground">Lvl {member.level}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-sm text-aurora">
                    Nagroda: +{foe.reward_exp} EXP trenera, +{foe.reward_coins} Catch Coins
                  </p>

                  <Button
                    className="mt-4"
                    disabled={busy || board.energy < board.energy_cost || board.party_ready === 0}
                    onClick={() => void challenge(foe.index)}
                  >
                    <Swords className="h-4 w-4" aria-hidden /> Walcz
                  </Button>
                </article>
              ))}
            </div>
          )}

          {log.length > 0 && !report ? (
            <div className="glass-panel max-h-72 overflow-y-auto rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Dziennik ostatniej walki
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {log.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </GamePage>
  );
}
