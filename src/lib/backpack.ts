/**
 * Plecak: jedno źródło prawdy dla listy przedmiotów gracza.
 * Łączy pola z `profiles` (Balle, jagody, mikstury, bilety) z tabelą `player_items`
 * (TM-y, fragmenty i kamienie Mega, przedmioty zadaniowe). Nie tworzy drugiego magazynu.
 */

import { BALLS, HEAL_ITEMS, MEGA_STONE, RAZZ } from "@/lib/items";
import { tmById, tmDescription, tmSprite } from "@/lib/finds";

export type BagCategory = "balls" | "berries" | "heal" | "tm" | "evolution" | "mega" | "quest" | "other";

export const BAG_CATEGORIES: { key: BagCategory | "all"; label: string }[] = [
  { key: "all", label: "Wszystko" },
  { key: "balls", label: "Balle" },
  { key: "berries", label: "Jagody" },
  { key: "heal", label: "Leczenie" },
  { key: "tm", label: "TM" },
  { key: "evolution", label: "Ewolucja" },
  { key: "mega", label: "Mega" },
  { key: "quest", label: "Zadania" },
  { key: "other", label: "Inne" },
];

export type BagItem = {
  key: string;
  label: string;
  sprite: string;
  count: number;
  category: BagCategory;
  note: string;
  /** Ustawiane dla fragmentów Mega: ile sztuk potrzeba do złożenia kamienia. */
  craftAt?: number;
  /** Numer gatunku dla przedmiotów gatunkowych (fragment/kamień Mega). */
  speciesId?: number;
};

type ProfileLike = Record<string, unknown>;
type ItemRow = { item_key: string; quantity: number };

const num = (value: unknown) => (typeof value === "number" ? value : 0);

/** Przedmioty ze znalezisk i nagród trzymane w `player_items`. */
const KNOWN_ITEM_KEYS: Record<string, { label: string; sprite: string; category: BagCategory; note: string }> = {
  shiny_charm: {
    label: "Shiny Charm",
    sprite: "shiny-charm",
    category: "quest",
    note: "Podwaja szansę na Shiny w eksploracji. Działa automatycznie.",
  },
  fire_stone: { label: "Kamień Ognia", sprite: "fire-stone", category: "evolution", note: "Kamień ewolucyjny dla Pokémonów Ognistych." },
  water_stone: { label: "Kamień Wody", sprite: "water-stone", category: "evolution", note: "Kamień ewolucyjny dla Pokémonów Wodnych." },
  thunder_stone: { label: "Kamień Gromu", sprite: "thunder-stone", category: "evolution", note: "Kamień ewolucyjny dla Pokémonów Elektrycznych." },
  leaf_stone: { label: "Kamień Liścia", sprite: "leaf-stone", category: "evolution", note: "Kamień ewolucyjny dla Pokémonów Trawiastych." },
  moon_stone: { label: "Kamień Księżyca", sprite: "moon-stone", category: "evolution", note: "Kamień ewolucyjny nocnych gatunków." },
  sun_stone: { label: "Kamień Słońca", sprite: "sun-stone", category: "evolution", note: "Kamień ewolucyjny gatunków słonecznych." },
};

export function buildBackpack(profile: ProfileLike | null | undefined, items: ItemRow[] = []): BagItem[] {
  if (!profile) return [];
  const out: BagItem[] = [];

  for (const ball of BALLS) {
    out.push({
      key: `ball_${ball.key}`,
      label: ball.label,
      sprite: ball.sprite,
      count: num(profile[ball.field]),
      category: "balls",
      note: ball.note,
    });
  }

  out.push({
    key: "razz",
    label: RAZZ.label,
    sprite: RAZZ.sprite,
    count: num(profile[RAZZ.field]),
    category: "berries",
    note: RAZZ.note,
  });

  for (const heal of HEAL_ITEMS) {
    out.push({
      key: `heal_${heal.key}`,
      label: heal.label,
      sprite: heal.sprite,
      count: num(profile[heal.field]),
      category: "heal",
      note: heal.note,
    });
  }

  out.push({
    key: "energy_bottle",
    label: "Flakon Energii",
    sprite: "max-elixir",
    count: num(profile["energy_bottles"]),
    category: "heal",
    note: "Uzupełnia Energię do pełna (limit 100). Nie zwiększa maksimum.",
  });

  out.push({
    key: "travel_ticket",
    label: "Bilet Podróży",
    sprite: "ss-ticket",
    count: num(profile["travel_tickets"]),
    category: "quest",
    note: "Pozwala polecieć do innego regionu w jego okno czasowe. Kosztuje 10 000 CC.",
  });

  out.push({
    key: "mega_stone_generic",
    label: MEGA_STONE.label,
    sprite: MEGA_STONE.sprite,
    count: num(profile["mega_stones"]),
    category: "mega",
    note: MEGA_STONE.note,
  });

  out.push({
    key: "candy_normal",
    label: "Cukierek",
    sprite: "rare-candy",
    count: num(profile["candy_normal"]),
    category: "other",
    note: "Podnosi przyjaźń i pomaga w rozwoju Pokémona.",
  });
  out.push({
    key: "candy_xl",
    label: "Cukierek XL",
    sprite: "rare-candy",
    count: num(profile["candy_xl"]),
    category: "other",
    note: "Mocniejsza wersja Cukierka.",
  });

  for (const row of items) {
    if (row.quantity <= 0) continue;
    if (row.item_key.startsWith("tm_")) {
      const tm = tmById(row.item_key.replace("tm_", ""));
      if (!tm) continue;
      out.push({
        key: row.item_key,
        label: tm.label,
        sprite: tmSprite(tm.type),
        count: row.quantity,
        category: "tm",
        note: tmDescription(tm),
      });
      continue;
    }
    if (row.item_key.startsWith("mega_shard_")) {
      const speciesId = Number(row.item_key.replace("mega_shard_", ""));
      out.push({
        key: row.item_key,
        label: `Fragment Mega · #${speciesId}`,
        sprite: "key-stone",
        count: row.quantity,
        category: "mega",
        note: "Zbierz 5 fragmentów, aby złożyć gatunkowy Kamień Mega.",
        craftAt: 5,
        speciesId,
      });
      continue;
    }
    if (row.item_key.startsWith("mega_stone_")) {
      const speciesId = Number(row.item_key.replace("mega_stone_", ""));
      out.push({
        key: row.item_key,
        label: `Kamień Mega · #${speciesId}`,
        sprite: "key-stone",
        count: row.quantity,
        category: "mega",
        note: "Gatunkowy Kamień Mega — użyjesz go w walce z Liderem Sali.",
        speciesId,
      });
      continue;
    }
    const known = KNOWN_ITEM_KEYS[row.item_key];
    out.push({
      key: row.item_key,
      label: known?.label ?? row.item_key,
      sprite: known?.sprite ?? "poke-ball",
      count: row.quantity,
      category: known?.category ?? "other",
      note: known?.note ?? "Przedmiot ze znalezisk i nagród.",
    });
  }

  return out;
}

export type BagSort = "name" | "count" | "category";

export function filterBackpack(
  bag: BagItem[],
  options: { category: BagCategory | "all"; search: string; sort: BagSort; hideEmpty: boolean },
): BagItem[] {
  const query = options.search.trim().toLowerCase();
  const order = BAG_CATEGORIES.map((c) => c.key);
  return bag
    .filter((item) => (options.category === "all" ? true : item.category === options.category))
    .filter((item) => (options.hideEmpty ? item.count > 0 : true))
    .filter((item) => (query ? `${item.label} ${item.note}`.toLowerCase().includes(query) : true))
    .sort((a, b) => {
      if (options.sort === "count") return b.count - a.count || a.label.localeCompare(b.label, "pl");
      if (options.sort === "category")
        return order.indexOf(a.category) - order.indexOf(b.category) || a.label.localeCompare(b.label, "pl");
      return a.label.localeCompare(b.label, "pl");
    });
}
