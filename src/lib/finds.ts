/**
 * Znaleziska na szlaku podczas eksploracji: TM-y do ataków, fragmenty Kamieni Mega
 * i Flakony Energii. Wszystkie są rzadkie — losowanie jest po stronie serwera.
 */

export type TmDef = {
  /** Klucz w ekwipunku bez prefiksu `tm_`. */
  id: string;
  /** Nazwa ruchu w PokéAPI. */
  move: string;
  label: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  note: string;
};

/** Pula TM-ów, które można znaleźć w trakcie podróży. */
export const TMS: TmDef[] = [
  { id: "flamethrower", move: "flamethrower", label: "TM — Flamethrower", type: "fire", power: 90, accuracy: 100, note: "Ognisty strumień. Czasem podpala przeciwnika." },
  { id: "surf", move: "surf", label: "TM — Surf", type: "water", power: 90, accuracy: 100, note: "Potężna fala uderzająca w całe pole." },
  { id: "thunderbolt", move: "thunderbolt", label: "TM — Thunderbolt", type: "electric", power: 90, accuracy: 100, note: "Silne uderzenie prądu. Może sparaliżować." },
  { id: "energy-ball", move: "energy-ball", label: "TM — Energy Ball", type: "grass", power: 90, accuracy: 100, note: "Kula energii natury. Obniża obronę specjalną." },
  { id: "ice-beam", move: "ice-beam", label: "TM — Ice Beam", type: "ice", power: 90, accuracy: 100, note: "Promień mrozu. Czasem zamraża." },
  { id: "brick-break", move: "brick-break", label: "TM — Brick Break", type: "fighting", power: 75, accuracy: 100, note: "Cios łamiący bariery ochronne." },
  { id: "sludge-bomb", move: "sludge-bomb", label: "TM — Sludge Bomb", type: "poison", power: 90, accuracy: 100, note: "Wybuch trucizny. Często zatruwa." },
  { id: "earthquake", move: "earthquake", label: "TM — Earthquake", type: "ground", power: 100, accuracy: 100, note: "Wstrząs ziemi o ogromnej sile." },
  { id: "air-slash", move: "air-slash", label: "TM — Air Slash", type: "flying", power: 75, accuracy: 95, note: "Ostrze powietrza. Może wystraszyć." },
  { id: "psychic", move: "psychic", label: "TM — Psychic", type: "psychic", power: 90, accuracy: 100, note: "Fala telekinetyczna obniżająca obronę specjalną." },
  { id: "x-scissor", move: "x-scissor", label: "TM — X-Scissor", type: "bug", power: 80, accuracy: 100, note: "Cięcie na krzyż szczypcami." },
  { id: "rock-slide", move: "rock-slide", label: "TM — Rock Slide", type: "rock", power: 75, accuracy: 90, note: "Lawina kamieni. Może wystraszyć." },
  { id: "shadow-ball", move: "shadow-ball", label: "TM — Shadow Ball", type: "ghost", power: 80, accuracy: 100, note: "Kula cienia obniżająca obronę specjalną." },
  { id: "dragon-claw", move: "dragon-claw", label: "TM — Dragon Claw", type: "dragon", power: 80, accuracy: 100, note: "Rozdarcie ostrymi szponami smoka." },
  { id: "dark-pulse", move: "dark-pulse", label: "TM — Dark Pulse", type: "dark", power: 80, accuracy: 100, note: "Fala mroku. Może wystraszyć." },
  { id: "flash-cannon", move: "flash-cannon", label: "TM — Flash Cannon", type: "steel", power: 80, accuracy: 100, note: "Skupiona wiązka światła ze stali." },
  { id: "dazzling-gleam", move: "dazzling-gleam", label: "TM — Dazzling Gleam", type: "fairy", power: 80, accuracy: 100, note: "Oślepiający błysk mocy wróżek." },
  { id: "body-slam", move: "body-slam", label: "TM — Body Slam", type: "normal", power: 85, accuracy: 100, note: "Uderzenie całym ciałem. Może sparaliżować." },
];

export function tmById(id: string): TmDef | undefined {
  return TMS.find((tm) => tm.id === id);
}

export function tmItemKey(id: string) {
  return `tm_${id}`;
}

/** Grafika TM-a zależy od typu ruchu. */
export function tmSprite(type: string) {
  return `tm-${type}`;
}

/** Opis TM-a widoczny w ekwipunku i w okienku znaleziska. */
export function tmDescription(tm: TmDef) {
  const stats = [
    tm.power ? `moc ${tm.power}` : null,
    tm.accuracy ? `celność ${tm.accuracy}%` : null,
  ].filter(Boolean);
  return `${tm.note} Nauczysz nim ataku typu ${tm.type}${stats.length ? ` (${stats.join(", ")})` : ""}.`;
}

/** Szanse na znalezisko w jednym kroku eksploracji — celowo bardzo niskie. */
export const FIND_RATES = {
  /** TM: najrzadszy. */
  tm: 0.012,
  /** Fragment Kamienia Mega. */
  mega: 0.02,
  /** Flakon Energii. */
  bottle: 0.03,
} as const;

export type FindKind = keyof typeof FIND_RATES;

/** Maksymalnie jedno znalezisko na krok, w kolejności od najrzadszego. */
export function rollFind(random: () => number = Math.random): FindKind | null {
  if (random() < FIND_RATES.tm) return "tm";
  if (random() < FIND_RATES.mega) return "mega";
  if (random() < FIND_RATES.bottle) return "bottle";
  return null;
}

export type FindView = {
  kind: FindKind;
  label: string;
  sprite: string;
  description: string;
  rarity: string;
};
