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

function RankingCard({
  entry,
  rows,
  me,
}: {
  entry: (typeof BOARDS)[number];
  rows: RankingRow[];
  me: string | null | undefined;
}) {
  const Icon = entry.icon;
  return (
    <section className="glass-panel rounded-2xl p-3 sm:p-4">
      <h2 className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-between">
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-aurora" aria-hidden />
          <span className="truncate font-display text-lg">{entry.label}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">TOP 10</span>
      </h2>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nikt jeszcze nie zdobył punktów. Ruszaj na eksplorację!
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {rows.map((row, index) => {
            const badge = row.featured_badge ? badgeByKey(row.featured_badge) : null;
            const isMe = row.id === me;
            return (
              <li
                key={row.id}
                className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-xl bg-secondary/40 px-3 py-2 ${
                  isMe ? "ring-1 ring-aurora/60" : ""
                }`}
              >
                <span className="w-7 shrink-0 text-center font-display text-base tabular-nums">
                  {index + 1}
                </span>
                <div className="flex min-w-0 items-center gap-2">
                  {badge ? (
                    <img
                      src={badge.imageUrl}
                      alt={badge.badgeName}
                      loading="lazy"
                      className="h-5 w-5 shrink-0 object-contain drop-shadow"
                    />
                  ) : null}
                  <p className="truncate text-sm font-semibold">
                    {row.trainer_name}
                    {isMe ? <span className="ml-2 text-xs text-aurora">to Ty</span> : null}
                  </p>
                </div>
                <span className="col-start-2 flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span className="font-semibold text-foreground">{entry.main(row)}</span>
                  <span className="text-muted-foreground">{entry.sub(row)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function RankingPage() {
  const fetchRanking = useServerFn(getRanking);
  const [board, setBoard] = useState<RankingBoard>("level");
  const { data, isLoading } = useQuery({
    queryKey: ["ranking"],
    queryFn: () => fetchRanking(),
  });

  const active = BOARDS.find((entry) => entry.key === board)!;

  return (
    <GamePage
      title="Ranking"
      subtitle="Zestawienia TOP 10 — poziom, kolekcja, monety i PvP."
    >
      {/* Telefon: karty z przełącznikiem. */}
      <div className="lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          {BOARDS.map((entry) => {
            const Icon = entry.icon;
            return (
              <Button
                key={entry.key}
                variant={entry.key === board ? "default" : "outline"}
                className="justify-center gap-2"
                onClick={() => setBoard(entry.key)}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{entry.label}</span>
              </Button>
            );
          })}
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Wczytuję zestawienie…</p>
        ) : (
          <div className="mt-4">
            <RankingCard entry={active} rows={data?.boards?.[active.key] ?? []} me={data?.me} />
          </div>
        )}
      </div>

      {/* Komputer: wszystkie zestawienia obok siebie w kolumnach. */}
      <div className="hidden lg:block">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Wczytuję zestawienia…</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {BOARDS.map((entry) => (
              <RankingCard
                key={entry.key}
                entry={entry}
                rows={data?.boards?.[entry.key] ?? []}
                me={data?.me}
              />
            ))}
          </div>
        )}
      </div>
    </GamePage>
  );
}

