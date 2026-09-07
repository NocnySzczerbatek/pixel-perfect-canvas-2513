import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { GamePage } from "@/components/game/GamePage";
import { badgeByKey } from "@/lib/gyms";
import { getRanking } from "@/lib/trainer.functions";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking trenerów — Catch Zone" },
      {
        name: "description",
        content: "Tabela najlepszych trenerów Catch Zone: poziom, EXP, Catch Coins i odznaki.",
      },
      { property: "og:title", content: "Ranking trenerów — Catch Zone" },
      {
        property: "og:description",
        content: "Sprawdź, kto prowadzi w Catch Zone i jaką odznakę wyróżnia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RankingPage,
});

function RankingPage() {
  const fetchRanking = useServerFn(getRanking);
  const { data, isLoading } = useQuery({
    queryKey: ["ranking"],
    queryFn: () => fetchRanking(),
  });

  return (
    <GamePage
      title="Ranking"
      subtitle="Najlepsi trenerzy Catch Zone — poziom, doświadczenie i wyróżniona odznaka."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Wczytuję tabelę…</p>
      ) : (
        <div className="glass-panel overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Trener</th>
                <th className="px-4 py-3 text-left">Odznaka</th>
                <th className="px-4 py-3 text-right">Poziom</th>
                <th className="px-4 py-3 text-right">EXP</th>
                <th className="px-4 py-3 text-right">Catch Coins</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((row, index) => {
                const badge = row.featured_badge ? badgeByKey(row.featured_badge) : null;
                const isMe = row.id === data?.me;
                return (
                  <tr
                    key={row.id}
                    className={`border-t border-border/40 ${isMe ? "bg-aurora/10" : ""}`}
                  >
                    <td className="px-4 py-3 font-display text-lg">{index + 1}</td>
                    <td className="px-4 py-3">
                      {row.trainer_name}
                      {isMe ? <span className="ml-2 text-xs text-aurora">to Ty</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      {badge ? (
                        <span className="inline-flex items-center gap-2 text-xs">
                          <img
                            src={badge.imageUrl}
                            alt=""
                            className="h-7 w-7 object-contain drop-shadow-md"
                            loading="lazy"
                          />
                          {badge.badgeName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{row.trainer_level}</td>
                    <td className="px-4 py-3 text-right">{row.trainer_exp}</td>
                    <td className="px-4 py-3 text-right">{row.catch_coins}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(data?.rows ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nikt jeszcze nie zdobył punktów. Ruszaj na eksplorację!
            </p>
          ) : null}
        </div>
      )}
    </GamePage>
  );
}
