/**
 * Świat gry: pora dnia i pogoda.
 * Jedno źródło prawdy dla serwera i klienta — wynik jest deterministyczny
 * (ta sama godzina w Europe/Warsaw = ta sama pogoda dla wszystkich graczy).
 */

import { warsawClock } from "@/lib/time";

export type DayPhase = "morning" | "day" | "evening" | "night";

export const DAY_PHASES: Record<DayPhase, { label: string; icon: string; note: string }> = {
  morning: { label: "Ranek", icon: "🌅", note: "Spokojny ranek — zwyczajne spotkania." },
  day: { label: "Dzień", icon: "☀️", note: "Pełnia dnia — więcej aktywnych Pokémonów." },
  evening: { label: "Wieczór", icon: "🌇", note: "Zmierzch — rzadkie gatunki wychodzą z ukrycia." },
  night: { label: "Noc", icon: "🌙", note: "Noc — Dusk Ball działa 3× lepiej, więcej Shiny." },
};

export function dayPhase(now = new Date()): DayPhase {
  const { hour } = warsawClock(now);
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 18) return "day";
  if (hour >= 18 && hour < 21) return "evening";
  return "night";
}

export function isNightNow(now = new Date()) {
  return dayPhase(now) === "night";
}

export type WeatherKey = "sun" | "rain" | "snow" | "storm" | "fog" | "sandstorm";

export type WeatherDef = {
  key: WeatherKey;
  label: string;
  icon: string;
  note: string;
  /** Typy Pokémonów, które pojawiają się częściej. */
  types: string[];
  /** Mnożnik szansy na rzadkie spotkanie. */
  rare: number;
  /** Mnożnik szansy na Shiny. */
  shiny: number;
};

export const WEATHERS: Record<WeatherKey, WeatherDef> = {
  sun: {
    key: "sun",
    label: "Słonecznie",
    icon: "☀️",
    note: "Ogniste i Trawiaste Pokémony wychodzą na słońce.",
    types: ["Ogień", "Trawa"],
    rare: 1,
    shiny: 1,
  },
  rain: {
    key: "rain",
    label: "Deszcz",
    icon: "🌧️",
    note: "Wodne i Robacze gatunki są znacznie częstsze.",
    types: ["Woda", "Robak"],
    rare: 1.1,
    shiny: 1.1,
  },
  snow: {
    key: "snow",
    label: "Śnieg",
    icon: "❄️",
    note: "Lodowe i Stalowe Pokémony opuszczają kryjówki.",
    types: ["Lód", "Stal"],
    rare: 1.15,
    shiny: 1.2,
  },
  storm: {
    key: "storm",
    label: "Burza",
    icon: "⛈️",
    note: "Elektryczne i Latające gatunki szaleją — najwięcej rzadkich spotkań.",
    types: ["Elektryczny", "Latający", "Smok"],
    rare: 1.35,
    shiny: 1.35,
  },
  fog: {
    key: "fog",
    label: "Mgła",
    icon: "🌫️",
    note: "Duchy i Wróżki korzystają z mgły.",
    types: ["Duch", "Wróżka", "Psychiczny"],
    rare: 1.25,
    shiny: 1.25,
  },
  sandstorm: {
    key: "sandstorm",
    label: "Burza piaskowa",
    icon: "🏜️",
    note: "Skalne i Ziemne Pokémony czują się jak w domu.",
    types: ["Skała", "Ziemia", "Walka"],
    rare: 1.2,
    shiny: 1.1,
  },
};

const ROTATION: WeatherKey[] = ["sun", "rain", "sun", "fog", "storm", "sun", "snow", "sandstorm"];
const WEATHER_SLOT_HOURS = 3;

function hash(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

/** Numer bloku pogodowego (zmienia się co 3 godziny czasu polskiego). */
export function weatherSlot(now = new Date()) {
  const { dateKey, hour } = warsawClock(now);
  return { dateKey, slot: Math.floor(hour / WEATHER_SLOT_HOURS) };
}

export function currentWeather(now = new Date()): WeatherDef {
  const { dateKey, slot } = weatherSlot(now);
  const index = hash(`${dateKey}#${slot}`) % ROTATION.length;
  return WEATHERS[ROTATION[index]];
}

/** Ile milisekund do zmiany pogody. */
export function msToWeatherChange(now = new Date()) {
  const { hour, minute, second } = warsawClock(now);
  const hoursLeft = WEATHER_SLOT_HOURS - (hour % WEATHER_SLOT_HOURS) - 1;
  return ((hoursLeft * 60 + (59 - minute)) * 60 + (60 - second)) * 1000;
}

/** Wpływ pory dnia i pogody na spotkania — używany przez eksplorację. */
export function worldEncounterEffects(now = new Date()) {
  const phase = dayPhase(now);
  const weather = currentWeather(now);
  const phaseRare = phase === "evening" ? 1.15 : phase === "night" ? 1.25 : 1;
  const phaseShiny = phase === "night" ? 1.3 : phase === "evening" ? 1.1 : 1;
  return {
    phase,
    weather,
    rare: weather.rare * phaseRare,
    shiny: weather.shiny * phaseShiny,
    /** Typy preferowane przy losowaniu gatunku. */
    favoredTypes: weather.types,
    /** Szansa, że losowanie zawęzi się do preferowanych typów. */
    favorChance: 0.55,
  };
}
