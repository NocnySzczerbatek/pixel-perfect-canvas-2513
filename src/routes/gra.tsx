import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Backpack,
  Boxes,
  Compass,
  Landmark,
  Medal,
  Repeat,
  Shield,
  ShoppingBag,
  Swords,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
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
  energy_updated_at: string;
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
            "trainer_name, trainer_level, trainer_exp, energy, energy_bottles, poke_balls, catch_coins, region, energy_updated_at",
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

  const [energyLeft, setEnergyLeft] = useState(0);
  const [energyNow, setEnergyNow] = useState<number | null>(null);
  useEffect(() => {
    if (!profile) return;
    const base = new Date(profile.energy_updated_at).getTime();
    const tick = () => {
      const elapsed = Math.max(0, Date.now() - base);
      const gained = Math.floor(elapsed / ENERGY_TICK_MS);
      const current = Math.min(MAX_ENERGY, profile.energy + gained);
      setEnergyNow(current);
      if (current >= MAX_ENERGY) {
        setEnergyLeft(0);
        return;
      }
      setEnergyLeft(ENERGY_TICK_MS - (elapsed % ENERGY_TICK_MS));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [profile]);

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
        <Stat
          label="Energia"
          value={`${energyNow ?? profile?.energy ?? "—"} / ${MAX_ENERGY}`}
          hint={
            !profile
              ? undefined
              : (energyNow ?? profile.energy) >= MAX_ENERGY
                ? "Pełna Energia"
                : `+1 pkt za ${formatCountdown(energyLeft)}`
          }
        />
        <Stat label="Catch Coins" value={profile?.catch_coins ?? "—"} />
        <Stat label="Poké Balle" value={profile?.poke_balls ?? "—"} />
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-2xl">Twoja drużyna</h2>
          <Link to="/druzyna" className="text-xs text-muted-foreground underline">
            Zarządzaj drużyną
          </Link>
        </div>
        <div className="glass-panel mt-4 overflow-x-auto rounded-2xl p-3">
          {party.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">Brak Pokémonów w drużynie.</p>
          ) : (
            <ul className="flex min-w-max items-stretch gap-3">
              {party.slice(0, 6).map((pokemon) => {
                const pct = Math.max(
                  0,
                  Math.min(100, Math.round((pokemon.hp_current / Math.max(1, pokemon.hp_max)) * 100)),
                );
                return (
                  <li key={pokemon.id}>
                    <Link
                      to="/pokemon/$id"
                      params={{ id: pokemon.id }}
                      className="tile-hover glass-panel flex w-32 flex-col items-center rounded-xl p-2 text-center"
                    >
                      <img
                        src={artworkUrl(pokemon.species_id)}
                        alt={pokemon.species_name}
                        loading="lazy"
                        width={96}
                        height={96}
                        className={`h-16 w-16 object-contain ${pokemon.fainted ? "opacity-40 grayscale" : ""}`}
                      />
                      <p className="mt-1 truncate text-sm font-medium">{pokemon.species_name}</p>
                      <p className="text-[11px] text-muted-foreground">Lvl {pokemon.level}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${pct > 50 ? "bg-aurora" : pct > 20 ? "bg-primary" : "bg-destructive"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {pokemon.fainted ? "Zemdlony" : `${pokemon.hp_current}/${pokemon.hp_max} HP`}
                      </p>
                    </Link>
                  </li>
                );
              })}
              {Array.from({ length: Math.max(0, 6 - party.length) }).map((_, i) => (
                <li
                  key={`empty-${i}`}
                  className="flex w-32 items-center justify-center rounded-xl border border-dashed border-border/60 text-[11px] text-muted-foreground"
                >
                  wolne miejsce
                </li>
              ))}
            </ul>
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

      {NAV_GROUPS.map((group) => (
        <section className="mt-10" key={group.title}>
          <h2 className="text-2xl">{group.title}</h2>
          <p className="text-xs text-muted-foreground">{group.note}</p>
          <nav className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.tiles.map(({ to, label, Icon, desc }) => (
              <Link
                key={to}
                to={to}
                className="tile-hover glass-panel flex flex-col items-start gap-2 rounded-2xl p-4"
              >
                <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
                <span className="font-display text-xl">{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </Link>
            ))}
          </nav>
        </section>
      ))}
    </main>
  );
}

const MAX_ENERGY = 100;
const ENERGY_TICK_MS = 3 * 60 * 1000;

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const NAV_GROUPS = [
  {
    title: "Walka",
    note: "Tu zdobywasz doświadczenie, odznaki i monety.",
    tiles: [
      { to: "/eksploracja", label: "Eksploracja", Icon: Compass, desc: "Biomy, dzicy i trenerzy" },
      { to: "/sale", label: "Sale", Icon: Landmark, desc: "8 Liderów regionu" },
      { to: "/pvp", label: "PvP", Icon: Swords, desc: "Napady na innych trenerów" },
      { to: "/trenerzy", label: "Trenerzy", Icon: Users, desc: "Przeciwnicy i klasy" },
    ],
  },
  {
    title: "Drużyna",
    note: "Twoje Pokémony, torba i skrzynia.",
    tiles: [
      { to: "/druzyna", label: "Drużyna", Icon: Shield, desc: "Skład i leczenie" },
      { to: "/pc-box", label: "PC Box", Icon: Boxes, desc: "Reszta kolekcji" },
      { to: "/ekwipunek", label: "Ekwipunek", Icon: Backpack, desc: "Balle i mikstury" },
      { to: "/odznaki", label: "Odznaki", Icon: Medal, desc: "Zdobyte odznaki" },
    ],
  },
  {
    title: "Handel i konto",
    note: "Zakupy, wymiany i Twoje statystyki.",
    tiles: [
      { to: "/sklep", label: "Sklep", Icon: ShoppingBag, desc: "Balle, mikstury, pakiety" },
      { to: "/gts", label: "GTS", Icon: Repeat, desc: "Giełda i Kupiec" },
      { to: "/ranking", label: "Ranking", Icon: Trophy, desc: "Najlepsi trenerzy" },
      { to: "/profil", label: "Profil", Icon: UserRound, desc: "Twoje statystyki" },
    ],
  },
] as const;

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string | undefined;
}) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
