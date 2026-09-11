import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { claimMastery, getMasteryState, type MasteryState } from "@/lib/mastery.functions";

export const Route = createFileRoute("/mistrzostwo")({
  head: () => ({
    meta: [
      { title: "Mistrzostwo regionów — Catch Zone" },
      {
        name: "description",
        content:
          "Sprawdź, ile gatunków złapałeś w każdym regionie i odbierz nagrody za progi 25, 50, 75 i 100%.",
      },
      { property: "og:title", content: "Mistrzostwo regionów — Catch Zone" },
      {
        property: "og:description",
        content: "Postęp kolekcji w regionach i nagrody za kolejne progi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MasteryPage,
});

function MasteryPage() {
  const fetchState = useServerFn(getMasteryState);
  const claim = useServerFn(claimMastery);
  const [state, setState] = useState<MasteryState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["mastery"], queryFn: () => fetchState({}) });
  useEffect(() => {
    if (query.data) setState(query.data as MasteryState);
  }, [query.data]);

  async function handleClaim(region: string, tier: number) {
    const key = `${region}:${tier}`;
    setBusy(key);
    try {
      const result = await claim({ data: { region, tier } });
      setState(result.state as MasteryState);
      if (result.ok) toast.success(`Nagroda odebrana: ${result.reward}`);
      else toast.error(result.reason);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się odebrać nagrody.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <GamePage
      title="Mistrzostwo regionów"
      subtitle="Procent złapanych gatunków w każdym regionie i nagrody za progi 25 / 50 / 75 / 100%."
    >
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Ładuję postęp…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(state?.regions ?? []).map((region) => (
            <section key={region.region} className="glass-panel rounded-2xl p-5">
              <header className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl">
                  {region.name}
                  {state?.home_region === region.region ? (
                    <span className="ml-2 text-xs text-primary">Twój region</span>
                  ) : null}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {region.caught}/{region.total} · {region.percent}%
                </p>
              </header>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-aurora" style={{ width: `${region.percent}%` }} />
              </div>
              <ul className="mt-4 space-y-2">
                {region.tiers.map((tier) => (
                  <li
                    key={tier.tier}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/40 p-3 text-sm"
                  >
                    <span>
                      <span className="font-semibold">{tier.tier}%</span>
                      <span className="ml-2 text-muted-foreground">{tier.reward}</span>
                    </span>
                    {tier.claimed ? (
                      <span className="text-xs text-emerald-400">Odebrane</span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!tier.reached || busy === `${region.region}:${tier.tier}`}
                        onClick={() => handleClaim(region.region, tier.tier)}
                      >
                        {tier.reached ? "Odbierz" : "Zablokowane"}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </GamePage>
  );
}
