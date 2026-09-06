import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/sklep")({
  head: () => ({
    meta: [
      { title: "Sklep — Catch Zone" },
      { name: "description", content: "Flakony Energii, Skrzynia Energii i Master Ball." },
      { property: "og:title", content: "Sklep — Catch Zone" },
      { property: "og:description", content: "Flakony Energii, Skrzynia Energii i Master Ball." },
    ],
  }),
  component: SklepPage,
});

function SklepPage() {
  return (
    <GamePage title="Sklep" subtitle={"Flakony Energii, Skrzynia Energii i Master Ball."}>
      <ComingSoon note={"Płatności uruchomimy po podłączeniu systemu płatniczego."} />
    </GamePage>
  );
}
