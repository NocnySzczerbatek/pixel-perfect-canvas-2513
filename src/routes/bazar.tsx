import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { itemSprite } from "@/lib/pokedex";
import {
  buyItemListing,
  cancelItemListing,
  createItemListing,
  getMarketState,
  placeBid,
  type MarketListing,
  type MarketState,
} from "@/lib/market.functions";

export const Route = createFileRoute("/bazar")({
  head: () => ({
    meta: [
      { title: "Bazar i aukcje przedmiotów — Catch Zone" },
      {
        name: "description",
        content:
          "Wymieniaj przedmioty z innymi trenerami: bazar za stałą cenę i aukcje 24-godzinne z licytacją za Catch Coins.",
      },
      { property: "og:title", content: "Bazar i aukcje przedmiotów — Catch Zone" },
      {
        property: "og:description",
        content: "TM-y, kamienie i Przedmioty Trzymane — kup od razu albo wylicytuj w aukcji.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BazarPage,
});

type Tab = "bazaar" | "auctions" | "mine";

function timeLeft(endsAt: string | null) {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "kończy się";
  const hours = Math.floor(ms / 3600_000);
  const minutes = Math.floor((ms % 3600_000) / 60_000);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function ItemIcon({ sprite, label }: { sprite: string; label: string }) {
  return (
    <img
      src={itemSprite(sprite)}
      alt={label}
      loading="lazy"
      width={48}
      height={48}
      className="h-12 w-12 shrink-0 object-contain"
    />
  );
}

function BazarPage() {
  const fetchState = useServerFn(getMarketState);
  const createFn = useServerFn(createItemListing);
  const cancelFn = useServerFn(cancelItemListing);
  const buyFn = useServerFn(buyItemListing);
  const bidFn = useServerFn(placeBid);

  const [state, setState] = useState<MarketState | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("bazaar");
  const [itemKey, setItemKey] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [kind, setKind] = useState<"fixed" | "auction">("fixed");
  const [bids, setBids] = useState<Record<string, string>>({});

  const { isLoading } = useQuery({
    queryKey: ["market"],
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

  const selected = state?.sellable.find((row) => row.item_key === itemKey) ?? null;

  const listingCard = (listing: MarketListing) => {
    const left = timeLeft(listing.ends_at);
    const bidValue = bids[listing.id] ?? String(listing.min_bid);
    return (
      <article key={listing.id} className="glass-panel rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <ItemIcon sprite={listing.sprite} label={listing.label} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg">
              {listing.label} {listing.quantity > 1 ? `×${listing.quantity}` : ""}
            </h3>
            <p className="text-xs text-muted-foreground">{listing.note}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sprzedaje: {listing.mine ? "Ty" : listing.seller_name}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-1 text-sm">
          {listing.kind === "fixed" ? (
            <p className="tabular-nums">Cena: {listing.price} CC</p>
          ) : (
            <>
              <p className="tabular-nums">
                {listing.current_bid === null
                  ? `Cena startowa: ${listing.price} CC`
                  : `Najwyższa oferta: ${listing.current_bid} CC`}
              </p>
              <p className="text-xs text-muted-foreground">
                Ofert: {listing.bids}
                {left ? ` · zostało ${left}` : ""}
                {listing.i_lead ? " · prowadzisz" : ""}
              </p>
            </>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {listing.mine ? (
            listing.can_cancel ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () => cancelFn({ data: { listingId: listing.id } }),
                    () => "Oferta wycofana — przedmiot wrócił do plecaka.",
                  )
                }
              >
                Wycofaj ofertę
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Aukcja z ofertą — poczekaj na koniec licytacji.
              </span>
            )
          ) : listing.kind === "fixed" ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                run(
                  () => buyFn({ data: { listingId: listing.id } }),
                  (result) => `Kupiono ${result?.name ?? "przedmiot"} za ${result?.price} CC.`,
                )
              }
            >
              Kup za {listing.price} CC
            </Button>
          ) : (
            <>
              <Input
                type="number"
                inputMode="numeric"
                min={listing.min_bid}
                value={bidValue}
                aria-label={`Twoja oferta dla ${listing.label}`}
                onChange={(event) =>
                  setBids((prev) => ({ ...prev, [listing.id]: event.target.value }))
                }
                className="w-28"
              />
              <Button
                size="sm"
                disabled={busy || listing.i_lead}
                onClick={() =>
                  run(
                    () => bidFn({ data: { listingId: listing.id, amount: Number(bidValue) } }),
                    (result) => `Twoja oferta ${result?.amount} CC została przyjęta.`,
                  )
                }
              >
                Licytuj (min. {listing.min_bid} CC)
              </Button>
            </>
          )}
        </div>
      </article>
    );
  };

  const visible =
    tab === "bazaar" ? (state?.bazaar ?? []) : tab === "auctions" ? (state?.auctions ?? []) : (state?.mine ?? []);

  return (
    <GamePage
      title="Bazar i aukcje"
      subtitle="Wymieniaj przedmioty z innymi trenerami: kup od razu albo licytuj przez 24 godziny. Bazar pobiera 5% prowizji od sprzedającego."
    >
      {isLoading || !state ? (
        <p className="text-sm text-muted-foreground">Wczytuję bazar…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["bazaar", `Bazar (${state.bazaar.length})`],
                  ["auctions", `Aukcje (${state.auctions.length})`],
                  ["mine", `Moje oferty (${state.mine.length})`],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={tab === value ? "default" : "outline"}
                  onClick={() => setTab(value)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="glass-panel rounded-2xl p-5 text-sm text-muted-foreground">
                {tab === "mine"
                  ? "Nie masz aktywnych ofert. Wystaw pierwszy przedmiot z panelu obok."
                  : "Nikt nic tu teraz nie oferuje. Bądź pierwszy!"}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">{visible.map(listingCard)}</div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="glass-panel rounded-2xl p-5">
              <h2 className="font-display text-2xl">Wystaw przedmiot</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Masz {state.catch_coins} CC · aktywne oferty {state.my_active}/{state.max_active}
              </p>

              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Przedmiot z plecaka</span>
                  <select
                    value={itemKey}
                    onChange={(event) => setItemKey(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
                  >
                    <option value="">— wybierz —</option>
                    {state.sellable.map((row) => (
                      <option key={row.item_key} value={row.item_key}>
                        {row.label} (×{row.count})
                      </option>
                    ))}
                  </select>
                </label>

                {selected ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                    <ItemIcon sprite={selected.sprite} label={selected.label} />
                    <p className="text-xs text-muted-foreground">{selected.note}</p>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <label className="block flex-1 text-sm">
                    <span className="text-muted-foreground">Ilość</span>
                    <Input
                      type="number"
                      min={1}
                      max={selected?.count ?? 99}
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      className="mt-1"
                    />
                  </label>
                  <label className="block flex-1 text-sm">
                    <span className="text-muted-foreground">
                      {kind === "fixed" ? "Cena (CC)" : "Cena startowa (CC)"}
                    </span>
                    <Input
                      type="number"
                      min={state.min_price}
                      value={price}
                      placeholder={String(state.min_price)}
                      onChange={(event) => setPrice(event.target.value)}
                      className="mt-1"
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={kind === "fixed" ? "default" : "outline"}
                    onClick={() => setKind("fixed")}
                  >
                    Stała cena
                  </Button>
                  <Button
                    size="sm"
                    variant={kind === "auction" ? "default" : "outline"}
                    onClick={() => setKind("auction")}
                  >
                    Aukcja {state.auction_hours} h
                  </Button>
                </div>

                <Button
                  className="w-full"
                  disabled={busy || !itemKey || !price}
                  onClick={() =>
                    run(
                      () =>
                        createFn({
                          data: {
                            itemKey,
                            quantity: Number(quantity) || 1,
                            price: Number(price) || 0,
                            kind,
                          },
                        }),
                      () => {
                        setItemKey("");
                        setPrice("");
                        setQuantity("1");
                        return kind === "fixed"
                          ? "Przedmiot wystawiony na bazarze."
                          : "Aukcja wystartowała — trwa 24 godziny.";
                      },
                    )
                  }
                >
                  Wystaw ofertę
                </Button>

                <p className="text-xs text-muted-foreground">
                  Przedmiot schodzi z plecaka od razu po wystawieniu. Prowizja {state.fee_percent}% trafia
                  do bazaru, a przy licytacji Twoje monety są blokowane i wracają, gdy ktoś przebije ofertę.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </GamePage>
  );
}
