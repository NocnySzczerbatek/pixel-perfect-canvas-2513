export type BiomeSpecies = {
  id: number;
  name: string;
  type: string;
};

export type Biome = {
  slug: string;
  name: string;
  element: string;
  tagline: string;
  species: BiomeSpecies[];
};

export const BIOMES: Biome[] = [
  {
    slug: "las",
    name: "Las",
    element: "Trawa",
    tagline: "Gęste korony drzew i szelest w krzakach.",
    species: [
      { id: 10, name: "Caterpie", type: "Robak" },
      { id: 43, name: "Oddish", type: "Trawa" },
      { id: 46, name: "Paras", type: "Robak" },
      { id: 102, name: "Exeggcute", type: "Trawa" },
      { id: 191, name: "Sunkern", type: "Trawa" },
      { id: 287, name: "Slakoth", type: "Normalny" },
    ],
  },
  {
    slug: "jaskinia",
    name: "Jaskinia",
    element: "Skała",
    tagline: "Wilgotne korytarze i echo skrzydeł.",
    species: [
      { id: 41, name: "Zubat", type: "Trucizna" },
      { id: 74, name: "Geodude", type: "Skała" },
      { id: 95, name: "Onix", type: "Skała" },
      { id: 246, name: "Larvitar", type: "Skała" },
      { id: 524, name: "Roggenrola", type: "Skała" },
      { id: 703, name: "Carbink", type: "Skała" },
    ],
  },
  {
    slug: "ocean",
    name: "Ocean",
    element: "Woda",
    tagline: "Otwarta toń i prądy pełne życia.",
    species: [
      { id: 72, name: "Tentacool", type: "Woda" },
      { id: 116, name: "Horsea", type: "Woda" },
      { id: 129, name: "Magikarp", type: "Woda" },
      { id: 320, name: "Wailmer", type: "Woda" },
      { id: 456, name: "Finneon", type: "Woda" },
      { id: 692, name: "Clauncher", type: "Woda" },
    ],
  },
  {
    slug: "gory",
    name: "Góry",
    element: "Walka",
    tagline: "Strome ściany i lodowaty wiatr.",
    species: [
      { id: 56, name: "Mankey", type: "Walka" },
      { id: 66, name: "Machop", type: "Walka" },
      { id: 111, name: "Rhyhorn", type: "Ziemia" },
      { id: 227, name: "Skarmory", type: "Stal" },
      { id: 396, name: "Starly", type: "Lot" },
      { id: 622, name: "Golett", type: "Ziemia" },
    ],
  },
  {
    slug: "rowniny",
    name: "Równiny",
    element: "Normalny",
    tagline: "Szerokie trawy i stada w biegu.",
    species: [
      { id: 16, name: "Pidgey", type: "Lot" },
      { id: 19, name: "Rattata", type: "Normalny" },
      { id: 25, name: "Pikachu", type: "Elektryczny" },
      { id: 128, name: "Tauros", type: "Normalny" },
      { id: 241, name: "Miltank", type: "Normalny" },
      { id: 519, name: "Pidove", type: "Normalny" },
    ],
  },
  {
    slug: "pustynia",
    name: "Pustynia",
    element: "Ziemia",
    tagline: "Rozgrzany piasek i burze pyłowe.",
    species: [
      { id: 27, name: "Sandshrew", type: "Ziemia" },
      { id: 50, name: "Diglett", type: "Ziemia" },
      { id: 328, name: "Trapinch", type: "Ziemia" },
      { id: 331, name: "Cacnea", type: "Trawa" },
      { id: 551, name: "Sandile", type: "Ziemia" },
      { id: 632, name: "Durant", type: "Robak" },
    ],
  },
  {
    slug: "snieg",
    name: "Śnieg",
    element: "Lód",
    tagline: "Śnieżna polana pod aurorą.",
    species: [
      { id: 220, name: "Swinub", type: "Lód" },
      { id: 225, name: "Delibird", type: "Lód" },
      { id: 361, name: "Snorunt", type: "Lód" },
      { id: 459, name: "Snover", type: "Lód" },
      { id: 613, name: "Cubchoo", type: "Lód" },
      { id: 712, name: "Bergmite", type: "Lód" },
    ],
  },
  {
    slug: "bagno",
    name: "Bagno",
    element: "Trucizna",
    tagline: "Mgła, muł i podejrzane bąble.",
    species: [
      { id: 88, name: "Grimer", type: "Trucizna" },
      { id: 194, name: "Wooper", type: "Woda" },
      { id: 336, name: "Seviper", type: "Trucizna" },
      { id: 453, name: "Croagunk", type: "Trucizna" },
      { id: 543, name: "Venipede", type: "Robak" },
      { id: 690, name: "Skrelp", type: "Trucizna" },
    ],
  },
  {
    slug: "wulkan",
    name: "Wulkan",
    element: "Ogień",
    tagline: "Lawa, popiół i gorące gejzery.",
    species: [
      { id: 58, name: "Growlithe", type: "Ogień" },
      { id: 126, name: "Magmar", type: "Ogień" },
      { id: 218, name: "Slugma", type: "Ogień" },
      { id: 322, name: "Numel", type: "Ogień" },
      { id: 607, name: "Litwick", type: "Ogień" },
      { id: 653, name: "Fennekin", type: "Ogień" },
    ],
  },
  {
    slug: "cyber-lab",
    name: "Cyber-Lab",
    element: "Stal",
    tagline: "Serwerownie i eksperymentalne konstrukty.",
    species: [
      { id: 81, name: "Magnemite", type: "Elektryczny" },
      { id: 137, name: "Porygon", type: "Normalny" },
      { id: 374, name: "Beldum", type: "Stal" },
      { id: 599, name: "Klink", type: "Stal" },
      { id: 602, name: "Tynamo", type: "Elektryczny" },
      { id: 679, name: "Honedge", type: "Stal" },
    ],
  },
  {
    slug: "niebo",
    name: "Niebo",
    element: "Lot",
    tagline: "Pływające wyspy w chmurach.",
    species: [
      { id: 21, name: "Spearow", type: "Lot" },
      { id: 142, name: "Aerodactyl", type: "Lot" },
      { id: 177, name: "Natu", type: "Psychiczny" },
      { id: 333, name: "Swablu", type: "Lot" },
      { id: 425, name: "Drifloon", type: "Duch" },
      { id: 627, name: "Rufflet", type: "Lot" },
    ],
  },
  {
    slug: "otchlan",
    name: "Otchłań",
    element: "Duch",
    tagline: "Ciemność, w której coś patrzy z powrotem.",
    species: [
      { id: 92, name: "Gastly", type: "Duch" },
      { id: 200, name: "Misdreavus", type: "Duch" },
      { id: 355, name: "Duskull", type: "Duch" },
      { id: 442, name: "Spiritomb", type: "Duch" },
      { id: 562, name: "Yamask", type: "Duch" },
      { id: 633, name: "Deino", type: "Smok" },
    ],
  },
];

export function findBiome(slug: string | null | undefined) {
  return BIOMES.find((b) => b.slug === slug) ?? null;
}
