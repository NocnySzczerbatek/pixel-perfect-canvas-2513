import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { PokemonCard } from "@/components/game/PokemonCard";
import { Button } from "@/components/ui/button";
import { useTrainerData } from "@/hooks/useTrainerData";
import { releasePokemon, setInParty } from "@/lib/trainer.functions";

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
  const { data, isLoading, setData } = useTrainerData();
  const move = useServerFn(setInParty);
  const release = useServerFn(releasePokemon);
  const [busy, setBusy] = useState(false);

  const stored = (data?.pokemon ?? []).filter((p) => !p.in_party);
  const partyCount = (data?.pokemon ?? []).filter((p) => p.in_party).length;

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
      subtitle="Twoja kolekcja poza drużyną. Możesz zamienić skład albo wypuścić Pokémona."
    >
      <p className="text-sm text-muted-foreground">
        W boxie: {stored.length} · w drużynie: {partyCount}/6
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Wczytuję kolekcję…</p>
      ) : stored.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          PC Box jest pusty — wszyscy Twoi Pokémoni są w drużynie.
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
                onClick={() =>
                  void run(() => release({ data: { id: pokemon.id } }), "Pokémon wypuszczony.")
                }
              >
                Wypuść
              </Button>
            </PokemonCard>
          ))}
        </div>
      )}
    </GamePage>
  );
}
