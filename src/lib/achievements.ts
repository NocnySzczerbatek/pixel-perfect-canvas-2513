/**
 * Definicje osiągnięć i nagród za codzienne logowanie.
 * Progres liczony jest z istniejących danych gracza — bez osobnych liczników.
 */

export type AchievementCategory =
  | "Łapanie"
  | "Walka"
  | "Eksploracja"
  | "Shiny"
  | "Kolekcja"
  | "Sale"
  | "Liga";

export type AchievementDef = {
  key: string;
  label: string;
  description: string;
  category: AchievementCategory;
  metric:
    | "caught"
    | "species"
    | "shiny"
    | "wins"
    | "trainer_wins"
    | "badges"
    | "regions"
    | "champion";
  target: number;
  rewardCoins: number;
  rewardBottles: number;
  /** Trwały bonus do Shiny/rzadkości (jednorazowo, przez istniejący system bonusów). */
  permanentBonus: boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // Łapanie
  { key: "catch_10", label: "Pierwsze łowy", description: "Złap 10 Pokémonów.", category: "Łapanie", metric: "caught", target: 10, rewardCoins: 500, rewardBottles: 1, permanentBonus: false },
  { key: "catch_100", label: "Doświadczony łowca", description: "Złap 100 Pokémonów.", category: "Łapanie", metric: "caught", target: 100, rewardCoins: 3000, rewardBottles: 3, permanentBonus: false },
  { key: "catch_500", label: "Mistrz siatki", description: "Złap 500 Pokémonów.", category: "Łapanie", metric: "caught", target: 500, rewardCoins: 12000, rewardBottles: 6, permanentBonus: true },
  { key: "catch_1000", label: "Legenda łowów", description: "Złap 1000 Pokémonów.", category: "Łapanie", metric: "caught", target: 1000, rewardCoins: 30000, rewardBottles: 10, permanentBonus: true },
  // Kolekcja
  { key: "species_50", label: "Kolekcjoner", description: "Zdobądź 50 różnych gatunków.", category: "Kolekcja", metric: "species", target: 50, rewardCoins: 2500, rewardBottles: 2, permanentBonus: false },
  { key: "species_150", label: "Badacz gatunków", description: "Zdobądź 150 różnych gatunków.", category: "Kolekcja", metric: "species", target: 150, rewardCoins: 9000, rewardBottles: 5, permanentBonus: true },
  { key: "species_400", label: "Żywy Pokédex", description: "Zdobądź 400 różnych gatunków.", category: "Kolekcja", metric: "species", target: 400, rewardCoins: 25000, rewardBottles: 8, permanentBonus: true },
  // Shiny
  { key: "shiny_1", label: "Błysk w oku", description: "Złap pierwszego Shiny.", category: "Shiny", metric: "shiny", target: 1, rewardCoins: 4000, rewardBottles: 3, permanentBonus: true },
  { key: "shiny_5", label: "Kolekcja blasku", description: "Złap 5 Shiny.", category: "Shiny", metric: "shiny", target: 5, rewardCoins: 15000, rewardBottles: 6, permanentBonus: true },
  // Walka
  { key: "wins_50", label: "Zaprawiony w boju", description: "Wygraj 50 walk z dzikimi Pokémonami.", category: "Walka", metric: "wins", target: 50, rewardCoins: 1500, rewardBottles: 2, permanentBonus: false },
  { key: "wins_250", label: "Weteran", description: "Wygraj 250 walk z dzikimi Pokémonami.", category: "Walka", metric: "wins", target: 250, rewardCoins: 8000, rewardBottles: 5, permanentBonus: false },
  { key: "trainer_wins_25", label: "Postrach szlaku", description: "Pokonaj 25 Trenerów.", category: "Walka", metric: "trainer_wins", target: 25, rewardCoins: 5000, rewardBottles: 4, permanentBonus: false },
  // Sale i Liga
  { key: "badges_1", label: "Pierwsza odznaka", description: "Zdobądź pierwszą odznakę Sali.", category: "Sale", metric: "badges", target: 1, rewardCoins: 1000, rewardBottles: 2, permanentBonus: false },
  { key: "badges_8", label: "Pełny zestaw", description: "Zdobądź 8 odznak.", category: "Sale", metric: "badges", target: 8, rewardCoins: 12000, rewardBottles: 6, permanentBonus: true },
  { key: "champion", label: "Mistrz Ligi", description: "Pokonaj Elite 4 i Mistrza.", category: "Liga", metric: "champion", target: 1, rewardCoins: 25000, rewardBottles: 10, permanentBonus: true },
  // Eksploracja
  { key: "regions_3", label: "Podróżnik", description: "Odwiedź 3 regiony.", category: "Eksploracja", metric: "regions", target: 3, rewardCoins: 3000, rewardBottles: 3, permanentBonus: false },
  { key: "regions_9", label: "Obieżyświat", description: "Odwiedź wszystkie 9 regionów.", category: "Eksploracja", metric: "regions", target: 9, rewardCoins: 20000, rewardBottles: 8, permanentBonus: true },
];

/** Nagrody za codzienne logowanie: dzień 1–7, potem cykl zaczyna się od nowa. */
export const LOGIN_REWARDS = [
  { day: 1, coins: 300, bottles: 0, balls: 3 },
  { day: 2, coins: 500, bottles: 1, balls: 3 },
  { day: 3, coins: 800, bottles: 1, balls: 5 },
  { day: 4, coins: 1200, bottles: 1, balls: 5 },
  { day: 5, coins: 1800, bottles: 2, balls: 8 },
  { day: 6, coins: 2600, bottles: 2, balls: 10 },
  { day: 7, coins: 4000, bottles: 3, balls: 15 },
] as const;

export function loginReward(day: number) {
  const index = Math.min(Math.max(day, 1), 7) - 1;
  return LOGIN_REWARDS[index] ?? LOGIN_REWARDS[0];
}

/** Dzisiejsza data w strefie Europe/Warsaw jako YYYY-MM-DD. */
export function warsawDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Czy `prev` to dzień poprzedzający `today` (obie daty YYYY-MM-DD). */
export function isYesterday(prev: string, today: string): boolean {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10) === prev;
}
