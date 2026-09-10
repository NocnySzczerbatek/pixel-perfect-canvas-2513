/** Wydarzenia tygodnia — jedno wydarzenie na tydzień (Europe/Warsaw, start w poniedziałek). */

import { warsawDate } from "@/lib/achievements";

export type WeeklyEvent = {
  key: string;
  name: string;
  description: string;
  shinyBonusPct: number;
  rareBonusPct: number;
  coins: number;
  bottles: number;
};

export const WEEKLY_EVENTS: WeeklyEvent[] = [
  {
    key: "rare_hunt",
    name: "Łowy na rzadkie",
    description: "Rzadkie spotkania są znacznie częstsze w całym tygodniu.",
    shinyBonusPct: 5,
    rareBonusPct: 25,
    coins: 1200,
    bottles: 2,
  },
  {
    key: "shiny_week",
    name: "Tydzień Shiny",
    description: "Największy w grze tygodniowy zastrzyk szansy na Shiny.",
    shinyBonusPct: 25,
    rareBonusPct: 5,
    coins: 1000,
    bottles: 2,
  },
  {
    key: "coin_rush",
    name: "Gorączka monet",
    description: "Sakiewka pełna Catch Coins na start tygodnia i lekki bonus do rzadkości.",
    shinyBonusPct: 5,
    rareBonusPct: 10,
    coins: 3000,
    bottles: 1,
  },
  {
    key: "energy_festival",
    name: "Festiwal Energii",
    description: "Zapas Flakonów Energii, aby wycisnąć z tygodnia jak najwięcej kroków.",
    shinyBonusPct: 5,
    rareBonusPct: 5,
    coins: 800,
    bottles: 6,
  },
  {
    key: "ghost_night",
    name: "Noc Duchów",
    description: "Duchy i typy Ciemności wychodzą z cienia — wyższa szansa na Shiny.",
    shinyBonusPct: 18,
    rareBonusPct: 12,
    coins: 1500,
    bottles: 2,
  },
  {
    key: "gym_week",
    name: "Tydzień Sal",
    description: "Tydzień pod znakiem Liderów — bonus do rzadkości i zapas Flakonów na walki.",
    shinyBonusPct: 8,
    rareBonusPct: 15,
    coins: 2000,
    bottles: 4,
  },
  {
    key: "safari",
    name: "Safari Trenerów",
    description: "Zrównoważony bonus do rzadkości i Shiny plus solidna wypłata.",
    shinyBonusPct: 12,
    rareBonusPct: 18,
    coins: 1800,
    bottles: 3,
  },
  {
    key: "candy_fest",
    name: "Święto Cukierków",
    description: "Więcej znajdziek w eksploracji i mocny bonus do rzadkich spotkań.",
    shinyBonusPct: 10,
    rareBonusPct: 22,
    coins: 1400,
    bottles: 3,
  },
];

/** Poniedziałek bieżącego tygodnia (czas polski) jako YYYY-MM-DD. */
export function warsawWeekStart(now: Date = new Date()): string {
  const today = warsawDate(now);
  const date = new Date(`${today}T00:00:00Z`);
  const shift = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - shift);
  return date.toISOString().slice(0, 10);
}

/** Koniec tygodnia (najbliższy poniedziałek 00:00 czasu polskiego) jako ISO. */
export function weekEndIso(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 7);
  // 00:00 czasu polskiego to 22:00 lub 23:00 UTC dnia poprzedniego — bierzemy 22:00 UTC.
  date.setUTCHours(-2, 0, 0, 0);
  return date.toISOString();
}

export function eventForWeek(weekStart: string): WeeklyEvent {
  const index = Math.floor(Date.parse(`${weekStart}T00:00:00Z`) / 604_800_000);
  return WEEKLY_EVENTS[((index % WEEKLY_EVENTS.length) + WEEKLY_EVENTS.length) % WEEKLY_EVENTS.length]!;
}

export function weekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (date: Date) =>
    date.toLocaleDateString("pl-PL", { day: "numeric", month: "long" });
  return `${fmt(start)} – ${fmt(end)}`;
}
