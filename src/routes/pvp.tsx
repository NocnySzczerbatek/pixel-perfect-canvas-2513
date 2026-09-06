import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/pvp")({
  head: () => ({
    meta: [
      { title: "PvP — Catch Zone" },
      { name: "description", content: "Pojedynki z żywymi graczami o Catch Coins." },
      { property: "og:title", content: "PvP — Catch Zone" },
      { property: "og:description", content: "Pojedynki z żywymi graczami o Catch Coins." },
    ],
  }),
  component: PvpPage,
});

function PvpPage() {
  return (
    <GamePage title="PvP" subtitle={"Pojedynki z żywymi graczami o Catch Coins."}>
      <ComingSoon note={"Arena PvP wraz z Tarczą BHP pojawi się wkrótce."} />
    </GamePage>
  );
}
