/**
 * Liga Pokémon: Elite 4 + Mistrz. Odblokowuje się po 8 odznakach regionu.
 * Drużyny budujemy z gatunków wysokopoziomowych — trudniej niż w Salach.
 */

export type LeagueMember = { species_id: number; species_name: string; level: number };

export type LeagueStage = {
  /** 1–4 = Elite 4, 5 = Mistrz. */
  stage: number;
  name: string;
  title: string;
  type: string;
  team: LeagueMember[];
};

function m(species_id: number, species_name: string, level: number): LeagueMember {
  return { species_id, species_name, level };
}

/** Wspólna Liga dla wszystkich regionów — klasyczna Elite 4 z Kanto/Johto plus Mistrz. */
export const LEAGUE_STAGES: LeagueStage[] = [
  {
    stage: 1,
    name: "Will",
    title: "Elite 4 — Psychika",
    type: "Psychiczny",
    team: [m(178, "Xatu", 56), m(124, "Jynx", 56), m(103, "Exeggutor", 57), m(80, "Slowbro", 58), m(178, "Xatu", 59)],
  },
  {
    stage: 2,
    name: "Koga",
    title: "Elite 4 — Trucizna",
    type: "Trucizna",
    team: [m(168, "Ariados", 58), m(49, "Venomoth", 58), m(205, "Forretress", 59), m(89, "Muk", 60), m(169, "Crobat", 61)],
  },
  {
    stage: 3,
    name: "Bruno",
    title: "Elite 4 — Walka",
    type: "Walka",
    team: [m(237, "Hitmontop", 60), m(106, "Hitmonlee", 60), m(107, "Hitmonchan", 61), m(95, "Onix", 61), m(68, "Machamp", 63)],
  },
  {
    stage: 4,
    name: "Karen",
    title: "Elite 4 — Mrok",
    type: "Mrok",
    team: [m(197, "Umbreon", 62), m(45, "Vileplume", 62), m(198, "Murkrow", 63), m(87, "Dewgong", 63), m(229, "Houndoom", 65)],
  },
  {
    stage: 5,
    name: "Lance",
    title: "Mistrz Ligi",
    type: "Smok",
    team: [m(130, "Gyarados", 66), m(149, "Dragonite", 68), m(142, "Aerodactyl", 66), m(148, "Dragonair", 67), m(149, "Dragonite", 70)],
  },
];

export function leagueStage(stage: number): LeagueStage | undefined {
  return LEAGUE_STAGES.find((entry) => entry.stage === stage);
}

/** Nagrody: rosną z każdym pokonanym przeciwnikiem, Mistrz płaci najwięcej. */
export function leagueRewards(stage: number) {
  const champion = stage === 5;
  return {
    coins: champion ? 20000 : 4000 + stage * 1000,
    exp: champion ? 3000 : 600 + stage * 200,
    bottles: champion ? 10 : 3,
  };
}

export const LEAGUE_ENERGY = 14;
