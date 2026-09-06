import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking — Catch Zone" },
      { name: "description", content: "Najlepsi trenerzy Catch Zone." },
      { property: "og:title", content: "Ranking — Catch Zone" },
      { property: "og:description", content: "Najlepsi trenerzy Catch Zone." },
    ],
  }),
  component: RankingPage,
});

function RankingPage() {
  return (
    <GamePage title="Ranking" subtitle={"Najlepsi trenerzy Catch Zone."}>
      <ComingSoon note={"Tabela wyników ruszy, gdy zaczniemy zbierać statystyki walk."} />
    </GamePage>
  );
}
