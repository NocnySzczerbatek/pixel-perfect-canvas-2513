/** Przedmioty: rodzaje Balli, Razz Berry, Tarcza BHP, pakiety PLN. */

export type BallKey = "poke" | "great" | "ultra" | "master" | "premier" | "net" | "dive" | "dusk" | "quick" | "timer" | "repeat" | "luxury";

export type BallDef = {
  key: BallKey;
  label: string;
  sprite: string;
  field: "poke_balls" | "great_balls" | "ultra_balls" | "master_balls" | "premier_balls" | "net_balls" | "dive_balls" | "dusk_balls" | "quick_balls" | "timer_balls" | "repeat_balls" | "luxury_balls";
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
  { key: "premier", label: "Premier Ball", sprite: "premier-ball", field: "premier_balls", multiplier: 1.1, price: 35, note: "Elegancki Ball z niewielką premią do łapania." },
  { key: "net", label: "Net Ball", sprite: "net-ball", field: "net_balls", multiplier: 1.2, price: 85, note: "3× skuteczność na Pokémony Wodne i Robacze." },
  { key: "dive", label: "Dive Ball", sprite: "dive-ball", field: "dive_balls", multiplier: 1.2, price: 85, note: "3× skuteczność na Pokémony Wodne." },
  { key: "dusk", label: "Dusk Ball", sprite: "dusk-ball", field: "dusk_balls", multiplier: 1.2, price: 95, note: "3× skuteczność nocą i w jaskiniach." },
  { key: "quick", label: "Quick Ball", sprite: "quick-ball", field: "quick_balls", multiplier: 1.2, price: 110, note: "4× skuteczność przed osłabieniem dzikiego Pokémona." },
  { key: "timer", label: "Timer Ball", sprite: "timer-ball", field: "timer_balls", multiplier: 1.4, price: 100, note: "Do 3,5× skuteczności po długiej walce." },
  { key: "repeat", label: "Repeat Ball", sprite: "repeat-ball", field: "repeat_balls", multiplier: 1.2, price: 90, note: "3× skuteczność na gatunek, który już posiadasz." },
  { key: "luxury", label: "Luxury Ball", sprite: "luxury-ball", field: "luxury_balls", multiplier: 1.5, price: 140, note: "Złapany Pokémon rozpoczyna z większą przyjaźnią." },
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
  priceId: string;
  name: string;
  pricePln: number;
  sprite: string;
  description: string;
  grants: string;
};

export const SHOP_PACKAGES: ShopPackage[] = [
  {
    id: "bottles-3",
    priceId: "energy_bottles_3_pln",
    name: "3× Flakon Energii",
    pricePln: 4.99,
    sprite: "max-elixir",
    description: "Trzy Flakony po 25 Energii — na dłuższą wyprawę.",
    grants: "+3 Flakony Energii",
  },
  {
    id: "energy-chest",
    priceId: "energy_chest_pln",
    name: "Skrzynia Energii",
    pricePln: 12.99,
    sprite: "max-revive",
    description: "10 Flakonów Energii i 500 Catch Coins.",
    grants: "+10 Flakonów, +500 CC",
  },
  {
    id: "master-ball",
    priceId: "master_ball_pln",
    name: "Master Ball",
    pricePln: 9.99,
    sprite: "master-ball",
    description: "Jeden Ball, który nie zawodzi nigdy.",
    grants: "+1 Master Ball",
  },
];

export type HealKey = "potion" | "super_potion" | "revive";

export type HealDef = {
  key: HealKey;
  label: string;
  sprite: string;
  field: "potions" | "super_potions" | "revives";
  /** Ile HP przywraca; `revive` podnosi zemdlonego na połowę HP. */
  heal: number;
  revive: boolean;
  price: number;
  note: string;
};

export const HEAL_ITEMS: HealDef[] = [
  {
    key: "potion",
    label: "Mikstura",
    sprite: "potion",
    field: "potions",
    heal: 25,
    revive: false,
    price: 40,
    note: "Leczy 25 HP — także w trakcie walki.",
  },
  {
    key: "super_potion",
    label: "Super Mikstura",
    sprite: "super-potion",
    field: "super_potions",
    heal: 70,
    revive: false,
    price: 120,
    note: "Leczy 70 HP jednym użyciem.",
  },
  {
    key: "revive",
    label: "Eliksir Życia",
    sprite: "revive",
    field: "revives",
    heal: 0,
    revive: true,
    price: 250,
    note: "Podnosi zemdlonego Pokémona z połową HP.",
  },
];

export function healByKey(key: string): HealDef | undefined {
  return HEAL_ITEMS.find((item) => item.key === key);
}
