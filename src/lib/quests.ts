import { BIOMES } from "@/lib/biomes";

export type QuestDifficulty = "easy" | "medium" | "hard";

export type QuestType =
  | "catch"
  | "battle"
  | "steps"
  | "visit"
  | "catch_type"
  | "find_item"
  | "evolve"
  | "shiny";

/** Liczba zadań generowanych codziennie dla każdej trudności. */
export const QUESTS_PER_DIFFICULTY = 10;
export const DIFFICULTIES: QuestDifficulty[] = ["easy", "medium", "hard"];

export const QUEST_PRESETS = {
  easy: { label: "Łatwe", catchTarget: 2, battleTarget: 2, coins: 120, item: "poke_balls", quantity: 3 },
  medium: { label: "Średnie", catchTarget: 5, battleTarget: 5, coins: 350, item: "great_balls", quantity: 3 },
  hard: { label: "Trudne", catchTarget: 10, battleTarget: 9, coins: 800, item: "energy_bottles", quantity: 2 },
} satisfies Record<QuestDifficulty, { label: string; catchTarget: number; battleTarget: number; coins: number; item: string; quantity: number }>;

export const QUEST_INFO = {
  catch: {
    title: "Łowca Pokémonów",
    goal: "Złap wyznaczoną liczbę dzikich Pokémonów.",
    how: "Wejdź w Eksplorację, wybierz dowolny biom (za Energię), wygraj walkę z dzikim Pokémonem i rzuć w niego Ballem. Każde udane złapanie zwiększa postęp o 1 — liczy się cały dzień do 24:00 czasu polskiego.",
  },
  battle: {
    title: "Szlak wojownika",
    goal: "Wygraj wyznaczoną liczbę walk z trenerami.",
    how: "Walki liczą się z Eksploracji (spotkani trenerzy-boty), z ekranu Trenerzy i z Sal. Przegrana nie odejmuje postępu.",
  },
} as const;

export const DIFFICULTY_INFO: Record<QuestDifficulty, string> = {
  easy: "Krótkie zadanie na jedną sesję gry, mała nagroda.",
  medium: "Zadanie na kilkanaście minut aktywnej eksploracji, średnia nagroda.",
  hard: "Cel na cały dzień z dodatkowymi warunkami, największa nagroda.",
};

export const OAK_INFO =
  "Profesor Oak daje jedno badanie naraz. Każdy etap odblokowuje się na wyższym poziomie trenera, ma własny cel (łapanie, walki albo dostarczenie przedmiotu) i po jego wykonaniu odbierasz nagrodę oraz dialog zamykający. Postęp liczy się automatycznie podczas normalnej gry.";

export const OAK_STAGES = [
  { stage: 1, level: 1, type: "catch_species", targetKey: "any", target: 3, coins: 250, item: "poke_balls", quantity: 5, intro: "Witaj! Zacznijmy od obserwacji. Złap trzy dowolne Pokémony i wróć do mnie.", complete: "Doskonała robota! Twoje notatki są bardzo obiecujące." },
  { stage: 2, level: 3, type: "win_battles", targetKey: "bot", target: 4, coins: 500, item: "great_balls", quantity: 5, intro: "Teraz sprawdź więź ze swoją drużyną. Pokonaj czterech trenerów.", complete: "Widziałem zapis walk. Umiesz korzystać z mocnych stron drużyny." },
  { stage: 3, level: 6, type: "deliver_item", targetKey: "candy_normal", target: 3, coins: 900, item: "ultra_balls", quantity: 3, intro: "Potrzebuję trzech Cukierków do analizy przyjaźni Pokémonów.", complete: "Próbki są idealne. To przyspieszy moje badania nad ewolucją." },
  { stage: 4, level: 10, type: "catch_species", targetKey: "any", target: 12, coins: 1400, item: "energy_bottles", quantity: 3, intro: "Czas na szerszą próbę populacji — złap dwanaście Pokémonów.", complete: "Twoje dane wypełniły całą tablicę w laboratorium!" },
  { stage: 5, level: 15, type: "win_battles", targetKey: "any", target: 15, coins: 2200, item: "ultra_balls", quantity: 5, intro: "Sprawdźmy wytrzymałość drużyny w piętnastu walkach.", complete: "Imponująco. Twoja drużyna jest gotowa na Ligę." },
  { stage: 6, level: 22, type: "deliver_item", targetKey: "candy_normal", target: 10, coins: 3200, item: "energy_bottles", quantity: 4, intro: "Do badań nad przyjaźnią potrzebuję dziesięciu Cukierków.", complete: "Znakomicie! Publikuję wyniki z Twoim nazwiskiem." },
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

/* ============ Generator zadań dziennych ============ */

export type GeneratedQuest = {
  slot: number;
  quest_type: QuestType;
  difficulty: QuestDifficulty;
  target: number;
  target_key: string | null;
  biome: string | null;
  title: string;
  description: string;
  reward_coins: number;
  reward_item_key: string;
  reward_item_quantity: number;
};

/** Deterministyczny generator — ten sam gracz i dzień zawsze dostaje ten sam zestaw. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const QUEST_TYPES_ALL = ["Trawa", "Robak", "Woda", "Ogień", "Elektryczny", "Skała", "Ziemia", "Lot", "Psychiczny", "Duch", "Smok", "Lód", "Stal", "Walka", "Trucizna", "Normalny", "Ciemność", "Wróżka"];

const LOCATION_STORIES: Record<string, string> = {
  las: "Śladami Lasu",
  jaskinia: "Tajemnica Jaskini",
  ocean: "Głosy Oceanu",
  gory: "Szlak Szczytów",
  rowniny: "Wiatr Równin",
  pustynia: "Miraż Pustyni",
  snieg: "Zorza Śniegów",
  bagno: "Mgła Bagien",
  wulkan: "Ogień Wulkanu",
  "cyber-lab": "Cyber Incydent",
  niebo: "Ścieżka Nieba",
  otchlan: "Echo Otchłani",
};

type Template = {
  type: QuestType;
  weight: Record<QuestDifficulty, number>;
  build: (difficulty: QuestDifficulty, rand: () => number) => {
    target: number;
    target_key: string | null;
    biome: string | null;
    title: string;
    description: string;
  };
};

const pickFrom = <T,>(list: readonly T[], rand: () => number): T => list[Math.floor(rand() * list.length) % list.length] as T;
const range = (rand: () => number, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const biomeName = (slug: string) => BIOMES.find((b) => b.slug === slug)?.name ?? slug;

const TEMPLATES: Template[] = [
  {
    type: "catch",
    weight: { easy: 3, medium: 3, hard: 2 },
    build: (difficulty, rand) => {
      const target = difficulty === "easy" ? range(rand, 3, 5) : difficulty === "medium" ? range(rand, 6, 10) : range(rand, 12, 18);
      return { target, target_key: null, biome: null, title: "Łowca Pokémonów", description: `Złap ${target} dzikich Pokémonów w dowolnym biomie.` };
    },
  },
  {
    type: "catch",
    weight: { easy: 2, medium: 3, hard: 3 },
    build: (difficulty, rand) => {
      const biome = pickFrom(BIOMES, rand).slug;
      const target = difficulty === "easy" ? range(rand, 2, 4) : difficulty === "medium" ? range(rand, 5, 8) : range(rand, 9, 14);
      return { target, target_key: null, biome, title: LOCATION_STORIES[biome] ?? biomeName(biome), description: `Złap ${target} Pokémonów w lokacji ${biomeName(biome)}.` };
    },
  },
  {
    type: "battle",
    weight: { easy: 3, medium: 3, hard: 3 },
    build: (difficulty, rand) => {
      const target = difficulty === "easy" ? range(rand, 2, 3) : difficulty === "medium" ? range(rand, 5, 8) : range(rand, 10, 15);
      return { target, target_key: null, biome: null, title: "Szlak wojownika", description: `Wygraj ${target} walk (eksploracja, Trenerzy albo Sale).` };
    },
  },
  {
    type: "steps",
    weight: { easy: 3, medium: 2, hard: 2 },
    build: (difficulty, rand) => {
      const target = difficulty === "easy" ? range(rand, 5, 10) : difficulty === "medium" ? range(rand, 12, 20) : range(rand, 25, 35);
      return { target, target_key: null, biome: null, title: "Wędrówka", description: `Wykonaj ${target} kroków eksploracji.` };
    },
  },
  {
    type: "visit",
    weight: { easy: 3, medium: 2, hard: 1 },
    build: (_difficulty, rand) => {
      const biome = pickFrom(BIOMES, rand).slug;
      return { target: 1, target_key: null, biome, title: LOCATION_STORIES[biome] ?? biomeName(biome), description: `Odwiedź lokację ${biomeName(biome)} i zrób tam co najmniej jeden krok.` };
    },
  },
  {
    type: "catch_type",
    weight: { easy: 2, medium: 3, hard: 3 },
    build: (difficulty, rand) => {
      const typeName = pickFrom(QUEST_TYPES_ALL, rand);
      const target = difficulty === "easy" ? range(rand, 1, 2) : difficulty === "medium" ? range(rand, 3, 5) : range(rand, 6, 9);
      return { target, target_key: typeName, biome: null, title: `Specjalista: ${typeName}`, description: `Złap ${target} Pokémonów typu ${typeName}.` };
    },
  },
  {
    type: "find_item",
    weight: { easy: 2, medium: 2, hard: 2 },
    build: (difficulty, rand) => {
      const target = difficulty === "easy" ? 1 : difficulty === "medium" ? range(rand, 2, 3) : range(rand, 4, 6);
      return { target, target_key: null, biome: null, title: "Poszukiwacz", description: `Znajdź ${target} przedmiotów podczas eksploracji (TM, fragmenty Mega, Flakony, Cukierki).` };
    },
  },
  {
    type: "evolve",
    weight: { easy: 0, medium: 2, hard: 2 },
    build: (difficulty, rand) => {
      const target = difficulty === "medium" ? 1 : range(rand, 2, 3);
      return { target, target_key: null, biome: null, title: "Kolejny etap", description: `Wykonaj ${target} ewolucji Pokémona.` };
    },
  },
  {
    type: "shiny",
    weight: { easy: 0, medium: 1, hard: 2 },
    build: () => ({ target: 1, target_key: null, biome: null, title: "Blask rzadkości", description: "Natraf na Shiny Pokémona podczas eksploracji." }),
  },
];

const REWARDS: Record<QuestDifficulty, { coins: [number, number]; items: Array<{ key: string; quantity: number }> }> = {
  easy: { coins: [120, 260], items: [{ key: "poke_balls", quantity: 3 }, { key: "poke_balls", quantity: 5 }, { key: "energy_bottles", quantity: 1 }] },
  medium: { coins: [350, 650], items: [{ key: "great_balls", quantity: 3 }, { key: "energy_bottles", quantity: 1 }, { key: "energy_bottles", quantity: 2 }] },
  hard: { coins: [800, 1400], items: [{ key: "ultra_balls", quantity: 3 }, { key: "energy_bottles", quantity: 2 }, { key: "energy_bottles", quantity: 3 }] },
};

function buildOne(difficulty: QuestDifficulty, slot: number, rand: () => number): GeneratedQuest {
  const pool = TEMPLATES.flatMap((template) => Array.from({ length: template.weight[difficulty] }, () => template));
  const template = pickFrom(pool, rand);
  const shape = template.build(difficulty, rand);
  const reward = REWARDS[difficulty];
  const item = pickFrom(reward.items, rand);
  return {
    slot,
    quest_type: template.type,
    difficulty,
    reward_coins: range(rand, reward.coins[0], reward.coins[1]),
    reward_item_key: item.key,
    reward_item_quantity: item.quantity,
    ...shape,
  };
}

/** Pełny dzienny zestaw: 10 łatwych, 10 średnich, 10 trudnych zadań. */
export function generateDailyQuests(seedKey: string): GeneratedQuest[] {
  const rand = seeded(seedKey);
  const quests: GeneratedQuest[] = [];
  DIFFICULTIES.forEach((difficulty, dIndex) => {
    const seen = new Set<string>();
    for (let i = 0; i < QUESTS_PER_DIFFICULTY; i += 1) {
      const slot = dIndex * QUESTS_PER_DIFFICULTY + i;
      let quest = buildOne(difficulty, slot, rand);
      let guard = 0;
      while (seen.has(`${quest.quest_type}:${quest.biome ?? ""}:${quest.target_key ?? ""}`) && guard < 12) {
        quest = buildOne(difficulty, slot, rand);
        guard += 1;
      }
      seen.add(`${quest.quest_type}:${quest.biome ?? ""}:${quest.target_key ?? ""}`);
      quests.push(quest);
    }
  });
  return quests;
}

/** Zamiennik przy jednorazowym przelosowaniu — ta sama trudność, inne zadanie. */
export function generateReplacementQuest(
  seedKey: string,
  slot: number,
  difficulty: QuestDifficulty,
  avoidSignature: string,
): GeneratedQuest {
  const rand = seeded(`${seedKey}:reroll:${slot}`);
  let quest = buildOne(difficulty, slot, rand);
  let guard = 0;
  while (`${quest.quest_type}:${quest.biome ?? ""}:${quest.target_key ?? ""}` === avoidSignature && guard < 12) {
    quest = buildOne(difficulty, slot, rand);
    guard += 1;
  }
  return quest;
}

export const QUEST_TYPE_LABELS: Record<QuestType, string> = {
  catch: "Łapanie",
  battle: "Walki",
  steps: "Kroki",
  visit: "Lokacja",
  catch_type: "Typ Pokémona",
  find_item: "Przedmioty",
  evolve: "Ewolucja",
  shiny: "Shiny",
};
