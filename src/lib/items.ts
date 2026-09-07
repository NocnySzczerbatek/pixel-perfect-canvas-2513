/** Przedmioty: rodzaje Balli, Razz Berry, Tarcza BHP, pakiety PLN. */

export type BallKey = "poke" | "great" | "ultra" | "master";

export type BallDef = {
  key: BallKey;
  label: string;
  sprite: string;
  field: "poke_balls" | "great_balls" | "ultra_balls" | "master_balls";
  /** Mnożnik szansy złapania. */
  multiplier: number;
  /** Cena w Catch Coins albo null, gdy tylko ze Sklepu PLN. */
  price: number | null;
  note: string;
};

export const BALLS: BallDef[] = [
  {
    key: "poke",
    label: "Poké Ball",
    sprite: "poke-ball",
    field: "poke_balls",
    multiplier: 1,
    price: 20,
    note: "Podstawowy Ball. Sprawdza się przy osłabionych Pokémonach.",
  },
  {
    key: "great",
    label: "Great Ball",
    sprite: "great-ball",
    field: "great_balls",
    multiplier: 1.5,
    price: 60,
    note: "O połowę skuteczniejszy od Poké Balla.",
  },
  {
    key: "ultra",
    label: "Ultra Ball",
    sprite: "ultra-ball",
    field: "ultra_balls",
    multiplier: 2.2,
    price: 150,
    note: "Dla rzadkich okazów i wysokich poziomów.",
  },
  {
    key: "master",
    label: "Master Ball",
    sprite: "master-ball",
    field: "master_balls",
    multiplier: 99,
    price: null,
    note: "Łapie zawsze. Dostępny wyłącznie w Sklepie.",
  },
];

export function ballByKey(key: string): BallDef | undefined {
  return BALLS.find((ball) => ball.key === key);
}

export const RAZZ = {
  label: "Razz Berry",
  sprite: "razz-berry",
  field: "razz_berries" as const,
  price: 35,
  /** Dodatkowa szansa złapania i mniejsza szansa ucieczki. */
  bonus: 1.4,
  note: "Nakarm dzikiego Pokémona — łatwiej go złapać i rzadziej ucieka.",
};

export const MEGA_STONE = {
  label: "Kamień Mega",
  sprite: "key-stone",
  field: "mega_stones" as const,
  boost: 0.3,
  note: "Zużywany w walce z Liderem Sali: +30% siły ataku Twojej drużyny.",
};

export const SHIELD_COST = 100; // Catch Coins
export const SHIELD_HOURS = 8;

export type ShopPackage = {
  id: string;
  name: string;
  pricePln: number;
  sprite: string;
  description: string;
  grants: string;
};

export const SHOP_PACKAGES: ShopPackage[] = [
  {
    id: "bottles-3",
    name: "3× Flakon Energii",
    pricePln: 4.99,
    sprite: "max-elixir",
    description: "Trzy Flakony po 25 Energii — na dłuższą wyprawę.",
    grants: "+3 Flakony Energii",
  },
  {
    id: "energy-chest",
    name: "Skrzynia Energii",
    pricePln: 12.99,
    sprite: "max-revive",
    description: "10 Flakonów Energii i 500 Catch Coins.",
    grants: "+10 Flakonów, +500 CC",
  },
  {
    id: "master-ball",
    name: "Master Ball",
    pricePln: 9.99,
    sprite: "master-ball",
    description: "Jeden Ball, który nie zawodzi nigdy.",
    grants: "+1 Master Ball",
  },
];
