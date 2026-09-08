import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { BattleTheatre } from "@/components/game/BattleTheatre";
import type { BattleReport } from "@/lib/battle";
import { useQuery } from "@tanstack/react-query";
import { Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { artworkUrl } from "@/lib/game-data";
import { challengeGym, getGymsState, type GymsState } from "@/lib/gyms.functions";
import { MEGA_STONE } from "@/lib/items";
import { itemSprite } from "@/lib/pokedex";

export const Route = createFileRoute("/sale")({
  head: () => ({
    meta: [
      { title: "Sale i Liderzy — Catch Zone" },
      {
        name: "description",
        content: "Osiem Sal w Twoim regionie, Liderzy z własnymi drużynami i osiem odznak.",
      },
      { property: "og:title", content: "Sale i Liderzy — Catch Zone" },
      {
        property: "og:description",
        content: "Pokonaj ośmiu Liderów Sal i zdobądź komplet odznak regionu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalePage,
});

function SalePage() {
  const fetchState = useServerFn(getGymsState);
  const challenge = useServerFn(challengeGym);
  const [state, setState] = useState<GymsState | null>(null);
  const [busy, setBusy] = useState(false);
  const [useMega, setUseMega] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [report, setReport] = useState<BattleReport | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["gyms"],
    queryFn: async () => {
      const result = await fetchState();
      setState(result);
      return result;
    },
  });

  const fight = async (gymIndex: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await challenge({ data: { gymIndex, useMega } });
      setState(result.state);
      if (!result.ok) {
        toast.error(result.reason);
      } else {
        setLog(result.log);
        if (result.report) setReport(result.report);
        setUseMega(false);
        if (result.won) toast.success(`Zwycięstwo! Zdobywasz ${result.badge}.`);
        else toast.warning("Lider okazał się silniejszy. Ulecz drużynę i wróć.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Błąd wyzwania.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePage
      title="Sale i Liderzy"
      subtitle="Osiem Sal w regionie. Każdą otwierasz odznaką z poprzedniej, a ósmy Lider daje Kamień Mega."
    >
      {isLoading || !state ? (
        <p className="text-sm text-muted-foreground">Wczytuję Sale…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {state.gyms.map((gym) => (
              <div key={gym.index} className="glass-panel rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Sala {gym.index} · typ {gym.type}
                    </p>
                    <p className="font-display text-2xl">{gym.leader}</p>
                    <p className="text-sm text-muted-foreground">
                      Drużyna Lvl {gym.level} ({gym.teamSize} Pokémony) · nagroda {gym.rewardExp} EXP
                      i {gym.rewardCoins} CC
                    </p>
                  </div>
                  <img
                    src={gym.imageUrl}
                    alt={gym.badgeName}
                    className={`h-16 w-16 object-contain drop-shadow-lg transition-transform duration-300 hover:[transform:rotateY(18deg)_rotateX(9deg)_scale(1.1)] ${
                      gym.earned ? "" : "grayscale opacity-45"
                    }`}
                    loading="lazy"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {gym.team.map((member, idx) => (
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

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {gym.earned ? (
                    <span className="inline-flex items-center gap-2 text-sm text-aurora">
                      <ShieldCheck className="h-4 w-4" aria-hidden /> {gym.badgeName} zdobyta
                    </span>
                  ) : gym.locked ? (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" aria-hidden /> Zdobądź najpierw odznakę Sali{" "}
                      {gym.index - 1}
                    </span>
                  ) : (
                    <Button
                      disabled={busy || state.energy < state.gym_energy}
                      onClick={() => void fight(gym.index)}
                    >
                      Wyzwij Lidera ({state.gym_energy} Energii)
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Zapasy</p>
              <p className="mt-2 text-sm">
                Energia: {state.energy} · Odznaki: {state.badges.length}/8
              </p>
              <div className="mt-4 flex items-center gap-3">
                <img
                  src={itemSprite(MEGA_STONE.sprite)}
                  alt={MEGA_STONE.label}
                  width={32}
                  height={32}
                  className="h-8 w-8 [image-rendering:pixelated]"
                />
                <div>
                  <p className="text-sm">
                    {MEGA_STONE.label}: {state.mega_stones}
                  </p>
                  <p className="text-xs text-muted-foreground">{MEGA_STONE.note}</p>
                </div>
              </div>
              <Button
                className="mt-4"
                size="sm"
                variant={useMega ? "default" : "outline"}
                disabled={state.mega_stones <= 0}
                onClick={() => setUseMega((value) => !value)}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {useMega ? "Kamień Mega gotowy" : "Użyj Kamienia Mega"}
              </Button>
            </div>

            {report ? (
              <BattleTheatre report={report} allyLabel="Twoja drużyna" foeLabel="Lider Sali" />
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
