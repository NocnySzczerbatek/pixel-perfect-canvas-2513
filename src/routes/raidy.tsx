import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Skull, Swords, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BattleTheatre } from "@/components/game/BattleTheatre";
import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import type { BattleReport } from "@/lib/battle";
import { artworkUrl } from "@/lib/game-data";
import { fightRaid, getRaidsState, type RaidsState } from "@/lib/raids.functions";

export const Route = createFileRoute("/raidy")({
  head: () => ({
    meta: [
      { title: "Raidy — Bossowie dnia w Catch Zone" },
      {
        name: "description",
        content:
          "Codziennie trzej Bossowie Raidów: od Gyaradosa do legend. Trzy próby na dobę, łup to monety, Flakony, TM i Kamienie Mega.",
      },
      { property: "og:title", content: "Raidy — Catch Zone" },
      {
        property: "og:description",
        content: "Bossowie z wielokrotnym HP, Tier 1–5 i legendy tylko w Raidach.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RaidsPage,
});

function RaidsPage() {
  const fetchState = useServerFn(getRaidsState);
  const fight = useServerFn(fightRaid);
  const [state, setState] = useState<RaidsState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<BattleReport | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const query = useQuery({ queryKey: ["raids"], queryFn: () => fetchState({}) });

  useEffect(() => {
    if (query.data) setState(query.data as RaidsState);
  }, [query.data]);

  async function handleFight(key: string) {
    setBusy(key);
    setReport(null);
    try {
      const result = await fight({ data: { key } });
      setState(result.state as RaidsState);
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setReport(result.report);
      setLog(result.log);
      if (result.won) toast.success(`Boss pokonany! ${result.drops.join(", ")}`);
      else toast.error("Boss okazał się za silny — raid przepadł.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Raid się nie udał.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <GamePage
      title="Raidy"
      subtitle="Trzech Bossów dziennie: łatwy, trudny i legendarny. Trzy próby na dobę."
    >
      <div className="mb-4 flex flex-wrap gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 text-sm">
        <span className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Energia: {state?.energy ?? 0}/100
        </span>
        <span>Koszt raidu: {state?.raid_energy ?? 8} Energii</span>
        <span>Pozostałe próby dziś: {state?.attempts_left ?? 0}/3</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(state?.bosses ?? []).map((boss) => (
          <article
            key={boss.key}
            className={`rounded-2xl border p-4 ${
              boss.defeated_today
                ? "border-emerald-500/40 bg-emerald-500/5"
                : boss.legendary
                  ? "border-amber-400/50 bg-amber-400/5"
                  : "border-border/60 bg-card/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <img
                src={artworkUrl(boss.species_id)}
                alt={boss.name}
                loading="lazy"
                className="h-20 w-20 shrink-0 object-contain"
              />
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  {boss.legendary ? (
                    <Flame className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Skull className="h-4 w-4 text-muted-foreground" />
                  )}
                  {boss.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tier {boss.tier} · poz. {boss.level} · {boss.species_type}
                </p>
                <p className="text-xs text-muted-foreground">{boss.hp} HP</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Łup: {boss.rewards.coins} CC · {boss.rewards.bottles}× Flakon
              {boss.rewards.candyXl > 0 ? ` · ${boss.rewards.candyXl}× Cukierek XL` : ""} · szansa na TM
              i Kamień Mega
            </p>

            <Button
              className="mt-3 w-full"
              disabled={
                boss.defeated_today ||
                busy === boss.key ||
                (state?.attempts_left ?? 0) <= 0 ||
                (state?.energy ?? 0) < (state?.raid_energy ?? 8)
              }
              onClick={() => handleFight(boss.key)}
            >
              <Swords className="mr-2 h-4 w-4" />
              {boss.defeated_today ? "Pokonany dziś" : "Stań do raidu"}
            </Button>
          </article>
        ))}
      </div>

      {report ? (
        <div className="mt-6">
          <BattleTheatre report={report} log={log} />
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-border/60 bg-card/50 p-4">
        <h2 className="mb-3 text-lg font-semibold">Ostatnie raidy</h2>
        {(state?.history ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nie brałeś jeszcze udziału w żadnym raidzie.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {(state?.history ?? []).map((row) => (
              <li key={row.id} className="flex flex-wrap justify-between gap-2 border-b border-border/40 pb-2">
                <span>
                  {row.boss_name} · Tier {row.tier}
                </span>
                <span className={row.won ? "text-emerald-400" : "text-rose-400"}>
                  {row.won ? `wygrana · +${row.reward_coins} CC` : "porażka"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </GamePage>
  );
}
