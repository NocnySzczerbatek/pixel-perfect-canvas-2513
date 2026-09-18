import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useSession } from "@/hooks/useSession";
import { getPlayerStatistics } from "@/lib/statistics.functions";
import { warsawClock } from "@/lib/time";

export const Route = createFileRoute("/statystyki")({
  head: () => ({ meta: [
    { title: "Statystyki gracza — Catch Zone" },
    { name: "description", content: "Twój postęp, wykresy aktywności oraz historia walk i złapanych Pokémonów w Catch Zone." },
    { property: "og:title", content: "Statystyki gracza — Catch Zone" },
    { property: "og:description", content: "Historia łapań, wyniki walk i aktywność Twojego trenera." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: StatisticsPage,
});
const fmt = new Intl.NumberFormat("pl-PL");
const when = (date: string) => new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Warsaw" }).format(new Date(date));

function StatisticsPage() {
  const { userId, loading } = useSession();
  const fetchStats = useServerFn(getPlayerStatistics);
  const query = useQuery({ queryKey: ["player-statistics", userId], queryFn: () => fetchStats(), enabled: !!userId, staleTime: 0 });
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState("caught");
  const [limit, setLimit] = useState(20);
  const data = query.data;
  const content = () => {
    if (loading) return <p>Wczytywanie…</p>;
    if (!userId) return <p>Zaloguj się, aby zobaczyć swoje statystyki. <Link to="/" className="text-primary underline">Przejdź do logowania</Link></p>;
    if (query.isError) return <div role="alert"><p>Nie udało się wczytać statystyk.</p><Button onClick={() => query.refetch()}>Spróbuj ponownie</Button></div>;
    if (!data) return <p>Wczytuję statystyki…</p>;
    const end = new Date(data.now);
    const buckets = Array.from({ length: days }, (_, i) => {
      const date = new Date(end.getTime() - (days - 1 - i) * 86400000);
      const key = warsawClock(date).dateKey;
      return { key, day: `${key.slice(8)}.${key.slice(5, 7)}`, caught: 0, battles: 0 };
    });
    const keys = new Set(buckets.map(b => b.key));
    const inRange = (date: string) => keys.has(warsawClock(new Date(date)).dateKey);
    const encounters = data.encounters.filter(e => inRange(e.created_at));
    const caught = encounters.filter(e => e.status === "caught");
    const battles = [
      ...encounters.filter(e => (e.kind === "bot" && ["resolved", "lost"].includes(e.status)) || (e.kind === "wild" && (e.hp_current === 0 || e.status === "lost"))).map(e => ({ id: `e-${e.id}`, date: e.created_at, name: e.kind === "bot" ? "Trener w eksploracji" : e.species_name ?? "Dziki Pokémon", mode: "Eksploracja", won: e.status !== "lost", reward: "", log: [] as string[] })),
      ...data.trainers.filter(e => inRange(e.created_at)).map(e => ({ id: `t-${e.id}`, date: e.created_at, name: e.opponent, mode: "Trenerzy", won: e.won, reward: `${e.reward_exp} EXP · ${e.reward_coins} CC`, log: Array.isArray(e.log) ? e.log.filter((line): line is string => typeof line === "string") : [] })),
      ...data.pvp.filter(e => inRange(e.created_at)).map(e => ({ id: `p-${e.id}`, date: e.created_at, name: "Pojedynek PvP", mode: "PvP", won: e.won, reward: `${e.coins > 0 ? "+" : ""}${e.coins} CC`, log: [] as string[] })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    for (const row of caught) { const bucket = buckets.find(b => b.key === warsawClock(new Date(row.created_at)).dateKey); if (bucket) bucket.caught++; }
    for (const row of battles) { const bucket = buckets.find(b => b.key === warsawClock(new Date(row.date)).dateKey); if (bucket) bucket.battles++; }
    const wild = encounters.filter(e => e.kind === "wild" && e.status !== "active");
    const wins = battles.filter(b => b.won).length;
    const captures = [...caught].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const total = tab === "caught" ? captures.length : battles.length;
    return <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Poziom trenera", data.profile.trainer_level], ["EXP na poziomie", data.profile.trainer_exp], ["Saldo CC", data.profile.catch_coins], ["Złapane w okresie", caught.length]].map(([label, value]) => <div key={label} className="glass-panel rounded-lg p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-display text-3xl">{fmt.format(Number(value))}</p></div>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl">Aktywność gracza</h2><Tabs value={String(days)} onValueChange={v => { setDays(Number(v)); setLimit(20); }}><TabsList>{[7, 30, 90].map(d => <TabsTrigger key={d} value={String(d)}>{d} dni</TabsTrigger>)}</TabsList></Tabs></div>
      <p className="text-sm text-muted-foreground">Wygrane walki: {wins}/{battles.length} · Złapania wśród zakończonych dzikich spotkań: {wild.length ? Math.round(caught.length / wild.length * 100) : 0}% · Shiny: {caught.filter(e => e.is_shiny).length}</p>
      <ChartContainer className="h-64 w-full" config={{ caught: { label: "Złapane", color: "var(--chart-1)" }, battles: { label: "Walki", color: "var(--chart-2)" } }}>
        <BarChart data={buckets} accessibilityLayer><CartesianGrid vertical={false} /><XAxis dataKey="day" minTickGap={24} /><YAxis allowDecimals={false} width={30} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="caught" fill="var(--color-caught)" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Bar dataKey="battles" fill="var(--color-battles)" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground">Złapane i walki dziennie · czas polski. Historia obejmuje eksplorację, Trenerów i PvP z ostatnich 90 dni. Poziom i saldo pokazują stan obecny — wcześniejsze wartości nie były zapisywane. Udział złapań nie jest szansą pojedynczego rzutu Ballem.</p>
      <section className="space-y-4"><h2 className="font-display text-2xl">Dziennik gracza</h2><Tabs value={tab} onValueChange={v => { setTab(v); setLimit(20); }}><TabsList><TabsTrigger value="caught">Łapania ({caught.length})</TabsTrigger><TabsTrigger value="battles">Walki ({battles.length})</TabsTrigger></TabsList></Tabs>
        {!total && <p className="py-6 text-muted-foreground">Brak wpisów w wybranym okresie.</p>}
        <ul className="space-y-3">{tab === "caught" ? captures.slice(0, limit).map(e => <li key={e.id} className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-lg p-4"><div><p className="font-display text-xl">{e.species_name}{e.is_shiny ? " · Shiny" : ""}</p><p className="text-sm text-muted-foreground">Poziom przy spotkaniu: {e.level} · {e.biome}</p></div><time className="text-xs text-muted-foreground">{when(e.updated_at)}</time></li>) : battles.slice(0, limit).map(b => <li key={b.id} className="glass-panel rounded-lg p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-display text-xl">{b.name}</p><p className={b.won ? "text-sm text-primary" : "text-sm text-destructive"}>{b.won ? "Wygrana" : "Przegrana"} · {b.mode}</p><p className="text-xs text-muted-foreground">{b.reward}</p></div><time className="text-xs text-muted-foreground">{when(b.date)}</time></div>{b.log.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">Przebieg walki</summary><ol className="mt-2 space-y-1">{b.log.map((line, i) => <li key={i}>{line}</li>)}</ol></details>}</li>)}</ul>
        {total > limit && <Button variant="outline" onClick={() => setLimit(n => n + 20)}>Pokaż kolejne</Button>}
      </section>
    </div>;
  };
  return <GamePage title="Statystyki gracza" subtitle="Postęp trenera · walki · złapane Pokémony">{content()}</GamePage>;
}
