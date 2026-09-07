/** Sale (8 na region), Liderzy z drużynami jak w serialu i oryginalne odznaki. */

export type GymMember = { species_id: number; species_name: string; level: number };

export type GymSpec = {
  index: number;
  type: string;
  leader: string;
  badgeKey: string;
  badgeName: string;
  team: GymMember[];
};

const TYPE_STYLE: Record<string, { gradient: string; accent: string }> = {
  Skała: { gradient: "linear-gradient(135deg,#a1866f,#5d4632)", accent: "#d8b48c" },
  Woda: { gradient: "linear-gradient(135deg,#5fb2ff,#12406f)", accent: "#a8dcff" },
  Elektryczny: { gradient: "linear-gradient(135deg,#ffd85e,#a06a00)", accent: "#fff0a8" },
  Trawa: { gradient: "linear-gradient(135deg,#7ddf7a,#1e6b3a)", accent: "#c6f5b8" },
  Trucizna: { gradient: "linear-gradient(135deg,#c07bff,#4b1f77)", accent: "#e3c4ff" },
  Psychiczny: { gradient: "linear-gradient(135deg,#ff85b6,#7a1f4d)", accent: "#ffc7dd" },
  Ogień: { gradient: "linear-gradient(135deg,#ff8a4c,#8a2a06)", accent: "#ffd0ab" },
  Ziemia: { gradient: "linear-gradient(135deg,#d9b26a,#6b4a15)", accent: "#f2dfae" },
  Lot: { gradient: "linear-gradient(135deg,#9fc9ff,#3a5f9e)", accent: "#d5e8ff" },
  Robak: { gradient: "linear-gradient(135deg,#b6d94c,#4d6310)", accent: "#e2f5a1" },
  Normalny: { gradient: "linear-gradient(135deg,#d7d3c8,#6f6a5e)", accent: "#f0ede4" },
  Duch: { gradient: "linear-gradient(135deg,#8b7bd8,#2d2159)", accent: "#cfc6ff" },
  Walka: { gradient: "linear-gradient(135deg,#ff7b6b,#7a1d12)", accent: "#ffc8bf" },
  Stal: { gradient: "linear-gradient(135deg,#c3ccd8,#4d5866)", accent: "#e6ecf4" },
  Lód: { gradient: "linear-gradient(135deg,#9be7f5,#155f77)", accent: "#d7fbff" },
  Smok: { gradient: "linear-gradient(135deg,#8f7bff,#2b1a7a)", accent: "#cfc2ff" },
  Wróżka: { gradient: "linear-gradient(135deg,#ffb3e6,#8a2f6d)", accent: "#ffdaf3" },
};


/** Kształty odznak (clip-path) — jak w grach: głaz, kropla, piorun, kwiat itd. */
export const BADGE_SHAPES: Record<string, string> = {
  boulder:
    "polygon(20% 0%, 80% 0%, 100% 30%, 88% 100%, 12% 100%, 0% 30%)",
  drop: "polygon(50% 0%, 78% 26%, 100% 62%, 78% 96%, 22% 96%, 0% 62%, 22% 26%)",
  bolt: "polygon(42% 0%, 100% 0%, 62% 38%, 96% 38%, 20% 100%, 38% 52%, 0% 52%)",
  flower:
    "polygon(50% 0%, 62% 24%, 88% 12%, 80% 40%, 100% 55%, 76% 68%, 82% 96%, 50% 82%, 18% 96%, 24% 68%, 0% 55%, 20% 40%, 12% 12%, 38% 24%)",
  heart:
    "polygon(50% 100%, 8% 56%, 0% 30%, 16% 8%, 36% 10%, 50% 28%, 64% 10%, 84% 8%, 100% 30%, 92% 56%)",
  hex: "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)",
  flame:
    "polygon(50% 0%, 70% 22%, 66% 44%, 92% 40%, 82% 74%, 50% 100%, 18% 74%, 8% 40%, 34% 44%, 30% 22%)",
  star: "polygon(50% 0%, 62% 32%, 98% 34%, 70% 56%, 80% 92%, 50% 72%, 20% 92%, 30% 56%, 2% 34%, 38% 32%)",
  wing: "polygon(50% 4%, 96% 16%, 74% 48%, 100% 62%, 50% 100%, 0% 62%, 26% 48%, 4% 16%)",
  shield: "polygon(50% 0%, 100% 14%, 92% 68%, 50% 100%, 8% 68%, 0% 14%)",
  gear: "polygon(38% 0%, 62% 0%, 70% 14%, 88% 12%, 88% 32%, 100% 44%, 100% 60%, 86% 70%, 88% 88%, 66% 90%, 56% 100%, 40% 100%, 30% 88%, 12% 88%, 12% 68%, 0% 58%, 0% 42%, 14% 30%, 12% 12%, 30% 14%)",
  crystal: "polygon(50% 0%, 84% 22%, 100% 62%, 50% 100%, 0% 62%, 16% 22%)",
  fang: "polygon(50% 0%, 100% 26%, 82% 60%, 50% 100%, 18% 60%, 0% 26%)",
  leaf: "polygon(50% 0%, 84% 18%, 96% 52%, 70% 86%, 50% 100%, 30% 86%, 4% 52%, 16% 18%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
};

/** Domyślny kształt dla danego typu Sali. */
const TYPE_SHAPE: Record<string, string> = {
  Skała: "boulder",
  Ziemia: "boulder",
  Woda: "drop",
  Elektryczny: "bolt",
  Trawa: "leaf",
  Trucizna: "hex",
  Psychiczny: "star",
  Ogień: "flame",
  Lot: "wing",
  Robak: "fang",
  Normalny: "shield",
  Duch: "hex",
  Walka: "shield",
  Stal: "gear",
  Lód: "crystal",
  Smok: "fang",
  Wróżka: "flower",
};

/** Ręczne kształty odznak Kanto, żeby były rozpoznawalne jak w grach. */
const BADGE_SHAPE_OVERRIDE: Record<string, string> = {
  kanto_boulder: "boulder",
  kanto_cascade: "drop",
  kanto_thunder: "bolt",
  kanto_rainbow: "flower",
  kanto_soul: "heart",
  kanto_marsh: "diamond",
  kanto_volcano: "flame",
  kanto_earth: "star",
  johto_zephyr: "wing",
  johto_hive: "hex",
  johto_plain: "shield",
  johto_fog: "diamond",
  johto_storm: "star",
  johto_mineral: "gear",
  johto_glacier: "crystal",
  johto_rising: "fang",
};

function m(species_id: number, species_name: string, level: number): GymMember {
  return { species_id, species_name, level };
}

export const REGION_GYMS: Record<string, GymSpec[]> = {
  kanto: [
    { index: 1, type: "Skała", leader: "Brock", badgeKey: "kanto_boulder", badgeName: "Odznaka Głazu (Boulder)", team: [m(74, "Geodude", 12), m(95, "Onix", 14)] },
    { index: 2, type: "Woda", leader: "Misty", badgeKey: "kanto_cascade", badgeName: "Odznaka Kaskady (Cascade)", team: [m(120, "Staryu", 18), m(121, "Starmie", 21)] },
    { index: 3, type: "Elektryczny", leader: "Lt. Surge", badgeKey: "kanto_thunder", badgeName: "Odznaka Pioruna (Thunder)", team: [m(100, "Voltorb", 21), m(25, "Pikachu", 18), m(26, "Raichu", 24)] },
    { index: 4, type: "Trawa", leader: "Erika", badgeKey: "kanto_rainbow", badgeName: "Odznaka Tęczy (Rainbow)", team: [m(71, "Victreebel", 29), m(114, "Tangela", 24), m(45, "Vileplume", 29)] },
    { index: 5, type: "Trucizna", leader: "Koga", badgeKey: "kanto_soul", badgeName: "Odznaka Duszy (Soul)", team: [m(109, "Koffing", 37), m(89, "Muk", 39), m(110, "Weezing", 43)] },
    { index: 6, type: "Psychiczny", leader: "Sabrina", badgeKey: "kanto_marsh", badgeName: "Odznaka Bagien (Marsh)", team: [m(64, "Kadabra", 38), m(122, "Mr. Mime", 37), m(49, "Venomoth", 38), m(65, "Alakazam", 43)] },
    { index: 7, type: "Ogień", leader: "Blaine", badgeKey: "kanto_volcano", badgeName: "Odznaka Wulkanu (Volcano)", team: [m(58, "Growlithe", 42), m(77, "Ponyta", 40), m(78, "Rapidash", 42), m(126, "Magmar", 47)] },
    { index: 8, type: "Ziemia", leader: "Giovanni", badgeKey: "kanto_earth", badgeName: "Odznaka Ziemi (Earth)", team: [m(111, "Rhyhorn", 45), m(51, "Dugtrio", 42), m(34, "Nidoking", 45), m(112, "Rhydon", 50)] },
  ],
  johto: [
    { index: 1, type: "Lot", leader: "Falkner", badgeKey: "johto_zephyr", badgeName: "Odznaka Zefiru (Zephyr)", team: [m(16, "Pidgey", 9), m(17, "Pidgeotto", 13)] },
    { index: 2, type: "Robak", leader: "Bugsy", badgeKey: "johto_hive", badgeName: "Odznaka Ula (Hive)", team: [m(11, "Metapod", 14), m(14, "Kakuna", 14), m(123, "Scyther", 16)] },
    { index: 3, type: "Normalny", leader: "Whitney", badgeKey: "johto_plain", badgeName: "Odznaka Równiny (Plain)", team: [m(35, "Clefairy", 18), m(241, "Miltank", 20)] },
    { index: 4, type: "Duch", leader: "Morty", badgeKey: "johto_fog", badgeName: "Odznaka Mgły (Fog)", team: [m(92, "Gastly", 21), m(93, "Haunter", 23), m(94, "Gengar", 25)] },
    { index: 5, type: "Walka", leader: "Chuck", badgeKey: "johto_storm", badgeName: "Odznaka Burzy (Storm)", team: [m(57, "Primeape", 29), m(62, "Poliwrath", 31)] },
    { index: 6, type: "Stal", leader: "Jasmine", badgeKey: "johto_mineral", badgeName: "Odznaka Minerału (Mineral)", team: [m(81, "Magnemite", 30), m(82, "Magneton", 32), m(208, "Steelix", 35)] },
    { index: 7, type: "Lód", leader: "Pryce", badgeKey: "johto_glacier", badgeName: "Odznaka Lodowca (Glacier)", team: [m(86, "Seel", 27), m(87, "Dewgong", 29), m(221, "Piloswine", 31)] },
    { index: 8, type: "Smok", leader: "Clair", badgeKey: "johto_rising", badgeName: "Odznaka Wschodzącego Słońca (Rising)", team: [m(147, "Dratini", 37), m(148, "Dragonair", 37), m(230, "Kingdra", 40)] },
  ],
  hoenn: [
    { index: 1, type: "Skała", leader: "Roxanne", badgeKey: "hoenn_stone", badgeName: "Odznaka Kamienia (Stone)", team: [m(74, "Geodude", 12), m(299, "Nosepass", 15)] },
    { index: 2, type: "Walka", leader: "Brawly", badgeKey: "hoenn_knuckle", badgeName: "Odznaka Pięści (Knuckle)", team: [m(66, "Machop", 16), m(296, "Makuhita", 18)] },
    { index: 3, type: "Elektryczny", leader: "Wattson", badgeKey: "hoenn_dynamo", badgeName: "Odznaka Dynama (Dynamo)", team: [m(100, "Voltorb", 20), m(309, "Electrike", 20), m(82, "Magneton", 22), m(310, "Manectric", 24)] },
    { index: 4, type: "Ogień", leader: "Flannery", badgeKey: "hoenn_heat", badgeName: "Odznaka Żaru (Heat)", team: [m(322, "Numel", 24), m(218, "Slugma", 24), m(323, "Camerupt", 26), m(324, "Torkoal", 26)] },
    { index: 5, type: "Normalny", leader: "Norman", badgeKey: "hoenn_balance", badgeName: "Odznaka Równowagi (Balance)", team: [m(327, "Spinda", 27), m(288, "Vigoroth", 27), m(264, "Linoone", 29), m(289, "Slaking", 31)] },
    { index: 6, type: "Lot", leader: "Winona", badgeKey: "hoenn_feather", badgeName: "Odznaka Pióra (Feather)", team: [m(333, "Swablu", 29), m(357, "Tropius", 29), m(279, "Pelipper", 30), m(334, "Altaria", 33)] },
    { index: 7, type: "Psychiczny", leader: "Tate i Liza", badgeKey: "hoenn_mind", badgeName: "Odznaka Umysłu (Mind)", team: [m(338, "Solrock", 41), m(337, "Lunatone", 41)] },
    { index: 8, type: "Woda", leader: "Juan", badgeKey: "hoenn_rain", badgeName: "Odznaka Deszczu (Rain)", team: [m(370, "Luvdisc", 41), m(340, "Whiscash", 41), m(364, "Sealeo", 43), m(230, "Kingdra", 46)] },
  ],
  sinnoh: [
    { index: 1, type: "Skała", leader: "Roark", badgeKey: "sinnoh_coal", badgeName: "Odznaka Węgla (Coal)", team: [m(74, "Geodude", 12), m(95, "Onix", 12), m(408, "Cranidos", 14)] },
    { index: 2, type: "Trawa", leader: "Gardenia", badgeKey: "sinnoh_forest", badgeName: "Odznaka Lasu (Forest)", team: [m(420, "Cherubi", 19), m(387, "Turtwig", 19), m(407, "Roserade", 22)] },
    { index: 3, type: "Walka", leader: "Maylene", badgeKey: "sinnoh_cobble", badgeName: "Odznaka Bruku (Cobble)", team: [m(307, "Meditite", 27), m(67, "Machoke", 27), m(448, "Lucario", 30)] },
    { index: 4, type: "Woda", leader: "Crasher Wake", badgeKey: "sinnoh_fen", badgeName: "Odznaka Moczarów (Fen)", team: [m(130, "Gyarados", 27), m(195, "Quagsire", 27), m(419, "Floatzel", 30)] },
    { index: 5, type: "Duch", leader: "Fantina", badgeKey: "sinnoh_relic", badgeName: "Odznaka Reliktu (Relic)", team: [m(355, "Duskull", 24), m(93, "Haunter", 24), m(429, "Mismagius", 26)] },
    { index: 6, type: "Stal", leader: "Byron", badgeKey: "sinnoh_mine", badgeName: "Odznaka Kopalni (Mine)", team: [m(436, "Bronzor", 36), m(208, "Steelix", 36), m(411, "Bastiodon", 39)] },
    { index: 7, type: "Lód", leader: "Candice", badgeKey: "sinnoh_icicle", badgeName: "Odznaka Sopla (Icicle)", team: [m(459, "Snover", 38), m(215, "Sneasel", 38), m(308, "Medicham", 40), m(460, "Abomasnow", 42)] },
    { index: 8, type: "Elektryczny", leader: "Volkner", badgeKey: "sinnoh_beacon", badgeName: "Odznaka Latarni (Beacon)", team: [m(26, "Raichu", 46), m(424, "Ambipom", 46), m(224, "Octillery", 47), m(405, "Luxray", 49)] },
  ],
  unova: [
    { index: 1, type: "Trawa", leader: "Cilan", badgeKey: "unova_trio", badgeName: "Odznaka Trio (Trio)", team: [m(506, "Lillipup", 12), m(511, "Pansage", 14)] },
    { index: 2, type: "Normalny", leader: "Lenora", badgeKey: "unova_basic", badgeName: "Odznaka Podstaw (Basic)", team: [m(507, "Herdier", 18), m(505, "Watchog", 20)] },
    { index: 3, type: "Robak", leader: "Burgh", badgeKey: "unova_insect", badgeName: "Odznaka Owada (Insect)", team: [m(544, "Whirlipede", 21), m(557, "Dwebble", 21), m(542, "Leavanny", 23)] },
    { index: 4, type: "Elektryczny", leader: "Elesa", badgeKey: "unova_bolt", badgeName: "Odznaka Błyskawicy (Bolt)", team: [m(587, "Emolga", 25), m(522, "Blitzle", 25), m(523, "Zebstrika", 27)] },
    { index: 5, type: "Ziemia", leader: "Clay", badgeKey: "unova_quake", badgeName: "Odznaka Wstrząsu (Quake)", team: [m(552, "Krokorok", 29), m(536, "Palpitoad", 29), m(530, "Excadrill", 31)] },
    { index: 6, type: "Lot", leader: "Skyla", badgeKey: "unova_jet", badgeName: "Odznaka Odrzutu (Jet)", team: [m(528, "Swoobat", 33), m(521, "Unfezant", 33), m(581, "Swanna", 35)] },
    { index: 7, type: "Lód", leader: "Brycen", badgeKey: "unova_freeze", badgeName: "Odznaka Mrozu (Freeze)", team: [m(583, "Vanillish", 37), m(615, "Cryogonal", 37), m(614, "Beartic", 39)] },
    { index: 8, type: "Smok", leader: "Drayden", badgeKey: "unova_legend", badgeName: "Odznaka Legendy (Legend)", team: [m(621, "Druddigon", 46), m(330, "Flygon", 46), m(612, "Haxorus", 48)] },
  ],
  kalos: [
    { index: 1, type: "Robak", leader: "Viola", badgeKey: "kalos_bug", badgeName: "Odznaka Owada (Bug)", team: [m(283, "Surskit", 10), m(666, "Vivillon", 12)] },
    { index: 2, type: "Skała", leader: "Grant", badgeKey: "kalos_cliff", badgeName: "Odznaka Urwiska (Cliff)", team: [m(698, "Amaura", 25), m(696, "Tyrunt", 25)] },
    { index: 3, type: "Walka", leader: "Korrina", badgeKey: "kalos_rumble", badgeName: "Odznaka Zwady (Rumble)", team: [m(619, "Mienfoo", 29), m(67, "Machoke", 28), m(701, "Hawlucha", 32)] },
    { index: 4, type: "Trawa", leader: "Ramos", badgeKey: "kalos_plant", badgeName: "Odznaka Rośliny (Plant)", team: [m(189, "Jumpluff", 30), m(70, "Weepinbell", 31), m(673, "Gogoat", 34)] },
    { index: 5, type: "Elektryczny", leader: "Clemont", badgeKey: "kalos_voltage", badgeName: "Odznaka Napięcia (Voltage)", team: [m(587, "Emolga", 35), m(82, "Magneton", 35), m(695, "Heliolisk", 37)] },
    { index: 6, type: "Wróżka", leader: "Valerie", badgeKey: "kalos_fairy", badgeName: "Odznaka Wróżki (Fairy)", team: [m(303, "Mawile", 38), m(122, "Mr. Mime", 39), m(700, "Sylveon", 42)] },
    { index: 7, type: "Psychiczny", leader: "Olympia", badgeKey: "kalos_psychic", badgeName: "Odznaka Psychiki (Psychic)", team: [m(561, "Sigilyph", 44), m(199, "Slowking", 45), m(678, "Meowstic", 48)] },
    { index: 8, type: "Lód", leader: "Wulfric", badgeKey: "kalos_iceberg", badgeName: "Odznaka Góry Lodowej (Iceberg)", team: [m(460, "Abomasnow", 56), m(615, "Cryogonal", 55), m(713, "Avalugg", 59)] },
  ],
  alola: [
    { index: 1, type: "Normalny", leader: "Ilima", badgeKey: "alola_normalium", badgeName: "Normalium Z", team: [m(734, "Yungoos", 10), m(235, "Smeargle", 11)] },
    { index: 2, type: "Woda", leader: "Lana", badgeKey: "alola_waterium", badgeName: "Waterium Z", team: [m(746, "Wishiwashi", 20), m(752, "Araquanid", 20)] },
    { index: 3, type: "Ogień", leader: "Kiawe", badgeKey: "alola_firium", badgeName: "Firium Z", team: [m(105, "Marowak", 22), m(758, "Salazzle", 24)] },
    { index: 4, type: "Trawa", leader: "Mallow", badgeKey: "alola_grassium", badgeName: "Grassium Z", team: [m(762, "Steenee", 24), m(754, "Lurantis", 26)] },
    { index: 5, type: "Elektryczny", leader: "Sophocles", badgeKey: "alola_electrium", badgeName: "Electrium Z", team: [m(737, "Charjabug", 29), m(777, "Togedemaru", 31)] },
    { index: 6, type: "Duch", leader: "Acerola", badgeKey: "alola_ghostium", badgeName: "Ghostium Z", team: [m(426, "Drifblim", 34), m(778, "Mimikyu", 34), m(770, "Palossand", 35)] },
    { index: 7, type: "Wróżka", leader: "Mina", badgeKey: "alola_fairium", badgeName: "Fairium Z", team: [m(210, "Granbull", 51), m(743, "Ribombee", 51), m(40, "Wigglytuff", 52)] },
    { index: 8, type: "Ziemia", leader: "Hapu", badgeKey: "alola_groundium", badgeName: "Groundium Z", team: [m(623, "Golurk", 53), m(423, "Gastrodon", 53), m(330, "Flygon", 54), m(750, "Mudsdale", 55)] },
  ],
  galar: [
    { index: 1, type: "Trawa", leader: "Milo", badgeKey: "galar_grass", badgeName: "Odznaka Trawy (Grass)", team: [m(829, "Gossifleur", 19), m(830, "Eldegoss", 20)] },
    { index: 2, type: "Woda", leader: "Nessa", badgeKey: "galar_water", badgeName: "Odznaka Wody (Water)", team: [m(118, "Goldeen", 22), m(846, "Arrokuda", 23), m(834, "Drednaw", 24)] },
    { index: 3, type: "Ogień", leader: "Kabu", badgeKey: "galar_fire", badgeName: "Odznaka Ognia (Fire)", team: [m(38, "Ninetales", 25), m(59, "Arcanine", 25), m(851, "Centiskorch", 27)] },
    { index: 4, type: "Walka", leader: "Bea", badgeKey: "galar_fighting", badgeName: "Odznaka Walki (Fighting)", team: [m(237, "Hitmontop", 34), m(675, "Pangoro", 34), m(865, "Sirfetch'd", 35), m(68, "Machamp", 36)] },
    { index: 5, type: "Wróżka", leader: "Opal", badgeKey: "galar_fairy", badgeName: "Odznaka Wróżki (Fairy)", team: [m(110, "Weezing", 36), m(303, "Mawile", 36), m(468, "Togekiss", 37), m(869, "Alcremie", 38)] },
    { index: 6, type: "Skała", leader: "Gordie", badgeKey: "galar_rock", badgeName: "Odznaka Skały (Rock)", team: [m(689, "Barbaracle", 40), m(213, "Shuckle", 40), m(874, "Stonjourner", 41), m(839, "Coalossal", 42)] },
    { index: 7, type: "Lód", leader: "Melony", badgeKey: "galar_ice", badgeName: "Odznaka Lodu (Ice)", team: [m(873, "Frosmoth", 40), m(555, "Darmanitan", 40), m(131, "Lapras", 41), m(875, "Eiscue", 42)] },
    { index: 8, type: "Smok", leader: "Raihan", badgeKey: "galar_dragon", badgeName: "Odznaka Smoka (Dragon)", team: [m(526, "Gigalith", 45), m(330, "Flygon", 45), m(844, "Sandaconda", 46), m(884, "Duraludon", 47)] },
  ],
  paldea: [
    { index: 1, type: "Robak", leader: "Katy", badgeKey: "paldea_bug", badgeName: "Odznaka Owada (Bug)", team: [m(915, "Nymble", 14), m(917, "Tarountula", 14), m(216, "Teddiursa", 15)] },
    { index: 2, type: "Trawa", leader: "Brassius", badgeKey: "paldea_grass", badgeName: "Odznaka Trawy (Grass)", team: [m(548, "Petilil", 16), m(928, "Smoliv", 16), m(185, "Sudowoodo", 17)] },
    { index: 3, type: "Elektryczny", leader: "Iono", badgeKey: "paldea_electric", badgeName: "Odznaka Elektryczna (Electric)", team: [m(940, "Wattrel", 23), m(404, "Luxio", 23), m(939, "Bellibolt", 23), m(429, "Mismagius", 24)] },
    { index: 4, type: "Woda", leader: "Kofu", badgeKey: "paldea_water", badgeName: "Odznaka Wody (Water)", team: [m(976, "Veluza", 29), m(961, "Wugtrio", 29), m(740, "Crabominable", 30)] },
    { index: 5, type: "Normalny", leader: "Larry", badgeKey: "paldea_normal", badgeName: "Odznaka Normalna (Normal)", team: [m(775, "Komala", 35), m(982, "Dudunsparce", 35), m(398, "Staraptor", 36)] },
    { index: 6, type: "Duch", leader: "Ryme", badgeKey: "paldea_ghost", badgeName: "Odznaka Ducha (Ghost)", team: [m(778, "Mimikyu", 41), m(354, "Banette", 41), m(849, "Toxtricity", 41), m(972, "Houndstone", 42)] },
    { index: 7, type: "Psychiczny", leader: "Tulip", badgeKey: "paldea_psychic", badgeName: "Odznaka Psychiki (Psychic)", team: [m(981, "Farigiraf", 44), m(282, "Gardevoir", 44), m(956, "Espathra", 45), m(671, "Florges", 45)] },
    { index: 8, type: "Lód", leader: "Grusha", badgeKey: "paldea_ice", badgeName: "Odznaka Lodu (Ice)", team: [m(873, "Frosmoth", 47), m(614, "Beartic", 47), m(975, "Cetitan", 48), m(334, "Altaria", 48)] },
  ],
};

export type Gym = GymSpec & {
  gradient: string;
  accent: string;
  /** clip-path kształtu odznaki. */
  shape: string;
  /** Najwyższy poziom w drużynie Lidera. */
  level: number;
  teamSize: number;
  rewardExp: number;
  rewardCoins: number;
};

function decorate(spec: GymSpec): Gym {
  const style = TYPE_STYLE[spec.type] ?? TYPE_STYLE["Normalny"]!;
  const level = Math.max(...spec.team.map((member) => member.level));
  const shapeKey =
    BADGE_SHAPE_OVERRIDE[spec.badgeKey] ?? TYPE_SHAPE[spec.type] ?? "shield";
  return {
    ...spec,
    gradient: style.gradient,
    accent: style.accent,
    shape: BADGE_SHAPES[shapeKey] ?? BADGE_SHAPES["shield"]!,
    level,
    teamSize: spec.team.length,
    rewardExp: 80 + (spec.index - 1) * 60,
    rewardCoins: 150 + (spec.index - 1) * 110,
  };
}

export function gymsForRegion(region: string | null | undefined): Gym[] {
  const specs = REGION_GYMS[region ?? "kanto"] ?? REGION_GYMS["kanto"]!;
  return specs.map(decorate);
}

export function badgeByKey(key: string): Gym | null {
  for (const specs of Object.values(REGION_GYMS)) {
    const found = specs.find((gym) => gym.badgeKey === key);
    if (found) return decorate(found);
  }
  return null;
}
