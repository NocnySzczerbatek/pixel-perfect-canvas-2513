export type QuestDifficulty = "easy" | "medium" | "hard";

export const QUEST_PRESETS = {
  easy: { label: "Łatwe", catchTarget: 2, battleTarget: 2, coins: 120, item: "poke_balls", quantity: 3 },
  medium: { label: "Średnie", catchTarget: 5, battleTarget: 5, coins: 350, item: "great_balls", quantity: 3 },
  hard: { label: "Trudne", catchTarget: 10, battleTarget: 9, coins: 800, item: "energy_bottles", quantity: 2 },
} satisfies Record<QuestDifficulty, { label: string; catchTarget: number; battleTarget: number; coins: number; item: string; quantity: number }>;

export const OAK_STAGES = [
  { stage: 1, level: 1, type: "catch_species", targetKey: "any", target: 3, coins: 250, item: "poke_balls", quantity: 5, intro: "Witaj! Zacznijmy od obserwacji. Złap trzy dowolne Pokémony i wróć do mnie.", complete: "Doskonała robota! Twoje notatki są bardzo obiecujące." },
  { stage: 2, level: 3, type: "win_battles", targetKey: "bot", target: 4, coins: 500, item: "great_balls", quantity: 5, intro: "Teraz sprawdź więź ze swoją drużyną. Pokonaj czterech trenerów.", complete: "Widziałem zapis walk. Umiesz korzystać z mocnych stron drużyny." },
  { stage: 3, level: 6, type: "deliver_item", targetKey: "candy_normal", target: 3, coins: 900, item: "ultra_balls", quantity: 3, intro: "Potrzebuję trzech Cukierków do analizy przyjaźni Pokémonów.", complete: "Próbki są idealne. To przyspieszy moje badania nad ewolucją." },
] as const;