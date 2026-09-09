import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { useTrainerData } from "@/hooks/useTrainerData";
import { itemSprite } from "@/lib/pokedex";
import { buyPokeBalls, craftMegaStone, useEnergyBottle } from "@/lib/trainer.functions";
import { BALLS } from "@/lib/items";
import { tmById, tmDescription, tmSprite } from "@/lib/finds";

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
  const craftStone = useServerFn(craftMegaStone);
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
          {(data.items ?? []).filter((item) => item.item_key.startsWith("mega_shard_")).map((item) => {
            const speciesId = Number(item.item_key.replace("mega_shard_", ""));
            return <div key={item.item_key} className="glass-panel rounded-2xl p-5"><ItemIcon name="key-stone" label="Fragment Mega" /><p className="mt-3 font-display text-3xl">{item.quantity}/5</p><p className="text-sm text-muted-foreground">Fragmenty Mega · gatunek #{speciesId}</p><Button className="mt-4" size="sm" disabled={busy || item.quantity < 5} onClick={() => void run(() => craftStone({ data: { speciesId } }), "Utworzono gatunkowy Kamień Mega.")}>Utwórz Kamień</Button></div>;
          })}
          {(data.items ?? []).filter((item) => item.item_key.startsWith("mega_stone_")).map((item) => <div key={item.item_key} className="glass-panel rounded-2xl p-5"><ItemIcon name="key-stone" label="Kamień Mega" /><p className="mt-3 font-display text-3xl">{item.quantity}</p><p className="text-sm text-muted-foreground">Kamień Mega · gatunek #{item.item_key.replace("mega_stone_", "")}</p></div>)}
          {(data.items ?? [])
            .filter((item) => item.item_key.startsWith("tm_") && item.quantity > 0)
            .map((item) => {
              const tm = tmById(item.item_key.replace("tm_", ""));
              if (!tm) return null;
              return (
                <div key={item.item_key} className="glass-panel rounded-2xl p-5">
                  <ItemIcon name={tmSprite(tm.type)} label={tm.label} />
                  <p className="mt-3 font-display text-3xl">{item.quantity}</p>
                  <p className="text-sm text-muted-foreground">{tm.label}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{tmDescription(tm)}</p>
                </div>
              );
            })}
          {(data.items ?? [])
            .filter((item) => item.item_key === "shiny_charm" && item.quantity > 0)
            .map((item) => (
              <div key={item.item_key} className="glass-panel rounded-2xl p-5">
                <ItemIcon name="shiny-charm" label="Shiny Charm" />
                <p className="mt-3 font-display text-3xl">{item.quantity}</p>
                <p className="text-sm text-muted-foreground">
                  Shiny Charm · podwaja szansę na shiny w eksploracji
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Nagroda za 1. miejsce w turnieju tygodniowym. Działa automatycznie.
                </p>
              </div>
            ))}

          <div className="glass-panel rounded-2xl p-5">
            <ItemIcon name="max-elixir" label="Flakon Energii" />
            <p className="mt-3 font-display text-3xl">{profile.energy_bottles}</p>
            <p className="text-sm text-muted-foreground">Flakony Energii</p>
            <Button
              className="mt-4"
              size="sm"
              disabled={busy || profile.energy_bottles <= 0 || profile.energy >= profile.energy_max}
              onClick={() =>
                void run(() => drinkBottle(), `Energia uzupełniona do ${profile.energy_max}/${profile.energy_max}.`)
              }
            >
              Zużyj Flakon
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Energia: {profile.energy}/{profile.energy_max} · +1 co 3 minuty.
            </p>
          </div>

          {[
            ...BALLS.filter((ball) => ball.key !== "poke").map((ball) => ({ label: ball.label, sprite: ball.sprite, count: profile[ball.field] })),
            { label: "Bilety Podróży", sprite: "ss-ticket", count: profile.travel_tickets },
            { label: "Razz Berry", sprite: "razz-berry", count: profile.razz_berries },
            { label: "Mikstura", sprite: "potion", count: profile.potions },
            { label: "Super Mikstura", sprite: "super-potion", count: profile.super_potions },
            { label: "Eliksir Życia", sprite: "revive", count: profile.revives },
            { label: "Kamienie Mega", sprite: "key-stone", count: profile.mega_stones },
          ].map((item) => (
            <div key={item.label} className="glass-panel rounded-2xl p-5">
              <ItemIcon name={item.sprite} label={item.label} />
              <p className="mt-3 font-display text-3xl">{item.count}</p>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Dokupisz w Sklepie za Catch Coins.
              </p>
            </div>
          ))}

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
