import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/odznaki")({
  head: () => ({
    meta: [
      { title: "Odznaki — Catch Zone" },
      { name: "description", content: "Zdobyte odznaki Sal z każdego regionu." },
      { property: "og:title", content: "Odznaki — Catch Zone" },
      { property: "og:description", content: "Zdobyte odznaki Sal z każdego regionu." },
    ],
  }),
  component: OdznakiPage,
});

function OdznakiPage() {
  return (
    <GamePage title="Odznaki" subtitle={"Zdobyte odznaki Sal z każdego regionu."}>
      <ComingSoon note={"Gablota odznak z efektem 3D czeka na system Sal."} />
    </GamePage>
  );
}
