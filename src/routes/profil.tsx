import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon, GamePage } from "@/components/game/GamePage";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil — Catch Zone" },
      { name: "description", content: "Nick, konto i ustawienia trenera." },
      { property: "og:title", content: "Profil — Catch Zone" },
      { property: "og:description", content: "Nick, konto i ustawienia trenera." },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  return (
    <GamePage title="Profil" subtitle={"Nick, konto i ustawienia trenera."}>
      <ComingSoon note={"Zmiana nicku i usuwanie konta pojawią się tutaj."} />
    </GamePage>
  );
}
