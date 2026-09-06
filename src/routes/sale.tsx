import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/sale")({
  head: () => ({
    meta: [
      { title: "Sale — Catch Zone" },
      { name: "description", content: "Osiem Sal w każdym regionie i ich Liderzy." },
      { property: "og:title", content: "Sale — Catch Zone" },
      { property: "og:description", content: "Osiem Sal w każdym regionie i ich Liderzy." },
    ],
  }),
  component: SalePage,
});

function SalePage() {
  return (
    <GamePage title="Sale" subtitle={"Osiem Sal w każdym regionie i ich Liderzy."}>
      <ComingSoon note={"Sale i Liderzy dołączą po module walk."} />
    </GamePage>
  );
}
