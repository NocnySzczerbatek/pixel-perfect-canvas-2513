import { Link, createFileRoute } from "@tanstack/react-router";
import { Swords } from "lucide-react";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { TRAINER_CLASSES } from "@/lib/pokedex";

export const Route = createFileRoute("/trenerzy")({
  head: () => ({
    meta: [
      { title: "Trenerzy — Catch Zone" },
      { name: "description", content: "Walki z trenerami-botami dopasowanymi do Twojego poziomu." },
      { property: "og:title", content: "Trenerzy — Catch Zone" },
      { property: "og:description", content: "Walki z trenerami-botami dopasowanymi do Twojego poziomu." },
    ],
  }),
  component: TrenerzyPage,
});

function TrenerzyPage() {
  return (
    <GamePage title="Trenerzy" subtitle="Wybierz klasę rywala, a potem znajdź go podczas eksploracji. Wynik, nagrody i pełny przebieg walki zapisują się w dzienniku.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRAINER_CLASSES.map((name) => <article key={name} className="glass-panel rounded-2xl p-5">
          <TrainerAvatar trainerClass={name} className="h-24 w-24" />
          <h2 className="mt-2 font-display text-2xl">{name}</h2>
          <p className="text-sm text-muted-foreground">Drużyna 3–4 Pokémonów dopasowana do poziomu trenera.</p>
          <Button asChild className="mt-4"><Link to="/eksploracja"><Swords className="h-4 w-4" /> Szukaj wyzwania</Link></Button>
        </article>)}
      </div>
    </GamePage>
  );
}
