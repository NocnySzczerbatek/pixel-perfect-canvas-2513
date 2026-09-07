import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { HeartPulse, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { PokemonCard } from "@/components/game/PokemonCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrainerData } from "@/hooks/useTrainerData";
import { healParty, renamePokemon, setInParty } from "@/lib/trainer.functions";

export const Route = createFileRoute("/druzyna")({
  head: () => ({
    meta: [
      { title: "Drużyna — Catch Zone" },
      {
        name: "description",
        content: "Zarządzaj składem drużyny, lecz Pokémony i nadawaj im pseudonimy.",
      },
      { property: "og:title", content: "Drużyna — Catch Zone" },
      {
        property: "og:description",
        content: "Zarządzaj składem drużyny, lecz Pokémony i nadawaj im pseudonimy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DruzynaPage,
});

function DruzynaPage() {
  const { data, isLoading, setData } = useTrainerData();
  const heal = useServerFn(healParty);
  const move = useServerFn(setInParty);
  const rename = useServerFn(renamePokemon);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

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
      title="Drużyna"
      subtitle="Do sześciu Pokémonów walczy przy Tobie. Leczenie jest darmowe i bez limitu."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => void run(() => heal(), "Drużyna wyleczona.")}
          disabled={busy || !needsHeal}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <HeartPulse className="h-4 w-4" aria-hidden />
          )}
          Wylecz drużynę
        </Button>
        <p className="text-sm text-muted-foreground">
          {party.length}/6 w drużynie
          {needsHeal ? " · ktoś potrzebuje leczenia" : " · wszyscy w pełni sił"}
        </p>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Wczytuję drużynę…</p>
      ) : party.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Drużyna jest pusta — wybierz Pokémony w PC Boxie lub złap kogoś w eksploracji.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {party.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon}>
              {editing === pokemon.id ? (
                <div className="flex gap-2">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={20}
                    placeholder="Pseudonim"
                    aria-label="Pseudonim Pokémona"
                  />
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => rename({ data: { id: pokemon.id, nickname: draft } }),
                        "Zapisano pseudonim.",
                      ).then(() => setEditing(null))
                    }
                  >
                    Zapisz
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(pokemon.id);
                    setDraft(pokemon.nickname ?? "");
                  }}
                >
                  Zmień pseudonim
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => move({ data: { id: pokemon.id, inParty: false } }),
                    "Pokémon trafił do PC Boxa.",
                  )
                }
              >
                Odeślij do PC Boxa
              </Button>
            </PokemonCard>
          ))}
        </div>
      )}
    </GamePage>
  );
}
