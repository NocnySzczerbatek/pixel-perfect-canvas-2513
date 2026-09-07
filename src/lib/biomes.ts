import biomeBagno from "@/assets/biome-bagno.jpg";
import biomeCyberLab from "@/assets/biome-cyber-lab.jpg";
import biomeGory from "@/assets/biome-gory.jpg";
import biomeJaskinia from "@/assets/biome-jaskinia.jpg";
import biomeLas from "@/assets/biome-las.jpg";
import biomeNiebo from "@/assets/biome-niebo.jpg";
import biomeOcean from "@/assets/biome-ocean.jpg";
import biomeOtchlan from "@/assets/biome-otchlan.jpg";
import biomePustynia from "@/assets/biome-pustynia.jpg";
import biomeRowniny from "@/assets/biome-rowniny.jpg";
import biomeSnieg from "@/assets/biome-snieg.jpg";
import biomeWulkan from "@/assets/biome-wulkan.jpg";

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
  image: string;
  types: string[];
  species: BiomeSpecies[];
};

export const BIOMES: Biome[] = [
  {
    slug: "las",
    types: ["Trawa", "Robak"],
    name: "Las",
    element: "Trawa",
    tagline: "Gęste korony drzew i szelest w krzakach — raj dla typów Trawa i Robak.",
    image: biomeLas,
    species: [
      { id: 10, name: "Caterpie", type: "Robak" },
      { id: 13, name: "Weedle", type: "Robak" },
      { id: 43, name: "Oddish", type: "Trawa" },
      { id: 46, name: "Paras", type: "Robak" },
      { id: 69, name: "Bellsprout", type: "Trawa" },
      { id: 102, name: "Exeggcute", type: "Trawa" },
      { id: 191, name: "Sunkern", type: "Trawa" },
      { id: 287, name: "Slakoth", type: "Normalny" },
    ],
  },
  {
    slug: "jaskinia",
    types: ["Skała", "Ziemia", "Stal", "Ciemność"],
    name: "Jaskinia",
    element: "Skała",
    tagline: "Wilgotne korytarze i echo skrzydeł — twarde typy Skała i Trucizna.",
    image: biomeJaskinia,
    species: [
      { id: 41, name: "Zubat", type: "Trucizna" },
      { id: 66, name: "Machop", type: "Walka" },
      { id: 74, name: "Geodude", type: "Skała" },
      { id: 95, name: "Onix", type: "Skała" },
      { id: 246, name: "Larvitar", type: "Skała" },
      { id: 524, name: "Roggenrola", type: "Skała" },
      { id: 703, name: "Carbink", type: "Skała" },
    ],
  },
  {
    slug: "ocean",
    types: ["Woda"],
    name: "Ocean",
    element: "Woda",
    tagline: "Otwarta toń i prądy pełne życia — same typy Woda.",
    image: biomeOcean,
    species: [
      { id: 72, name: "Tentacool", type: "Woda" },
      { id: 90, name: "Shellder", type: "Woda" },
      { id: 116, name: "Horsea", type: "Woda" },
      { id: 120, name: "Staryu", type: "Woda" },
      { id: 129, name: "Magikarp", type: "Woda" },
      { id: 320, name: "Wailmer", type: "Woda" },
      { id: 456, name: "Finneon", type: "Woda" },
      { id: 692, name: "Clauncher", type: "Woda" },
    ],
  },
  {
    slug: "gory",
    types: ["Walka", "Ziemia", "Skała", "Lot"],
    name: "Góry",
    element: "Walka",
    tagline: "Strome ściany i lodowaty wiatr — typy Walka, Ziemia i Lot.",
    image: biomeGory,
    species: [
      { id: 56, name: "Mankey", type: "Walka" },
      { id: 66, name: "Machop", type: "Walka" },
      { id: 84, name: "Doduo", type: "Lot" },
      { id: 111, name: "Rhyhorn", type: "Ziemia" },
      { id: 227, name: "Skarmory", type: "Stal" },
      { id: 396, name: "Starly", type: "Lot" },
      { id: 622, name: "Golett", type: "Ziemia" },
    ],
  },
  {
    slug: "rowniny",
    types: ["Normalny", "Lot", "Elektryczny", "Baśniowy"],
    name: "Równiny",
    element: "Normalny",
    tagline: "Szerokie trawy i stada w biegu — spokojny start dla nowych trenerów.",
    image: biomeRowniny,
    species: [
      { id: 16, name: "Pidgey", type: "Lot" },
      { id: 19, name: "Rattata", type: "Normalny" },
      { id: 25, name: "Pikachu", type: "Elektryczny" },
      { id: 52, name: "Meowth", type: "Normalny" },
      { id: 128, name: "Tauros", type: "Normalny" },
      { id: 241, name: "Miltank", type: "Normalny" },
      { id: 519, name: "Pidove", type: "Normalny" },
    ],
  },
  {
    slug: "pustynia",
    types: ["Ziemia", "Skała", "Trucizna", "Ogień"],
    name: "Pustynia",
    element: "Ziemia",
    tagline: "Rozgrzany piasek i burze pyłowe — typy Ziemia dobrze się tu chowają.",
    image: biomePustynia,
    species: [
      { id: 23, name: "Ekans", type: "Trucizna" },
      { id: 27, name: "Sandshrew", type: "Ziemia" },
      { id: 50, name: "Diglett", type: "Ziemia" },
      { id: 104, name: "Cubone", type: "Ziemia" },
      { id: 328, name: "Trapinch", type: "Ziemia" },
      { id: 331, name: "Cacnea", type: "Trawa" },
      { id: 551, name: "Sandile", type: "Ziemia" },
    ],
  },
  {
    slug: "snieg",
    types: ["Lód", "Woda"],
    name: "Śnieg",
    element: "Lód",
    tagline: "Śnieżna polana pod aurorą — dom lodowych Pokémonów.",
    image: biomeSnieg,
    species: [
      { id: 86, name: "Seel", type: "Lód" },
      { id: 90, name: "Shellder", type: "Woda" },
      { id: 124, name: "Jynx", type: "Lód" },
      { id: 220, name: "Swinub", type: "Lód" },
      { id: 361, name: "Snorunt", type: "Lód" },
      { id: 459, name: "Snover", type: "Lód" },
      { id: 613, name: "Cubchoo", type: "Lód" },
      { id: 712, name: "Bergmite", type: "Lód" },
    ],
  },
  {
    slug: "bagno",
    types: ["Trucizna", "Woda", "Ciemność"],
    name: "Bagno",
    element: "Trucizna",
    tagline: "Mgła, muł i podejrzane bąble — typy Trucizna i Woda.",
    image: biomeBagno,
    species: [
      { id: 60, name: "Poliwag", type: "Woda" },
      { id: 88, name: "Grimer", type: "Trucizna" },
      { id: 109, name: "Koffing", type: "Trucizna" },
      { id: 194, name: "Wooper", type: "Woda" },
      { id: 336, name: "Seviper", type: "Trucizna" },
      { id: 453, name: "Croagunk", type: "Trucizna" },
      { id: 690, name: "Skrelp", type: "Trucizna" },
    ],
  },
  {
    slug: "wulkan",
    types: ["Ogień", "Skała"],
    name: "Wulkan",
    element: "Ogień",
    tagline: "Lawa, popiół i gorące gejzery — wyłącznie typy Ogień.",
    image: biomeWulkan,
    species: [
      { id: 37, name: "Vulpix", type: "Ogień" },
      { id: 58, name: "Growlithe", type: "Ogień" },
      { id: 77, name: "Ponyta", type: "Ogień" },
      { id: 126, name: "Magmar", type: "Ogień" },
      { id: 218, name: "Slugma", type: "Ogień" },
      { id: 322, name: "Numel", type: "Ogień" },
      { id: 607, name: "Litwick", type: "Ogień" },
    ],
  },
  {
    slug: "cyber-lab",
    types: ["Stal", "Elektryczny", "Psychiczny", "Normalny"],
    name: "Cyber-Lab",
    element: "Stal",
    tagline: "Serwerownie i eksperymentalne konstrukty — typy Stal i Elektryczny.",
    image: biomeCyberLab,
    species: [
      { id: 81, name: "Magnemite", type: "Elektryczny" },
      { id: 100, name: "Voltorb", type: "Elektryczny" },
      { id: 132, name: "Ditto", type: "Normalny" },
      { id: 137, name: "Porygon", type: "Normalny" },
      { id: 374, name: "Beldum", type: "Stal" },
      { id: 599, name: "Klink", type: "Stal" },
      { id: 679, name: "Honedge", type: "Stal" },
    ],
  },
  {
    slug: "niebo",
    types: ["Lot", "Smok", "Psychiczny"],
    name: "Niebo",
    element: "Lot",
    tagline: "Pływające wyspy w chmurach — szybkie typy Lot.",
    image: biomeNiebo,
    species: [
      { id: 17, name: "Pidgeotto", type: "Lot" },
      { id: 21, name: "Spearow", type: "Lot" },
      { id: 83, name: "Farfetch'd", type: "Lot" },
      { id: 142, name: "Aerodactyl", type: "Lot" },
      { id: 177, name: "Natu", type: "Psychiczny" },
      { id: 333, name: "Swablu", type: "Lot" },
      { id: 627, name: "Rufflet", type: "Lot" },
    ],
  },
  {
    slug: "otchlan",
    types: ["Duch", "Smok", "Ciemność", "Psychiczny"],
    name: "Otchłań",
    element: "Duch",
    tagline: "Ciemność, w której coś patrzy z powrotem — typy Duch i Smok.",
    image: biomeOtchlan,
    species: [
      { id: 92, name: "Gastly", type: "Duch" },
      { id: 93, name: "Haunter", type: "Duch" },
      { id: 96, name: "Drowzee", type: "Psychiczny" },
      { id: 200, name: "Misdreavus", type: "Duch" },
      { id: 355, name: "Duskull", type: "Duch" },
      { id: 562, name: "Yamask", type: "Duch" },
      { id: 633, name: "Deino", type: "Smok" },
    ],
  },
];

export function findBiome(slug: string | null | undefined) {
  return BIOMES.find((b) => b.slug === slug) ?? null;
}
