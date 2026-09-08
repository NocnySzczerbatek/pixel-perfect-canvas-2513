import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Timer } from "lucide-react";

import { GamePage } from "@/components/game/GamePage";
import { useSession } from "@/hooks/useSession";
import { getBonusHistory } from "@/lib/bonuses.functions";

export const Route = createFileRoute("/bonusy")({
  head: () => ({
    meta: [
      { title: "Historia bonusów — Catch Zone" },
      {
        name: "description",
        content:
          "Sprawdź, kiedy i na jak długo zdobyłeś bonusy oraz jak zmieniła się Twoja szansa na Shiny.",
      },
      { property: "og:title", content: "Historia bonusów — Catch Zone" },
      {
        property: "og:description",
        content: "Kiedy, jaki buff, jak długo i jaka szansa na Shiny przed i po.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BonusyPage,
});

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(iso));
}

function BonusyPage() {
  const { userId } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["bonus-history"],
    queryFn: () => getBonusHistory(),
    enabled: !!userId,
  });

  const rows = data ?? [];

  return (
    <GamePage
      title="Historia bonusów"
      subtitle="Każdy zdobyty bonus: kiedy, na jak długo i jak zmienił szansę na Shiny."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Wczytuję historię…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Brak wpisów — wygraj walkę w Sali albo zdobądź osiągnięcie, aby zapisać pierwszy bonus.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const timed = row.kind === "timed";
            return (
              <li key={row.id} className="glass-panel rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-display text-xl">
                    {timed ? (
                      <Timer className="h-4 w-4 text-primary" aria-hidden />
                    ) : (
                      <Sparkles className="h-4 w-4 text-amber-300" aria-hidden />
                    )}
                    {row.label}
                  </p>
                  <span className="text-xs text-muted-foreground">{formatWhen(row.started_at)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {timed ? "Bonus czasowy" : "Bonus trwały"} · {row.source}
                  {row.duration_minutes ? ` · ${row.duration_minutes} min` : ""}
                  {row.expires_at ? ` · do ${formatWhen(row.expires_at)}` : " · na zawsze"}
                </p>
                <p className="mt-2 text-sm">
                  +{row.shiny_bonus_pct}% Shiny · +{row.rare_bonus_pct}% rzadkie spotkania
                </p>
                {row.shiny_denom_before && row.shiny_denom_after ? (
                  <p className="text-xs text-muted-foreground">
                    Szansa na Shiny: 1 / {row.shiny_denom_before} → 1 / {row.shiny_denom_after}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </GamePage>
  );
}
