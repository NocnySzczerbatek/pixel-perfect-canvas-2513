import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { HeartPulse, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { useTrainerData } from "@/hooks/useTrainerData";
import { artworkUrl } from "@/lib/game-data";
import { healParty, healPokemon } from "@/lib/trainer.functions";

export const Route = createFileRoute("/centrum")({
  head: () => ({
    meta: [
      { title: "Centrum Pokémon — Siostra Joy" },
      {
        name: "description",
        content:
          "Siostra Joy leczy całą drużynę albo jednego Pokémona. Leczenie jest darmowe i bez limitu.",
      },
      { property: "og:title", content: "Centrum Pokémon — Siostra Joy" },
      {
        property: "og:description",
        content: "Darmowe leczenie drużyny i pojedynczych Pokémonów bez limitu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CentrumPage,
});

function CentrumPage() {
  const { data, isLoading, setData } = useTrainerData();
  const healAll = useServerFn(healParty);
  const healOne = useServerFn(healPokemon);
  const [busy, setBusy] = useState(false);

  const party = (data?.pokemon ?? []).filter((p) => p.in_party);
  const needsHeal = party.some((p) => p.fainted || p.hp_current < p.hp_max);

  const run = async (action: () => Promise<any>, success?: string) => {
    setBusy(true);
    try {
      const result = await action();
      if (result?.data) setData(result.data);
      if (result?.ok === false) toast.error(result.reason);
      else if (success) toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coś poszło nie tak.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GamePage
      title="Centrum Pokémon"
      subtitle="Siostra Joy: „Zajmę się Twoimi Pokémonami!” Leczenie jest darmowe i bez limitu."
    >
      <div className="glass-panel flex flex-wrap items-center gap-4 rounded-2xl p-5">
        <div>
          <p className="font-display text-2xl">Siostra Joy</p>
          <p className="text-sm text-muted-foreground">
            {needsHeal
              ? "Ktoś z drużyny potrzebuje opieki."
              : "Cała drużyna jest w pełni sił."}
          </p>
        </div>
        <Button
          className="ml-auto"
          disabled={busy || !needsHeal}
          onClick={() => void run(() => healAll(), "Cała drużyna wyleczona.")}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <HeartPulse className="h-4 w-4" aria-hidden />
          )}
          Wylecz całą drużynę
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Wczytuję drużynę…</p>
      ) : party.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Drużyna jest pusta — wybierz Pokémony w PC Boxie.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {party.map((pokemon) => {
            const pct = Math.max(
              0,
              Math.min(100, Math.round((pokemon.hp_current / Math.max(1, pokemon.hp_max)) * 100)),
            );
            const hurt = pokemon.fainted || pokemon.hp_current < pokemon.hp_max;
            return (
              <li key={pokemon.id} className="glass-panel flex items-center gap-3 rounded-2xl p-4">
                <img
                  src={artworkUrl(pokemon.species_id, pokemon.is_shiny)}
                  alt={pokemon.nickname ?? pokemon.species_name}
                  loading="lazy"
                  width={96}
                  height={96}
                  className={`h-16 w-16 object-contain ${pokemon.fainted ? "opacity-40 grayscale" : ""}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{pokemon.nickname ?? pokemon.species_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Lvl {pokemon.level} · {pokemon.hp_current}/{pokemon.hp_max} HP
                    {pokemon.fainted ? " · Zemdlony" : ""}
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${pct > 50 ? "bg-aurora" : pct > 20 ? "bg-primary" : "bg-destructive"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !hurt}
                  onClick={() =>
                    void run(
                      () => healOne({ data: { id: pokemon.id } }),
                      `${pokemon.nickname ?? pokemon.species_name} wyleczony.`,
                    )
                  }
                >
                  Wylecz
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </GamePage>
  );
}
