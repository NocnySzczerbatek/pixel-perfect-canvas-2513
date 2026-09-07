import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plane } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { REGIONS } from "@/lib/game-data";
import { flyToRegion, getTravelState } from "@/lib/travel.functions";
import { formatDuration } from "@/lib/time";
import { TRAVEL_TICKET_PRICE, travelWindowState } from "@/lib/travel";
import { itemSprite } from "@/lib/pokedex";

export const Route = createFileRoute("/podroze")({
  head: () => ({ meta: [
    { title: "Podróże między regionami — Catch Zone" },
    { name: "description", content: "Leć do otwartego regionu i czasowo odkrywaj jego Pokémony." },
    { property: "og:title", content: "Podróże — Catch Zone" },
    { property: "og:description", content: "Czasowe wyprawy do regionów Pokémon za Bilet Podróży." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: TravelPage,
});

function TravelPage() {
  const fetchState = useServerFn(getTravelState);
  const fly = useServerFn(flyToRegion);
  const [state, setState] = useState<Awaited<ReturnType<typeof getTravelState>> | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const { isLoading } = useQuery({ queryKey: ["travel"], queryFn: async () => { const result = await fetchState(); setState(result); return result; } });
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);

  const handleFly = async (region: string) => {
    setBusy(true);
    try {
      const result = await fly({ data: { region } });
      setState(result.state);
      if (!result.ok) toast.error(result.reason); else toast.success("Wystartowałeś! Eksploracja korzysta teraz z Pokémonów tego regionu.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Lot nie powiódł się."); }
    finally { setBusy(false); }
  };

  return <GamePage title="Podróże" subtitle="Loty działają w codziennych oknach według czasu polskiego. Po zamknięciu okna wracasz automatycznie.">
    {isLoading || !state ? <p className="text-sm text-muted-foreground">Sprawdzam rozkład lotów…</p> : <div className="space-y-6">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bilety Podróży</p><p className="font-display text-3xl">{state.travel_tickets}</p></div>
        <img src={itemSprite("ss-ticket")} alt="Bilet Podróży" width={48} height={48} className="h-12 w-12 [image-rendering:pixelated]" />
        <div className="text-sm text-muted-foreground"><p>Region domowy: {REGIONS.find((r) => r.slug === state.home_region)?.name ?? "—"}</p><p>Bilet w sklepie: {TRAVEL_TICKET_PRICE} CC</p></div>
      </div>
      {state.travel_region && state.travel_until ? <div className="glass-panel rounded-2xl border border-aurora/40 p-5"><p className="font-display text-2xl">Trwa wycieczka: {REGIONS.find((r) => r.slug === state.travel_region)?.name}</p><p className="text-sm text-muted-foreground">Powrót za {formatDuration(new Date(state.travel_until).getTime() - now.getTime())}</p></div> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{REGIONS.map((region) => {
        const windowState = travelWindowState(region.slug, now);
        const home = region.slug === state.home_region;
        return <article key={region.slug} className={`glass-panel rounded-2xl p-5 ${home ? "opacity-45" : ""}`}>
          <div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{region.gen}</p><h2 className="font-display text-2xl">{region.name}</h2></div><Plane className="h-6 w-6 text-muted-foreground" aria-hidden /></div>
          <p className="mt-2 text-xs text-muted-foreground">{region.tagline}</p><p className="mt-3 text-sm">Okno: {windowState?.label}</p>
          {home ? <p className="mt-4 text-sm">Region domowy</p> : windowState?.open ? <Button className="mt-4 w-full" disabled={busy || state.travel_tickets < 1} onClick={() => void handleFly(region.slug)}>Leć · koszt 1 bilet</Button> : <Button className="mt-4 w-full" disabled variant="outline">Otwarcie za {formatDuration(windowState?.msUntilOpen ?? 0)}</Button>}
        </article>;
      })}</div>
    </div>}
  </GamePage>;
}