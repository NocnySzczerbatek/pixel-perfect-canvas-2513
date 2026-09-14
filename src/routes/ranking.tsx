import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Coins, Crown, Medal, Swords } from "lucide-react";
import { useState } from "react";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { badgeByKey } from "@/lib/gyms";
import { getRanking, type RankingBoard, type RankingRow } from "@/lib/trainer.functions";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking trenerów — Catch Zone" },
      {
        name: "description",
        content:
          "Cztery zestawienia TOP 10 w Catch Zone: poziom trenera, złapane Pokémony, Catch Coins i zwycięstwa PvP.",
      },
      { property: "og:title", content: "Ranking trenerów — Catch Zone" },
      {
        property: "og:description",
        content: "Sprawdź, kto prowadzi w Catch Zone w poziomie, kolekcji, monetach i PvP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RankingPage,
});

const nf = new Intl.NumberFormat("pl-PL");

const BOARDS: {
  key: RankingBoard;
  label: string;
  icon: typeof Crown;
  main: (row: RankingRow) => string;
  sub: (row: RankingRow) => string;
}[] = [
  {
    key: "level",
    label: "Poziom",
    icon: Crown,
    main: (row) => `poz. ${row.trainer_level}`,
    sub: (row) => `${nf.format(row.trainer_exp)} EXP`,
  },
  {
    key: "caught",
    label: "Złapane",
    icon: Medal,
    main: (row) => `${nf.format(row.caught_pokemon)} Pokémonów`,
    sub: (row) => `poz. ${row.trainer_level}`,
  },
  {
    key: "wealth",
    label: "Bogacze",
    icon: Coins,
    main: (row) => `${nf.format(row.catch_coins)} CC`,
    sub: (row) => `poz. ${row.trainer_level}`,
  },
  {
    key: "pvp",
    label: "PvP",
    icon: Swords,
    main: (row) => `${nf.format(row.pvp_wins)} zwycięstw`,
    sub: (row) => `poz. ${row.trainer_level}`,
  },
];

function RankingPage() {
  const fetchRanking = useServerFn(getRanking);
  const [board, setBoard] = useState<RankingBoard>("level");
  const { data, isLoading } = useQuery({
    queryKey: ["ranking"],
    queryFn: () => fetchRanking(),
  });

  const active = BOARDS.find((entry) => entry.key === board)!;
  const rows = data?.boards?.[board] ?? [];

  return (
    <GamePage
      title="Ranking"
      subtitle="Cztery zestawienia TOP 10 — poziom, kolekcja, monety i PvP."
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BOARDS.map((entry) => {
          const Icon = entry.icon;
          return (
            <Button
              key={entry.key}
              variant={entry.key === board ? "default" : "outline"}
              className="justify-center gap-2"
              onClick={() => setBoard(entry.key)}
            >
              <Icon className="h-4 w-4" />
              {entry.label}
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Wczytuję zestawienie…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nikt jeszcze nie zdobył punktów. Ruszaj na eksplorację!
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row, index) => {
            const badge = row.featured_badge ? badgeByKey(row.featured_badge) : null;
            const isMe = row.id === data?.me;
            return (
              <li
                key={row.id}
                className={`glass-panel flex items-center gap-3 rounded-2xl px-3 py-3 ${
                  isMe ? "ring-1 ring-aurora/60" : ""
                }`}
              >
                <span className="w-8 shrink-0 text-center font-display text-lg">{index + 1}</span>
                {badge ? (
                  <img
                    src={badge.imageUrl}
                    alt={badge.badgeName}
                    loading="lazy"
                    className="h-6 w-6 shrink-0 object-contain drop-shadow"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {row.trainer_name}
                    {isMe ? <span className="ml-2 text-xs text-aurora">to Ty</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{active.sub(row)}</p>
                </div>
                <span className="shrink-0 text-right text-sm font-semibold">{active.main(row)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </GamePage>
  );
}
