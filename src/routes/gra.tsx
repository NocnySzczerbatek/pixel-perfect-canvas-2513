import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { artworkUrl, findRegion } from "@/lib/game-data";

export const Route = createFileRoute("/gra")({
  head: () => ({
    meta: [
      { title: "Catch Zone — panel trenera" },
      {
        name: "description",
        content:
          "Twój panel trenera: energia, Catch Coins, drużyna Pokémonów i wybór biomu do eksploracji.",
      },
      { property: "og:title", content: "Catch Zone — panel trenera" },
      {
        property: "og:description",
        content: "Sprawdź energię, monety i drużynę, a potem wyrusz w biom.",
      },
    ],
  }),
  component: TrainerDashboard,
});

type Profile = {
  trainer_name: string;
  trainer_level: number;
  trainer_exp: number;
  energy: number;
  energy_bottles: number;
  poke_balls: number;
  catch_coins: number;
  region: string | null;
};

type Pokemon = {
  id: string;
  species_id: number;
  species_name: string;
  level: number;
  hp_current: number;
  hp_max: number;
  fainted: boolean;
};

function TrainerDashboard() {
  const { session, loading, userId } = useSession();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [party, setParty] = useState<Pokemon[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void navigate({ to: "/" });
      return;
    }
    if (!userId) return;
    let active = true;
    void (async () => {
      const [{ data: profileRow }, { data: pokemonRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "trainer_name, trainer_level, trainer_exp, energy, energy_bottles, poke_balls, catch_coins, region",
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("player_pokemon")
          .select("id, species_id, species_name, level, hp_current, hp_max, fainted")
          .eq("owner_id", userId)
          .eq("in_party", true),
      ]);
      if (!active) return;
      setProfile(profileRow as Profile | null);
      setParty((pokemonRows ?? []) as Pokemon[]);
    })();
    return () => {
      active = false;
    };
  }, [loading, session, userId, navigate]);

  const region = findRegion(profile?.region);

  return (
    <main className="min-h-screen px-5 py-8 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            {region ? region.name : "Catch Zone"}
          </p>
          <h1 className="aurora-text text-4xl">
            {profile?.trainer_name ?? "Panel trenera"}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut();
            void navigate({ to: "/" });
          }}
        >
          Wyloguj
        </Button>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Poziom trenera" value={profile?.trainer_level ?? "—"} />
        <Stat label="Energia" value={`${profile?.energy ?? "—"} / 100`} />
        <Stat label="Catch Coins" value={profile?.catch_coins ?? "—"} />
        <Stat label="Poké Balle" value={profile?.poke_balls ?? "—"} />
      </section>

      <section className="mt-10">
        <h2 className="text-2xl">Twoja drużyna</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {party.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak Pokémonów w drużynie.</p>
          ) : (
            party.map((pokemon) => (
              <article key={pokemon.id} className="glass-panel rounded-2xl p-5 text-center">
                <img
                  src={artworkUrl(pokemon.species_id)}
                  alt={pokemon.species_name}
                  loading="lazy"
                  width={220}
                  height={220}
                  className="mx-auto h-28 w-28 object-contain"
                />
                <p className="mt-2 font-display text-2xl">{pokemon.species_name}</p>
                <p className="text-xs text-muted-foreground">
                  Lvl {pokemon.level} · HP {pokemon.hp_current}/{pokemon.hp_max}
                  {pokemon.fainted ? " · Zemdlony" : ""}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl">Ogłoszenia</h2>
        <div className="glass-panel mt-4 rounded-2xl p-5 text-sm text-muted-foreground">
          Pogoda: mroźnie, aurora nad doliną. Wydarzenie tygodnia: +10% szansy na rzadkie
          spotkania na Śnieżnej Polanie. Kolejne moduły — eksploracja biomów, Catch Zone,
          walki z botami, PvP i Sale — dochodzą w następnych etapach.
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}
