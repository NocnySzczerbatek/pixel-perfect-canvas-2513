import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { GamePage } from "@/components/game/GamePage";
import { TypeBadges } from "@/components/game/TypeBadges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BIOMES } from "@/lib/biomes";
import { biomePool, regionDex } from "@/lib/encounter-pool";
import { REGIONS, artworkUrl } from "@/lib/game-data";
import { pokedexProgress } from "@/lib/pokedex.functions";
import { STAT_LABELS } from "@/lib/pokedex";

export const Route = createFileRoute("/pokedex")({
  head: () => ({
    meta: [
      { title: "Pokédex regionu — Catch Zone" },
      {
        name: "description",
        content:
          "Twój Pokédex: spotkane i złapane Pokémony, ich typy, statystyki bazowe i biomy, w których je znajdziesz.",
      },
      { property: "og:title", content: "Pokédex — Catch Zone" },
      {
        property: "og:description",
        content: "Sprawdź, kogo spotkałeś, kogo złapałeś i w jakim biomie szukać kolejnych Pokémonów.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PokedexPage,
});

type Filter = "all" | "seen" | "caught" | "missing";

const STAT_ORDER = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"] as const;
const STAT_NAMES: Record<string, string> = {
  hp: STAT_LABELS.hp,
  attack: STAT_LABELS.atk,
  defense: STAT_LABELS.def,
  "special-attack": STAT_LABELS.spa,
  "special-defense": STAT_LABELS.spd,
  speed: STAT_LABELS.spe,
};

/** Biomy, w których dany gatunek może się pojawić w wybranym regionie. */
function biomesFor(speciesId: number, region: string | null) {
  return BIOMES.filter((biome) => biomePool(biome.slug, region).some((s) => s.id === speciesId));
}

function PokedexPage() {
  const fetchProgress = useServerFn(pokedexProgress);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pokedex"],
    queryFn: () => fetchProgress(),
  });

  const region = data?.region ?? null;
  const seen = useMemo(() => new Set(data?.seenIds ?? []), [data]);
  const caught = useMemo(() => new Set(data?.caughtIds ?? []), [data]);
  const dex = useMemo(() => regionDex(region), [region]);
  const entries = useMemo(
    () =>
      dex.filter((entry) => {
        if (filter === "seen") return seen.has(entry.id);
        if (filter === "caught") return caught.has(entry.id);
        if (filter === "missing") return !seen.has(entry.id);
        return true;
      }),
    [dex, filter, seen, caught],
  );

  const regionName = REGIONS.find((r) => r.slug === region)?.name ?? "wszystkie regiony";
  const detail = selected ? dex.find((entry) => entry.id === selected) : null;
  const detailSeen = detail ? seen.has(detail.id) : false;

  const { data: apiDetail } = useQuery({
    queryKey: ["pokedex-detail", selected],
    enabled: Boolean(selected) && detailSeen,
    queryFn: async () => {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${selected}`);
      if (!response.ok) throw new Error("Nie udało się wczytać danych gatunku.");
      return (await response.json()) as {
        height: number;
        weight: number;
        stats: { base_stat: number; stat: { name: string } }[];
      };
    },
  });

  return (
    <GamePage
      title="Pokédex"
      subtitle={`Region ${regionName}: ${caught.size} złapanych i ${seen.size} spotkanych z ${dex.length} gatunków.`}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Wczytuję Pokédex…</p>
      ) : (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">
              Pokémona poznajesz w eksploracji — po pierwszym spotkaniu jego wpis się odblokowuje i
              pokazuje typy, statystyki bazowe oraz biomy, w których go znajdziesz. Złapane gatunki
              są podświetlone.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["all", "Wszystkie"],
                  ["seen", "Spotkane"],
                  ["caught", "Złapane"],
                  ["missing", "Brakujące"],
                ] as [Filter, string][]
              ).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={filter === key ? "default" : "outline"}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {entries.map((entry) => {
              const isSeen = seen.has(entry.id);
              const isCaught = caught.has(entry.id);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(entry.id)}
                    className={`tile-hover glass-panel flex w-full flex-col items-center rounded-2xl p-3 text-center ${
                      isCaught ? "ring-1 ring-aurora/60" : ""
                    }`}
                  >
                    <img
                      src={artworkUrl(entry.id)}
                      alt={isSeen ? entry.name : "Nieznany Pokémon"}
                      loading="lazy"
                      width={96}
                      height={96}
                      className={`h-20 w-20 object-contain ${isSeen ? "" : "opacity-30 grayscale"}`}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      #{String(entry.id).padStart(4, "0")}
                    </p>
                    <p className="truncate text-sm font-medium">{isSeen ? entry.name : "???"}</p>
                    {isSeen ? <TypeBadges types={entry.types} className="mt-1" /> : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {isCaught ? "Złapany" : isSeen ? "Spotkany" : "Nieodkryty"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak wpisów dla tego filtra.</p>
          ) : null}
        </div>
      )}

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail ? (detailSeen ? detail.name : "Nieodkryty Pokémon") : ""}
            </DialogTitle>
            <DialogDescription>
              {detail ? `Numer Pokédexu #${String(detail.id).padStart(4, "0")}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            detailSeen ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={artworkUrl(detail.id)}
                    alt={detail.name}
                    width={128}
                    height={128}
                    className="h-28 w-28 object-contain"
                  />
                  <div>
                    <TypeBadges types={detail.types} />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {caught.has(detail.id) ? "Masz go już w kolekcji." : "Spotkany, jeszcze nie złapany."}
                    </p>
                    {apiDetail ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Wzrost {(apiDetail.height / 10).toFixed(1)} m · waga{" "}
                        {(apiDetail.weight / 10).toFixed(1)} kg
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Statystyki bazowe
                  </p>
                  {apiDetail ? (
                    <ul className="mt-2 space-y-1">
                      {STAT_ORDER.map((key) => {
                        const stat = apiDetail.stats.find((s) => s.stat.name === key);
                        const value = stat?.base_stat ?? 0;
                        return (
                          <li key={key} className="flex items-center gap-3 text-sm">
                            <span className="w-28 text-muted-foreground">{STAT_NAMES[key]}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-aurora"
                                style={{ width: `${Math.min(100, (value / 160) * 100)}%` }}
                              />
                            </div>
                            <span className="w-8 text-right">{value}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Wczytuję statystyki…</p>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Gdzie go spotkasz
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {biomesFor(detail.id, region).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        W tym regionie nie pojawia się dziko — szukaj go na giełdzie GTS lub u
                        handlarza.
                      </p>
                    ) : (
                      biomesFor(detail.id, region).map((biome) => (
                        <span
                          key={biome.slug}
                          className="rounded-full border border-border/60 px-3 py-1 text-xs"
                        >
                          {biome.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ten wpis odblokujesz po pierwszym spotkaniu w eksploracji.
              </p>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </GamePage>
  );
}
