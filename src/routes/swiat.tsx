import { createFileRoute, Link } from "@tanstack/react-router";

import { GamePage } from "@/components/game/GamePage";
import { WORLD_ZONES, biomeTypes, zoneBiomes, zoneTypes } from "@/lib/world-zones";

export const Route = createFileRoute("/swiat")({
  head: () => ({
    meta: [
      { title: "Mapa świata — Catch Zone" },
      {
        name: "description",
        content:
          "Pełna mapa świata Catch Zone: strefy, biomy i typy Pokémonów, które w nich występują. Kliknij strefę i ruszaj na wyprawę.",
      },
      { property: "og:title", content: "Mapa świata — Catch Zone" },
      {
        property: "og:description",
        content: "Strefy i biomy Catch Zone z typami Pokémonów oraz szybkim wejściem w eksplorację.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SwiatPage,
});

function SwiatPage() {
  return (
    <GamePage>
      <div className="space-y-6">
        <header className="glass-panel rounded-2xl p-5">
          <h1 className="font-display text-3xl">Mapa świata</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Świat dzieli się na strefy, a każda strefa na biomy. W biomie spotkasz wyłącznie Pokémony,
            których typ 1 lub typ 2 pasuje do tego terenu. Kliknij biom, aby od razu ruszyć na wyprawę.
          </p>
        </header>

        {WORLD_ZONES.map((zone) => (
          <section key={zone.slug} className="glass-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl">{zone.name}</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                od Lvl {zone.minLevel}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{zone.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {zoneTypes(zone).map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-wide text-ice"
                >
                  {type}
                </span>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {zoneBiomes(zone).map((biome) => (
                <Link
                  key={biome.slug}
                  to="/eksploracja"
                  search={{ biome: biome.slug }}
                  className="tile-hover glass-panel overflow-hidden rounded-2xl"
                >
                  <img
                    src={biome.image}
                    alt={`Biom ${biome.name}`}
                    loading="lazy"
                    width={768}
                    height={512}
                    className="h-28 w-full object-cover"
                  />
                  <div className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-display text-xl">{biome.name}</p>
                      <span className="text-xs text-muted-foreground">{biome.element}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{biome.tagline}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {biomeTypes(biome).map((type) => (
                        <span
                          key={type}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs font-medium text-ice">Ruszaj na wyprawę · 2–5 Energii</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </GamePage>
  );
}
