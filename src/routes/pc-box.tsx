import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/pc-box")({
  head: () => ({
    meta: [
      { title: "PC Box — Catch Zone" },
      { name: "description", content: "Wszystkie złapane Pokémony poza aktywną drużyną." },
      { property: "og:title", content: "PC Box — Catch Zone" },
      { property: "og:description", content: "Wszystkie złapane Pokémony poza aktywną drużyną." },
    ],
  }),
  component: PcBoxPage,
});

function PcBoxPage() {
  return (
    <GamePage title="PC Box" subtitle={"Wszystkie złapane Pokémony poza aktywną drużyną."}>
      <ComingSoon note={"Magazyn PC uruchomimy po systemie łapania."} />
    </GamePage>
  );
}
