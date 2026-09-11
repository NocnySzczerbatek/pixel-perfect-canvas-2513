import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Coins, Dumbbell, Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GROWTH_LABEL, fetchGrowthRate, pokemonExpToNext } from "@/lib/leveling";
import { IV_MAX_PER_STAT, IV_MAX_TOTAL, ivPercent, ivRating, ivTotal } from "@/lib/iv";
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
import { useTrainerData } from "@/hooks/useTrainerData";
import { HELD_ITEMS, catalogItem } from "@/lib/held-items";
import {
  equipHeldItem,
  equipMegaStone,
  unequipHeldItem,
  unequipMegaStone,
} from "@/lib/held.functions";
import { artworkUrl } from "@/lib/game-data";
import {
  fetchEvolutionLine,
  fetchEvolutions,
  fetchLearnableMoves,
  fetchMoveDetails,
  type LearnableMove,
  type LearnMethod,
} from "@/lib/pokeapi";
import candyXlIcon from "@/assets/candy-xl.png.asset.json";
import {
  STAT_KEYS,
  STAT_LABELS,
  defaultActiveMoves,
  itemSprite,
  learnedMoves,
  movePool,
  speciesType,
  type StatKey,
} from "@/lib/pokedex";
import {
  CANDIES,
  MAX_FRIENDSHIP,
  MAX_TRAIN,
  TRAINING_DISPLAY_MAX,
  TRAINING_LEVEL_STEP,
  trainPokemon,
  evolvePokemon,
  setActiveMoves,
  trainingCost,
  trainingInvested,
  trainingLevel,
  useCandy,
  type CandyKind,
  type PokemonRow,
  type TrainerData,
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

/** Pasek pokazuje wyłącznie punkty kupione przez gracza — nie wrodzoną moc gatunku. */
const TRAIN_OF: Record<StatKey, keyof PokemonRow> = {
  hp: "train_hp",
  atk: "train_atk",
  def: "train_def",
  spa: "train_spa",
  spd: "train_spd",
  spe: "train_spe",
};

function PokemonDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading, setData, refetch } = useTrainerData();
  const equipFn = useServerFn(equipHeldItem);
  const unequipFn = useServerFn(unequipHeldItem);
  const [heldOpen, setHeldOpen] = useState(false);
  const megaEquipFn = useServerFn(equipMegaStone);
  const megaUnequipFn = useServerFn(unequipMegaStone);
  const [megaOpen, setMegaOpen] = useState(false);
  const train = useServerFn(trainPokemon);
  const feed = useServerFn(useCandy);
  const evolve = useServerFn(evolvePokemon);
  const [busy, setBusy] = useState(false);

  const pokemon = (data?.pokemon ?? []).find((p) => p.id === id);
  const coins = data?.profile.catch_coins ?? 0;
  const speciesId = pokemon?.species_id;

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

  /** Przedmioty Trzymane, które gracz faktycznie posiada (ilość > 0). */
  const ownedHeld = (data?.items ?? [])
    .filter((row) => row.quantity > 0 && HELD_ITEMS.some((item) => item.key === row.item_key))
    .map((row) => ({ ...catalogItem(row.item_key)!, count: row.quantity }));

  const handleHeld = async (action: () => Promise<any>, success: string) => {
    setBusy(true);
    try {
      const result = await action();
      if (result?.ok === false) toast.error(result.reason);
      else {
        toast.success(success);
        setHeldOpen(false);
        setMegaOpen(false);
        await refetch();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zmienić przedmiotu.");
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
  const heldItem = pokemon.held_item ? catalogItem(pokemon.held_item) : null;
  const toNextLevel = TRAINING_LEVEL_STEP - (pokemon.training_points % TRAINING_LEVEL_STEP || 0);
  const friendship = pokemon.friendship ?? 0;
  const friendshipPct = Math.round((friendship / MAX_FRIENDSHIP) * 100);

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
              <dt className="text-muted-foreground">Kupione punkty treningu</dt>
              <dd>{pokemon.training_points}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Do awansu</dt>
              <dd>{toNextLevel} pkt</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3 text-left">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm tracking-wide">IV (wrodzony potencjał)</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${ivRating(ivPercent(pokemon)).className}`}
              >
                {ivRating(ivPercent(pokemon)).label}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Suma {ivTotal(pokemon)}/{IV_MAX_TOTAL} · {ivPercent(pokemon)}%. IV są losowane przy
              złapaniu i nie zmieniają się — trening liczy się osobno.
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {(
                [
                  ["HP", pokemon.iv_hp],
                  ["Atak", pokemon.iv_atk],
                  ["Obrona", pokemon.iv_def],
                  ["Atak Sp.", pokemon.iv_spa],
                  ["Obrona Sp.", pokemon.iv_spd],
                  ["Szybkość", pokemon.iv_spe],
                ] as const
              ).map(([label, value]) => (
                <li key={label} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.round(((value ?? 0) / IV_MAX_PER_STAT) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right text-xs tabular-nums">
                    {value ?? 0}/{IV_MAX_PER_STAT}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3 text-left">
            <p className="font-display text-sm tracking-wide">Przedmiot Trzymany</p>
            {heldItem ? (
              <div className="mt-2 flex items-center gap-3">
                <img src={itemSprite(heldItem.sprite)} alt={heldItem.label} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{heldItem.label}</p>
                  <p className="text-xs text-muted-foreground">{heldItem.note}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void handleHeld(() => unequipFn({ data: { pokemonId: id } }), "Przedmiot wrócił do Ekwipunku.")}
                >
                  Zdejmij
                </Button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Slot jest pusty. Przedmiot Trzymany wzmacnia ataki wybranego typu albo leczy co turę.
              </p>
            )}
            <Button size="sm" variant="outline" className="mt-3" disabled={busy} onClick={() => setHeldOpen(true)}>
              {heldItem ? "Zmień przedmiot" : "Założ przedmiot"}
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Natura i umiejętność są losowane przy złapaniu i nie da się ich zmienić.
          </p>
        </section>

        <section className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <h2 className="text-2xl">Poziom Treningu statystyk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Skala 0–{TRAINING_DISPLAY_MAX} pokazuje wyłącznie punkty, które sam kupiłeś za Catch
            Coins — świeżo złapany Pokémon startuje z 0/{TRAINING_DISPLAY_MAX} na każdej statystyce.
            Wrodzona moc gatunku liczy się osobno i wpływa na walkę, ale nie na ten pasek. Kolejne
            punkty są coraz droższe, a co {TRAINING_LEVEL_STEP} punkty treningu Pokémon zyskuje
            poziom.
          </p>
          <ul className="mt-4 space-y-3">
            {STAT_KEYS.map((stat) => {
              const points = (pokemon[TRAIN_OF[stat]] as number) ?? 0;
              const shown = trainingLevel(points);
              const cost = trainingCost(points);
              const invested = trainingInvested(points);
              const maxed = points >= MAX_TRAIN;
              const hint =
                points === 0
                  ? `${STAT_LABELS[stat]}: 0/${TRAINING_DISPLAY_MAX} — jeszcze nie trenowano`
                  : `${STAT_LABELS[stat]}: ${shown}/${TRAINING_DISPLAY_MAX} — zainwestowano ${invested} CC łącznie (${points} pkt)`;
              return (
                <li key={stat} className="flex items-center gap-3" title={hint}>
                  <span className="w-24 shrink-0 text-sm">{STAT_LABELS[stat]}</span>
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
                    role="progressbar"
                    aria-label={hint}
                    aria-valuemin={0}
                    aria-valuemax={TRAINING_DISPLAY_MAX}
                    aria-valuenow={shown}
                  >
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
                    src={kind === "xl" ? candyXlIcon.url : itemSprite(candy.sprite)}
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

        <ActiveMovesPanel
          pokemon={pokemon}
          onSaved={setData}
        />

        <AllMovesSection pokemon={pokemon} />


      </div>
      <Dialog open={heldOpen} onOpenChange={setHeldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wybierz Przedmiot Trzymany</DialogTitle>
            <DialogDescription>
              Pokazujemy tylko przedmioty, które masz w Ekwipunku. Założenie zabiera 1 sztukę, a
              zdjęcie zwraca ją do plecaka.
            </DialogDescription>
          </DialogHeader>
          {ownedHeld.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze Przedmiotów Trzymanych — znajdziesz je podczas eksploracji biomów.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {ownedHeld.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-2"
                >
                  <img src={itemSprite(item.sprite)} alt={item.label} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {item.label} <span className="text-muted-foreground">×{item.count}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={busy || pokemon.held_item === item.key}
                    onClick={() =>
                      void handleHeld(
                        () => equipFn({ data: { pokemonId: id, itemKey: item.key } }),
                        `${item.label} założony.`,
                      )
                    }
                  >
                    {pokemon.held_item === item.key ? "Trzyma" : "Załóż"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </GamePage>
  );
}


/** 4 sloty aktywnych ataków + pełna lista opanowanych ruchów z przyciskiem "Przypisz". */
function ActiveMovesPanel({
  pokemon,
  onSaved,
}: {
  pokemon: PokemonRow;
  onSaved: (data: TrainerData) => void;
}) {
  const save = useServerFn(setActiveMoves);
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);

  const fullPool = movePool(pokemon.species_id);
  const pool = learnedMoves(pokemon.species_id, pokemon.level);
  const stored = (pokemon.active_moves ?? []).filter((name) =>
    pool.some((move) => move.name === name),
  );
  const active = stored.length > 0 ? stored : defaultActiveMoves(pokemon.species_id, pokemon.level);

  const commit = async (moves: string[]) => {
    setBusy(true);
    try {
      const result = await save({ data: { id: pokemon.id, moves } });
      if (result.data) onSaved(result.data);
      if (!result.ok) toast.error(result.reason);
      else toast.success("Zestaw aktywnych ataków zapisany.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać ataków.");
    } finally {
      setBusy(false);
      setReplacing(null);
    }
  };

  const assign = (name: string) => {
    if (active.includes(name)) return;
    if (active.length < 4) {
      void commit([...active, name]);
      return;
    }
    setReplacing(name);
  };

  const replace = (oldName: string) => {
    if (!replacing) return;
    void commit(active.map((name) => (name === oldName ? replacing : name)));
  };

  return (
    <section className="glass-panel rounded-2xl p-5 lg:col-span-3">
      <h2 className="text-2xl">Aktywne Ataki</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        W walce Pokémon korzysta wyłącznie z tych 4 ataków. Wybór należy do Ciebie — na start
        wpisane są 4 ostatnio poznane.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((slot) => {
          const name = active[slot];
          const move = pool.find((entry) => entry.name === name);
          return (
            <div
              key={slot}
              className={`rounded-xl border p-3 ${
                move ? "border-aurora/50 bg-aurora/10" : "border-dashed border-border/60"
              }`}
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Slot {slot + 1}
              </p>
              {move ? (
                <>
                  <p className="font-medium">{move.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {move.type} · {move.category} · Moc {move.power} · Celność {move.accuracy}%
                  </p>
                  <Button
                    className="mt-2"
                    size="sm"
                    variant="ghost"
                    disabled={busy || active.length <= 1}
                    onClick={() => void commit(active.filter((entry) => entry !== move.name))}
                  >
                    Zwolnij slot
                  </Button>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Wolny slot</p>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="mt-6 text-lg">Ruchy z poziomowania</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Odblokowane ataki możesz od razu wstawić w slot. Kolejne dochodzą wraz z poziomem.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fullPool.map((move) => {
          const unlocked = move.level <= pokemon.level;
          const isActive = active.includes(move.name);
          return (
            <div
              key={move.name}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                unlocked ? "border-border/60" : "border-border/40 opacity-60"
              }`}
            >
              <div>
                <p className="font-medium">{move.name}</p>
                <p className="text-xs text-muted-foreground">
                  {move.type} · {move.category} · Moc {move.power} · Celność {move.accuracy}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {unlocked ? `Odblokowany (Lvl ${move.level || 1})` : `Nauka na Lvl ${move.level}`}
                </p>
              </div>
              {isActive ? (
                <span className="shrink-0 rounded-full bg-aurora/20 px-3 py-1 text-xs text-aurora">
                  Aktywny
                </span>
              ) : (
                <Button
                  size="sm"
                  disabled={busy || !unlocked}
                  onClick={() => assign(move.name)}
                >
                  Przypisz
                </Button>
              )}
            </div>
          );
        })}
      </div>


      {replacing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Wybierz atak do zastąpienia"
        >
          <div className="glass-panel w-full max-w-md rounded-2xl p-5">
            <h4 className="text-xl">Wszystkie 4 sloty są zajęte</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Który atak zastąpić przez „{replacing}”?
            </p>
            <ul className="mt-4 space-y-2">
              {active.map((name) => (
                <li key={name}>
                  <Button
                    className="w-full justify-start"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => replace(name)}
                  >
                    Zastąp {name}
                  </Button>
                </li>
              ))}
            </ul>
            <Button className="mt-4" variant="ghost" onClick={() => setReplacing(null)}>
              Anuluj
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const METHOD_LABEL: Record<LearnMethod, string> = {
  "level-up": "poziomowanie",
  machine: "wymagana TM",
  tutor: "od instruktora ataków",
  egg: "atak z jaja (dziedziczony)",
  other: "specjalny sposób nauki",
};

function methodLabel(move: LearnableMove) {
  if (move.method === "level-up") return `Lvl ${move.level || 1}`;
  return METHOD_LABEL[move.method];
}

/** Pełna lista ataków dla obecnej formy i wszystkich dalszych ewolucji. */
function AllMovesSection({ pokemon }: { pokemon: PokemonRow }) {
  const speciesId = pokemon.species_id;

  const { data: line } = useQuery({
    queryKey: ["pokeapi-line", speciesId],
    queryFn: () => fetchEvolutionLine(speciesId),
    staleTime: Infinity,
  });

  const stages = line ?? [];

  const { data: movesByStage } = useQuery({
    queryKey: ["pokeapi-line-moves", stages.map((s) => s.id).join("-")],
    queryFn: async () => {
      const out: Record<number, LearnableMove[]> = {};
      for (const stage of stages) {
        try {
          out[stage.id] = await fetchLearnableMoves(stage.id);
        } catch {
          out[stage.id] = [];
        }
      }
      return out;
    },
    enabled: stages.length > 0,
    staleTime: Infinity,
  });

  const allSlugs = Object.values(movesByStage ?? {})
    .flat()
    .map((m) => m.slug);
  const { data: stats } = useQuery({
    queryKey: ["pokeapi-line-move-stats", allSlugs.length, speciesId],
    queryFn: () => fetchMoveDetails([...new Set(allSlugs)]),
    enabled: allSlugs.length > 0,
    staleTime: Infinity,
  });

  return (
    <section className="glass-panel rounded-2xl p-5 lg:col-span-3">
      <h2 className="text-2xl">Pełna lista ataków (wszystkie formy)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Każdy atak wymaga odpowiedniej formy Pokémona oraz poziomu albo TM. Ataki dalszych
        ewolucji zobaczysz z góry — odblokujesz je po ewolucji.
      </p>

      {line === undefined ? (
        <p className="mt-4 text-sm text-muted-foreground">Wczytuję linię ewolucyjną…</p>
      ) : (
        <div className="mt-4 space-y-6">
          {stages.map((stage, index) => {
            const isCurrent = stage.id === speciesId;
            const moves = movesByStage?.[stage.id];
            return (
              <div key={stage.id}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-lg">
                    {index + 1}. {stage.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {isCurrent
                      ? "obecna forma"
                      : `wymaga formy ${stage.name} — ${stage.requirement}`}
                  </span>
                </div>
                {moves === undefined ? (
                  <p className="mt-2 text-sm text-muted-foreground">Wczytuję ataki…</p>
                ) : moves.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Brak danych o atakach.</p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {moves.map((move) => {
                      const detail = stats?.[move.slug];
                      const available =
                        isCurrent && move.method === "level-up" && pokemon.level >= move.level;
                      return (
                        <div
                          key={`${stage.id}-${move.slug}`}
                          className={`rounded-xl border p-3 ${
                            available
                              ? "border-aurora/40 bg-aurora/10"
                              : "border-border/60 opacity-70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{move.name}</p>
                            {detail ? <TypeBadges types={[detail.type]} /> : null}
                          </div>
                          {detail ? (
                            <p className="mt-1 text-xs">
                              {detail.category} · Moc {detail.power ?? "—"} · Celność{" "}
                              {detail.accuracy ? `${detail.accuracy}%` : "—"}
                              {detail.pp ? ` · PP ${detail.pp}` : ""}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Wczytuję statystyki…
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            Wymaga: {stage.name} · {methodLabel(move)}
                            {available ? " — dostępny" : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
