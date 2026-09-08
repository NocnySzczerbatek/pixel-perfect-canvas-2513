import { FastForward, Swords, Trophy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { TypeBadges } from "@/components/game/TypeBadges";
import { Button } from "@/components/ui/button";
import { artworkUrl } from "@/lib/game-data";
import type { BattleLine, BattleReport, FighterSnapshot } from "@/lib/battle";

const ROUND_DELAY_MS = 1400;

function HpBar({ hp, hpMax }: { hp: number; hpMax: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((hp / Math.max(1, hpMax)) * 100)));
  const tone = pct > 50 ? "bg-primary" : pct > 20 ? "bg-amber-400" : "bg-destructive";
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className={`h-full rounded-full ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/40 py-1 last:border-0">
      <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      <span className="tabular-nums text-sm">{value}</span>
    </div>
  );
}

function StatCard({ fighter, subtitle }: { fighter: FighterSnapshot; subtitle: string }) {
  return (
    <article className="glass-panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{subtitle}</p>
      <div className="mt-2 flex items-center gap-3">
        {fighter.species_id ? (
          <img
            src={artworkUrl(fighter.species_id, fighter.shiny)}
            alt={fighter.name}
            loading="lazy"
            width={96}
            height={96}
            className="h-20 w-20 shrink-0 object-contain"
          />
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl">{fighter.name}</h3>
          <p className="text-xs text-muted-foreground">Poziom {fighter.level}</p>
          <div className="mt-1">
            <TypeBadges types={fighter.types} />
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Życie</span>
          <span className="tabular-nums text-sm">
            {fighter.hp} / {fighter.hpMax} HP
          </span>
        </div>
        <HpBar hp={fighter.hp} hpMax={fighter.hpMax} />
      </div>
      <div className="mt-3">
        <StatRow label="Atak" value={fighter.atk} />
        <StatRow label="Obrona" value={fighter.def} />
        <StatRow label="Atak Sp." value={fighter.spa} />
        <StatRow label="Obrona Sp." value={fighter.spd} />
        <StatRow label="Prędkość" value={fighter.spe} />
        <StatRow label="Celność" value={`${fighter.acc}%`} />
        <StatRow label="Zdolność" value={fighter.ability} />
      </div>
    </article>
  );
}

function MiniCard({ fighter }: { fighter: FighterSnapshot }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3">
      <div className="flex items-center gap-2">
        {fighter.species_id ? (
          <img
            src={artworkUrl(fighter.species_id, fighter.shiny)}
            alt={fighter.name}
            loading="lazy"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 object-contain"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{fighter.name}</p>
          <p className="text-[11px] text-muted-foreground">
            Lvl {fighter.level} · {fighter.hp}/{fighter.hpMax} HP
          </p>
          <HpBar hp={fighter.hp} hpMax={fighter.hpMax} />
        </div>
      </div>
      <div className="mt-2">
        <TypeBadges types={fighter.types} />
      </div>
      <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
        Atk {fighter.atk} · Def {fighter.def} · AtkSp {fighter.spa} · DefSp {fighter.spd} · Prd{" "}
        {fighter.spe}
      </p>
    </div>
  );
}

function lineTone(kind: BattleLine["kind"]) {
  if (kind === "weather") return "text-sky-300";
  if (kind === "ability") return "text-amber-300";
  if (kind === "faint") return "text-destructive";
  if (kind === "info") return "text-muted-foreground";
  return "text-foreground";
}

export function BattleTheatre({
  report,
  allyLabel = "Twój Pokémon",
  foeLabel = "Przeciwnik",
  children,
  onFinished,
}: {
  report: BattleReport;
  allyLabel?: string;
  foeLabel?: string;
  /** Akcje po walce (np. wybór Balla, „Dalej”). Widoczne po odsłonięciu wszystkich rund. */
  children?: ReactNode;
  onFinished?: () => void;
}) {
  const total = report.rounds.length;
  const [shown, setShown] = useState(total > 0 ? 1 : 0);

  useEffect(() => {
    setShown(total > 0 ? 1 : 0);
  }, [report, total]);

  useEffect(() => {
    if (shown >= total) return;
    const timer = setTimeout(() => setShown((value) => Math.min(total, value + 1)), ROUND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shown, total]);

  const done = shown >= total;
  useEffect(() => {
    if (done) onFinished?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard fighter={report.ally} subtitle={allyLabel} />
        <StatCard fighter={report.foe} subtitle={foeLabel} />
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Przebieg walki · {report.weather.label}
            </h2>
          </div>
          {!done ? (
            <Button variant="outline" size="sm" onClick={() => setShown(total)}>
              <FastForward className="h-4 w-4" /> Przejdź na koniec walki
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              Rundy: {total} · walka rozegrana automatycznie
            </span>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {report.rounds.slice(0, shown).map((round) => (
            <article key={round.index} className="rounded-2xl border border-border/60 bg-background/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Runda {round.index}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MiniCard fighter={round.ally} />
                <MiniCard fighter={round.foe} />
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {round.lines.map((line, index) => (
                  <li key={index} className={lineTone(line.kind)}>
                    {line.text}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      {done ? (
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Trophy
              className={`h-5 w-5 ${report.won ? "text-amber-300" : "text-muted-foreground"}`}
              aria-hidden
            />
            <h2 className="font-display text-2xl">{report.won ? "Wygrałeś!" : "Przegrałeś"}</h2>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {report.won ? (
              <>
                <li>Postać +{report.trainer_exp} doświadczenia</li>
                {report.coins > 0 ? <li>+{report.coins} Catch Coins</li> : null}
                {report.pokemon_exp.map((entry) => (
                  <li key={entry.name}>
                    {entry.name} +{entry.exp} doświadczenia
                  </li>
                ))}
              </>
            ) : (
              <li className="text-muted-foreground">
                Bez nagrody — ulecz drużynę w Centrum Pokémon i wróć silniejszy.
              </li>
            )}
            {report.extras.map((extra, index) => (
              <li key={index} className="text-muted-foreground">
                {extra}
              </li>
            ))}
          </ul>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
