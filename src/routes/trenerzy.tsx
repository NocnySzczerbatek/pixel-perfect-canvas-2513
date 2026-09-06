import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

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
    <GamePage title="Trenerzy" subtitle={"Walki z trenerami-botami dopasowanymi do Twojego poziomu."}>
      <ComingSoon note={"Automatyczne walki z logiem tur są w przygotowaniu."} />
    </GamePage>
  );
}
