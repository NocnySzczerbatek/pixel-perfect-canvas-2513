import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Coins, Dumbbell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { useTrainerData } from "@/hooks/useTrainerData";
import { artworkUrl } from "@/lib/game-data";
import { STAT_KEYS, STAT_LABELS, movePool, speciesType, type StatKey } from "@/lib/pokedex";
import {
  TRAINING_LEVEL_STEP,
  trainPokemon,
  trainingCost,
  type PokemonRow,
} from "@/lib/trainer.functions";

export const Route = createFileRoute("/pokemon/$id")({
  head: () => ({
    meta: [
      { title: "Szczegóły Pokémona — Catch Zone" },
      {
        name: "description",
        content:
          "Statystyki wrodzone, natura, umiejętność i trening za Catch Coins oraz lista ruchów Pokémona.",
      },
      { property: "og:title", content: "Szczegóły Pokémona — Catch Zone" },
      {
        property: "og:description",
        content: "Trenuj statystyki za Catch Coins i sprawdź, jakich ruchów uczy się Twój Pokémon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PokemonDetailPage,
});

const IV_OF: Record<StatKey, keyof PokemonRow> = {
  hp: "iv_hp",
  atk: "iv_atk",
  def: "iv_def",
  spa: "iv_spa",
  spd: "iv_spd",
  spe: "iv_spe",
};

function PokemonDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading, setData } = useTrainerData();
  const train = useServerFn(trainPokemon);
  const [busy, setBusy] = useState(false);

  const pokemon = (data?.pokemon ?? []).find((p) => p.id === id);
  const coins = data?.profile.catch_coins ?? 0;

  const handleTrain = async (stat: StatKey) => {
    setBusy(true);
    try {
      const result = await train({ data: { id, stat } });
      if (result.data) setData(result.data);
      if (!result.ok) {
        toast.error(result.reason);
      } else {
        toast.success(
          result.leveledUp
            ? `Trening zaliczony (−${result.cost} CC). Awans na Lvl ${result.level}!`
            : `Trening zaliczony (−${result.cost} CC).`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Trening się nie udał.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <GamePage title="Pokémon" subtitle="Wczytuję dane Pokémona…">
        <div className="glass-panel h-64 animate-pulse rounded-2xl" />
      </GamePage>
    );
  }

  if (!pokemon) {
    return (
      <GamePage title="Nie znaleziono" subtitle="Ten Pokémon nie jest już w Twojej kolekcji.">
        <Link to="/druzyna" className="text-sm text-aurora hover:underline">
          Wróć do drużyny
        </Link>
      </GamePage>
    );
  }

  const type = speciesType(pokemon.species_id);
  const moves = movePool(pokemon.species_id);
  const toNextLevel =
    TRAINING_LEVEL_STEP - (pokemon.training_points % TRAINING_LEVEL_STEP || 0);

  return (
    <GamePage
      title={pokemon.nickname ?? pokemon.species_name}
      subtitle={`Typ ${type} · Lvl ${pokemon.level} · natura ${pokemon.nature ?? "—"} · umiejętność ${pokemon.ability ?? "—"}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={pokemon.in_party ? "/druzyna" : "/pc-box"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {pokemon.in_party ? "Drużyna" : "PC Box"}
        </Link>
        <span className="inline-flex items-center gap-2 text-sm text-ice">
          <Coins className="h-4 w-4" aria-hidden />
          {coins} Catch Coins
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="glass-panel rounded-2xl p-5 text-center">
          <img
            src={artworkUrl(pokemon.species_id)}
            alt={pokemon.nickname ?? pokemon.species_name}
            loading="lazy"
            width={320}
            height={320}
            className="mx-auto h-44 w-44 object-contain"
          />
          <p className="mt-2 font-display text-3xl">{pokemon.species_name}</p>
          <p className="text-sm text-muted-foreground">
            HP {pokemon.hp_current}/{pokemon.hp_max}
          </p>
          <dl className="mt-4 space-y-1 text-left text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Natura</dt>
              <dd>{pokemon.nature ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Umiejętność</dt>
              <dd>{pokemon.ability ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Punkty treningu</dt>
              <dd>{pokemon.training_points}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Do awansu</dt>
              <dd>{toNextLevel} pkt</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Natura i umiejętność są losowane przy złapaniu i nie da się ich zmienić.
          </p>
        </section>

        <section className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <h2 className="text-2xl">Statystyki wrodzone (IV)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Każdy trening to +1 do wybranej statystyki (max 31). Co {TRAINING_LEVEL_STEP} punkty
            treningu Pokémon zyskuje poziom.
          </p>
          <ul className="mt-4 space-y-3">
            {STAT_KEYS.map((stat) => {
              const value = pokemon[IV_OF[stat]] as number;
              const cost = trainingCost(value);
              const maxed = value >= 31;
              return (
                <li key={stat} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm">{STAT_LABELS[stat]}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-aurora transition-all"
                      style={{ width: `${Math.round((value / 31) * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-sm tabular-nums">{value}/31</span>
                  <Button
                    size="sm"
                    variant={maxed ? "ghost" : "default"}
                    disabled={busy || maxed || coins < cost}
                    onClick={() => void handleTrain(stat)}
                  >
                    <Dumbbell className="h-4 w-4" aria-hidden />
                    {maxed ? "Max" : `${cost} CC`}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="glass-panel rounded-2xl p-5 lg:col-span-3">
          <h2 className="text-2xl">Ruchy i poziomy nauki</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {moves.map((move) => {
              const known = pokemon.level >= move.level;
              return (
                <div
                  key={move.name}
                  className={`rounded-xl border p-3 ${
                    known ? "border-aurora/40 bg-aurora/10" : "border-border/60 opacity-70"
                  }`}
                >
                  <p className="font-medium">{move.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Lvl {move.level} · moc {move.power}
                  </p>
                  <p className="mt-1 text-xs">
                    {known ? "Opanowany" : `Nauka na Lvl ${move.level}`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </GamePage>
  );
}
