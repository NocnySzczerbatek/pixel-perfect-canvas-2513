/** Prosty system walki: statystyki z poziomu i IV + tablica przewag typów. */

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
};

export function statFromIv(level: number, iv: number, base = 8) {
  return Math.round(base + level * 2 + iv * 0.6);
}

export function hpFromIv(level: number, iv: number) {
  return Math.round(20 + level * 4 + iv * 0.8);
}

function damage(attacker: Fighter, defender: Fighter) {
  const mult = typeMultiplier(attacker.type, defender.type);
  const variance = 0.85 + Math.random() * 0.3;
  const raw = (attacker.atk * 1.1 - defender.def * 0.55) * mult * variance;
  return Math.max(2, Math.round(raw));
}

export type BattleResult = {
  won: boolean;
  log: string[];
  /** Pozostałe HP Pokémonów gracza po walce, wg id. */
  allyHp: Record<string, number>;
};

/** Auto-walka drużyna vs drużyna z uwzględnieniem typów i kolejności. */
export function simulateTeamBattle(allies: Fighter[], foes: Fighter[]): BattleResult {
  const log: string[] = [];
  const allyHp: Record<string, number> = {};
  const myTeam = allies.map((f) => ({ ...f }));
  const foeTeam = foes.map((f) => ({ ...f }));

  let a = 0;
  let b = 0;
  let turn = 1;
  while (a < myTeam.length && b < foeTeam.length && turn <= 60) {
    const me = myTeam[a]!;
    const foe = foeTeam[b]!;
    const order = me.spe >= foe.spe ? [me, foe] : [foe, me];
    for (const attacker of order) {
      const defender = attacker === me ? foe : me;
      if (attacker.hp <= 0 || defender.hp <= 0) continue;
      const dmg = damage(attacker, defender);
      defender.hp = Math.max(0, defender.hp - dmg);
      const mult = typeMultiplier(attacker.type, defender.type);
      const note = mult > 1 ? " (super skuteczne!)" : mult < 1 ? " (niewiele dało)" : "";
      log.push(
        `Tura ${turn}: ${attacker.name} (${attacker.type}) trafia ${defender.name} za ${dmg}${note}.`,
      );
      if (defender.hp <= 0) log.push(`${defender.name} pada!`);
    }
    if (me.hp <= 0) {
      if (me.id) allyHp[me.id] = 0;
      a += 1;
    }
    if (foe.hp <= 0) b += 1;
    turn += 1;
  }

  for (const ally of myTeam) if (ally.id) allyHp[ally.id] = Math.max(0, ally.hp);

  const won = b >= foeTeam.length && a < myTeam.length;
  log.push(
    won
      ? "Zwycięstwo! Rywal wysyła ostatniego Pokémona do PC-a."
      : "Porażka — Twoja drużyna nie dała rady. Ulecz Pokémony i spróbuj ponownie.",
  );
  return { won, log, allyHp };
}
