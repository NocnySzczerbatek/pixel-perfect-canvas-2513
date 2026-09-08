import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { BattleTheatre } from "@/components/game/BattleTheatre";
import type { BattleReport } from "@/lib/battle";
import { useQuery } from "@tanstack/react-query";
import { Shield, Swords } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { buyShield } from "@/lib/items.functions";
import { SHIELD_COST, SHIELD_HOURS } from "@/lib/items";
import { getPvpState, raidTrainer, type PvpState } from "@/lib/pvp.functions";

export const Route = createFileRoute("/pvp")({
  head: () => ({
    meta: [
      { title: "PvP — napady na trenerów — Catch Zone" },
      {
        name: "description",
        content:
          "Napadaj na innych trenerów i zabierz 5–10% ich Catch Coins albo chroń się Tarczą BHP.",
      },
      { property: "og:title", content: "PvP — napady na trenerów — Catch Zone" },
      {
        property: "og:description",
        content: "Walcz z innymi trenerami o Catch Coins. Tarcza BHP blokuje napady na 8 godzin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PvpPage,
});

function PvpPage() {
  const fetchState = useServerFn(getPvpState);
  const raid = useServerFn(raidTrainer);
  const shield = useServerFn(buyShield);
  const [state, setState] = useState<PvpState | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [report, setReport] = useState<BattleReport | null>(null);

  const { isLoading, refetch } = useQuery({
    queryKey: ["pvp"],
    queryFn: async () => {
      const result = await fetchState();
      setState(result);
      return result;
    },
  });

  const attack = async (rivalId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await raid({ data: { rivalId } });
      setState(result.state);
      if (!result.ok) toast.error(result.reason);
      else {
        setLog(result.log);
        if (result.report) setReport(result.report);
        if (result.won) toast.success(`Wygrałeś! Zabierasz ${result.stolen} CC.`);
        else toast.warning(`Przegrałeś napad — tracisz ${result.stolen} CC.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Błąd napadu.");
    } finally {
      setBusy(false);
    }
  };

  const activateShield = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await shield();
      if (!result.ok) toast.error(result.reason);
      else toast.success(`Tarcza BHP aktywna przez ${SHIELD_HOURS} godzin.`);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Błąd zakupu Tarczy.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePage
      title="PvP — napady"
      subtitle="Wygrany napad zabiera 5–10% Catch Coins przegranego. Tarcza BHP chroni Cię na 8 godzin."
    >
      {isLoading || !state ? (
        <p className="text-sm text-muted-foreground">Wczytuję listę trenerów…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-3 lg:col-span-2">
            {state.rivals.length === 0 ? (
              <p className="glass-panel rounded-2xl p-5 text-sm text-muted-foreground">
                Nie ma jeszcze innych trenerów do napadu.
              </p>
            ) : (
              state.rivals.map((rival) => (
                <div
                  key={rival.id}
                  className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                >
                  <div>
                    <p className="font-display text-lg">{rival.trainer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Poziom {rival.trainer_level} · {rival.catch_coins} CC · bilans{" "}
                      {rival.pvp_wins}–{rival.pvp_losses}
                      {rival.region ? ` · ${rival.region}` : ""}
                    </p>
                  </div>
                  {rival.shielded ? (
                    <span className="inline-flex items-center gap-2 text-xs text-ice">
                      <Shield className="h-4 w-4" aria-hidden /> Tarcza BHP
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busy || state.me.energy < state.raid_energy}
                      onClick={() => void attack(rival.id)}
                    >
                      <Swords className="h-4 w-4" aria-hidden />
                      Napad ({state.raid_energy} Energii)
                    </Button>
                  )}
                </div>
              ))
            )}
          </section>

          <aside className="space-y-4">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ty</p>
              <p className="font-display text-2xl">{state.me.trainer_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.me.catch_coins} CC · Energia {state.me.energy} · drużyna{" "}
                {state.me.party_size}
              </p>
              <p className="text-sm text-muted-foreground">
                Bilans PvP: {state.me.pvp_wins}–{state.me.pvp_losses}
              </p>
              <p className="mt-3 text-sm">
                {state.me.shielded
                  ? `Tarcza BHP aktywna do ${new Date(state.me.shield_until!).toLocaleString("pl-PL")}`
                  : "Brak ochrony — inni mogą Cię napadać."}
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                disabled={busy || state.me.catch_coins < SHIELD_COST}
                onClick={() => void activateShield()}
              >
                <Shield className="h-4 w-4" aria-hidden />
                Tarcza BHP · {SHIELD_COST} CC
              </Button>
            </div>

            {report ? (
              <BattleTheatre report={report} allyLabel="Twoja drużyna" foeLabel="Rywal" />
            ) : null}

            {log.length > 0 ? (
              <div className="glass-panel max-h-80 overflow-y-auto rounded-2xl p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Przebieg napadu
                </p>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {log.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Ostatnie starcia
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {state.history.length === 0 ? (
                  <li>Brak historii.</li>
                ) : (
                  state.history.map((row) => (
                    <li key={row.id}>
                      {row.won ? "Wygrana z" : "Przegrana z"} {row.opponent} · {row.coins_stolen} CC
                    </li>
                  ))
                )}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </GamePage>
  );
}
