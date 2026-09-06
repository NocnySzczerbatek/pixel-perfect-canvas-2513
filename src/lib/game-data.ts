export type Starter = {
  id: number;
  name: string;
  type: string;
};

export type Region = {
  slug: string;
  name: string;
  gen: string;
  tagline: string;
  starters: Starter[];
};

export const REGIONS: Region[] = [
  {
    slug: "kanto",
    name: "Kanto",
    gen: "Gen I",
    tagline: "Klasyczna podróż z Profesorem Oakiem.",
    starters: [
      { id: 1, name: "Bulbasaur", type: "Trawa" },
      { id: 4, name: "Charmander", type: "Ogień" },
      { id: 7, name: "Squirtle", type: "Woda" },
    ],
  },
  {
    slug: "johto",
    name: "Johto",
    gen: "Gen II",
    tagline: "Tradycja, wieże i legendy.",
    starters: [
      { id: 152, name: "Chikorita", type: "Trawa" },
      { id: 155, name: "Cyndaquil", type: "Ogień" },
      { id: 158, name: "Totodile", type: "Woda" },
    ],
  },
  {
    slug: "hoenn",
    name: "Hoenn",
    gen: "Gen III",
    tagline: "Wulkany, morza i burzowe biomy.",
    starters: [
      { id: 252, name: "Treecko", type: "Trawa" },
      { id: 255, name: "Torchic", type: "Ogień" },
      { id: 258, name: "Mudkip", type: "Woda" },
    ],
  },
  {
    slug: "sinnoh",
    name: "Sinnoh",
    gen: "Gen IV",
    tagline: "Śnieżne szczyty i mityczny czas.",
    starters: [
      { id: 387, name: "Turtwig", type: "Trawa" },
      { id: 390, name: "Chimchar", type: "Ogień" },
      { id: 393, name: "Piplup", type: "Woda" },
    ],
  },
  {
    slug: "unova",
    name: "Unova",
    gen: "Gen V",
    tagline: "Wielkie miasto, wielkie ambicje.",
    starters: [
      { id: 495, name: "Snivy", type: "Trawa" },
      { id: 498, name: "Tepig", type: "Ogień" },
      { id: 501, name: "Oshawott", type: "Woda" },
    ],
  },
  {
    slug: "kalos",
    name: "Kalos",
    gen: "Gen VI",
    tagline: "Elegancja i Mega Ewolucje.",
    starters: [
      { id: 650, name: "Chespin", type: "Trawa" },
      { id: 653, name: "Fennekin", type: "Ogień" },
      { id: 656, name: "Froakie", type: "Woda" },
    ],
  },
  {
    slug: "alola",
    name: "Alola",
    gen: "Gen VII",
    tagline: "Tropikalne wyspy i próby.",
    starters: [
      { id: 722, name: "Rowlet", type: "Trawa" },
      { id: 725, name: "Litten", type: "Ogień" },
      { id: 728, name: "Popplio", type: "Woda" },
    ],
  },
  {
    slug: "galar",
    name: "Galar",
    gen: "Gen VIII",
    tagline: "Stadiony pełne kibiców.",
    starters: [
      { id: 810, name: "Grookey", type: "Trawa" },
      { id: 813, name: "Scorbunny", type: "Ogień" },
      { id: 816, name: "Sobble", type: "Woda" },
    ],
  },
  {
    slug: "paldea",
    name: "Paldea",
    gen: "Gen IX",
    tagline: "Otwarty świat i trzy szlaki.",
    starters: [
      { id: 906, name: "Sprigatito", type: "Trawa" },
      { id: 909, name: "Fuecoco", type: "Ogień" },
      { id: 912, name: "Quaxly", type: "Woda" },
    ],
  },
];

export function artworkUrl(speciesId: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png`;
}

export function findRegion(slug: string | null | undefined) {
  return REGIONS.find((r) => r.slug === slug) ?? null;
}
