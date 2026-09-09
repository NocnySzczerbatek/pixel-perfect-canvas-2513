import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BattleTheatre } from "@/components/game/BattleTheatre";
import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import type { BattleReport } from "@/lib/battle";
import { artworkUrl } from "@/lib/game-data";
import { challengeLeague, getLeagueState, type LeagueState } from "@/lib/league.functions";
import { leaderArt } from "@/lib/trainerArt";

export const Route = createFileRoute("/liga")({
  head: () => ({
    meta: [
      { title: "Liga Pokémon — Catch Zone" },
      {
        name: "description",
        content:
          "Po ośmiu odznakach staje przed Tobą Elite 4 i Mistrz Ligi. Pięć walk bez pomyłki.",
      },
      { property: "og:title", content: "Liga Pokémon — Catch Zone" },
      {
        property: "og:description",
        content: "Elite 4 i Mistrz Ligi — najtrudniejsze walki w Catch Zone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaguePage,
});

function LeaguePage() {
  const fetchState = useServerFn(getLeagueState);
  const challenge = useServerFn(challengeLeague);
  const [state, setState] = useState<LeagueState | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [report, setReport] = useState<BattleReport | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["league"],
    queryFn: async () => {
      const result = await fetchState();
      setState(result);
      return result;
    },
  });

  const fight = async (stage: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await challenge({ data: { stage } });
      setState(result.state);
      if (!result.ok) {
        toast.error(result.reason);
      } else {
        setLog(result.log);
        if (result.report) setReport(result.report);
        if (result.won) toast.success("Zwycięstwo! Kolejny przeciwnik czeka.");
        else toast.warning("Porażka — przebieg Ligi zaczynasz od nowa.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Błąd wyzwania.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePage
      title="Liga Pokémon"
      subtitle="Elite 4 i Mistrz. Pięć walk pod rząd — każda porażka cofa Cię na start."
    >
      {isLoading || !state ? (
        <p className="text-sm text-muted-foreground">Wczytuję Ligę…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {!state.unlocked ? (
              <div className="glass-panel rounded-2xl p-5 text-sm text-muted-foreground">
                Liga otwiera się po zdobyciu 8 odznak regionu. Masz {state.badges}/8.
              </div>
            ) : null}

            {state.stages.map((stage) => (
              <div key={stage.stage} className="glass-panel rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <img
                    src={leaderArt(stage.type, stage.name)}
                    alt={`Przeciwnik Ligi: ${stage.name}`}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-20 w-20 rounded-xl border border-border/60 object-cover [image-rendering:pixelated]"
                  />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {stage.title} · typ {stage.type}
                    </p>
                    <p className="font-display text-2xl">{stage.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Nagroda: {stage.rewards.exp} EXP, {stage.rewards.coins} CC,{" "}
                      {stage.rewards.bottles}× Flakon Energii
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {stage.team.map((member, idx) => (
                    <div key={idx} className="glass-panel rounded-xl p-2 text-center">
                      <img
                        src={artworkUrl(member.species_id)}
                        alt={member.species_name}
                        loading="lazy"
                        width={56}
                        height={56}
                        className="h-14 w-14 object-contain"
                      />
                      <p className="text-[11px]">{member.species_name}</p>
                      <p className="text-[10px] text-muted-foreground">Lvl {member.level}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  {stage.cleared ? (
                    <span className="inline-flex items-center gap-2 text-sm text-aurora">
                      <ShieldCheck className="h-4 w-4" aria-hidden /> Pokonany
                    </span>
                  ) : stage.locked ? (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" aria-hidden /> Najpierw pokonaj poprzedniego
                      przeciwnika
                    </span>
                  ) : (
                    <Button
                      disabled={busy || state.energy < state.league_energy}
                      onClick={() => void fight(stage.stage)}
                    >
                      Walcz ({state.league_energy} Energii)
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Postęp</p>
              <p className="mt-2 text-sm">
                Energia: {state.energy} · Odznaki: {state.badges}/8
              </p>
              <p className="text-sm">Pokonani: {state.cleared_stages}/5</p>
              <p className="text-sm text-muted-foreground">Próby Ligi: {state.attempts}</p>
              {state.champion ? (
                <p className="mt-3 inline-flex items-center gap-2 font-display text-lg text-aurora">
                  <Crown className="h-5 w-5" aria-hidden /> Mistrz Ligi
                </p>
              ) : null}
            </div>

            {report ? (
              <BattleTheatre report={report} allyLabel="Twoja drużyna" foeLabel="Liga Pokémon" />
            ) : null}

            {log.length > 0 ? (
              <div className="glass-panel max-h-[26rem] overflow-y-auto rounded-2xl p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Przebieg walki
                </p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {log.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </GamePage>
  );
}
