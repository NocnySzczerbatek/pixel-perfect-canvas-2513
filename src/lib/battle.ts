/**
 * System walki: statystyki z poziomu i IV, tablica przewag typów,
 * auto-battle (Pokémon sam wybiera atak) oraz rozbudowany raport rund
 * do wizualnego ekranu walki.
 */

type Chart = Record<string, { strong: string[]; weak: string[] }>;

const TYPE_CHART: Chart = {
  Ogień: { strong: ["Trawa", "Lód", "Robak", "Stal"], weak: ["Woda", "Skała", "Smok"] },
  Woda: { strong: ["Ogień", "Ziemia", "Skała"], weak: ["Trawa", "Elektryczny", "Smok"] },
  Trawa: { strong: ["Woda", "Ziemia", "Skała"], weak: ["Ogień", "Trawa", "Trucizna", "Lot", "Robak", "Smok", "Stal"] },
  Elektryczny: { strong: ["Woda", "Lot"], weak: ["Trawa", "Elektryczny", "Smok"] },
  Lód: { strong: ["Trawa", "Ziemia", "Lot", "Smok"], weak: ["Ogień", "Woda", "Lód", "Stal"] },
  Walka: { strong: ["Normalny", "Lód", "Skała", "Stal"], weak: ["Trucizna", "Lot", "Psychiczny", "Robak"] },
  Trucizna: { strong: ["Trawa"], weak: ["Trucizna", "Ziemia", "Skała", "Duch", "Stal"] },
  Ziemia: { strong: ["Ogień", "Elektryczny", "Trucizna", "Skała", "Stal"], weak: ["Trawa", "Robak", "Lot"] },
  Lot: { strong: ["Trawa", "Walka", "Robak"], weak: ["Elektryczny", "Skała", "Stal"] },
  Psychiczny: { strong: ["Walka", "Trucizna"], weak: ["Psychiczny", "Stal", "Duch"] },
  Robak: { strong: ["Trawa", "Psychiczny", "Duch"], weak: ["Ogień", "Walka", "Trucizna", "Lot", "Duch", "Stal"] },
  Skała: { strong: ["Ogień", "Lód", "Lot", "Robak"], weak: ["Walka", "Ziemia", "Stal"] },
  Duch: { strong: ["Psychiczny", "Duch"], weak: ["Normalny", "Stal"] },
  Smok: { strong: ["Smok"], weak: ["Stal"] },
  Stal: { strong: ["Lód", "Skała"], weak: ["Ogień", "Woda", "Elektryczny", "Stal"] },
  Normalny: { strong: [], weak: ["Skała", "Stal", "Duch"] },
};

export function typeMultiplier(attacker: string, defender: string) {
  const entry = TYPE_CHART[attacker];
  if (!entry) return 1;
  if (entry.strong.includes(defender)) return 2;
  if (entry.weak.includes(defender)) return 0.5;
  return 1;
}

/** Skuteczność wobec wszystkich typów obrońcy (mnożniki się mnożą). */
function multiplierAgainst(moveType: string, defenderTypes: string[]): number {
  return defenderTypes.reduce((acc, type) => acc * typeMultiplier(moveType, type), 1);
}

export type BattleMove = {
  name: string;
  type?: string;
  power: number;
  category?: "Fizyczny" | "Specjalny";
  accuracy?: number;
};

export type Fighter = {
  id?: string;
  name: string;
  type: string;
  level: number;
  hp: number;
  hpMax: number;
  atk: number;
  def: number;
  spe: number;
  /** Rozszerzenia dla wizualnej walki — opcjonalne, mają rozsądne wartości domyślne. */
  species_id?: number;
  types?: string[];
  spa?: number;
  spd?: number;
  acc?: number;
  ability?: string;
  shiny?: boolean;
  side?: "ally" | "foe";
  moves?: BattleMove[];
  /** Klucz Przedmiotu Trzymanego (Held Item) — premia do typu albo leczenie co turę. */
  heldItem?: string | null;
};

/**
 * Statystyka wyliczana jak w oryginalnych grach: bazowa moc gatunku decyduje
 * najbardziej, poziom skaluje, IV i punkty treningu dodają szlif.
 */
export function statValue(level: number, baseStat: number, iv = 0, train = 0) {
  const core = Math.floor(((2 * baseStat + iv + Math.floor(train / 4)) * level) / 100);
  return Math.max(1, core + 5);
}

/** HP wyliczane bazą gatunku (formuła z gier). */
export function hpValue(level: number, baseHp: number, iv = 0, train = 0) {
  const core = Math.floor(((2 * baseHp + iv + Math.floor(train / 4)) * level) / 100);
  return Math.max(5, core + level + 10);
}

/** Zgodność wstecz: gdy nie znamy gatunku, przyjmujemy przeciętną bazę. */
export function statFromIv(level: number, iv: number, base = 60) {
  return statValue(level, base >= 20 ? base : 60, iv);
}

export function hpFromIv(level: number, iv: number, base = 60) {
  return hpValue(level, base, iv);
}


/* ------------------------- Pogoda i warunki ------------------------- */

export type Weather = {
  key: string;
  label: string;
  /** Modyfikator celności obu stron (1 = bez zmian). */
  accuracy: number;
  /** Typy wzmocnione (×1,2) i osłabione (×0,8). */
  boost: string[];
  drop: string[];
  narration: string;
};

export const WEATHERS: Weather[] = [
  { key: "clear", label: "Pogodnie", accuracy: 1, boost: [], drop: [], narration: "Niebo jest czyste — nic nie zakłóca walki." },
  { key: "rain", label: "Deszcz", accuracy: 0.95, boost: ["Woda"], drop: ["Ogień"], narration: "Pada deszcz: ataki Wodne są silniejsze, Ogniste słabsze." },
  { key: "sun", label: "Upał", accuracy: 1, boost: ["Ogień"], drop: ["Woda"], narration: "Praży słońce: ataki Ogniste są silniejsze, Wodne słabsze." },
  { key: "fog", label: "Mgła", accuracy: 0.8, boost: [], drop: [], narration: "Z powodu mgły celność Pokémonów spada o 20%." },
  { key: "sand", label: "Burza piaskowa", accuracy: 0.9, boost: ["Skała", "Ziemia"], drop: [], narration: "Burza piaskowa tnie po oczach: celność spada o 10%, ataki Skalne i Ziemne rosną." },
  { key: "snow", label: "Śnieżyca", accuracy: 0.9, boost: ["Lód"], drop: ["Ogień"], narration: "Śnieżyca: celność spada o 10%, ataki Lodowe są silniejsze." },
];

export function pickWeather(): Weather {
  return WEATHERS[Math.floor(Math.random() * WEATHERS.length)]!;
}

export function weatherByKey(key: string): Weather {
  return WEATHERS.find((w) => w.key === key) ?? WEATHERS[0]!;
}

/* ------------------------- Raport walki ------------------------- */

export type FighterSnapshot = {
  id?: string;
  name: string;
  side: "ally" | "foe";
  species_id: number | null;
  level: number;
  types: string[];
  hp: number;
  hpMax: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  acc: number;
  ability: string;
  shiny: boolean;
};

export type BattleLine = {
  kind: "attack" | "weather" | "ability" | "faint" | "info";
  text: string;
};

export type BattleRound = {
  index: number;
  ally: FighterSnapshot;
  foe: FighterSnapshot;
  lines: BattleLine[];
};

export type BattleReport = {
  weather: { key: string; label: string; narration: string };
  ally: FighterSnapshot;
  foe: FighterSnapshot;
  rounds: BattleRound[];
  won: boolean;
  /** Sumaryczne EXP przypisane po walce (wypełniane po stronie serwera). */
  trainer_exp: number;
  coins: number;
  pokemon_exp: { name: string; exp: number }[];
  extras: string[];
};

import { catalogItem, heldBoostFor, heldHealFor } from "@/lib/held-items";

const DEFAULT_MOVE: BattleMove = { name: "Uderzenie", power: 40, category: "Fizyczny" };

function typesOf(f: Fighter): string[] {
  const list = (f.types ?? [f.type]).filter(Boolean);
  return list.length > 0 ? list : ["Normalny"];
}

function spaOf(f: Fighter) {
  return f.spa ?? f.atk;
}
function spdOf(f: Fighter) {
  return f.spd ?? f.def;
}
function accOf(f: Fighter) {
  return f.acc ?? 100;
}

function snapshot(f: Fighter, side: "ally" | "foe"): FighterSnapshot {
  return {
    ...(f.id ? { id: f.id } : {}),
    name: f.name,
    side,
    species_id: f.species_id ?? null,
    level: f.level,
    types: typesOf(f),
    hp: Math.max(0, Math.round(f.hp)),
    hpMax: f.hpMax,
    atk: f.atk,
    def: f.def,
    spa: spaOf(f),
    spd: spdOf(f),
    spe: f.spe,
    acc: accOf(f),
    ability: f.ability ?? "—",
    shiny: !!f.shiny,
  };
}

/** Auto-wybór ataku: najwyższe oczekiwane obrażenia wobec typów obrońcy. */
function chooseMove(attacker: Fighter, defender: Fighter): BattleMove {
  const moves = (attacker.moves ?? []).filter((m) => (m.power ?? 0) > 0);
  if (moves.length === 0) return { ...DEFAULT_MOVE, type: typesOf(attacker)[0]! };
  const defTypes = typesOf(defender);
  let best = moves[0]!;
  let bestScore = -1;
  for (const move of moves) {
    const moveType = move.type ?? typesOf(attacker)[0]!;
    const mult = multiplierAgainst(moveType, defTypes);
    const stab = typesOf(attacker).includes(moveType) ? 1.2 : 1;
    const off = move.category === "Specjalny" ? spaOf(attacker) : attacker.atk;
    const def = move.category === "Specjalny" ? spdOf(defender) : defender.def;
    const score = Math.max(1, off * (move.power / 60) - def * 0.45) * mult * stab;
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

function attackOnce(
  attacker: Fighter,
  defender: Fighter,
  weather: Weather,
  lines: BattleLine[],
): void {
  const move = chooseMove(attacker, defender);
  const moveType = move.type ?? typesOf(attacker)[0]!;
  const accuracy = Math.min(
    1,
    ((move.accuracy ?? 100) / 100) * (accOf(attacker) / 100) * weather.accuracy,
  );
  if (Math.random() > accuracy) {
    lines.push({
      kind: "attack",
      text: `${attacker.name} używa ${move.name}, ale chybia (celność ${Math.round(accuracy * 100)}%).`,
    });
    return;
  }

  const mult = multiplierAgainst(moveType, typesOf(defender));
  const stab = typesOf(attacker).includes(moveType) ? 1.2 : 1;
  const weatherBoost = weather.boost.includes(moveType)
    ? 1.2
    : weather.drop.includes(moveType)
      ? 0.8
      : 1;
  const special = move.category === "Specjalny";
  const off = special ? spaOf(attacker) : attacker.atk;
  const def = special ? spdOf(defender) : defender.def;
  const variance = 0.9 + Math.random() * 0.2;
  const heldBoost = 1 + heldBoostFor(attacker.heldItem, moveType);
  const dmg = Math.max(
    2,
    Math.round(
      Math.max(2, off * (move.power / 55) - def * 0.45) *
        mult *
        stab *
        weatherBoost *
        heldBoost *
        variance,
    ),
  );
  defender.hp = Math.max(0, defender.hp - dmg);
  const note =
    mult > 1 ? " Super skuteczne!" : mult < 1 ? " Niewiele to dało…" : "";
  lines.push({
    kind: "attack",
    text: `${attacker.name} używając ${move.name} uderza ${defender.name} zabierając mu ${dmg} HP.${note}`,
  });
  if (weatherBoost !== 1) {
    lines.push({
      kind: "weather",
      text:
        weatherBoost > 1
          ? `${weather.label} wzmacnia ataki typu ${moveType} o 20%.`
          : `${weather.label} osłabia ataki typu ${moveType} o 20%.`,
    });
  }
  if (heldBoost > 1) {
    lines.push({
      kind: "ability",
      text: `${catalogItem(attacker.heldItem)?.label} wzmacnia ataki typu ${moveType} o ${Math.round((heldBoost - 1) * 100)}%.`,
    });
  }
  if (stab > 1) {
    lines.push({
      kind: "ability",
      text: `${attacker.name} atakuje własnym typem (${moveType}) — obrażenia rosną o 20%.`,
    });
  }
  if (defender.hp <= 0) {
    lines.push({ kind: "faint", text: `${defender.name} pada!` });
  }
}

/**
 * Auto-walka drużyna vs drużyna: kolejność po Prędkości, atak wybierany
 * automatycznie, pełny raport rund do wizualizacji.
 */
export function simulateTeamBattle(
  allies: Fighter[],
  foes: Fighter[],
  options?: { weather?: Weather },
): { won: boolean; log: string[]; allyHp: Record<string, number>; report: BattleReport } {
  const weather = options?.weather ?? pickWeather();
  const log: string[] = [];
  const allyHp: Record<string, number> = {};
  const myTeam = allies.map((f) => ({ ...f }));
  const foeTeam = foes.map((f) => ({ ...f }));
  const rounds: BattleRound[] = [];

  const blank: Fighter = { name: "—", type: "Normalny", level: 1, hp: 0, hpMax: 1, atk: 1, def: 1, spe: 1 };
  const allyCard = snapshot(myTeam[0] ?? blank, "ally");
  const foeCard = snapshot(foeTeam[0] ?? blank, "foe");

  let a = 0;
  let b = 0;
  let round = 1;
  while (a < myTeam.length && b < foeTeam.length && round <= 60) {
    const me = myTeam[a]!;
    const foe = foeTeam[b]!;
    const lines: BattleLine[] = [];
    if (round === 1) {
      lines.push({ kind: "weather", text: weather.narration });
    }
    const order = me.spe >= foe.spe ? [me, foe] : [foe, me];
    for (const attacker of order) {
      const defender = attacker === me ? foe : me;
      if (attacker.hp <= 0 || defender.hp <= 0) continue;
      attackOnce(attacker, defender, weather, lines);
    }

    // Leftovers i podobne przedmioty leczą na koniec tury.
    for (const fighter of [me, foe]) {
      const share = heldHealFor(fighter.heldItem);
      if (share <= 0 || fighter.hp <= 0 || fighter.hp >= fighter.hpMax) continue;
      const heal = Math.max(1, Math.round(fighter.hpMax * share));
      fighter.hp = Math.min(fighter.hpMax, fighter.hp + heal);
      lines.push({
        kind: "ability",
        text: `${catalogItem(fighter.heldItem)?.label} leczy ${fighter.name} o ${heal} HP.`,
      });
    }

    rounds.push({
      index: round,
      ally: snapshot(me, "ally"),
      foe: snapshot(foe, "foe"),
      lines,
    });
    log.push(...lines.map((line) => `Runda ${round}: ${line.text}`));

    if (me.hp <= 0) {
      if (me.id) allyHp[me.id] = 0;
      a += 1;
      if (a < myTeam.length) {
        rounds[rounds.length - 1]!.lines.push({
          kind: "info",
          text: `Wysyłasz do walki ${myTeam[a]!.name}.`,
        });
      }
    }
    if (foe.hp <= 0) {
      b += 1;
      if (b < foeTeam.length) {
        rounds[rounds.length - 1]!.lines.push({
          kind: "info",
          text: `Rywal wystawia ${foeTeam[b]!.name}.`,
        });
      }
    }
    round += 1;
  }

  for (const ally of myTeam) if (ally.id) allyHp[ally.id] = Math.max(0, ally.hp);

  const won = b >= foeTeam.length && a < myTeam.length;
  log.push(
    won
      ? "Zwycięstwo! Rywal wysyła ostatniego Pokémona do PC-a."
      : "Porażka — Twoja drużyna nie dała rady. Ulecz Pokémony i spróbuj ponownie.",
  );

  const report: BattleReport = {
    weather: { key: weather.key, label: weather.label, narration: weather.narration },
    ally: allyCard,
    foe: foeCard,
    rounds,
    won,
    trainer_exp: 0,
    coins: 0,
    pokemon_exp: [],
    extras: [],
  };

  return { won, log, allyHp, report };
}
