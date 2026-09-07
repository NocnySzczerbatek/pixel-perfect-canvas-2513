import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Swords } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GamePage } from "@/components/game/GamePage";
import { useSession } from "@/hooks/useSession";
import { BIOMES, findBiome } from "@/lib/biomes";
import { artworkUrl } from "@/lib/game-data";
import { BALLS, HEAL_ITEMS, RAZZ, ballByKey } from "@/lib/items";
import { itemSprite } from "@/lib/pokedex";
import {
  dismissEncounter,
  fightWildMove,
  getExplorationState,
  resolveBotBattle,
  throwBall,
  travel,
  useHealItem,
  type EncounterView,
  type ExplorationState,
  type PartyView,
} from "@/lib/exploration.functions";


export const Route = createFileRoute("/eksploracja")({
  head: () => ({
    meta: [
      { title: "Eksploracja — Catch Zone" },
      {
        name: "description",
        content:
          "Wybierz biom i ruszaj na spotkania z dzikimi Pokémonami. Każdy krok kosztuje Energię.",
      },
      { property: "og:title", content: "Eksploracja — Catch Zone" },
      {
        property: "og:description",
        content: "Wybierz biom i ruszaj na spotkania z dzikimi Pokémonami. Każdy krok kosztuje Energię.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EksploracjaPage,
});

const EXPLORATION_QUERY_KEY = "exploration";

type BattleOutcome = { won: boolean; biome: string; label: string };

function EksploracjaPage() {
  const { session, loading, userId } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [lastBiome, setLastBiome] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<BattleOutcome | null>(null);
  const [activeMonId, setActiveMonId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/" });
    }
  }, [loading, session, navigate]);

  const fetchState = useServerFn(getExplorationState);
  const travelFn = useServerFn(travel);
  const throwBallFn = useServerFn(throwBall);
  const fightMoveFn = useServerFn(fightWildMove);
  const resolveBotFn = useServerFn(resolveBotBattle);
  const dismissFn = useServerFn(dismissEncounter);
  const healFn = useServerFn(useHealItem);


  const { data: state, isLoading } = useQuery<ExplorationState>({
    queryKey: [EXPLORATION_QUERY_KEY, userId],
    queryFn: () => fetchState(),
    enabled: !!userId,
    staleTime: 0,
  });

  const updateState = (next: ExplorationState | undefined) => {
    if (!next) return;
    queryClient.setQueryData([EXPLORATION_QUERY_KEY, userId], next);
  };

  const handleTravel = async (biomeSlug: string) => {
    if (!userId || busy) return;
    setBusy(true);
    setOutcome(null);
    try {
      const result = await travelFn({ data: { biome: biomeSlug } });
      if (!result.ok) {
        toast.error(result.reason);
      } else {
        setLastBiome(biomeSlug);
        const biome = findBiome(biomeSlug);
        toast.success(`Dotarłeś do biomu ${biome?.name ?? biomeSlug}`);
      }
      updateState(result.state);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd eksploracji");
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (encounter: EncounterView, pokemonId: string, move: string) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const result = await fightMoveFn({ data: { encounterId: encounter.id, pokemonId, move } });
      if (!result.ok) {
        toast.error(result.reason);
      } else if (result.wildDefeated) {
        toast.success(`${encounter.species_name} pokonany — łap albo idź dalej!`);
      } else if (result.allyFainted) {
        toast.error("Twój Pokémon jest Zemdlony.");
        setOutcome({
          won: false,
          biome: encounter.biome,
          label: encounter.species_name ?? "dziki Pokémon",
        });
      }
      updateState(result.state);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd walki");
    } finally {
      setBusy(false);
    }
  };


  const handleThrowBall = async (encounterId: string, ball = "poke", razz = false) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const result = await throwBallFn({ data: { encounterId, ball, razz } });
      if (!result.ok) {
        toast.error(result.reason);
      } else if (result.caught) {
        toast.success(`Złapano! (szansa ${Math.round(result.chance * 100)}%)`);
      } else if (result.fled) {
        toast.warning(`Pokémon uciekł (szansa ${Math.round(result.chance * 100)}%).`);
      } else {
        toast.info(`Chybiłeś (szansa ${Math.round(result.chance * 100)}%).`);
      }
      updateState(result.state);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd rzutu");
    } finally {
      setBusy(false);
    }
  };

  const handleHeal = async (pokemonId: string, item: string, encounterId?: string) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const result = await healFn({
        data: encounterId ? { pokemonId, item, encounterId } : { pokemonId, item },
      });
      if (!result.ok) toast.error(result.reason);
      else toast.success(result.message);
      updateState(result.state);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd leczenia");
    } finally {
      setBusy(false);
    }
  };

  const handleBattle = async (encounter: EncounterView) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const result = await resolveBotFn({ data: { encounterId: encounter.id } });
      const label = `${encounter.trainer_class ?? "Trener"} ${encounter.trainer_person ?? "Bot"}`;
      if (result.won) toast.success(`Wygrana z ${label}!`);
      else toast.error(`Przegrana z ${label}.`);
      setOutcome({ won: result.won, biome: encounter.biome, label });
      updateState(result.state);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd walki");
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = async (encounterId: string) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const result = await dismissFn({ data: { encounterId } });
      toast.info("Spotkanie opuszczone.");
      updateState(result.state);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zamykania spotkania");
    } finally {
      setBusy(false);
    }
  };

  /** "Dalej" — zamyka spotkanie i robi kolejny krok w tym samym biomie. */
  const handleNext = async (encounter: EncounterView) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      await dismissFn({ data: { encounterId: encounter.id } });
    } catch {
      /* spotkanie mogło już zostać zamknięte */
    } finally {
      setBusy(false);
    }
    await handleTravel(encounter.biome);
  };


  if (loading || isLoading) {
    return (
      <GamePage title="Eksploracja" subtitle="Ładowanie stanu eksploracji...">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel h-32 animate-pulse rounded-2xl" />
          ))}
        </div>
      </GamePage>
    );
  }

  if (!session) return null;

  return (
    <GamePage
      title="Eksploracja"
      subtitle="Wybierz biom i ruszaj na spotkania z dzikimi Pokémonami. Każdy krok kosztuje Energię."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <ResourcesPanel state={state} />
          {state?.active ? (
            <EncounterCard
              encounter={state.active}
              balls={{
                poke: state.poke_balls,
                great: state.great_balls,
                ultra: state.ultra_balls,
                master: state.master_balls,
                premier: state.premier_balls,
                net: state.net_balls,
                dive: state.dive_balls,
                dusk: state.dusk_balls,
                quick: state.quick_balls,
                timer: state.timer_balls,
                repeat: state.repeat_balls,
                luxury: state.luxury_balls,
              }}
              razzBerries={state.razz_berries}
              heals={{
                potion: state.potions,
                super_potion: state.super_potions,
                revive: state.revives,
              }}
              onHeal={handleHeal}
              party={state.party}
              activeMonId={activeMonId}
              onSelectMon={setActiveMonId}
              onThrowBall={handleThrowBall}
              onMove={handleMove}
              onBattle={handleBattle}
              onDismiss={handleDismiss}
              onNext={handleNext}
              busy={busy}
            />


          ) : outcome ? (
            <OutcomePanel
              outcome={outcome}
              busy={busy}
              onContinue={() => void handleTravel(outcome.biome)}
              onBack={() => setOutcome(null)}
            />
          ) : (
            <BiomeGrid
              onTravel={handleTravel}
              energy={state?.energy ?? 0}
              busy={busy}
              lastBiome={lastBiome}
            />
          )}
        </section>

        <aside className="space-y-6">
          <LogPanel state={state} />
          <TrainerLevelPanel state={state} />
        </aside>
      </div>
    </GamePage>
  );
}

const ENERGY_TICK_DISPLAY_MS = 3 * 60 * 1000;

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function ResourcesPanel({ state }: { state: ExplorationState | undefined }) {
  const energy = state?.energy ?? 0;
  const max = state?.energy_max ?? 100;
  const pct = Math.round((energy / max) * 100);
  const [left, setLeft] = useState(state?.energy_next_ms ?? 0);
  useEffect(() => {
    setLeft(state?.energy_next_ms ?? 0);
  }, [state?.energy_next_ms]);
  useEffect(() => {
    if ((state?.energy_next_ms ?? 0) <= 0) return;
    const timer = setInterval(
      () =>
        setLeft((value) => (value <= 1000 ? ENERGY_TICK_DISPLAY_MS : Math.max(0, value - 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [state?.energy_next_ms]);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="glass-panel rounded-2xl p-4 sm:col-span-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Energia</span>
          <span className="font-display text-2xl">
            {energy} / {max}
          </span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          +1 pkt co 3 minuty
          {energy >= max
            ? " · Energia pełna"
            : ` · następny punkt za ${formatCountdown(left)}`}
        </p>
      </div>
      <div className="glass-panel rounded-2xl p-4 text-center">
        <img
          src={itemSprite("poke-ball")}
          alt="Poké Ball"
          loading="lazy"
          width={32}
          height={32}
          className="mx-auto h-8 w-8 [image-rendering:pixelated]"
        />
        <p className="mt-1 font-display text-3xl">{state?.poke_balls ?? 0}</p>
      </div>
      <div className="glass-panel rounded-2xl p-4 text-center">
        <img
          src={itemSprite("coin-case")}
          alt="Catch Coins"
          loading="lazy"
          width={32}
          height={32}
          className="mx-auto h-8 w-8 [image-rendering:pixelated]"
        />
        <p className="mt-1 font-display text-3xl">{state?.catch_coins ?? 0}</p>
      </div>
      <div className="glass-panel rounded-2xl p-4 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Drużyna</p>
        <p className="mt-1 font-display text-3xl">{state?.party_size ?? 0} / 6</p>
      </div>
    </div>
  );
}

function BiomeGrid({
  onTravel,
  energy,
  busy,
  lastBiome,
}: {
  onTravel: (slug: string) => void;
  energy: number;
  busy: boolean;
  lastBiome: string | null;
}) {
  const minCost = 2;
  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="text-2xl">Wybierz biom</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BIOMES.map((biome) => {
          const disabled = energy < minCost || busy;
          return (
            <button
              key={biome.slug}
              disabled={disabled}
              onClick={() => onTravel(biome.slug)}
              className="tile-hover glass-panel overflow-hidden rounded-2xl text-left disabled:opacity-50 disabled:hover:transform-none"
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
                <p className="mt-2 text-xs font-medium text-ice">
                  2–5 Energii{lastBiome === biome.slug ? " · ostatnio tu byłeś" : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OutcomePanel({
  outcome,
  busy,
  onContinue,
  onBack,
}: {
  outcome: BattleOutcome;
  busy: boolean;
  onContinue: () => void;
  onBack: () => void;
}) {
  const biome = findBiome(outcome.biome);
  return (
    <div className="glass-panel rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Wynik walki · {biome?.name ?? outcome.biome}
      </p>
      <h2 className="mt-1 font-display text-3xl">
        {outcome.won ? `Wygrana z ${outcome.label}!` : `Przegrana z ${outcome.label}`}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {outcome.won
          ? "Nagroda trafiła do Twojego profilu. Możesz iść dalej tym samym szlakiem."
          : "Bez nagrody. Ulecz drużynę w zakładce Drużyna albo spróbuj dalej."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={onContinue} disabled={busy}>
          Dalej — kolejny krok w {biome?.name ?? "tym biomie"}
        </Button>
        <Button variant="outline" onClick={onBack} disabled={busy}>
          Wybierz inny biom
        </Button>
      </div>
    </div>
  );
}

function EncounterCard({
  encounter,
  balls,
  razzBerries,
  heals,
  onHeal,
  party,
  activeMonId,
  onSelectMon,
  onThrowBall,
  onMove,
  onBattle,
  onDismiss,
  onNext,
  busy,
}: {
  encounter: EncounterView;
  balls: Record<string, number>;
  razzBerries: number;
  heals: Record<string, number>;
  onHeal: (pokemonId: string, item: string, encounterId?: string) => void;
  party: PartyView[];
  activeMonId: string | null;
  onSelectMon: (id: string) => void;
  onThrowBall: (id: string, ball?: string, razz?: boolean) => void;
  onMove: (encounter: EncounterView, pokemonId: string, move: string) => void;
  onBattle: (encounter: EncounterView) => void;
  onDismiss: (id: string) => void;
  onNext: (encounter: EncounterView) => void;
  busy: boolean;
}) {
  const hpPct = Math.max(
    0,
    Math.min(100, Math.round((encounter.hp_current / Math.max(1, encounter.hp_max)) * 100)),
  );
  const catchChance = Math.round(
    Math.max(
      5,
      Math.min(
        95,
        ((3 * encounter.hp_max - 2 * encounter.hp_current) / (3 * encounter.hp_max)) * 90,
      ),
    ),
  );
  const [ballKey, setBallKey] = useState<string>("poke");
  const [useRazz, setUseRazz] = useState(false);
  const selectedBall = ballByKey(ballKey) ?? BALLS[0]!;
  const ballCount = balls[selectedBall.key] ?? 0;
  const ready = party.filter((mon) => !mon.fainted && mon.hp_current > 0);
  const active = ready.find((mon) => mon.id === activeMonId) ?? ready[0] ?? null;
  const defeated = encounter.hp_current <= 0;

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Aktywne spotkanie · {findBiome(encounter.biome)?.name ?? encounter.biome}
          </p>
          <h2 className="mt-1 text-3xl">{encounterTitle(encounter)}</h2>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium uppercase tracking-wider ${kindStyles(
            encounter.kind,
          )}`}
        >
          {encounter.kind === "wild" ? "dziki" : encounter.kind === "bot" ? "trener" : "pvp"}
        </span>
      </div>

      {encounter.kind === "wild" && encounter.species_id ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="glass-panel rounded-2xl p-4 text-center">
              {active ? (
                <>
                  <img
                    src={artworkUrl(active.species_id)}
                    alt={active.name}
                    loading="lazy"
                    width={220}
                    height={220}
                    className="mx-auto h-32 w-32 object-contain"
                  />
                  <p className="font-display text-xl">{active.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.species_type} · Lvl {active.level}
                  </p>
                  <HpBar current={active.hp_current} max={active.hp_max} className="mt-3" />
                </>
              ) : (
                <p className="py-10 text-sm text-muted-foreground">
                  Cała drużyna jest Zemdlona — ulecz Pokémony w zakładce Drużyna.
                </p>
              )}
            </div>
            <div className="glass-panel rounded-2xl p-4 text-center">
              <img
                src={artworkUrl(encounter.species_id)}
                alt={encounter.species_name ?? "Pokémon"}
                loading="lazy"
                width={220}
                height={220}
                className="mx-auto h-32 w-32 object-contain"
              />
              <p className="font-display text-xl">{encounter.species_name}</p>
              <p className="text-xs text-muted-foreground">
                {encounter.species_type} · Lvl {encounter.level}
              </p>
              <HpBar current={encounter.hp_current} max={encounter.hp_max} className="mt-3" />
              <p className="mt-2 text-xs text-aurora">
                Szansa złapania: {catchChance}% (HP {hpPct}%)
              </p>
            </div>
          </div>

          {ready.length > 1 && !defeated ? (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Twój Pokémon
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ready.map((mon) => (
                  <button
                    key={mon.id}
                    onClick={() => onSelectMon(mon.id)}
                    disabled={busy}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                      active?.id === mon.id
                        ? "border-aurora bg-aurora/15 text-aurora"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    <img
                      src={artworkUrl(mon.species_id)}
                      alt=""
                      loading="lazy"
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                    {mon.name} · Lvl {mon.level}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {encounter.kind === "wild" ? (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ball</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {BALLS.map((ball) => {
                  const count = balls[ball.key] ?? 0;
                  return (
                    <button
                      key={ball.key}
                      onClick={() => setBallKey(ball.key)}
                      disabled={busy || count <= 0}
                      title={ball.note}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs disabled:opacity-40 ${
                        ballKey === ball.key
                          ? "border-aurora bg-aurora/15 text-aurora"
                          : "border-border/60 text-muted-foreground"
                      }`}
                    >
                      <img
                        src={itemSprite(ball.sprite)}
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 [image-rendering:pixelated]"
                      />
                      {ball.label} · {count}
                    </button>
                  );
                })}
                <button
                  onClick={() => setUseRazz((value) => !value)}
                  disabled={busy || razzBerries <= 0}
                  title={RAZZ.note}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs disabled:opacity-40 ${
                    useRazz
                      ? "border-ember bg-ember/15 text-ember"
                      : "border-border/60 text-muted-foreground"
                  }`}
                >
                  <img
                    src={itemSprite(RAZZ.sprite)}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 [image-rendering:pixelated]"
                  />
                  {RAZZ.label} · {razzBerries}
                </button>
              </div>
              {active ? (
                <>
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Leczenie w walce
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {HEAL_ITEMS.map((item) => {
                      const count = heals[item.key] ?? 0;
                      return (
                        <button
                          key={item.key}
                          onClick={() => onHeal(active.id, item.key, encounter.id)}
                          disabled={busy || count <= 0 || item.revive}
                          title={item.note}
                          className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground disabled:opacity-40"
                        >
                          <img
                            src={itemSprite(item.sprite)}
                            alt=""
                            width={20}
                            height={20}
                            className="h-5 w-5 [image-rendering:pixelated]"
                          />
                          {item.label} · {count}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {defeated ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => onThrowBall(encounter.id, selectedBall.key, useRazz)}
                disabled={busy || ballCount <= 0}
              >
                <img
                  src={itemSprite(selectedBall.sprite)}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 [image-rendering:pixelated]"
                />
                Złap go — {selectedBall.label} ({ballCount})
              </Button>
              <Button variant="outline" onClick={() => onNext(encounter)} disabled={busy}>
                Dalej
              </Button>
            </div>
          ) : active ? (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Wybierz atak
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {active.moves.map((move) => (
                  <Button
                    key={move.name}
                    variant="secondary"
                    className="h-auto flex-col items-start py-2"
                    disabled={busy}
                    onClick={() => onMove(encounter, active.id, move.name)}
                  >
                    <span className="font-medium">{move.name}</span>
                    <span className="text-xs text-muted-foreground">
                      moc {move.power} · {active.species_type}
                    </span>
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => onThrowBall(encounter.id, selectedBall.key, useRazz)}
                  disabled={busy || ballCount <= 0}
                >
                  <img
                    src={itemSprite(selectedBall.sprite)}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 [image-rendering:pixelated]"
                  />
                  Rzut {selectedBall.label} ({ballCount})
                </Button>
                <Button variant="outline" onClick={() => onDismiss(encounter.id)} disabled={busy}>
                  Uciekaj
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <Button variant="outline" onClick={() => onDismiss(encounter.id)} disabled={busy}>
                Uciekaj
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-6 md:flex-row">
            {encounter.kind === "bot" ? (
              <div className="flex flex-wrap gap-2">
                {(encounter.bot_team ?? []).map((member, idx) => (
                  <div key={idx} className="glass-panel rounded-xl p-2 text-center">
                    <img
                      src={artworkUrl(member.species_id)}
                      alt={member.species_name}
                      loading="lazy"
                      width={80}
                      height={80}
                      className="mx-auto h-16 w-16 object-contain"
                    />
                    <p className="mt-1 text-xs font-medium">{member.species_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.species_type} · Lvl {member.level}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl bg-secondary/50 px-8">
                <Swords className="h-12 w-12 text-muted-foreground" aria-hidden />
              </div>
            )}

            <div className="flex-1">
              {encounter.kind === "bot" ? (
                <>
                  <p className="font-display text-2xl">
                    {encounter.trainer_class ?? "Trener"} {encounter.trainer_person ?? ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Drużyna {encounter.bot_team?.length ?? 0} Pokémonów · średni Lvl{" "}
                    {encounter.level}
                  </p>
                  <p className="mt-2 text-sm text-aurora">
                    Nagroda: +{encounter.reward_exp} EXP, +{encounter.reward_coins} CC
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Liczy się cała Twoja drużyna i przewagi typów — słaby lider może przegrać walkę.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  To spotkanie możesz już tylko opuścić.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {encounter.kind === "bot" && (
              <Button onClick={() => onBattle(encounter)} disabled={busy}>
                <Swords className="h-4 w-4" aria-hidden />
                Walcz
              </Button>
            )}
            <Button variant="outline" onClick={() => onDismiss(encounter.id)} disabled={busy}>
              {encounter.kind === "bot" ? "Uciekaj" : "Opuść"}
            </Button>
          </div>
        </>
      )}
    </div>
  );

}

function LogPanel({ state }: { state: ExplorationState | undefined }) {
  const entries = useMemo(() => {
    const list: { id: string; text: string; time: string }[] = [];
    if (state?.active?.log.length) {
      state.active.log.forEach((line, idx) =>
        list.push({ id: `active-${idx}`, text: line, time: state.active!.created_at }),
      );
    }
    (state?.history ?? []).forEach((enc) => {
      enc.log.forEach((line, idx) =>
        list.push({ id: `${enc.id}-${idx}`, text: line, time: enc.created_at }),
      );
    });
    return list.slice(0, 20);
  }, [state]);

  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="text-2xl">Dziennik</h2>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Jeszcze nic się nie wydarzyło. Wybierz biom!</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="flex gap-3 text-sm">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora" />
              <span className="text-muted-foreground">{entry.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrainerLevelPanel({ state }: { state: ExplorationState | undefined }) {
  const level = state?.trainer_level ?? 1;
  const exp = state?.trainer_exp ?? 0;
  const next = state?.trainer_exp_next ?? 100;
  const pct = Math.min(100, Math.round((exp / next) * 100));
  return (
    <div className="glass-panel rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Poziom trenera</p>
      <p className="mt-1 font-display text-3xl">{level}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        EXP {exp} / {next}
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-ember" style={{ width: `${pct}%` }} />
      </div>
      {state?.region ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Region: {state.region} — spotykasz tylko Pokémony z tego regionu.
        </p>
      ) : null}
    </div>
  );
}

function HpBar({ current, max, className }: { current: number; max: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>HP</span>
        <span>
          {current} / {max}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-destructive transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function encounterTitle(encounter: EncounterView) {
  if (encounter.kind === "wild") return encounter.species_name ?? "Dziki Pokémon";
  if (encounter.kind === "bot")
    return `${encounter.trainer_class ?? "Trener"} ${encounter.trainer_person ?? ""}`.trim();
  return "Pojedynek PvP";
}

function kindStyles(kind: EncounterView["kind"]) {
  if (kind === "wild") return "bg-aurora/20 text-aurora";
  if (kind === "bot") return "bg-ice/20 text-ice";
  return "bg-ember/20 text-ember";
}
