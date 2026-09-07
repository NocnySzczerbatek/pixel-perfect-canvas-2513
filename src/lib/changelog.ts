export type ChangelogEntry = {
  version: string;
  date: string;
  added: string[];
  changed: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0",
    date: "07.09.2026",
    added: [
      "Pokédex regionu: spotkane i złapane gatunki, typy, statystyki bazowe oraz biomy, w których je znajdziesz.",
      "Kafelek Pokédexu w nawigacji panelu trenera.",
    ],
    changed: [
      "Płatności prawdziwymi pieniędzmi są wyłączone — pakiety w złotówkach mają status „Wkrótce”.",
      "Punkty życia wszystkich Pokémonów liczone są jednym wzorem (poziom + statystyka HP).",
      "Ewolucja działa i sprawdzana jest po stronie serwera: poziom, przyjaźń i wymagany przedmiot.",
    ],
  },
  {
    version: "0.9",
    date: "07.09.2026",
    added: [
      "Podróże: bilet za 20 000 CC pozwala lecieć do regionu w jego oknie czasowym (czas polski).",
      "Zadania dzienne z wyborem trudności oraz badania Profesora Oaka z dialogami i nagrodami.",
      "Nowe rodzaje Balli w sklepie, Master Ball z 24-godzinnym odnowieniem i pakiety Energii za złotówki.",
      "Fragmenty Kamieni Mega z eksploracji oraz tworzenie kamienia dla gatunku (+30% siły).",
      "Sale 8 Liderów w każdym regionie z kanonicznymi odznakami i efektem 3D.",
      "GTS z 5% prowizji, NPC-Kupiec bez targowania, PvP z Tarczą BHP i ranking trenerów.",
    ],
    changed: [
      "Dzikie spotkanie to najpierw walka, potem łapanie; po walce z botem pojawia się przycisk „Dalej”.",
      "Pokémon używa maksymalnie czterech poznanych ruchów, dostępne jest leczenie w trakcie walki.",
      "Ewolucje i ruchy pobierane są z Pokédexu, a rozwój zamiast IV napędza trening 0–1000.",
      "Drużyna sześciu Pokémonów jest jednym klikalnym paskiem na panelu trenera.",
      "Dane innych graczy w rankingu, na giełdzie i w PvP są ograniczone do informacji publicznych.",
    ],
  },
];

export const GAME_LOOP = [
  "Zbieraj Energię (+1 co 3 minuty, maks. 100) i wydawaj ją na eksplorację biomów.",
  "Wygraj walkę z dzikim Pokémonem, a potem złap go Ballem — nieudany rzut traci Balla.",
  "Za walki dostajesz EXP, Catch Coins i przedmioty; poziom trenera daje Balle w nagrodę.",
  "Trenuj Pokémony, ewoluuj je i podbijaj 8 Sal regionu, by zdobyć odznaki.",
  "Handluj na GTS lub u Kupca, atakuj innych w PvP i pnij się w rankingu.",
];
