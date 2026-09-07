import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { useTrainerData } from "@/hooks/useTrainerData";
import { itemSprite } from "@/lib/pokedex";
import { buyPokeBalls, useEnergyBottle } from "@/lib/trainer.functions";

export const Route = createFileRoute("/ekwipunek")({
  head: () => ({
    meta: [
      { title: "Ekwipunek — Catch Zone" },
      {
        name: "description",
        content: "Poké Balle, Flakony Energii i Catch Coins. Uzupełnij zapasy przed wyprawą.",
      },
      { property: "og:title", content: "Ekwipunek — Catch Zone" },
      {
        property: "og:description",
        content: "Poké Balle, Flakony Energii i Catch Coins. Uzupełnij zapasy przed wyprawą.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EkwipunekPage,
});

function EkwipunekPage() {
  const { data, isLoading, setData } = useTrainerData();
  const drinkBottle = useServerFn(useEnergyBottle);
  const buyBalls = useServerFn(buyPokeBalls);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<any>, success: string) => {
    setBusy(true);
    try {
      const result = await action();
      if (result?.data) setData(result.data);
      if (result?.ok === false) toast.error(result.reason);
      else toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coś poszło nie tak.");
    } finally {
      setBusy(false);
    }
  };

  const profile = data?.profile;
  const price = data?.ball_price ?? 20;

  return (
    <GamePage
      title="Ekwipunek"
      subtitle="Twoje zapasy. Poké Balle kupisz za Catch Coins, Flakon dolewa Energii natychmiast."
    >
      {isLoading || !profile ? (
        <p className="text-sm text-muted-foreground">Wczytuję ekwipunek…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass-panel rounded-2xl p-5">
            <ItemIcon name="poke-ball" label="Poké Ball" />
            <p className="mt-3 font-display text-3xl">{profile.poke_balls}</p>
            <p className="text-sm text-muted-foreground">Poké Balle</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[1, 5, 10].map((amount) => (
                <Button
                  key={amount}
                  size="sm"
                  variant={amount === 1 ? "default" : "outline"}
                  disabled={busy || profile.catch_coins < amount * price}
                  onClick={() =>
                    void run(
                      () => buyBalls({ data: { amount } }),
                      `Kupiono ${amount} Poké Ball${amount > 1 ? "e" : ""}.`,
                    )
                  }
                >
                  +{amount} · {amount * price}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{price} Catch Coins za Balla.</p>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <ItemIcon name="max-elixir" label="Flakon Energii" />
            <p className="mt-3 font-display text-3xl">{profile.energy_bottles}</p>
            <p className="text-sm text-muted-foreground">Flakony Energii</p>
            <Button
              className="mt-4"
              size="sm"
              disabled={busy || profile.energy_bottles <= 0 || profile.energy >= profile.energy_max}
              onClick={() =>
                void run(() => drinkBottle(), `Energia uzupełniona o ${data?.bottle_energy ?? 25}.`)
              }
            >
              Zużyj Flakon
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Energia: {profile.energy}/{profile.energy_max} · +1 co 3 minuty.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <ItemIcon name="coin-case" label="Catch Coins" />
            <p className="mt-3 font-display text-3xl">{profile.catch_coins}</p>
            <p className="text-sm text-muted-foreground">Catch Coins</p>
            <p className="mt-4 text-xs text-muted-foreground">
              Monety zdobywasz za wygrane walki z trenerami i wydajesz na trening Pokémonów.
            </p>
          </div>
        </div>
      )}
    </GamePage>
  );
}

function ItemIcon({ name, label }: { name: string; label: string }) {
  return (
    <img
      src={itemSprite(name)}
      alt={label}
      loading="lazy"
      width={40}
      height={40}
      className="h-10 w-10 [image-rendering:pixelated]"
    />
  );
}
