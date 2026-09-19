/**
 * Bazar i aukcje przedmiotów — wspólne stałe i opisy przedmiotów.
 * Handlujemy tylko przedmiotami z tabeli `player_items` (TM-y, kamienie,
 * Przedmioty Trzymane, fragmenty i Kamienie Mega, przedmioty ze znalezisk).
 */

import { FULL_DEX } from "@/lib/full-dex";
import { CATALOG } from "@/lib/held-items";
import { tmById, tmDescription, tmSprite } from "@/lib/finds";

/** Prowizja bazaru i aukcji — tak jak w GTS. */
export const MARKET_FEE = 0.05;
export const MARKET_MIN_PRICE = 50;
export const MARKET_MAX_PRICE = 500000;
/** Aukcja trwa dobę. */
export const AUCTION_HOURS = 24;
/** Minimalne przebicie w licytacji. */
export const BID_STEP = 25;
/** Limit aktywnych ofert jednego gracza. */
export const MAX_ACTIVE_PER_PLAYER = 8;

const dexName = (speciesId: number) =>
  FULL_DEX.find((entry) => entry.id === speciesId)?.name ?? `#${speciesId}`;

export type MarketItemInfo = { label: string; sprite: string; note: string };

/** Nazwa, ikona i opis przedmiotu po kluczu z `player_items`. */
export function describeMarketItem(itemKey: string): MarketItemInfo {
  if (itemKey.startsWith("tm_")) {
    const tm = tmById(itemKey.replace("tm_", ""));
    if (tm) return { label: tm.label, sprite: tmSprite(tm.type), note: tmDescription(tm) };
  }
  if (itemKey.startsWith("mega_shard_")) {
    const name = dexName(Number(itemKey.replace("mega_shard_", "")));
    return {
      label: `Fragment Mega · ${name}`,
      sprite: "key-stone",
      note: `Zbierz 5 fragmentów, aby złożyć Kamień Mega dla ${name}.`,
    };
  }
  if (itemKey.startsWith("mega_stone_")) {
    const name = dexName(Number(itemKey.replace("mega_stone_", "")));
    return {
      label: `Kamień Mega · ${name}`,
      sprite: "key-stone",
      note: "Gatunkowy Kamień Mega — użyjesz go w walce z Liderem Sali.",
    };
  }
  const item = CATALOG.find((entry) => entry.key === itemKey);
  if (item) return { label: item.label, sprite: item.sprite, note: item.note };
  if (itemKey === "shiny_charm") {
    return {
      label: "Shiny Charm",
      sprite: "shiny-charm",
      note: "Podwaja szansę na Shiny w eksploracji.",
    };
  }
  return { label: itemKey, sprite: "poke-ball", note: "Przedmiot ze znalezisk i nagród." };
}

/** Najniższa dopuszczalna oferta w licytacji. */
export function minNextBid(startPrice: number, currentBid: number | null) {
  return currentBid === null ? startPrice : currentBid + BID_STEP;
}

/** Ile zostaje sprzedającemu po prowizji. */
export function payoutAfterFee(price: number) {
  const fee = Math.max(1, Math.round(price * MARKET_FEE));
  return { fee, payout: price - fee };
}
