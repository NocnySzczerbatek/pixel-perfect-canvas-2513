import { WARSAW_TIME_ZONE } from "@/lib/time";

export const TOURNAMENT_WIN_POINTS = 3;
export const TOURNAMENT_DAILY_BATTLES = 5;
export const TOURNAMENT_MIN_PARTY = 3;

export type TournamentPhase = "registration" | "active" | "finished";

export type WeekBounds = {
  weekStart: string; // poniedziałek (YYYY-MM-DD, czas polski)
  weekEnd: string; // niedziela
  phase: Exclude<TournamentPhase, "finished">;
  /** Koniec bieżącej fazy w UTC (ISO) — do odliczania w UI. */
  phaseEndsAt: string;
  weekLabel: string;
};

function warsawParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WARSAW_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    hour: Number(get("hour")),
  };
}

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function addDays(dateKey: string, days: number) {
  const base = new Date(`${dateKey}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Granica dnia w Warszawie (00:00) wyrażona w UTC — przybliżenie wystarczające do odliczania. */
function warsawMidnightUtc(dateKey: string) {
  const guess = new Date(`${dateKey}T00:00:00Z`);
  const offsetMinutes =
    (new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime() -
      new Date(guess.toLocaleString("en-US", { timeZone: WARSAW_TIME_ZONE })).getTime()) /
    60000;
  return new Date(guess.getTime() + offsetMinutes * 60000).toISOString();
}

/** Tydzień turniejowy: poniedziałek–niedziela. Zapisy: pon.–wt., walki: śr.–niedz. */
export function weekBounds(now = new Date()): WeekBounds {
  const { date, weekday } = warsawParts(now);
  const index = WEEKDAY_INDEX[weekday] ?? 0;
  const weekStart = addDays(date, -index);
  const weekEnd = addDays(weekStart, 6);
  const phase = index <= 1 ? "registration" : "active";
  const phaseEndsAt =
    phase === "registration" ? warsawMidnightUtc(addDays(weekStart, 2)) : warsawMidnightUtc(addDays(weekEnd, 1));
  return {
    weekStart,
    weekEnd,
    phase,
    phaseEndsAt,
    weekLabel: `${weekStart} – ${weekEnd}`,
  };
}

export function rewardFor(place: number) {
  if (place === 1)
    return {
      coins: 5000,
      bottles: 3,
      balls: 20,
      charm: true,
      badge: true,
      text: "1. miejsce: 5000 CC, 3 Flakony Energii, 20 Poké Balli, Shiny Charm i odznaka sezonowa",
    };
  if (place <= 3)
    return {
      coins: 2500,
      bottles: 2,
      balls: 10,
      charm: false,
      badge: false,
      text: `${place}. miejsce: 2500 CC, 2 Flakony Energii, 10 Poké Balli`,
    };
  if (place <= 10)
    return { coins: 1000, bottles: 0, balls: 5, charm: false, badge: false, text: `${place}. miejsce: 1000 CC i 5 Poké Balli` };
  return { coins: 200, bottles: 0, balls: 3, charm: false, badge: false, text: "Nagroda za uczestnictwo: 200 CC i 3 Poké Balle" };
}
