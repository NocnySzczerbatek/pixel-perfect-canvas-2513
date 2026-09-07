import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Coins, Dumbbell, Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GROWTH_LABEL, fetchGrowthRate, pokemonExpToNext } from "@/lib/leveling";
import { GamePage } from "@/components/game/GamePage";
import { TypeBadges } from "@/components/game/TypeBadges";
import { Button } from "@/components/ui/button";
import { useTrainerData } from "@/hooks/useTrainerData";
import { artworkUrl } from "@/lib/game-data";
import { fetchEvolutions, fetchLevelUpMoves } from "@/lib/pokeapi";
import { STAT_KEYS, STAT_LABELS, itemSprite, speciesType, type StatKey } from "@/lib/pokedex";
import {
  CANDIES,
  MAX_FRIENDSHIP,
  TRAINING_DISPLAY_MAX,
  TRAINING_LEVEL_STEP,
  trainPokemon,
  evolvePokemon,
  trainingCost,
  trainingLevel,
  useCandy,
  type CandyKind,
  type PokemonRow,
} from "@/lib/trainer.functions";

export const Route = createFileRoute("/pokemon/$id")({
  head: () => ({
    meta: [
      { title: "Szczegóły Pokémona — Catch Zone" },
      {
        name: "description",
        content:
          "Poziom treningu statystyk, przyjaźń, cukierki, ruchy z poziomowania i warunki ewolucji.",
      },
      { property: "og:title", content: "Szczegóły Pokémona — Catch Zone" },
      {
        property: "og:description",
        content: "Trenuj statystyki za Catch Coins, karm cukierkami i sprawdź warunki ewolucji.",
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
  const feed = useServerFn(useCandy);
  const evolve = useServerFn(evolvePokemon);
  const [busy, setBusy] = useState(false);

  const pokemon = (data?.pokemon ?? []).find((p) => p.id === id);
  const coins = data?.profile.catch_coins ?? 0;
  const speciesId = pokemon?.species_id;

  const { data: moves } = useQuery({
    queryKey: ["pokeapi-moves", speciesId],
    queryFn: () => fetchLevelUpMoves(speciesId!),
    enabled: !!speciesId,
    staleTime: Infinity,
  });
  const { data: evolutions } = useQuery({
    queryKey: ["pokeapi-evo", speciesId],
    queryFn: () => fetchEvolutions(speciesId!),
    enabled: !!speciesId,
    staleTime: Infinity,
  });
  const { data: growthRate } = useQuery({
    queryKey: ["pokeapi-growth", speciesId],
    queryFn: () => fetchGrowthRate(speciesId!),
    enabled: !!speciesId,
    staleTime: Infinity,
  });
  const growth = growthRate ?? "medium-fast";



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

  const handleCandy = async (kind: CandyKind) => {
    setBusy(true);
    try {
      const result = await feed({ data: { id, kind } });
      if (result.data) setData(result.data);
      if (!result.ok) toast.error(result.reason);
      else toast.success(`Przyjaźń +${result.gained} (teraz ${result.friendship}/${MAX_FRIENDSHIP}).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się użyć cukierka.");
    } finally {
      setBusy(false);
    }
  };

  const handleEvolve = async () => {
    setBusy(true);
    try {
      const result = await evolve({ data: { id } });
      if (result.data) setData(result.data);
      if (!result.ok) toast.error(result.reason); else toast.success(`Ewolucja zakończona: ${result.name}!`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Ewolucja się nie udała."); }
    finally { setBusy(false); }
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
  const toNextLevel = TRAINING_LEVEL_STEP - (pokemon.training_points % TRAINING_LEVEL_STEP || 0);
  const friendship = pokemon.friendship ?? 0;
  const friendshipPct = Math.round((friendship / MAX_FRIENDSHIP) * 100);
  const knownMoves = (moves ?? []).filter((move) => move.level <= pokemon.level);

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
            src={artworkUrl(pokemon.species_id, pokemon.is_shiny)}
            alt={pokemon.nickname ?? pokemon.species_name}
            loading="lazy"
            width={320}
            height={320}
            className={`mx-auto h-44 w-44 object-contain ${pokemon.is_shiny ? "shiny-glow" : ""}`}
          />
          <p className="mt-2 font-display text-3xl">
            {pokemon.is_shiny ? <span className="text-amber-300">★ </span> : null}
            {pokemon.species_name}
          </p>
          {pokemon.is_shiny ? (
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">
              SHINY — rzadka odmiana kolorystyczna (bez wpływu na staty)
            </p>
          ) : null}
          <TypeBadges speciesId={pokemon.species_id} className="mt-2" />
          <p className="text-sm text-muted-foreground">
            HP {pokemon.hp_current}/{pokemon.hp_max}
          </p>
          <div className="mt-4 text-left">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">
                Doświadczenie do Lvl {pokemon.level + 1}
              </span>
              <span>
                {pokemon.exp} / {pokemonExpToNext(pokemon.level, growth)} EXP
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-ice"
                style={{
                  width: `${Math.min(100, Math.round((pokemon.exp / pokemonExpToNext(pokemon.level, growth)) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Brakuje {Math.max(0, pokemonExpToNext(pokemon.level, growth) - pokemon.exp)} EXP.
              Krzywa wzrostu tego gatunku: {GROWTH_LABEL[growth] ?? "Średnia"}. EXP zdobywasz
              w walkach: dziki Pokémon, Trener-Bot (x1,4) i Lider Sali (x2,2).
            </p>
          </div>
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
          <h2 className="text-2xl">Poziom Treningu statystyk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Skala 0–{TRAINING_DISPLAY_MAX}. Kolejne punkty są coraz droższe, więc samą gotówką nie
            zmaksymalizujesz Pokémona. Co {TRAINING_LEVEL_STEP} punkty treningu Pokémon zyskuje
            poziom.
          </p>
          <ul className="mt-4 space-y-3">
            {STAT_KEYS.map((stat) => {
              const value = pokemon[IV_OF[stat]] as number;
              const shown = trainingLevel(value);
              const cost = trainingCost(value);
              const maxed = shown >= TRAINING_DISPLAY_MAX;
              return (
                <li key={stat} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm">{STAT_LABELS[stat]}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-aurora transition-all"
                      style={{ width: `${(shown / TRAINING_DISPLAY_MAX) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm tabular-nums">
                    {shown}/{TRAINING_DISPLAY_MAX}
                  </span>
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

        <section className="glass-panel rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-2xl">
            <Heart className="h-5 w-5 text-ember" aria-hidden />
            Przyjaźń
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {friendship} / {MAX_FRIENDSHIP}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-ember transition-all"
              style={{ width: `${friendshipPct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Cukierki znajdujesz podczas eksploracji. Wysoka przyjaźń jest potrzebna do części
            ewolucji.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(CANDIES) as CandyKind[]).map((kind) => {
              const candy = CANDIES[kind];
              const owned =
                kind === "xl" ? (data?.profile.candy_xl ?? 0) : (data?.profile.candy_normal ?? 0);
              return (
                <Button
                  key={kind}
                  size="sm"
                  variant="secondary"
                  disabled={busy || owned <= 0 || friendship >= MAX_FRIENDSHIP}
                  onClick={() => void handleCandy(kind)}
                >
                  <img
                    src={itemSprite(candy.sprite)}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 [image-rendering:pixelated]"
                  />
                  {candy.label} ({owned}) · +{candy.friendship}
                </Button>
              );
            })}
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <h2 className="text-2xl">Ewolucja</h2>
          {evolutions === undefined ? (
            <p className="mt-2 text-sm text-muted-foreground">Sprawdzam łańcuch ewolucji…</p>
          ) : evolutions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Ten Pokémon nie ma dalszych ewolucji.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {evolutions.map((evo) => (
                <li key={evo.to} className="rounded-xl border border-border/60 p-3">
                  <p className="font-medium">Ewoluuje w {evo.to}</p>
                  <p className="text-xs text-muted-foreground">
                    {evo.minLevel
                      ? `od poziomu ${evo.minLevel}`
                      : evo.minHappiness
                        ? `przy przyjaźni ${evo.minHappiness}+ (masz ${friendship})`
                        : evo.item
                          ? `przy użyciu ${evo.item}`
                          : `warunek: ${evo.trigger}`}
                  </p>
                  <Button className="mt-3" size="sm" disabled={busy || Boolean(evo.minLevel && pokemon.level < evo.minLevel) || Boolean(evo.minHappiness && friendship < evo.minHappiness)} onClick={() => void handleEvolve()}>Ewoluuj w {evo.to}</Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-panel rounded-2xl p-5 lg:col-span-3">
          <h2 className="text-2xl">Ruchy z poziomowania</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dane z PokéAPI. Opanowane: {knownMoves.length} z {(moves ?? []).length}.
          </p>
          {moves === undefined ? (
            <p className="mt-4 text-sm text-muted-foreground">Wczytuję listę ruchów…</p>
          ) : (
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      {known
                        ? `Opanowany (Lvl ${move.level || 1})`
                        : `Nauka na Lvl ${move.level}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </GamePage>
  );
}
