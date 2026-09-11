import { BIOMES, type Biome } from "@/lib/biomes";

export type WorldZone = {
  slug: string;
  name: string;
  summary: string;
  /** Sugerowany poziom trenera na wejście do strefy. */
  minLevel: number;
  biomeSlugs: string[];
};

export const WORLD_ZONES: WorldZone[] = [
  {
    slug: "zielona-kraina",
    name: "Zielona Kraina",
    summary: "Startowa strefa: łagodne trawy, las i mokradła. Najlepszy początek dla nowych trenerów.",
    minLevel: 1,
    biomeSlugs: ["rowniny", "las", "bagno"],
  },
  {
    slug: "wybrzeze-i-mrozy",
    name: "Wybrzeże i Mrozy",
    summary: "Otwarta toń oraz śnieżne polany — typy Woda i Lód.",
    minLevel: 8,
    biomeSlugs: ["ocean", "snieg"],
  },
  {
    slug: "skalne-pustkowia",
    name: "Skalne Pustkowia",
    summary: "Góry, jaskinie i piaski. Twarde typy Skała, Ziemia i Walka.",
    minLevel: 14,
    biomeSlugs: ["gory", "jaskinia", "pustynia"],
  },
  {
    slug: "serce-ognia",
    name: "Serce Ognia",
    summary: "Lawa i popiół — najgorętsze spotkania typu Ogień.",
    minLevel: 22,
    biomeSlugs: ["wulkan"],
  },
  {
    slug: "kraina-mistyczna",
    name: "Kraina Mistyczna",
    summary: "Chmury, ruiny i otchłań — typy Lot, Psychiczny, Duch i Smok.",
    minLevel: 28,
    biomeSlugs: ["niebo", "ruiny", "otchlan"],
  },
  {
    slug: "strefa-technologii",
    name: "Strefa Technologii",
    summary: "Serwerownie i konstrukty — typy Stal i Elektryczny.",
    minLevel: 34,
    biomeSlugs: ["cyber-lab"],
  },
];

export function zoneBiomes(zone: WorldZone): Biome[] {
  return zone.biomeSlugs
    .map((slug) => BIOMES.find((biome) => biome.slug === slug))
    .filter((biome): biome is Biome => Boolean(biome));
}

export function biomeTypes(biome: Biome): string[] {
  return biome.types.length > 0 ? biome.types : [biome.element];
}

/** Wszystkie typy występujące w strefie (suma typów jej biomów). */
export function zoneTypes(zone: WorldZone): string[] {
  const set = new Set<string>();
  for (const biome of zoneBiomes(zone)) for (const type of biomeTypes(biome)) set.add(type);
  return [...set];
}

export function zoneForBiome(slug: string | null | undefined): WorldZone | null {
  if (!slug) return null;
  return WORLD_ZONES.find((zone) => zone.biomeSlugs.includes(slug)) ?? null;
}
