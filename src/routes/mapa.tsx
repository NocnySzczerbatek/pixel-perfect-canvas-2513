import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Landmark, Medal, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { REGIONS, artworkUrl } from "@/lib/game-data";
import { gymsForRegion } from "@/lib/gyms";
import { getGymsState } from "@/lib/gyms.functions";
import { REGION_MAP_POINTS } from "@/lib/region-map";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa regionów — Catch Zone" },
      {
        name: "description",
        content:
          "Interaktywna mapa dziewięciu regionów: ikony Sal, Liderów i odznak. Kliknij region, by zobaczyć jego ośmiu Liderów i komplet odznak.",
      },
      { property: "og:title", content: "Mapa regionów — Catch Zone" },
      {
        property: "og:description",
        content: "Kliknij region na mapie i sprawdź jego Sale, Liderów oraz zdobyte odznaki.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const fetchState = useServerFn(getGymsState);
  const { data, isLoading } = useQuery({ queryKey: ["gyms"], queryFn: () => fetchState() });
  const [open, setOpen] = useState<string | null>(null);

  const earned = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const badge of data?.badges ?? []) {
      const set = map.get(badge.region) ?? new Set<number>();
      set.add(badge.gym_index);
      map.set(badge.region, set);
    }
    return map;
  }, [data]);

  const currentRegion = data?.region ?? null;
  const activeRegion = open ?? currentRegion ?? "kanto";
  const region = REGIONS.find((r) => r.slug === activeRegion) ?? REGIONS[0]!;
  const gyms = gymsForRegion(region.slug);
  const ownedHere = earned.get(region.slug) ?? new Set<number>();

  return (
    <GamePage
      title="Mapa regionów"
      subtitle="Kliknij region na mapie, aby otworzyć jego sekcję: osiem Sal, Liderzy i odznaki."
    >
      <div className="space-y-6">
        <div className="glass-panel relative overflow-hidden rounded-2xl p-4">
          <div className="relative aspect-[16/10] w-full rounded-xl bg-[radial-gradient(circle_at_20%_20%,hsl(var(--aurora)/0.18),transparent_55%),radial-gradient(circle_at_80%_70%,hsl(var(--primary)/0.16),transparent_55%)] ring-1 ring-border/60">
            <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px]" />
            {REGIONS.map((entry) => {
              const point = REGION_MAP_POINTS[entry.slug] ?? { x: 50, y: 50 };
              const owned = earned.get(entry.slug)?.size ?? 0;
              const isActive = entry.slug === region.slug;
              const isHome = entry.slug === currentRegion;
              return (
                <button
                  key={entry.slug}
                  type="button"
                  onClick={() => setOpen(entry.slug)}
                  aria-label={`Region ${entry.name}: ${owned} z 8 odznak`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3 py-2 text-left backdrop-blur transition-transform hover:scale-105 ${
                    isActive
                      ? "border-aurora/70 bg-background/80 shadow-lg"
                      : "border-border/60 bg-background/55"
                  }`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                  <span className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-aurora" aria-hidden />
                    <span className="font-display text-sm md:text-base">{entry.name}</span>
                    {isHome ? (
                      <Sparkles className="h-3.5 w-3.5 text-aurora" aria-hidden />
                    ) : null}
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Medal className="h-3 w-3" aria-hidden />
                    {owned}/8
                  </span>
                  <span className="mt-1 flex gap-0.5">
                    {gymsForRegion(entry.slug).map((gym) => (
                      <img
                        key={gym.index}
                        src={gym.imageUrl}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        width={12}
                        height={12}
                        className={`h-3 w-3 object-contain ${
                          (earned.get(entry.slug)?.has(gym.index) ?? false)
                            ? ""
                            : "opacity-40 grayscale"
                        }`}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          {isLoading ? (
            <p className="mt-3 text-xs text-muted-foreground">Wczytuję Twoje odznaki…</p>
          ) : null}
        </div>

        <section className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {region.gen} · {ownedHere.size}/8 odznak
              </p>
              <h2 className="font-display text-3xl">{region.name}</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{region.tagline}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {region.slug === currentRegion ? (
                <Button asChild size="sm">
                  <Link to="/sale">Idź do Sal</Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link to="/podroze">Zaplanuj lot</Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link to="/odznaki">Moje odznaki</Link>
              </Button>
            </div>
          </div>

          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {gyms.map((gym) => {
              const has = ownedHere.has(gym.index);
              return (
                <li key={gym.index} className="glass-panel rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={gym.imageUrl}
                      alt={gym.badgeName}
                      loading="lazy"
                      width={48}
                      height={48}
                      className={`h-12 w-12 object-contain ${has ? "" : "opacity-45 grayscale"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Sala {gym.index} · typ {gym.type}
                      </p>
                      <p className="flex items-center gap-2 font-display text-xl">
                        <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                        {gym.leader}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{gym.badgeName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Drużyna Lvl {gym.level} · {gym.teamSize} Pokémony
                      </p>
                      {has ? (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-aurora">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Zdobyta
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {gym.team.map((member, idx) => (
                      <img
                        key={idx}
                        src={artworkUrl(member.species_id)}
                        alt={member.species_name}
                        title={`${member.species_name} · Lvl ${member.level}`}
                        loading="lazy"
                        width={40}
                        height={40}
                        className="h-10 w-10 object-contain"
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </GamePage>
  );
}
