/** Sale (8 na region), Liderzy i odznaki. */

export type GymBlueprint = {
  index: number;
  type: string;
  badgeKey: string;
  badgeName: string;
  gradient: string;
  accent: string;
};

export const GYM_BLUEPRINT: GymBlueprint[] = [
  {
    index: 1,
    type: "Skała",
    badgeKey: "rock",
    badgeName: "Odznaka Skały",
    gradient: "linear-gradient(135deg,#a1866f,#5d4632)",
    accent: "#d8b48c",
  },
  {
    index: 2,
    type: "Woda",
    badgeKey: "water",
    badgeName: "Odznaka Kaskady",
    gradient: "linear-gradient(135deg,#5fb2ff,#12406f)",
    accent: "#a8dcff",
  },
  {
    index: 3,
    type: "Elektryczny",
    badgeKey: "electric",
    badgeName: "Odznaka Pioruna",
    gradient: "linear-gradient(135deg,#ffd85e,#a06a00)",
    accent: "#fff0a8",
  },
  {
    index: 4,
    type: "Trawa",
    badgeKey: "grass",
    badgeName: "Odznaka Tęczy",
    gradient: "linear-gradient(135deg,#7ddf7a,#1e6b3a)",
    accent: "#c6f5b8",
  },
  {
    index: 5,
    type: "Trucizna",
    badgeKey: "poison",
    badgeName: "Odznaka Mgły",
    gradient: "linear-gradient(135deg,#c07bff,#4b1f77)",
    accent: "#e3c4ff",
  },
  {
    index: 6,
    type: "Psychiczny",
    badgeKey: "psychic",
    badgeName: "Odznaka Duszy",
    gradient: "linear-gradient(135deg,#ff85b6,#7a1f4d)",
    accent: "#ffc7dd",
  },
  {
    index: 7,
    type: "Ogień",
    badgeKey: "fire",
    badgeName: "Odznaka Żaru",
    gradient: "linear-gradient(135deg,#ff8a4c,#8a2a06)",
    accent: "#ffd0ab",
  },
  {
    index: 8,
    type: "Ziemia",
    badgeKey: "earth",
    badgeName: "Odznaka Ziemi",
    gradient: "linear-gradient(135deg,#9be7d8,#155f57)",
    accent: "#d7fff6",
  },
];

const LEADERS: Record<string, string[]> = {
  kanto: ["Brock", "Misty", "Lt. Surge", "Erika", "Koga", "Sabrina", "Blaine", "Giovanni"],
  johto: ["Falkner", "Bugsy", "Whitney", "Morty", "Chuck", "Jasmine", "Pryce", "Clair"],
  hoenn: ["Roxanne", "Brawly", "Wattson", "Flannery", "Norman", "Winona", "Tate", "Juan"],
  sinnoh: ["Roark", "Gardenia", "Maylene", "Crasher Wake", "Fantina", "Byron", "Candice", "Volkner"],
  unova: ["Cilan", "Lenora", "Burgh", "Elesa", "Clay", "Skyla", "Brycen", "Drayden"],
  kalos: ["Viola", "Grant", "Korrina", "Ramos", "Clemont", "Valerie", "Olympia", "Wulfric"],
  alola: ["Ilima", "Lana", "Kiawe", "Mallow", "Sophocles", "Acerola", "Mina", "Hapu"],
  galar: ["Milo", "Nessa", "Kabu", "Bea", "Opal", "Gordie", "Melony", "Raihan"],
  paldea: ["Katy", "Brassius", "Iono", "Kofu", "Larry", "Ryme", "Tulip", "Grusha"],
};

export type Gym = GymBlueprint & {
  leader: string;
  /** Poziom drużyny Lidera. */
  level: number;
  teamSize: number;
  rewardExp: number;
  rewardCoins: number;
};

export function gymsForRegion(region: string | null | undefined): Gym[] {
  const leaders = LEADERS[region ?? "kanto"] ?? LEADERS["kanto"]!;
  return GYM_BLUEPRINT.map((blueprint, i) => ({
    ...blueprint,
    leader: leaders[i] ?? `Lider ${i + 1}`,
    level: 4 + i * 4,
    teamSize: i < 3 ? 2 : i < 6 ? 3 : 4,
    rewardExp: 60 + i * 45,
    rewardCoins: 120 + i * 90,
  }));
}

export function badgeByKey(key: string) {
  return GYM_BLUEPRINT.find((gym) => gym.badgeKey === key) ?? null;
}
