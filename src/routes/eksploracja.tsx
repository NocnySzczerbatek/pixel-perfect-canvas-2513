import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { BallPicker } from "@/components/game/BallPicker";
import { BattleTheatre } from "@/components/game/BattleTheatre";
import type { BattleReport } from "@/lib/battle";
import { useEffect, useMemo, useRef, useState } from "react";
import { Swords } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GamePage } from "@/components/game/GamePage";
import { ENERGY_TICK_MS } from "@/lib/energy";
import { TypeBadges } from "@/components/game/TypeBadges";
import { TrainerAvatar } from "@/components/game/TrainerAvatar";
import { useSession } from "@/hooks/useSession";
import { BIOMES, findBiome } from "@/lib/biomes";
import { artworkUrl } from "@/lib/game-data";
import { HEAL_ITEMS } from "@/lib/items";
import type { FindView } from "@/lib/finds";
import { itemSprite } from "@/lib/pokedex";
import { DAY_PHASES, currentWeather, dayPhase, msToWeatherChange } from "@/lib/world";
import { formatDuration } from "@/lib/time";
import {
  dismissEncounter,
  autoFightWild,
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
  // Zadania dzienne mogą wskazać lokację: /eksploracja?biome=las
  validateSearch: (search: Record<string, unknown>) => ({
    biome: typeof search["biome"] === "string" ? (search["biome"] as string) : undefined,
  }),
  component: EksploracjaPage,
});

const EXPLORATION_QUERY_KEY = "exploration";

type BattleOutcome = { won: boolean; biome: string; label: string };

function EksploracjaPage() {
  const { session, loading, userId } = useSession();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<BattleReport | null>(null);
  const [lastBiome, setLastBiome] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<BattleOutcome | null>(null);
  const [activeMonId, setActiveMonId] = useState<string | null>(null);
  const [find, setFind] = useState<FindView | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/" });
    }
  }, [loading, session, navigate]);

  const fetchState = useServerFn(getExplorationState);
  const travelFn = useServerFn(travel);
  const throwBallFn = useServerFn(throwBall);
  const autoFightFn = useServerFn(autoFightWild);
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
    setReport(null);
    if (!userId || busy) return;
    setBusy(true);
    setOutcome(null);
    setFind(null);
    try {
      const result = await travelFn({ data: { biome: biomeSlug } });
      if (!result.ok) {
        toast.error(result.reason);
      } else {
        setLastBiome(biomeSlug);
        const biome = findBiome(biomeSlug);
        toast.success(`Dotarłeś do biomu ${biome?.name ?? biomeSlug}`);
        if (result.find) {
          setFind(result.find);
          toast.success(`Znalezisko: ${result.find.label}`);
        }
      }
      updateState(result.state);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd eksploracji");
    } finally {
      setBusy(false);
    }
  };

  const handleAutoFight = async (encounter: EncounterView, pokemonId: string) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const result = await autoFightFn({ data: { encounterId: encounter.id, pokemonId } });
      if (!result.ok) {
        toast.error(result.reason);
      } else {
        setReport(result.report);
        if (result.wildDefeated) toast.success(`${encounter.species_name} pokonany — łap albo idź dalej!`);
        else toast.error("Twój Pokémon jest Zemdlony.");
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
      if (result.ok && (result.caught || result.fled)) setReport(null);
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
      if (result.report) setReport(result.report);
      else setOutcome({ won: result.won, biome: encounter.biome, label });
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
          <WorldPanel />
          <ResourcesPanel state={state} />

          {find ? <FindCard find={find} onClose={() => setFind(null)} /> : null}
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
              report={report}
              onFight={handleAutoFight}
              onCloseReport={() => setReport(null)}
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
              focusBiome={search.biome ?? null}
            />
          )}
        </section>

        <aside className="space-y-6">
          <TrainerLevelPanel state={state} />
        </aside>
      </div>
    </GamePage>
  );
}

const ENERGY_TICK_DISPLAY_MS = ENERGY_TICK_MS;

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
  focusBiome,
}: {
  onTravel: (slug: string) => void;
  energy: number;
  busy: boolean;
  lastBiome: string | null;
  focusBiome?: string | null;
}) {
  const minCost = 2;
  const focusRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (focusBiome && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusBiome]);
  return (
    <div className="glass-panel rounded-2xl p-5">
      <h2 className="text-2xl">Wybierz biom</h2>
      {focusBiome ? (
        <p className="mt-2 text-sm text-ice">
          Zadanie wskazuje lokację {findBiome(focusBiome)?.name ?? focusBiome} — jest podświetlona poniżej.
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BIOMES.map((biome) => {
          const disabled = energy < minCost || busy;
          const isFocus = focusBiome === biome.slug;
          return (
            <button
              key={biome.slug}
              ref={isFocus ? focusRef : undefined}
              disabled={disabled}
              onClick={() => onTravel(biome.slug)}
              className={`tile-hover glass-panel overflow-hidden rounded-2xl text-left disabled:opacity-50 disabled:hover:transform-none${isFocus ? " ring-2 ring-ice" : ""}`}
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
                  {isFocus ? " · cel zadania" : ""}
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
  report,
  onFight,
  onCloseReport,
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
  report: BattleReport | null;
  onFight: (encounter: EncounterView, pokemonId: string) => void;
  onCloseReport: () => void;
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
  const [useRazz, setUseRazz] = useState(false);
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
              {encounter.is_shiny ? (
                <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-amber-300">
                  ✨ SHINY ✨
                </p>
              ) : null}
              <img
                src={artworkUrl(encounter.species_id, encounter.is_shiny)}
                alt={encounter.species_name ?? "Pokémon"}
                loading="lazy"
                width={220}
                height={220}
                className={`mx-auto h-32 w-32 object-contain ${encounter.is_shiny ? "shiny-glow" : ""}`}
              />
              <p className="font-display text-xl">
                {encounter.is_shiny ? <span className="text-amber-300">★ </span> : null}
                {encounter.species_name}
              </p>
              {encounter.species_id ? (
                <TypeBadges speciesId={encounter.species_id} className="mt-1" />
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">Lvl {encounter.level}</p>
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

          {report ? (
            <div className="mt-6">
              <BattleTheatre
                report={report}
                allyLabel={active?.name ?? "Twój Pokémon"}
                foeLabel={encounter.species_name ?? "Dziki Pokémon"}
              >
                {defeated ? (
                  <div className="space-y-4">
                    <BallPicker
                      balls={balls}
                      razzBerries={razzBerries}
                      useRazz={useRazz}
                      onToggleRazz={setUseRazz}
                      busy={busy}
                      onThrow={(ball) => onThrowBall(encounter.id, ball, useRazz)}
                    />
                    <Button variant="outline" onClick={() => onNext(encounter)} disabled={busy}>
                      Dalej
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onCloseReport();
                      onNext(encounter);
                    }}
                    disabled={busy}
                  >
                    Dalej
                  </Button>
                )}
              </BattleTheatre>
            </div>
          ) : defeated ? (
            <div className="mt-6 space-y-4">
              <BallPicker
                balls={balls}
                razzBerries={razzBerries}
                useRazz={useRazz}
                onToggleRazz={setUseRazz}
                busy={busy}
                onThrow={(ball) => onThrowBall(encounter.id, ball, useRazz)}
              />
              <Button variant="outline" onClick={() => onNext(encounter)} disabled={busy}>
                Dalej
              </Button>
            </div>
          ) : active ? (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Leczenie przed walką
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
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => onFight(encounter, active.id)} disabled={busy}>
                  <Swords className="h-4 w-4" aria-hidden />
                  Walcz automatycznie
                </Button>
                <Button variant="outline" onClick={() => onDismiss(encounter.id)} disabled={busy}>
                  Uciekaj
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Twój Pokémon sam wybiera ataki. Po wygranej wybierzesz Poké Balla.
              </p>
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
                  <div className="flex items-center gap-3">
                    <TrainerAvatar trainerClass={encounter.trainer_class} className="h-14 w-14" />
                    <p className="font-display text-2xl">
                      {encounter.trainer_class ?? "Trener"} {encounter.trainer_person ?? ""}
                    </p>
                  </div>
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

          {report ? (
            <div className="mt-6">
              <BattleTheatre
                report={report}
                allyLabel="Twoja drużyna"
                foeLabel={`${encounter.trainer_class ?? "Trener"} ${encounter.trainer_person ?? ""}`}
              >
                <Button
                  variant="outline"
                  onClick={() => {
                    onCloseReport();
                    onNext(encounter);
                  }}
                  disabled={busy}
                >
                  Dalej
                </Button>
              </BattleTheatre>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {encounter.kind === "bot" && !report && (
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

/** Okienko znaleziska: co znalazłeś na szlaku i do czego to służy. */
function FindCard({ find, onClose }: { find: FindView; onClose: () => void }) {
  return (
    <div className="glass-panel rounded-2xl border border-primary/40 p-5">
      <div className="flex items-start gap-4">
        <img
          src={itemSprite(find.sprite)}
          alt={find.label}
          width={56}
          height={56}
          loading="lazy"
          className="h-14 w-14 shrink-0 [image-rendering:pixelated]"
          onError={(event) => {
            event.currentTarget.src = itemSprite("dowsing-machine");
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-primary">
            Znalezisko na szlaku · {find.rarity}
          </p>
          <p className="font-display text-lg">{find.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{find.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Przedmiot trafił automatycznie do Twojego Ekwipunku.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onClose}>
          OK
        </Button>
      </div>
    </div>
  );
}

/** Pora dnia i pogoda świata — wspólne dla wszystkich graczy, zmiana co 3 godziny. */
function WorldPanel() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const phase = DAY_PHASES[dayPhase(now)];
  const weather = currentWeather(now);
  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pora dnia</p>
          <p className="font-display text-xl">
            {phase.icon} {phase.label}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pogoda</p>
          <p className="font-display text-xl">
            {weather.icon} {weather.label}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Zmiana pogody za</p>
          <p className="font-display text-xl">{formatDuration(msToWeatherChange(now))}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{weather.note}</p>
      <p className="mt-1 text-xs text-muted-foreground">{phase.note}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Częstsze typy: {weather.types.join(", ")}.
      </p>
    </div>
  );
}
