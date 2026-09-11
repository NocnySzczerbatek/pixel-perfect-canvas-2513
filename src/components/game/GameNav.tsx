import { Link } from "@tanstack/react-router";
import {
  Backpack,
  BookOpen,
  Boxes,
  CalendarDays,
  Compass,
  Crown,
  Egg,
  Flame,
  Gem,
  Heart,
  HeartPulse,
  Landmark,
  Map as MapIcon,
  Medal,
  Plane,
  Repeat,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  ClipboardList,
  UserRound,
  Users,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const NAV_GROUPS = [
  {
    title: "Walka",
    note: "Tu zdobywasz doświadczenie, odznaki i monety.",
    tiles: [
      { to: "/eksploracja", label: "Eksploracja", Icon: Compass, desc: "Biomy, dzicy i trenerzy" },
      { to: "/swiat", label: "Mapa świata", Icon: MapIcon, desc: "Strefy, biomy i ich typy" },

      { to: "/podroze", label: "Podróże", Icon: Plane, desc: "Czasowe wyprawy do regionów" },
      { to: "/mapa", label: "Mapa regionów", Icon: MapIcon, desc: "Sale, Liderzy i odznaki" },
      { to: "/bonusy", label: "Historia bonusów", Icon: Sparkles, desc: "Buffy i szansa na Shiny" },
      { to: "/osiagniecia", label: "Osiągnięcia", Icon: Trophy, desc: "Codzienna nagroda i kamienie milowe" },
      { to: "/sale", label: "Sale", Icon: Landmark, desc: "8 Liderów regionu" },
      { to: "/liga", label: "Liga Pokémon", Icon: Crown, desc: "Elite 4 i Mistrz" },
      { to: "/raidy", label: "Raidy", Icon: Flame, desc: "Bossowie dnia i legendy" },
      { to: "/pvp", label: "PvP", Icon: Swords, desc: "Napady na innych trenerów" },
      { to: "/turnieje", label: "Turnieje", Icon: Crown, desc: "Tygodniowa liga o puchar" },
      { to: "/trenerzy", label: "Trenerzy", Icon: Users, desc: "Przeciwnicy i klasy" },
      { to: "/wydarzenia", label: "Wydarzenia", Icon: CalendarDays, desc: "Bonus tygodnia i nagroda" },
      { to: "/mistrzostwo", label: "Mistrzostwo", Icon: Gem, desc: "Postęp regionów i progi" },
    ],
  },
  {
    title: "Drużyna",
    note: "Twoje Pokémony, torba i skrzynia.",
    tiles: [
      { to: "/druzyna", label: "Drużyna", Icon: Shield, desc: "Skład i pseudonimy" },
      { to: "/centrum", label: "Siostra Joy", Icon: HeartPulse, desc: "Centrum Pokémon: leczenie" },
      { to: "/pc-box", label: "PC Box", Icon: Boxes, desc: "Reszta kolekcji" },
      { to: "/ekwipunek", label: "Ekwipunek", Icon: Backpack, desc: "Balle i mikstury" },
      { to: "/odznaki", label: "Odznaki", Icon: Medal, desc: "Zdobyte odznaki" },
      { to: "/zadania", label: "Zadania", Icon: ClipboardList, desc: "Dzienne cele i badania Oaka" },
      { to: "/pokedex", label: "Pokédex", Icon: BookOpen, desc: "Spotkane gatunki i ich biomy" },
      { to: "/hodowla", label: "Hodowla", Icon: Egg, desc: "Jajka i dziedziczone IV" },
    ],
  },
  {
    title: "Handel i konto",
    note: "Zakupy, wymiany i Twoje statystyki.",
    tiles: [
      { to: "/sklep", label: "Sklep", Icon: ShoppingBag, desc: "Balle, mikstury, pakiety" },
      { to: "/gts", label: "GTS", Icon: Repeat, desc: "Giełda i Kupiec" },
      { to: "/ranking", label: "Ranking", Icon: Trophy, desc: "Najlepsi trenerzy" },
      { to: "/znajomi", label: "Znajomi", Icon: Heart, desc: "Zaproszenia i lista trenerów" },
      { to: "/profil", label: "Profil", Icon: UserRound, desc: "Twoje statystyki" },
    ],
  },
] as const;

export function GameNav() {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="sticky top-0 z-40 mt-6">
      <nav className="glass-panel rounded-2xl px-2 py-2">
        <ul className="flex flex-wrap items-center gap-1">
          {NAV_GROUPS.map((group) => {
            const isOpen = open === group.title;
            return (
              <li key={group.title}>
                <button
                  type="button"
                  data-tour={group.title === "Walka" ? "/eksploracja" : undefined}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : group.title)}
                  onMouseEnter={() => setOpen(group.title)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                    isOpen ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {group.title}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>

        {NAV_GROUPS.filter((group) => group === NAV_GROUPS.find((g) => g.title === open)).map((group) => (
          <div key={group.title} className="mt-2 border-t border-border/60 pt-3" onMouseLeave={() => setOpen(null)}>
            <p className="px-2 text-xs text-muted-foreground">{group.note}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {group.tiles.map(({ to, label, Icon, desc }) => (
                <Link
                  key={to}
                  to={to}
                  data-tour={to}
                  onClick={() => setOpen(null)}
                  className="tile-hover glass-panel flex items-center gap-2 rounded-xl p-2.5"
                >
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm">{label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
