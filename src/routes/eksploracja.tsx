import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/eksploracja")({
  head: () => ({
    meta: [
      { title: "Eksploracja — Catch Zone" },
      { name: "description", content: "Wybierz biom i ruszaj na spotkania z dzikimi Pokémonami. Każdy krok kosztuje Energię." },
      { property: "og:title", content: "Eksploracja — Catch Zone" },
      { property: "og:description", content: "Wybierz biom i ruszaj na spotkania z dzikimi Pokémonami. Każdy krok kosztuje Energię." },
    ],
  }),
  component: EksploracjaPage,
});

function EksploracjaPage() {
  return (
    <GamePage title="Eksploracja" subtitle={"Wybierz biom i ruszaj na spotkania z dzikimi Pokémonami. Każdy krok kosztuje Energię."}>
      <ComingSoon note={"Moduł biomów i Catch Zone przygotowujemy w kolejnym etapie."} />
    </GamePage>
  );
}
