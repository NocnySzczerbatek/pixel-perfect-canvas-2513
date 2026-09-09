import { REGIONS } from "@/lib/game-data";
import { warsawClock } from "@/lib/time";

export const TRAVEL_TICKET_PRICE = 20000;

/**
 * Okna podróży mieszczą się wyłącznie w rozsądnych godzinach (8:00–24:00 czasu polskiego):
 * 9 regionów × 2 h, start co 1 h 45 min — od 8:00 do 22:00–24:00.
 */
const TRAVEL_FIRST_START = 8 * 60; // 8:00
const TRAVEL_STEP = 105; // 1 h 45 min
const TRAVEL_LENGTH = 120; // 2 h

export const TRAVEL_WINDOWS = REGIONS.map((region, index) => ({
  ...region,
  startMinute: TRAVEL_FIRST_START + index * TRAVEL_STEP,
  endMinute: TRAVEL_FIRST_START + index * TRAVEL_STEP + TRAVEL_LENGTH,
}));


export function travelWindowState(region: string, now = new Date()) {
  const window = TRAVEL_WINDOWS.find((entry) => entry.slug === region);
  if (!window) return null;
  const clock = warsawClock(now);
  const secondsToday = clock.minuteOfDay * 60 + clock.second;
  const start = window.startMinute * 60;
  const end = window.endMinute * 60;
  const open = secondsToday >= start && secondsToday < end;
  const untilOpenSeconds = open ? 0 : secondsToday < start ? start - secondsToday : 86400 - secondsToday + start;
  const untilCloseSeconds = open ? end - secondsToday : 0;
  return {
    open,
    msUntilOpen: untilOpenSeconds * 1000,
    msUntilClose: untilCloseSeconds * 1000,
    label: `${String(Math.floor(window.startMinute / 60)).padStart(2, "0")}:${String(window.startMinute % 60).padStart(2, "0")}–${String(Math.floor(window.endMinute / 60)).padStart(2, "0")}:${String(window.endMinute % 60).padStart(2, "0")}`,
  };
}

export function effectiveRegion(home: string | null, travel: string | null, travelUntil: string | null) {
  if (!travel || !travelUntil || new Date(travelUntil).getTime() <= Date.now()) return home;
  return travel;
}