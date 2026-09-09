import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrainerData } from "@/hooks/useTrainerData";
import { itemSprite } from "@/lib/pokedex";
import { buyPokeBalls, craftMegaStone, useEnergyBottle } from "@/lib/trainer.functions";
import { BAG_CATEGORIES, buildBackpack, filterBackpack, type BagCategory, type BagSort } from "@/lib/backpack";

export const Route = createFileRoute("/ekwipunek")({
  head: () => ({
    meta: [
      { title: "Plecak — Catch Zone" },
      {
        name: "description",
        content: "Plecak trenera: Balle, jagody, mikstury, TM-y, kamienie ewolucji i Mega, bilety podróży.",
      },
      { property: "og:title", content: "Plecak — Catch Zone" },
      {
        property: "og:description",
        content: "Plecak trenera: Balle, jagody, mikstury, TM-y, kamienie ewolucji i Mega, bilety podróży.",
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
  const [category, setCategory] = useState<BagCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<BagSort>("category");
  const [hideEmpty, setHideEmpty] = useState(true);

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

  const bag = useMemo(() => buildBackpack(profile as any, data?.items ?? []), [profile, data?.items]);
  const visible = useMemo(
    () => filterBackpack(bag, { category, search, sort, hideEmpty }),
    [bag, category, search, sort, hideEmpty],
  );

  return (
    <GamePage
      title="Plecak"
      subtitle="Wszystkie przedmioty w jednym miejscu — filtruj po kategorii, szukaj i sortuj."
    >
      {isLoading || !profile ? (
        <p className="text-sm text-muted-foreground">Wczytuję plecak…</p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">Catch Coins</p>
              <p className="font-display text-2xl">{profile.catch_coins}</p>
            </div>
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">Energia</p>
              <p className="font-display text-2xl">
                {profile.energy}/{profile.energy_max}
              </p>
              <Button
                className="mt-2"
                size="sm"
                disabled={busy || profile.energy_bottles <= 0 || profile.energy >= profile.energy_max}
                onClick={() =>
                  void run(
                    () => drinkBottle(),
                    `Energia uzupełniona do ${profile.energy_max}/${profile.energy_max}.`,
                  )
                }
              >
                Zużyj Flakon ({profile.energy_bottles})
              </Button>
            </div>
            <div className="glass-panel rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">Poké Balle · {price} CC / szt.</p>
              <p className="font-display text-2xl">{profile.poke_balls}</p>
              <div className="mt-2 flex flex-wrap gap-2">
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
                    +{amount}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {BAG_CATEGORIES.map((cat) => (
              <Button
                key={cat.key}
                size="sm"
                variant={category === cat.key ? "default" : "outline"}
                onClick={() => setCategory(cat.key)}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Szukaj przedmiotu…"
              className="w-full sm:w-64"
            />
            {([
              { key: "category", label: "Wg kategorii" },
              { key: "name", label: "Wg nazwy" },
              { key: "count", label: "Wg ilości" },
            ] as { key: BagSort; label: string }[]).map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant={sort === option.key ? "secondary" : "outline"}
                onClick={() => setSort(option.key)}
              >
                {option.label}
              </Button>
            ))}
            <Button size="sm" variant={hideEmpty ? "secondary" : "outline"} onClick={() => setHideEmpty((v) => !v)}>
              {hideEmpty ? "Ukryj puste: tak" : "Ukryj puste: nie"}
            </Button>
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak przedmiotów w tej kategorii.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => (
                <div key={item.key} className="glass-panel rounded-2xl p-5">
                  <div className="flex items-center gap-3">
                    <img
                      src={itemSprite(item.sprite)}
                      alt={item.label}
                      loading="lazy"
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 [image-rendering:pixelated]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="font-display text-2xl">
                        {item.count}
                        {item.craftAt ? <span className="text-sm text-muted-foreground">/{item.craftAt}</span> : null}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{item.note}</p>
                  {item.craftAt && item.speciesId ? (
                    <Button
                      className="mt-3"
                      size="sm"
                      disabled={busy || item.count < item.craftAt}
                      onClick={() =>
                        void run(
                          () => craftStone({ data: { speciesId: item.speciesId! } }),
                          "Utworzono gatunkowy Kamień Mega.",
                        )
                      }
                    >
                      Utwórz Kamień
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </GamePage>
  );
}
