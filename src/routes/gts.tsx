import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { artworkUrl } from "@/lib/game-data";
import {
  buyListing,
  cancelListing,
  createListing,
  getGtsState,
  sellToNpc,
  type GtsState,
} from "@/lib/gts.functions";

export const Route = createFileRoute("/gts")({
  head: () => ({
    meta: [
      { title: "GTS i NPC-Kupiec — Catch Zone" },
      {
        name: "description",
        content:
          "Giełda Pokémonów Catch Zone: wystawiaj i kupuj okazy za Catch Coins a szybką sprzedaż Hodowcy znajdziesz w PC Boxie.",
      },
      { property: "og:title", content: "GTS i NPC-Kupiec — Catch Zone" },
      {
        property: "og:description",
        content: "Handluj Pokémonami z innymi trenerami — prowizja giełdy to 5%.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GtsPage,
});

function GtsPage() {
  const fetchState = useServerFn(getGtsState);
  const listFn = useServerFn(createListing);
  const cancelFn = useServerFn(cancelListing);
  const buyFn = useServerFn(buyListing);

  const [state, setState] = useState<GtsState | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [price, setPrice] = useState<string>("");

  const { isLoading } = useQuery({
    queryKey: ["gts"],
    queryFn: async () => {
      const result = await fetchState();
      setState(result);
      return result;
    },
  });

  const run = async (action: () => Promise<any>, success: (result: any) => string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await action();
      if (result?.state) setState(result.state);
      if (result?.ok === false) toast.error(result.reason);
      else toast.success(success(result));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coś poszło nie tak.");
    } finally {
      setBusy(false);
    }
  };

  const mon = state?.sellable.find((row) => row.id === selected) ?? null;

  return (
    <GamePage
      title="GTS i NPC-Kupiec"
      subtitle="Wystaw Pokémona innym trenerom (giełda pobiera 5% prowizji) a szybką sprzedaż Hodowcy znajdziesz w PC Boxie."
    >
      {isLoading || !state ? (
        <p className="text-sm text-muted-foreground">Wczytuję giełdę…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <h2 className="font-display text-2xl">Oferty innych trenerów</h2>
            {state.listings.length === 0 ? (
              <p className="glass-panel rounded-2xl p-5 text-sm text-muted-foreground">
                Nikt nic teraz nie sprzedaje. Wystaw pierwszą ofertę!
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {state.listings.map((listing) => (
                  <div key={listing.id} className="glass-panel rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={artworkUrl(listing.species_id)}
                        alt={listing.species_name}
                        loading="lazy"
                        width={72}
                        height={72}
                        className="h-16 w-16 object-contain"
                      />
                      <div>
                        <p className="font-display text-lg">{listing.species_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Lvl {listing.level} · {listing.species_type ?? "?"} ·{" "}
                          {listing.seller_name}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 font-display text-xl text-aurora">{listing.price} CC</p>
                    <Button
                      className="mt-3"
                      size="sm"
                      disabled={busy || state.catch_coins < listing.price}
                      onClick={() =>
                        void run(
                          () => buyFn({ data: { listingId: listing.id } }),
                          (r) => `Kupiono ${r.name} za ${r.price} CC.`,
                        )
                      }
                    >
                      Kup
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <h2 className="font-display text-2xl">Moje oferty</h2>
            {state.my_listings.length === 0 ? (
              <p className="glass-panel rounded-2xl p-5 text-sm text-muted-foreground">
                Nie masz aktywnych ofert.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {state.my_listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="glass-panel flex items-center justify-between rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={artworkUrl(listing.species_id)}
                        alt={listing.species_name}
                        loading="lazy"
                        width={48}
                        height={48}
                        className="h-12 w-12 object-contain"
                      />
                      <div>
                        <p className="text-sm">{listing.species_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Lvl {listing.level} · {listing.price} CC
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => cancelFn({ data: { listingId: listing.id } }),
                          () => "Oferta wycofana.",
                        )
                      }
                    >
                      Wycofaj
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Catch Coins
              </p>
              <p className="font-display text-3xl">{state.catch_coins}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prowizja giełdy: {state.fee_percent}% od ceny sprzedaży.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-5">
              <p className="font-display text-xl">Wystaw Pokémona</p>
              {state.sellable.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nie masz Pokémonów do sprzedaży (startera nie można sprzedać).
                </p>
              ) : (
                <>
                  <select
                    value={selected}
                    onChange={(event) => {
                      setSelected(event.target.value);
                      const next = state.sellable.find((row) => row.id === event.target.value);
                      setPrice(next ? String(next.suggested) : "");
                    }}
                    className="mt-3 w-full rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
                  >
                    <option value="">— wybierz Pokémona —</option>
                    {state.sellable.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="mt-3"
                    type="number"
                    min={state.min_price}
                    value={price}
                    placeholder={`Cena w CC (min. ${state.min_price})`}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                  {mon ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Sugerowana cena: {mon.suggested} CC.
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy || !mon || Number(price) < state.min_price}
                      onClick={() =>
                        void run(
                          () =>
                            listFn({ data: { pokemonId: selected, price: Number(price) } }),
                          () => "Oferta wystawiona na giełdzie.",
                        )
                      }
                    >
                      Wystaw na GTS
                    </Button>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </GamePage>
  );
}
