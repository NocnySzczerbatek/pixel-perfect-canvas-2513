import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { artworkUrl } from "@/lib/game-data";
import { IV_LABEL, type IvKey } from "@/lib/breeding";
import {
  createEgg,
  getBreedingState,
  hatchEgg,
  type BreedingState,
} from "@/lib/breeding.functions";

export const Route = createFileRoute("/hodowla")({
  head: () => ({
    meta: [
      { title: "Hodowla Pokémonów — Catch Zone" },
      {
        name: "description",
        content:
          "Połącz dwa Pokémony w jajko, które dziedziczy najlepsze IV rodziców, i wyklu nowego podopiecznego.",
      },
      { property: "og:title", content: "Hodowla Pokémonów — Catch Zone" },
      {
        property: "og:description",
        content: "Jajka dziedziczą trzy najlepsze statystyki rodziców.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BreedingPage,
});

function BreedingPage() {
  const fetchState = useServerFn(getBreedingState);
  const create = useServerFn(createEgg);
  const hatch = useServerFn(hatchEgg);
  const [state, setState] = useState<BreedingState | null>(null);
  const [parentA, setParentA] = useState("");
  const [parentB, setParentB] = useState("");
  const [busy, setBusy] = useState(false);

  const query = useQuery({ queryKey: ["breeding"], queryFn: () => fetchState({}) });
  useEffect(() => {
    if (query.data) setState(query.data as BreedingState);
  }, [query.data]);

  async function handleCreate() {
    setBusy(true);
    try {
      const result = await create({ data: { parentA, parentB } });
      setState(result.state as BreedingState);
      if (result.ok) {
        toast.success(result.message);
        setParentA("");
        setParentB("");
      } else toast.error(result.reason);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się utworzyć jajka.");
    } finally {
      setBusy(false);
    }
  }

  async function handleHatch(eggId: string) {
    setBusy(true);
    try {
      const result = await hatch({ data: { eggId } });
      setState(result.state as BreedingState);
      if (result.ok) toast.success(result.message);
      else toast.error(result.reason);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się wykluć jajka.");
    } finally {
      setBusy(false);
    }
  }

  const parents = state?.parents ?? [];

  return (
    <GamePage
      title="Hodowla"
      subtitle={`Dwóch Pokémonów od poziomu ${state?.min_level ?? 20} tworzy jajko za ${state?.cost ?? 2500} CC. Jajko dziedziczy trzy najlepsze statystyki rodziców.`}
    >
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Ładuję hodowlę…</p>
      ) : (
        <div className="space-y-6">
          <section className="glass-panel rounded-2xl p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl">Inkubator</h2>
              <p className="text-sm text-muted-foreground">{state?.coins ?? 0} CC</p>
            </header>
            {parents.length < 2 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Potrzebujesz co najmniej dwóch Pokémonów na poziomie {state?.min_level ?? 20} lub wyżej.
              </p>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { value: parentA, set: setParentA, label: "Rodzic A" },
                    { value: parentB, set: setParentB, label: "Rodzic B" },
                  ].map((slot) => (
                    <label key={slot.label} className="text-sm">
                      <span className="block text-muted-foreground">{slot.label}</span>
                      <select
                        value={slot.value}
                        onChange={(event) => slot.set(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-border/60 bg-background/60 p-2"
                      >
                        <option value="">— wybierz —</option>
                        {parents.map((mon) => (
                          <option key={mon.id} value={mon.id}>
                            {mon.species_name} · Lvl {mon.level}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <Button
                  className="mt-4"
                  disabled={busy || !parentA || !parentB || parentA === parentB}
                  onClick={handleCreate}
                >
                  Stwórz jajko za {state?.cost ?? 2500} CC
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Czas wyklucia: {state?.hatch_minutes ?? 60} min · maks. {state?.max_eggs ?? 3} jajka naraz
                </p>
              </>
            )}
          </section>

          <section className="glass-panel rounded-2xl p-5">
            <h2 className="font-display text-2xl">Twoje jajka</h2>
            {(state?.eggs ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Brak jajek w inkubatorze.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {(state?.eggs ?? []).map((egg) => (
                  <li key={egg.id} className="rounded-xl border border-border/50 bg-background/40 p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={artworkUrl(egg.species_id)}
                        alt={egg.species_name}
                        loading="lazy"
                        width={72}
                        height={72}
                        className={`h-16 w-16 object-contain ${egg.ready ? "" : "opacity-40 grayscale"}`}
                      />
                      <div>
                        <p className="font-semibold">{egg.species_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {egg.parent_a_name} × {egg.parent_b_name} · poziom {egg.level}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {egg.ready
                            ? "Gotowe do wyklucia"
                            : `Gotowe: ${new Date(egg.ready_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Dziedziczone:{" "}
                      {egg.inherited.length > 0
                        ? egg.inherited.map((key) => IV_LABEL[key as IvKey] ?? key).join(", ")
                        : "losowo"}
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      disabled={busy || !egg.ready}
                      onClick={() => handleHatch(egg.id)}
                    >
                      {egg.ready ? "Wyklu jajko" : "Jeszcze nie gotowe"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </GamePage>
  );
}
