export type QuestDifficulty = "easy" | "medium" | "hard";

export const QUEST_PRESETS = {
  easy: { label: "Łatwe", catchTarget: 2, battleTarget: 2, coins: 120, item: "poke_balls", quantity: 3 },
  medium: { label: "Średnie", catchTarget: 5, battleTarget: 5, coins: 350, item: "great_balls", quantity: 3 },
  hard: { label: "Trudne", catchTarget: 10, battleTarget: 9, coins: 800, item: "energy_bottles", quantity: 2 },
} satisfies Record<QuestDifficulty, { label: string; catchTarget: number; battleTarget: number; coins: number; item: string; quantity: number }>;

export const QUEST_INFO = {
  catch: {
    title: "Łowca Pokémonów",
    goal: "Złap wyznaczoną liczbę dzikich Pokémonów.",
    how: "Wejdź w Eksplorację, wybierz dowolny biom (za Energię), wygraj walkę z dzikim Pokémonem i rzuć w niego Ballem. Każde udane złapanie zwiększa postęp o 1 — biom nie ma znaczenia, liczy się cały dzień do 24:00 czasu polskiego.",
  },
  battle: {
    title: "Szlak wojownika",
    goal: "Wygraj wyznaczoną liczbę walk z trenerami.",
    how: "Walki liczą się z Eksploracji (spotkani trenerzy-boty), z ekranu Trenerzy i z Sal. Przegrana nie odejmuje postępu, ale nie dolicza się do celu.",
  },
} as const;

export const DIFFICULTY_INFO: Record<QuestDifficulty, string> = {
  easy: "Krótkie zadanie na jedną sesję gry, mała nagroda.",
  medium: "Zadanie na kilkanaście minut gry, średnia nagroda.",
  hard: "Cel na cały dzień, największa nagroda w monetach i przedmiotach.",
};

export const OAK_INFO =
  "Profesor Oak daje jedno badanie naraz. Każdy etap odblokowuje się na wyższym poziomie trenera, ma własny cel (łapanie, walki albo dostarczenie przedmiotu) i po jego wykonaniu odbierasz nagrodę oraz dialog zamykający. Postęp liczy się automatycznie podczas normalnej gry.";

export const OAK_STAGES = [
  { stage: 1, level: 1, type: "catch_species", targetKey: "any", target: 3, coins: 250, item: "poke_balls", quantity: 5, intro: "Witaj! Zacznijmy od obserwacji. Złap trzy dowolne Pokémony i wróć do mnie.", complete: "Doskonała robota! Twoje notatki są bardzo obiecujące." },
  { stage: 2, level: 3, type: "win_battles", targetKey: "bot", target: 4, coins: 500, item: "great_balls", quantity: 5, intro: "Teraz sprawdź więź ze swoją drużyną. Pokonaj czterech trenerów.", complete: "Widziałem zapis walk. Umiesz korzystać z mocnych stron drużyny." },
  { stage: 3, level: 6, type: "deliver_item", targetKey: "candy_normal", target: 3, coins: 900, item: "ultra_balls", quantity: 3, intro: "Potrzebuję trzech Cukierków do analizy przyjaźni Pokémonów.", complete: "Próbki są idealne. To przyspieszy moje badania nad ewolucją." },
] as const;
/** Czytelne nazwy przedmiotów przyznawanych w nagrodach. */
export const REWARD_ITEM_LABELS: Record<string, string> = {
  poke_balls: "Poké Ball",
  great_balls: "Great Ball",
  ultra_balls: "Ultra Ball",
  energy_bottles: "Flakon Energii",
};

/** Nazwa przedmiotu nagrody z zapasowym opisem. */
export function rewardItemLabel(key: string | null | undefined): string {
  if (!key) return "przedmiot";
  return REWARD_ITEM_LABELS[key] ?? key;
}
