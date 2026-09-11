import {
  Award,
  ChevronDown,
  Coins,
  Compass,
  Dumbbell,
  Gem,
  Globe2,
  Map,
  Repeat,
  Shield,
  Smartphone,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/Reveal";

const LOOP = [
  {
    icon: Zap,
    title: "Zbieraj Energię",
    body: "Energia odnawia się sama (maks. 100). To Twoje paliwo do każdej wyprawy.",
  },
  {
    icon: Compass,
    title: "Eksploruj i łap",
    body: "Wybierz biom, spotykaj dzikie Pokémony i rzucaj Ballem — także na Shiny.",
  },
  {
    icon: Swords,
    title: "Walcz o EXP i monety",
    body: "Widowiskowe walki z dzikimi Pokémonami, trenerami i bossami raidów.",
  },
  {
    icon: Dumbbell,
    title: "Trenuj i zdobywaj odznaki",
    body: "Rozwijaj statystyki, ucz ruchów i pokonuj ośmiu Liderów Sal w regionie.",
  },
  {
    icon: Trophy,
    title: "Handluj i rywalizuj",
    body: "Wystawiaj Pokémony na GTS, walcz w PvP i pnij się w rankingu trenerów.",
  },
];

const FEATURES = [
  { icon: Globe2, title: "9 regionów", body: "Od Kanto po Paldeę — własne startery, biomy i Sale." },
  { icon: Sparkles, title: "Shiny Pokémony", body: "Rzadkie warianty z podbitą szansą w wydarzeniach." },
  { icon: Trophy, title: "Turnieje tygodniowe", body: "Cykliczne drabinki i nagrody dla najlepszych drużyn." },
  { icon: Award, title: "Sale i Liga", body: "Osiem odznak, a potem starcie z Ligą regionu." },
  { icon: Swords, title: "PvP i Ranking", body: "Mierz się z innymi trenerami i zbieraj punkty rankingowe." },
  { icon: Repeat, title: "GTS i handel", body: "Wymieniaj i sprzedawaj Pokémony innym graczom." },
];

const WHY = [
  { icon: Coins, title: "Przejrzysta ekonomia", body: "Bez pay-to-win — postęp zależy od gry, nie od portfela." },
  { icon: Gem, title: "Interaktywne walki", body: "Czytelna scena walki z podglądem HP, typów i ruchów." },
  { icon: Map, title: "Wydarzenia tygodniowe", body: "Rotacje bonusów, raidy i sezonowe cele co tydzień." },
  { icon: Smartphone, title: "Nowoczesny interfejs", body: "Mobile-first, szybki i wygodny także na telefonie." },
];

export function ScrollHint() {
  return (
    <div className="flex flex-col items-center gap-1 pb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
      Przewiń w dół
      <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden />
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal className="text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-3xl md:text-4xl">{title}</h2>
    </Reveal>
  );
}

export function LandingSections({
  busy,
  onSignIn,
}: {
  busy: boolean;
  onSignIn: (provider: "google" | "microsoft") => void;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-24 pb-20">
      <section aria-labelledby="jak-sie-gra">
        <SectionHeading eyebrow="Pętla rozgrywki" title="Jak się gra" />
        <h2 id="jak-sie-gra" className="sr-only">
          Jak się gra
        </h2>
        <ol className="mt-8 space-y-4">
          {LOOP.map((step, index) => (
            <Reveal key={step.title} delay={index * 90}>
              <li className="glass-panel flex items-start gap-4 rounded-2xl p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <step.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-display text-2xl">
                    <span className="mr-2 text-sm text-muted-foreground">{index + 1}</span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section>
        <SectionHeading eyebrow="Zawartość" title="Co znajdziesz w grze" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item, index) => (
            <Reveal key={item.title} delay={index * 70}>
              <article className="glass-panel tile-hover h-full rounded-2xl p-5">
                <item.icon className="h-6 w-6 text-primary" aria-hidden />
                <p className="mt-3 font-display text-2xl">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Wyróżniki" title="Dlaczego Catch Zone" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {WHY.map((item, index) => (
            <Reveal key={item.title} delay={index * 80}>
              <article className="glass-panel flex h-full items-start gap-4 rounded-2xl p-5">
                <Shield className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-display text-2xl">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section>
        <Reveal>
          <div className="glass-panel mx-auto max-w-xl rounded-2xl p-8 text-center">
            <h2 className="text-3xl">Gotowy na pierwszego Pokémona?</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Zaloguj się, wybierz region i startera. Postęp trenera zapisujemy automatycznie.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button disabled={busy} onClick={() => onSignIn("google")}>
                Zaloguj przez Google
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => onSignIn("microsoft")}>
                Zaloguj przez Microsoft
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
