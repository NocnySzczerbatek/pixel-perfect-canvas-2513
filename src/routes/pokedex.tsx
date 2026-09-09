import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { GamePage } from "@/components/game/GamePage";
import { TypeBadges } from "@/components/game/TypeBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BIOMES } from "@/lib/biomes";
import { biomePool, regionDex } from "@/lib/encounter-pool";
import { FULL_DEX } from "@/lib/full-dex";
import { REGIONS, artworkUrl } from "@/lib/game-data";
import { ivRating } from "@/lib/iv";
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

type Filter = "all" | "seen" | "caught" | "missing" | "shiny";
type Scope = "region" | "world";
type Sort = "number" | "name" | "iv" | "level" | "count";

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
  const [scope, setScope] = useState<Scope>("region");
  const [sort, setSort] = useState<Sort>("number");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pokedex"],
    queryFn: () => fetchProgress(),
  });

  const region = data?.region ?? null;
  const seen = useMemo(() => new Set(data?.seenIds ?? []), [data]);
  const caught = useMemo(() => new Set(data?.caughtIds ?? []), [data]);
  const owned = useMemo(() => {
    const map = new Map<number, (typeof data)["owned"][number]>();
    for (const row of data?.owned ?? []) map.set(row.speciesId, row);
    return map;
  }, [data]);
  const dex = useMemo(
    () => (scope === "world" ? FULL_DEX : regionDex(region)),
    [region, scope],
  );
  const entries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = dex.filter((entry) => {
      if (filter === "seen") return seen.has(entry.id);
      if (filter === "caught") return caught.has(entry.id);
      if (filter === "missing") return !seen.has(entry.id);
      if (filter === "shiny") return owned.get(entry.id)?.shiny === true;
      return true;
    });
    const searched = needle
      ? list.filter(
          (entry) =>
            entry.name.toLowerCase().includes(needle) ||
            entry.types.some((t) => t.toLowerCase().includes(needle)) ||
            String(entry.id) === needle,
        )
      : list;
    const sorted = [...searched];
    sorted.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "pl");
      if (sort === "iv") return (owned.get(b.id)?.bestIv ?? -1) - (owned.get(a.id)?.bestIv ?? -1);
      if (sort === "level") return (owned.get(b.id)?.maxLevel ?? -1) - (owned.get(a.id)?.maxLevel ?? -1);
      if (sort === "count") return (owned.get(b.id)?.count ?? 0) - (owned.get(a.id)?.count ?? 0);
      return a.id - b.id;
    });
    return sorted;
  }, [dex, filter, seen, caught, owned, search, sort]);

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
      subtitle={`${scope === "world" ? "Cały świat" : `Region ${regionName}`}: ${caught.size} złapanych i ${seen.size} spotkanych z ${dex.length} gatunków.`}
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
                  ["shiny", "Shiny"],
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Szukaj: nazwa, typ albo numer"
                className="h-9 w-full sm:w-64"
              />
              {(
                [
                  ["region", "Mój region"],
                  ["world", "Cały świat (1025)"],
                ] as [Scope, string][]
              ).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={scope === key ? "default" : "outline"}
                  onClick={() => setScope(key)}
                >
                  {label}
                </Button>
              ))}
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm"
                aria-label="Sortowanie Pokédexu"
              >
                <option value="number">Sortuj: numer</option>
                <option value="name">Sortuj: nazwa</option>
                <option value="iv">Sortuj: najlepsze IV</option>
                <option value="level">Sortuj: najwyższy poziom</option>
                <option value="count">Sortuj: liczba złapanych</option>
              </select>
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
                    {(() => {
                      const record = owned.get(entry.id);
                      if (!record) return null;
                      const rating = ivRating(record.bestIv);
                      return (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          ×{record.count} · Lvl {record.maxLevel} ·{" "}
                          <span className={rating.className.split(" ")[0]}>{record.bestIv}% IV</span>
                          {record.shiny ? " · ★" : ""}
                        </p>
                      );
                    })()}
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

                {(() => {
                  const record = owned.get(detail.id);
                  if (!record) return null;
                  const rating = ivRating(record.bestIv);
                  return (
                    <div className="rounded-xl border border-border/60 p-3 text-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Twoja kolekcja
                      </p>
                      <p className="mt-2">
                        Złapane: {record.count} · najwyższy poziom: {record.maxLevel}
                      </p>
                      <p className="mt-1">
                        Najlepsze IV:{" "}
                        <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${rating.className}`}>
                          {record.bestIv}% · {rating.label}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pierwszy raz złapany:{" "}
                        {new Date(record.firstCaughtAt).toLocaleDateString("pl-PL")}
                        {record.shiny ? " · masz wersję Shiny ★" : ""}
                      </p>
                    </div>
                  );
                })()}

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
