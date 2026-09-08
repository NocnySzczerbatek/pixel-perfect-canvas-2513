/** Dynamiczne ogłoszenia w panelu trenera — pogoda dnia i wydarzenie tygodnia. */

export type Announcements = {
  dayLabel: string;
  weekLabel: string;
  weather: string;
  event: string;
  tip: string;
};

const WEATHER = [
  "słonecznie i parno — Pokémony Ognia i Trawy są wyjątkowo aktywne",
  "mroźnie, aurora nad doliną — łatwiej spotkać typy Lodu",
  "rzęsisty deszcz — zbiorniki wodne tętnią życiem",
  "gęsta mgła — nocne i duchowe gatunki wychodzą z cienia",
  "silny wiatr — ptaki krążą nad równinami",
  "burza z piorunami — typy Elektryczne szaleją",
  "spokojnie i pochmurnie — dobry dzień na treningi",
];

const EVENTS = [
  "+10% szansy na rzadkie spotkania na Śnieżnej Polanie",
  "Tydzień Wędkarzy — więcej spotkań w Oceanie i na Bagnie",
  "Podwójne monety za walki z Trenerami",
  "Tydzień Sal — Liderzy dają dodatkowe doświadczenie",
  "Święto Cukierków — częstsze znajdźki w eksploracji",
  "Turniejowy tydzień — punkty w rankingu liczą się podwójnie",
  "Noc Duchów — większa szansa na Shiny w Jaskini i Otchłani",
  "Tydzień GTS — obniżona prowizja przy wystawianiu Pokémonów",
];

const TIPS = [
  "Ulecz drużynę w Centrum Pokémon — jest darmowe i bez limitu.",
  "Razz Berry zwiększa szansę złapania — używaj przy rzadkich gatunkach.",
  "Trening statystyk kupujesz za Catch Coins, do 1000 punktów na staty.",
  "Odbierz Zadania Dzienne przed północą — potem znikają.",
  "Badania Profesora Oaka dają Balle i monety za zwykłą grę.",
  "Tarcza BHP chroni monety przed atakami innych trenerów w PvP.",
];

function dayIndex(date: Date): number {
  return Math.floor(date.getTime() / 86_400_000);
}

function weekIndex(date: Date): number {
  return Math.floor(dayIndex(date) / 7);
}

export function announcementsFor(date: Date = new Date()): Announcements {
  const day = dayIndex(date);
  const week = weekIndex(date);
  return {
    dayLabel: date.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" }),
    weekLabel: `Tydzień #${week % 52}`,
    weather: WEATHER[day % WEATHER.length]!,
    event: EVENTS[week % EVENTS.length]!,
    tip: TIPS[day % TIPS.length]!,
  };
}
