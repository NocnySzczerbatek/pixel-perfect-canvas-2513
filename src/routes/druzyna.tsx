import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/druzyna")({
  head: () => ({
    meta: [
      { title: "Drużyna — Catch Zone" },
      { name: "description", content: "Zarządzaj składem, leczeniem i kolejnością Pokémonów." },
      { property: "og:title", content: "Drużyna — Catch Zone" },
      { property: "og:description", content: "Zarządzaj składem, leczeniem i kolejnością Pokémonów." },
    ],
  }),
  component: DruzynaPage,
});

function DruzynaPage() {
  return (
    <GamePage title="Drużyna" subtitle={"Zarządzaj składem, leczeniem i kolejnością Pokémonów."}>
      <ComingSoon note={"Zarządzanie drużyną włączymy razem z walkami."} />
    </GamePage>
  );
}
