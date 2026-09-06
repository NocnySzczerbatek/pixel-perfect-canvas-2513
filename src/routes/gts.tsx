import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/gts")({
  head: () => ({
    meta: [
      { title: "GTS — Catch Zone" },
      { name: "description", content: "Globalna giełda wymiany i NPC-Kupiec." },
      { property: "og:title", content: "GTS — Catch Zone" },
      { property: "og:description", content: "Globalna giełda wymiany i NPC-Kupiec." },
    ],
  }),
  component: GtsPage,
});

function GtsPage() {
  return (
    <GamePage title="GTS" subtitle={"Globalna giełda wymiany i NPC-Kupiec."}>
      <ComingSoon note={"Giełda i kupiec ruszą po systemie łapania Pokémonów."} />
    </GamePage>
  );
}
