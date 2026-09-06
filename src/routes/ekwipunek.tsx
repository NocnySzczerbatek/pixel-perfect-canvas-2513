import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/ekwipunek")({
  head: () => ({
    meta: [
      { title: "Ekwipunek — Catch Zone" },
      { name: "description", content: "Twoje Balle, jagody, flakony energii i Kamienie Mega." },
      { property: "og:title", content: "Ekwipunek — Catch Zone" },
      { property: "og:description", content: "Twoje Balle, jagody, flakony energii i Kamienie Mega." },
    ],
  }),
  component: EkwipunekPage,
});

function EkwipunekPage() {
  return (
    <GamePage title="Ekwipunek" subtitle={"Twoje Balle, jagody, flakony energii i Kamienie Mega."}>
      <ComingSoon note={"Pełny ekwipunek pojawi się razem z systemem łapania."} />
    </GamePage>
  );
}
