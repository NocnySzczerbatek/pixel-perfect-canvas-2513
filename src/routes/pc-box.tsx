import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { PokemonCard } from "@/components/game/PokemonCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrainerData } from "@/hooks/useTrainerData";
import { ivPercent } from "@/lib/iv";
import { npcPrice, sellToNpc } from "@/lib/gts.functions";
import { releasePokemon, setInParty } from "@/lib/trainer.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/pc-box")({
  head: () => ({
    meta: [
      { title: "PC Box — Catch Zone" },
      {
        name: "description",
        content: "Wszystkie złapane Pokémony poza drużyną. Wymieniaj skład i porządkuj kolekcję.",
      },
      { property: "og:title", content: "PC Box — Catch Zone" },
      {
        property: "og:description",
        content: "Wszystkie złapane Pokémony poza drużyną. Wymieniaj skład i porządkuj kolekcję.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PcBoxPage,
});

function PcBoxPage() {
  const { data, isLoading, setData, refetch } = useTrainerData();
  const move = useServerFn(setInParty);
  const release = useServerFn(releasePokemon);
  const sell = useServerFn(sellToNpc);
  const [sellId, setSellId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [quality, setQuality] = useState<"all" | "50" | "75" | "90" | "100" | "shiny">("all");
  const [sort, setSort] = useState<"recent" | "iv" | "level" | "name">("recent");

  const all = (data?.pokemon ?? []).filter((p) => !p.in_party);
  const needle = search.trim().toLowerCase();
  const stored = all
    .filter((p) => {
      const iv = ivPercent(p);
      if (quality === "shiny") return p.is_shiny;
      if (quality !== "all" && iv < Number(quality)) return false;
      return true;
    })
    .filter((p) =>
      needle
        ? (p.nickname ?? "").toLowerCase().includes(needle) ||
          p.species_name.toLowerCase().includes(needle)
        : true,
    )
    .sort((a, b) => {
      if (sort === "iv") return ivPercent(b) - ivPercent(a);
      if (sort === "level") return b.level - a.level;
      if (sort === "name") return (a.nickname ?? a.species_name).localeCompare(b.nickname ?? b.species_name, "pl");
      return 0;
    });
  const partyCount = (data?.pokemon ?? []).filter((p) => p.in_party).length;

  const sellTarget = (data?.pokemon ?? []).find((p) => p.id === sellId) ?? null;
  const sellOffer = sellTarget ? npcPrice(sellTarget) : 0;

  /** Sprzedaż Hodowcy: gotówka od razu, Pokémon opuszcza kolekcję. */
  const confirmSell = async () => {
    if (!sellTarget) return;
    setBusy(true);
    try {
      const result = await sell({ data: { pokemonId: sellTarget.id } });
      if (result?.ok === false) toast.error(result.reason);
      else {
        toast.success(`Hodowca zapłacił ${sellOffer} CC za ${sellTarget.nickname ?? sellTarget.species_name}.`);
        await refetch();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sprzedaż się nie udała.");
    } finally {
      setBusy(false);
      setSellId(null);
    }
  };

  const run = async (action: () => Promise<any>, success: string) => {
    setBusy(true);
    try {
      const result = await action();
      if (result?.data) setData(result.data);
      if (result?.ok === false) toast.error(result.reason);
      else toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coś poszło nie tak.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePage
      title="PC Box"
      subtitle="Twoja kolekcja poza drużyną. Możesz zamienić skład albo sprzedać Pokémona Hodowcy."
    >
      <p className="text-sm text-muted-foreground">
        W boxie: {all.length} · pokazane: {stored.length} · w drużynie: {partyCount}/6
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Szukaj po nazwie"
          className="h-9 w-full sm:w-56"
        />
        <select
          value={quality}
          onChange={(event) => setQuality(event.target.value as typeof quality)}
          className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm"
          aria-label="Filtr jakości IV"
        >
          <option value="all">Wszystkie IV</option>
          <option value="50">IV od 50% (Dobry)</option>
          <option value="75">IV od 75% (Bardzo dobry)</option>
          <option value="90">IV od 90% (Doskonały)</option>
          <option value="100">Tylko Hundo 100%</option>
          <option value="shiny">Tylko Shiny</option>
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm"
          aria-label="Sortowanie kolekcji"
        >
          <option value="recent">Sortuj: najnowsze</option>
          <option value="iv">Sortuj: najlepsze IV</option>
          <option value="level">Sortuj: poziom</option>
          <option value="name">Sortuj: nazwa</option>
        </select>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Wczytuję kolekcję…</p>
      ) : stored.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {all.length === 0
            ? "PC Box jest pusty — wszyscy Twoi Pokémoni są w drużynie."
            : "Żaden Pokémon nie pasuje do wybranych filtrów."}
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stored.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon}>
              <Button
                size="sm"
                disabled={busy || partyCount >= 6}
                onClick={() =>
                  void run(
                    () => move({ data: { id: pokemon.id, inParty: true } }),
                    "Pokémon dołączył do drużyny.",
                  )
                }
              >
                Do drużyny
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy || pokemon.is_starter}
                onClick={() => setSellId(pokemon.id)}
              >
                Sprzedaj Hodowcy
              </Button>
            </PokemonCard>
          ))}
        </div>
      )}
      <AlertDialog open={Boolean(sellId)} onOpenChange={(open) => !open && setSellId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oferta Hodowcy</AlertDialogTitle>
            <AlertDialogDescription>
              Hodowca kupi {sellTarget?.nickname ?? sellTarget?.species_name} (Lvl {sellTarget?.level}) za{" "}
              <strong>{sellOffer} CC</strong>. Pokémon na zawsze opuści Twoją kolekcję.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Anuluj</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void confirmSell(); }}>
              Sprzedaj za {sellOffer} CC
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GamePage>
  );
}
