import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { gymsForRegion } from "@/lib/gyms";
import { getGymsState, setFeaturedBadge, type GymsState } from "@/lib/gyms.functions";

export const Route = createFileRoute("/odznaki")({
  head: () => ({
    meta: [
      { title: "Odznaki — Catch Zone" },
      {
        name: "description",
        content: "Twoja kolekcja odznak w 3D. Wybierz odznakę wyróżnioną w rankingu.",
      },
      { property: "og:title", content: "Odznaki — Catch Zone" },
      {
        property: "og:description",
        content: "Kolekcja odznak Catch Zone z efektem 3D i wyróżnioną odznaką.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OdznakiPage,
});

function OdznakiPage() {
  const fetchState = useServerFn(getGymsState);
  const setFeatured = useServerFn(setFeaturedBadge);
  const [state, setState] = useState<GymsState | null>(null);
  const [busy, setBusy] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["gyms", "badges"],
    queryFn: async () => {
      const result = await fetchState();
      setState(result);
      return result;
    },
  });

  const choose = async (badgeKey: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await setFeatured({ data: { badgeKey } });
      setState(result.state);
      toast.success("Odznaka wyróżniona zapisana.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać.");
    } finally {
      setBusy(false);
    }
  };

  const owned = new Set((state?.badges ?? []).map((badge) => badge.badge_key));
  const catalog = gymsForRegion(state?.region);

  return (
    <GamePage
      title="Odznaki"
      subtitle="Przesuń kursorem po odznace, żeby zobaczyć efekt 3D. Jedną możesz wyróżnić w rankingu."
    >
      {isLoading || !state ? (
        <p className="text-sm text-muted-foreground">Wczytuję kolekcję…</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.map((badge) => {
            const has = owned.has(badge.badgeKey);
            const isFeatured = state.featured_badge === badge.badgeKey;
            const earned = state.badges.find((row) => row.badge_key === badge.badgeKey);
            return (
              <div
                key={badge.badgeKey}
                className={`glass-panel group rounded-2xl p-5 text-center transition-transform duration-300 [perspective:800px] ${
                  has ? "" : "opacity-45"
                }`}
              >
                <div
                  className="mx-auto flex h-24 w-24 items-center justify-center rounded-full shadow-xl transition-transform duration-300 group-hover:[transform:rotateY(24deg)_rotateX(12deg)_scale(1.08)]"
                  style={{
                    background: badge.gradient,
                    boxShadow: `0 12px 30px -10px ${badge.accent}`,
                  }}
                  aria-hidden
                >
                  <span className="font-display text-2xl text-[#0b1020]">{badge.index}</span>
                </div>
                <p className="mt-4 font-display text-lg">{badge.badgeName}</p>
                <p className="text-xs text-muted-foreground">
                  {badge.leader} · typ {badge.type}
                  {earned ? ` · ${earned.leader_name}` : ""}
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  variant={isFeatured ? "default" : "outline"}
                  disabled={!has || busy || isFeatured}
                  onClick={() => void choose(badge.badgeKey)}
                >
                  {isFeatured ? "Wyróżniona" : has ? "Wyróżnij" : "Niezdobyta"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </GamePage>
  );
}
