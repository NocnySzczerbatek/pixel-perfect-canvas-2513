import { BIOMES, type BiomeSpecies } from "@/lib/biomes";
import { FULL_DEX } from "@/lib/full-dex";
import { REGIONS } from "@/lib/game-data";

/** Zakresy numerów Pokédexu dla każdego regionu (wg generacji). */
export const REGION_DEX_RANGES: Record<string, [number, number]> = {
  kanto: [1, 151],
  johto: [152, 251],
  hoenn: [252, 386],
  sinnoh: [387, 493],
  unova: [494, 649],
  kalos: [650, 721],
  alola: [722, 809],
  galar: [810, 905],
  paldea: [906, 1025],
};

export function inRegion(speciesId: number, region: string | null | undefined) {
  if (!region) return true;
  const range = REGION_DEX_RANGES[region];
  if (!range) return true;
  return speciesId >= range[0] && speciesId <= range[1];
}


/** Zapasowe pule gatunków dla każdego regionu (gdy biom nie ma lokalnych gatunków). */
export const REGION_SPECIES: Record<string, BiomeSpecies[]> = {
  kanto: [
    { id: 16, name: "Pidgey", type: "Lot" },
    { id: 19, name: "Rattata", type: "Normalny" },
    { id: 27, name: "Sandshrew", type: "Ziemia" },
    { id: 43, name: "Oddish", type: "Trawa" },
    { id: 58, name: "Growlithe", type: "Ogień" },
    { id: 72, name: "Tentacool", type: "Woda" },
    { id: 74, name: "Geodude", type: "Skała" },
    { id: 86, name: "Seel", type: "Lód" },
    { id: 92, name: "Gastly", type: "Duch" },
    { id: 81, name: "Magnemite", type: "Elektryczny" },
  ],
  johto: [
    { id: 161, name: "Sentret", type: "Normalny" },
    { id: 163, name: "Hoothoot", type: "Lot" },
    { id: 179, name: "Mareep", type: "Elektryczny" },
    { id: 191, name: "Sunkern", type: "Trawa" },
    { id: 194, name: "Wooper", type: "Woda" },
    { id: 218, name: "Slugma", type: "Ogień" },
    { id: 220, name: "Swinub", type: "Lód" },
    { id: 246, name: "Larvitar", type: "Skała" },
    { id: 200, name: "Misdreavus", type: "Duch" },
  ],
  hoenn: [
    { id: 261, name: "Poochyena", type: "Normalny" },
    { id: 278, name: "Wingull", type: "Lot" },
    { id: 287, name: "Slakoth", type: "Normalny" },
    { id: 320, name: "Wailmer", type: "Woda" },
    { id: 322, name: "Numel", type: "Ogień" },
    { id: 328, name: "Trapinch", type: "Ziemia" },
    { id: 331, name: "Cacnea", type: "Trawa" },
    { id: 336, name: "Seviper", type: "Trucizna" },
    { id: 355, name: "Duskull", type: "Duch" },
    { id: 361, name: "Snorunt", type: "Lód" },
  ],
  sinnoh: [
    { id: 396, name: "Starly", type: "Lot" },
    { id: 399, name: "Bidoof", type: "Normalny" },
    { id: 403, name: "Shinx", type: "Elektryczny" },
    { id: 408, name: "Cranidos", type: "Skała" },
    { id: 418, name: "Buizel", type: "Woda" },
    { id: 425, name: "Drifloon", type: "Duch" },
    { id: 453, name: "Croagunk", type: "Trucizna" },
    { id: 459, name: "Snover", type: "Lód" },
  ],
  unova: [
    { id: 504, name: "Patrat", type: "Normalny" },
    { id: 519, name: "Pidove", type: "Lot" },
    { id: 524, name: "Roggenrola", type: "Skała" },
    { id: 535, name: "Tympole", type: "Woda" },
    { id: 543, name: "Venipede", type: "Robak" },
    { id: 551, name: "Sandile", type: "Ziemia" },
    { id: 562, name: "Yamask", type: "Duch" },
    { id: 607, name: "Litwick", type: "Ogień" },
    { id: 613, name: "Cubchoo", type: "Lód" },
  ],
  kalos: [
    { id: 659, name: "Bunnelby", type: "Normalny" },
    { id: 661, name: "Fletchling", type: "Lot" },
    { id: 667, name: "Litleo", type: "Ogień" },
    { id: 672, name: "Skiddo", type: "Trawa" },
    { id: 690, name: "Skrelp", type: "Trucizna" },
    { id: 692, name: "Clauncher", type: "Woda" },
    { id: 703, name: "Carbink", type: "Skała" },
    { id: 712, name: "Bergmite", type: "Lód" },
  ],
  alola: [
    { id: 731, name: "Pikipek", type: "Lot" },
    { id: 734, name: "Yungoos", type: "Normalny" },
    { id: 736, name: "Grubbin", type: "Robak" },
    { id: 739, name: "Crabrawler", type: "Walka" },
    { id: 746, name: "Wishiwashi", type: "Woda" },
    { id: 749, name: "Mudbray", type: "Ziemia" },
    { id: 757, name: "Salandit", type: "Ogień" },
    { id: 769, name: "Sandygast", type: "Duch" },
  ],
  galar: [
    { id: 819, name: "Skwovet", type: "Normalny" },
    { id: 821, name: "Rookidee", type: "Lot" },
    { id: 833, name: "Chewtle", type: "Woda" },
    { id: 837, name: "Rolycoly", type: "Skała" },
    { id: 843, name: "Silicobra", type: "Ziemia" },
    { id: 850, name: "Sizzlipede", type: "Ogień" },
    { id: 859, name: "Impidimp", type: "Duch" },
    { id: 872, name: "Snom", type: "Lód" },
  ],
  paldea: [
    { id: 915, name: "Lechonk", type: "Normalny" },
    { id: 917, name: "Tarountula", type: "Robak" },
    { id: 932, name: "Nacli", type: "Skała" },
    { id: 935, name: "Charcadet", type: "Ogień" },
    { id: 940, name: "Wattrel", type: "Lot" },
    { id: 963, name: "Finizen", type: "Woda" },
    { id: 971, name: "Greavard", type: "Duch" },
    { id: 974, name: "Cetoddle", type: "Lód" },
  ],
};

/** Mapa typów wszystkich gatunków (pełny Pokédex + biomy + startery). */
const TYPES_MAP: Record<number, string[]> = (() => {
  const map: Record<number, string[]> = {};
  for (const entry of FULL_DEX) map[entry.id] = entry.types;
  return map;
})();

const TYPE_MAP: Record<number, string> = (() => {
  const map: Record<number, string> = {};
  for (const entry of FULL_DEX) map[entry.id] = entry.type;
  for (const biome of BIOMES) {
    for (const species of biome.species) map[species.id] = species.type;
  }
  for (const region of REGIONS) {
    for (const starter of region.starters) map[starter.id] = starter.type;
  }
  for (const list of Object.values(REGION_SPECIES)) {
    for (const species of list) map[species.id] = species.type;
  }
  return map;
})();

export function speciesType(speciesId: number) {
  return TYPE_MAP[speciesId] ?? "Normalny";
}

/** Wszystkie typy gatunku (np. ["Trawa", "Trucizna"]). */
export function speciesTypes(speciesId: number): string[] {
  return TYPES_MAP[speciesId] ?? [speciesType(speciesId)];
}

export const NATURES = [
  "Hardy",
  "Lonely",
  "Brave",
  "Adamant",
  "Naughty",
  "Bold",
  "Docile",
  "Relaxed",
  "Impish",
  "Lax",
  "Timid",
  "Hasty",
  "Serious",
  "Jolly",
  "Naive",
  "Modest",
  "Mild",
  "Quiet",
  "Bashful",
  "Rash",
  "Calm",
  "Gentle",
  "Sassy",
  "Careful",
  "Quirky",
];

/** Umiejętności dostępne dla danego typu (losowana jedna przy złapaniu). */
const ABILITIES_BY_TYPE: Record<string, string[]> = {
  Trawa: ["Overgrow", "Chlorophyll", "Leaf Guard"],
  Ogień: ["Blaze", "Flash Fire", "Flame Body"],
  Woda: ["Torrent", "Swift Swim", "Water Veil"],
  Elektryczny: ["Static", "Volt Absorb", "Lightning Rod"],
  Lód: ["Snow Cloak", "Ice Body", "Thick Fat"],
  Walka: ["Guts", "Inner Focus", "Iron Fist"],
  Trucizna: ["Stench", "Poison Point", "Liquid Ooze"],
  Ziemia: ["Sand Veil", "Arena Trap", "Rough Skin"],
  Lot: ["Keen Eye", "Big Pecks", "Gale Wings"],
  Psychiczny: ["Synchronize", "Inner Focus", "Magic Guard"],
  Robak: ["Shield Dust", "Swarm", "Compound Eyes"],
  Skała: ["Sturdy", "Rock Head", "Solid Rock"],
  Duch: ["Levitate", "Cursed Body", "Infiltrator"],
  Smok: ["Shed Skin", "Marvel Scale", "Multiscale"],
  Stal: ["Clear Body", "Light Metal", "Heavy Metal"],
  Normalny: ["Run Away", "Adaptability", "Scrappy"],
};

export function abilitiesFor(type: string) {
  return ABILITIES_BY_TYPE[type] ?? ABILITIES_BY_TYPE["Normalny"]!;
}

export type Move = {
  name: string;
  level: number;
  power: number;
  type: string;
  category: "Fizyczny" | "Specjalny";
  accuracy: number;
};

/** Kategoria ataku wynika z typu, jak w klasycznych generacjach. */
const SPECIAL_TYPES = ["Ogień", "Woda", "Trawa", "Elektryczny", "Psychiczny", "Lód", "Smok"];

export function categoryForType(type: string): "Fizyczny" | "Specjalny" {
  return SPECIAL_TYPES.includes(type) ? "Specjalny" : "Fizyczny";
}

const TYPE_MOVES: Record<string, string[]> = {
  Trawa: ["Absorb", "Vine Whip", "Razor Leaf", "Mega Drain", "Seed Bomb", "Energy Ball", "Leaf Blade", "Solar Beam"],
  Ogień: ["Ember", "Fire Spin", "Flame Wheel", "Fire Fang", "Flamethrower", "Fire Blast", "Inferno", "Overheat"],
  Woda: ["Bubble", "Water Gun", "Aqua Jet", "Bubble Beam", "Brine", "Surf", "Aqua Tail", "Hydro Pump"],
  Elektryczny: ["Thunder Shock", "Spark", "Shock Wave", "Thunder Fang", "Discharge", "Thunderbolt", "Wild Charge", "Thunder"],
  Lód: ["Powder Snow", "Icy Wind", "Ice Shard", "Aurora Beam", "Ice Fang", "Ice Beam", "Avalanche", "Blizzard"],
  Walka: ["Karate Chop", "Low Kick", "Rock Smash", "Brick Break", "Submission", "Cross Chop", "Close Combat", "Focus Punch"],
  Trucizna: ["Acid", "Poison Sting", "Smog", "Venoshock", "Sludge", "Poison Jab", "Sludge Bomb", "Gunk Shot"],
  Ziemia: ["Mud Slap", "Sand Attack", "Bulldoze", "Mud Bomb", "Dig", "Earth Power", "Earthquake", "Fissure"],
  Lot: ["Gust", "Wing Attack", "Peck", "Aerial Ace", "Air Slash", "Drill Peck", "Fly", "Hurricane"],
  Psychiczny: ["Confusion", "Psywave", "Psybeam", "Extrasensory", "Psycho Cut", "Psychic", "Zen Headbutt", "Future Sight"],
  Robak: ["Bug Bite", "String Shot", "Fury Cutter", "Struggle Bug", "Silver Wind", "Bug Buzz", "X-Scissor", "Megahorn"],
  Skała: ["Rock Throw", "Rollout", "Rock Tomb", "Smack Down", "Rock Slide", "Power Gem", "Stone Edge", "Head Smash"],
  Duch: ["Lick", "Night Shade", "Astonish", "Hex", "Shadow Punch", "Shadow Ball", "Shadow Claw", "Phantom Force"],
  Smok: ["Twister", "Dragon Breath", "Dragon Tail", "Dragon Claw", "Dragon Pulse", "Dragon Rush", "Outrage", "Draco Meteor"],
  Stal: ["Metal Claw", "Bullet Punch", "Magnet Bomb", "Iron Head", "Steel Wing", "Flash Cannon", "Meteor Mash", "Iron Tail"],
  Normalny: ["Tackle", "Quick Attack", "Bite", "Headbutt", "Slam", "Body Slam", "Take Down", "Hyper Beam"],
};

const MOVE_LEVELS = [1, 5, 10, 16, 22, 30, 40, 50];
const MOVE_POWERS = [30, 40, 50, 60, 70, 85, 95, 110];

/** Pula ruchów Pokémona wraz z poziomem, na którym się ich uczy. */
export function movePool(speciesId: number): Move[] {
  const type = speciesType(speciesId);
  const names = TYPE_MOVES[type] ?? TYPE_MOVES["Normalny"]!;
  return names.map((name, index) => ({
    name,
    level: MOVE_LEVELS[index] ?? 60,
    power: MOVE_POWERS[index] ?? 110,
    type,
    category: categoryForType(type),
    accuracy: index >= 7 ? 80 : index >= 6 ? 90 : 100,
  }));
}

/** Wszystkie ataki opanowane na danym poziomie (pula do wyboru aktywnej czwórki). */
export function learnedMoves(speciesId: number, level: number): Move[] {
  return movePool(speciesId).filter((move) => move.level <= level);
}

/** Domyślny zestaw, gdy gracz jeszcze nic nie przypisał: 4 najnowsze poznane ataki. */
export function defaultActiveMoves(speciesId: number, level: number): string[] {
  return learnedMoves(speciesId, level)
    .slice(-4)
    .map((move) => move.name);
}

/**
 * Zestaw walki: dokładnie te ataki, które gracz przypisał do slotów
 * (a gdy nic nie przypisał — 4 najnowsze poznane).
 */
export function battleMoves(
  speciesId: number,
  level: number,
  active?: readonly (string | null)[] | null,
): Move[] {
  const learned = learnedMoves(speciesId, level);
  const chosen = (active ?? [])
    .filter((name): name is string => !!name)
    .map((name) => learned.find((move) => move.name === name))
    .filter((move): move is Move => !!move)
    .slice(0, 4);
  if (chosen.length > 0) return chosen;
  return learned.slice(-4);
}


export const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  atk: "Atak",
  def: "Obrona",
  spa: "Atak Sp.",
  spd: "Obrona Sp.",
  spe: "Szybkość",
};

/** Klasy trenerów-botów w stylu oryginalnych gier. */
export const TRAINER_CLASSES = [
  "Turysta",
  "Wędkarz",
  "Naukowiec",
  "Youngster",
  "Lady",
  "Czarny Pas",
  "Bliźniaczki",
  "Rowerzysta",
  "Górnik",
  "Ornitolog",
  "Pokémaniak",
  "Harcerz",
  "Kelnerka",
  "Rockowiec",
  "Treser Robaków",
  "Psychik",
  "Bogaty Dzieciak",
  "Weteran",
];

export const TRAINER_NAMES = [
  "Marek",
  "Kasia",
  "Bartek",
  "Ola",
  "Piotrek",
  "Zosia",
  "Tomek",
  "Nina",
  "Krzysiek",
  "Ewa",
  "Damian",
  "Hania",
  "Filip",
  "Iga",
  "Rafał",
  "Karolina",
  "Sebastian",
  "Ala",
];

/** Ikony przedmiotów z PokéAPI sprites. */
export function itemSprite(name: string) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${name}.png`;
}
