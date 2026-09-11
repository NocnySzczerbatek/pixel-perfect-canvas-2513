/**
 * Katalog przedmiotów: Kamienie Ewolucyjne, przedmioty ewolucyjne specjalne
 * i Przedmioty Trzymane (Held Items). Jedno źródło prawdy dla ekwipunku,
 * dropów w biomach i bonusów w walce.
 */

export type ItemCategory = "evolution" | "held";

export type CatalogItem = {
  /** Klucz w `player_items.item_key`. */
  key: string;
  label: string;
  sprite: string;
  category: ItemCategory;
  note: string;
  /** Typ ataków wzmacnianych przez przedmiot trzymany. */
  boostType?: string;
  /** Premia do obrażeń tego typu (0.2 = +20%). */
  boostPct?: number;
  /** Leczenie co turę jako część maksymalnego HP (Leftovers). */
  healPerTurn?: number;
};

/** Kamienie Ewolucyjne. */
export const EVOLUTION_STONES: CatalogItem[] = [
  { key: "fire_stone", label: "Kamień Ognia", sprite: "fire-stone", category: "evolution", note: "Kamień ewolucyjny dla Pokémonów Ognistych." },
  { key: "water_stone", label: "Kamień Wody", sprite: "water-stone", category: "evolution", note: "Kamień ewolucyjny dla Pokémonów Wodnych." },
  { key: "thunder_stone", label: "Kamień Gromu", sprite: "thunder-stone", category: "evolution", note: "Kamień ewolucyjny dla Pokémonów Elektrycznych." },
  { key: "leaf_stone", label: "Kamień Liścia", sprite: "leaf-stone", category: "evolution", note: "Kamień ewolucyjny dla Pokémonów Trawiastych." },
  { key: "moon_stone", label: "Kamień Księżyca", sprite: "moon-stone", category: "evolution", note: "Kamień ewolucyjny nocnych gatunków." },
  { key: "sun_stone", label: "Kamień Słońca", sprite: "sun-stone", category: "evolution", note: "Kamień ewolucyjny gatunków słonecznych." },
  { key: "shiny_stone", label: "Kamień Blasku", sprite: "shiny-stone", category: "evolution", note: "Lśniący kamień ewolucyjny (Shiny Stone)." },
  { key: "dusk_stone", label: "Kamień Zmierzchu", sprite: "dusk-stone", category: "evolution", note: "Ciemny kamień ewolucyjny (Dusk Stone)." },
  { key: "dawn_stone", label: "Kamień Świtu", sprite: "dawn-stone", category: "evolution", note: "Kamień ewolucyjny o barwie świtu (Dawn Stone)." },
  { key: "ice_stone", label: "Kamień Lodu", sprite: "ice-stone", category: "evolution", note: "Kamień ewolucyjny dla Pokémonów Lodowych." },
];

/** Przedmioty ewolucyjne specjalne. */
export const EVOLUTION_ITEMS: CatalogItem[] = [
  { key: "metal_coat", label: "Metal Coat", sprite: "metal-coat", category: "evolution", note: "Metalowa powłoka — ewolucja gatunków Stalowych." },
  { key: "dragon_scale", label: "Dragon Scale", sprite: "dragon-scale", category: "evolution", note: "Twarda łuska smoka — przedmiot ewolucyjny." },
  { key: "kings_rock", label: "King's Rock", sprite: "kings-rock", category: "evolution", note: "Królewski kamień — przedmiot ewolucyjny." },
  { key: "up_grade", label: "Up-Grade", sprite: "up-grade", category: "evolution", note: "Moduł danych — przedmiot ewolucyjny gatunków sztucznych." },
  { key: "reaper_cloth", label: "Reaper Cloth", sprite: "reaper-cloth", category: "evolution", note: "Całun żniwiarza — przedmiot ewolucyjny gatunków Duchów." },
  { key: "protector", label: "Protector", sprite: "protector", category: "evolution", note: "Ciężki pancerz — przedmiot ewolucyjny." },
  { key: "magmarizer", label: "Magmarizer", sprite: "magmarizer", category: "evolution", note: "Urządzenie magmowe — przedmiot ewolucyjny." },
];

/** Przedmioty Trzymane: wzmacniają ataki danego typu albo leczą co turę. */
export const HELD_ITEMS: CatalogItem[] = [
  { key: "charcoal", label: "Charcoal", sprite: "charcoal", category: "held", boostType: "Ogień", boostPct: 0.2, note: "+20% do obrażeń ataków typu Ogień." },
  { key: "mystic_water", label: "Mystic Water", sprite: "mystic-water", category: "held", boostType: "Woda", boostPct: 0.2, note: "+20% do obrażeń ataków typu Woda." },
  { key: "miracle_seed", label: "Miracle Seed", sprite: "miracle-seed", category: "held", boostType: "Trawa", boostPct: 0.2, note: "+20% do obrażeń ataków typu Trawa." },
  { key: "magnet", label: "Magnet", sprite: "magnet", category: "held", boostType: "Elektryczny", boostPct: 0.2, note: "+20% do obrażeń ataków typu Elektryczny." },
  { key: "black_glasses", label: "Black Glasses", sprite: "black-glasses", category: "held", boostType: "Ciemność", boostPct: 0.2, note: "+20% do obrażeń ataków typu Ciemność." },
  { key: "silk_scarf", label: "Silk Scarf", sprite: "silk-scarf", category: "held", boostType: "Normalny", boostPct: 0.2, note: "+20% do obrażeń ataków typu Normalny." },
  { key: "never_melt_ice", label: "Never-Melt Ice", sprite: "never-melt-ice", category: "held", boostType: "Lód", boostPct: 0.2, note: "+20% do obrażeń ataków typu Lód." },
  { key: "sharp_beak", label: "Sharp Beak", sprite: "sharp-beak", category: "held", boostType: "Lot", boostPct: 0.2, note: "+20% do obrażeń ataków typu Lot." },
  { key: "twisted_spoon", label: "Twisted Spoon", sprite: "twisted-spoon", category: "held", boostType: "Psychiczny", boostPct: 0.2, note: "+20% do obrażeń ataków typu Psychiczny." },
  { key: "hard_stone", label: "Hard Stone", sprite: "hard-stone", category: "held", boostType: "Skała", boostPct: 0.2, note: "+20% do obrażeń ataków typu Skała." },
  { key: "leftovers", label: "Leftovers", sprite: "leftovers", category: "held", healPerTurn: 0.0625, note: "Leczy 6% maksymalnego HP na koniec każdej tury walki." },
];

export const CATALOG: CatalogItem[] = [...EVOLUTION_STONES, ...EVOLUTION_ITEMS, ...HELD_ITEMS];

export function catalogItem(key: string | null | undefined): CatalogItem | undefined {
  if (!key) return undefined;
  return CATALOG.find((item) => item.key === key);
}

export function isHeldItem(key: string | null | undefined): boolean {
  return catalogItem(key)?.category === "held";
}

/** Premia do obrażeń z trzymanego przedmiotu dla ataku danego typu. */
export function heldBoostFor(key: string | null | undefined, moveType: string): number {
  const item = catalogItem(key);
  if (!item?.boostType || !item.boostPct) return 0;
  return item.boostType === moveType ? item.boostPct : 0;
}

/** Leczenie co turę z trzymanego przedmiotu (udział maks. HP). */
export function heldHealFor(key: string | null | undefined): number {
  return catalogItem(key)?.healPerTurn ?? 0;
}

/** Tabele dropów przedmiotów w biomach — szanse na jeden krok eksploracji. */
export const BIOME_DROPS: Record<string, { key: string; chance: number }[]> = {
  wulkan: [
    { key: "fire_stone", chance: 0.03 },
    { key: "charcoal", chance: 0.01 },
    { key: "magmarizer", chance: 0.01 },
  ],
  ocean: [
    { key: "water_stone", chance: 0.03 },
    { key: "mystic_water", chance: 0.01 },
    { key: "dragon_scale", chance: 0.01 },
    { key: "kings_rock", chance: 0.005 },
  ],
  jaskinia: [
    { key: "moon_stone", chance: 0.02 },
    { key: "dusk_stone", chance: 0.02 },
    { key: "black_glasses", chance: 0.01 },
    { key: "metal_coat", chance: 0.01 },
  ],
  otchlan: [
    { key: "moon_stone", chance: 0.02 },
    { key: "dusk_stone", chance: 0.02 },
    { key: "reaper_cloth", chance: 0.01 },
    { key: "black_glasses", chance: 0.01 },
  ],
  las: [
    { key: "leaf_stone", chance: 0.03 },
    { key: "miracle_seed", chance: 0.01 },
    { key: "sun_stone", chance: 0.01 },
  ],
  snieg: [
    { key: "ice_stone", chance: 0.03 },
    { key: "never_melt_ice", chance: 0.01 },
  ],
  rowniny: [
    { key: "thunder_stone", chance: 0.02 },
    { key: "silk_scarf", chance: 0.01 },
    { key: "shiny_stone", chance: 0.01 },
  ],
  niebo: [
    { key: "sharp_beak", chance: 0.015 },
    { key: "dawn_stone", chance: 0.01 },
  ],
  gory: [
    { key: "hard_stone", chance: 0.015 },
    { key: "protector", chance: 0.01 },
  ],
  "cyber-lab": [
    { key: "up_grade", chance: 0.015 },
    { key: "magnet", chance: 0.01 },
  ],
  ruiny: [
    { key: "twisted_spoon", chance: 0.015 },
    { key: "reaper_cloth", chance: 0.01 },
  ],
  bagno: [{ key: "kings_rock", chance: 0.01 }],
  pustynia: [{ key: "hard_stone", chance: 0.015 }],
};

/**
 * Losuje maksymalnie jeden przedmiot dla danego biomu.
 * Kolejność sprawdzania jest stała, więc wynik jest przewidywalny w testach.
 */
export function rollBiomeDrop(biome: string, random: () => number = Math.random): CatalogItem | null {
  for (const drop of BIOME_DROPS[biome] ?? []) {
    if (random() < drop.chance) {
      const item = catalogItem(drop.key);
      if (item) return item;
    }
  }
  return null;
}
