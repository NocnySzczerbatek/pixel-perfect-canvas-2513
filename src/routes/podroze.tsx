import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, MapPin, Plane, Plane as PlaneIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { REGIONS } from "@/lib/game-data";
import { flyToRegion, getTravelState } from "@/lib/travel.functions";
import { formatDuration } from "@/lib/time";
import { TRAVEL_TICKET_PRICE, travelWindowState } from "@/lib/travel";
import { itemSprite } from "@/lib/pokedex";
import { REGION_MAP_POINTS } from "@/lib/region-map";
import travelMap from "@/assets/travel-map.jpg";

export const Route = createFileRoute("/podroze")({
  head: () => ({
    meta: [
      { title: "Mapa podróży między regionami — Catch Zone" },
      {
        name: "description",
        content:
          "Mapa dziewięciu regionów z oknami lotów według czasu polskiego i oznaczeniem miejsc, w których już byłeś.",
      },
      { property: "og:title", content: "Mapa podróży — Catch Zone" },
      {
        property: "og:description",
        content: "Kliknij region na mapie, sprawdź okno lotu i zobacz, gdzie już byłeś.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TravelPage,
});

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function TravelPage() {
  const fetchState = useServerFn(getTravelState);
  const fly = useServerFn(flyToRegion);
  const [state, setState] = useState<Awaited<ReturnType<typeof getTravelState>> | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const { isLoading } = useQuery({
    queryKey: ["travel"],
    queryFn: async () => {
      const result = await fetchState();
      setState(result);
      return result;
    },
  });
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visits = useMemo(() => {
    const map = new Map<string, { visits: number; first: string; last: string }>();
    for (const entry of state?.visits ?? []) {
      map.set(entry.region, {
        visits: entry.visits,
        first: entry.first_visit_at,
        last: entry.last_visit_at,
      });
    }
    return map;
  }, [state]);

  const handleFly = async (region: string) => {
    setBusy(true);
    try {
      const result = await fly({ data: { region } });
      setState(result.state);
      if (!result.ok) toast.error(result.reason);
      else toast.success("Wystartowałeś! Eksploracja korzysta teraz z Pokémonów tego regionu.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lot nie powiódł się.");
    } finally {
      setBusy(false);
    }
  };

  const homeRegion = state?.home_region ?? null;
  const activeSlug = picked ?? state?.travel_region ?? homeRegion ?? "kanto";
  const active = REGIONS.find((entry) => entry.slug === activeSlug) ?? REGIONS[0]!;
  const activeWindow = travelWindowState(active.slug, now);
  const activeVisit = visits.get(active.slug);
  const activeIsHome = active.slug === homeRegion;
  const visitedCount = (state?.visits.length ?? 0) + (homeRegion && !visits.has(homeRegion) ? 1 : 0);

  return (
    <GamePage
      title="Mapa podróży"
      subtitle="Kliknij region na mapie: zobaczysz okno lotu według czasu polskiego i to, czy już tam byłeś."
    >
      {isLoading || !state ? (
        <p className="text-sm text-muted-foreground">Sprawdzam rozkład lotów…</p>
      ) : (
        <div className="space-y-6">
          <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bilety Podróży</p>
              <p className="font-display text-3xl">{state.travel_tickets}</p>
            </div>
            <img
              src={itemSprite("ss-ticket")}
              alt="Bilet Podróży"
              width={48}
              height={48}
              className="h-12 w-12 [image-rendering:pixelated]"
            />
            <div className="text-sm text-muted-foreground">
              <p>Region domowy: {REGIONS.find((r) => r.slug === state.home_region)?.name ?? "—"}</p>
              <p>Odwiedzone regiony: {visitedCount}/{REGIONS.length}</p>
              <p>Bilet w sklepie: {TRAVEL_TICKET_PRICE} CC</p>
            </div>
          </div>

          {state.travel_region && state.travel_until ? (
            <div className="glass-panel rounded-2xl border border-aurora/40 p-5">
              <p className="font-display text-2xl">
                Trwa wycieczka: {REGIONS.find((r) => r.slug === state.travel_region)?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Powrót za {formatDuration(new Date(state.travel_until).getTime() - now.getTime())}
              </p>
            </div>
          ) : null}

          <div className="glass-panel rounded-2xl p-4">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl ring-1 ring-border/60">
              <img
                src={travelMap}
                alt="Mapa świata z dziewięcioma regionami połączonymi trasami lotów"
                width={1600}
                height={1000}
                loading="lazy"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover [image-rendering:pixelated]"
              />
              <div className="pointer-events-none absolute inset-0 bg-background/35" />
              {REGIONS.map((entry) => {
                const point = REGION_MAP_POINTS[entry.slug] ?? { x: 50, y: 50 };
                const windowState = travelWindowState(entry.slug, now);
                const isHome = entry.slug === homeRegion;
                const visited = isHome || visits.has(entry.slug);
                const isSelected = entry.slug === active.slug;
                const isOpen = windowState?.open ?? false;
                return (
                  <button
                    key={entry.slug}
                    type="button"
                    onClick={() => setPicked(entry.slug)}
                    aria-label={`${entry.name}: okno ${windowState?.label}, ${
                      visited ? "już odwiedzony" : "jeszcze nieodwiedzony"
                    }`}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3 py-2 text-left backdrop-blur transition-transform hover:scale-105 ${
                      isSelected
                        ? "border-aurora/70 bg-background/85 shadow-lg"
                        : isOpen
                          ? "border-aurora/40 bg-background/65"
                          : "border-border/60 bg-background/50"
                    } ${visited ? "" : "opacity-75"}`}
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  >
                    <span className="flex items-center gap-2">
                      {isHome ? (
                        <MapPin className="h-4 w-4 text-aurora" aria-hidden />
                      ) : (
                        <PlaneIcon
                          className={`h-4 w-4 ${isOpen ? "text-aurora" : "text-muted-foreground"}`}
                          aria-hidden
                        />
                      )}
                      <span className="font-display text-sm md:text-base">{entry.name}</span>
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden />
                      {windowState?.label}
                    </span>
                    <span
                      className={`mt-1 block text-[10px] font-semibold ${
                        isOpen ? "text-aurora" : "text-muted-foreground"
                      }`}
                    >
                      {isHome ? "Dom" : isOpen ? "Otwarte" : `za ${formatDuration(windowState?.msUntilOpen ?? 0)}`}
                    </span>
                    <span className="mt-1 block text-[10px]">
                      {visited ? (
                        <span className="text-aurora">✓ byłeś tu</span>
                      ) : (
                        <span className="text-muted-foreground">niezwiedzony</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Znacznik domu to Twój region startowy. Ptaszek oznacza region, w którym już byłeś.
            </p>
          </div>

          <section className="glass-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {active.gen} · okno {activeWindow?.label}
                </p>
                <h2 className="font-display text-3xl">{active.name}</h2>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">{active.tagline}</p>
                <p className="mt-2 text-sm">
                  {activeIsHome
                    ? "To Twój region domowy — zawsze dostępny."
                    : activeVisit
                      ? `Byłeś tu ${activeVisit.visits} raz(y). Pierwsza wizyta: ${dateLabel(
                          activeVisit.first,
                        )}, ostatnia: ${dateLabel(activeVisit.last)}.`
                      : "Jeszcze tu nie byłeś — pierwsza wizyta odblokuje nowe gatunki w eksploracji."}
                </p>
              </div>
              <div className="min-w-[220px]">
                {activeIsHome ? (
                  <Button className="w-full" disabled variant="outline">
                    Region domowy
                  </Button>
                ) : activeWindow?.open ? (
                  <Button
                    className="w-full"
                    disabled={busy || state.travel_tickets < 1}
                    onClick={() => void handleFly(active.slug)}
                  >
                    <Plane className="h-4 w-4" aria-hidden />
                    Leć · koszt 1 bilet
                  </Button>
                ) : (
                  <Button className="w-full" disabled variant="outline">
                    Otwarcie za {formatDuration(activeWindow?.msUntilOpen ?? 0)}
                  </Button>
                )}
                {activeWindow?.open && !activeIsHome ? (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Okno zamyka się za {formatDuration(activeWindow.msUntilClose)}
                  </p>
                ) : null}
                {state.travel_tickets < 1 ? (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Brak Biletu Podróży — kupisz go w Sklepie.
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      )}
    </GamePage>
  );
}
