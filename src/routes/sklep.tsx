import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";

import { GamePage } from "@/components/game/GamePage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GameCheckout } from "@/components/game/GameCheckout";
import { useTrainerData } from "@/hooks/useTrainerData";
import { BALLS, HEAL_ITEMS, RAZZ, SHOP_PACKAGES } from "@/lib/items";
import { MASTER_BALL_CC, MASTER_BALL_COOLDOWN_MS, buyItem } from "@/lib/items.functions";
import { TRAVEL_TICKET_PRICE } from "@/lib/travel";
import { formatDuration } from "@/lib/time";
import { itemSprite } from "@/lib/pokedex";

export const Route = createFileRoute("/sklep")({
  head: () => ({
    meta: [
      { title: "Sklep — Catch Zone" },
      {
        name: "description",
        content:
          "Kup Balle i Razz Berry za Catch Coins albo pakiety Energii i Master Balla za złotówki.",
      },
      { property: "og:title", content: "Sklep — Catch Zone" },
      {
        property: "og:description",
        content: "Pakiety Energii, Master Ball i przedmioty do łapania Pokémonów.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SklepPage,
});

function SklepPage() {
  const { data, isLoading, setData } = useTrainerData();
  const buy = useServerFn(buyItem);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [checkout, setCheckout] = useState<{ priceId: string; name: string } | null>(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  const purchase = async (kind: string, amount: number, label: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await buy({ data: { kind, amount } });
      if (result.ok === false) toast.error(result.reason);
      else toast.success(`Kupiono ${amount}× ${label} za ${result.cost} CC.`);
      window.setTimeout(() => void reload(), 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się kupić.");
    } finally {
      setBusy(false);
    }
  };

  const reload = async () => {
    const { getTrainerData } = await import("@/lib/trainer.functions");
    const fresh = await getTrainerData();
    setData(fresh);
  };

  const profile = data?.profile;

  return (
    <GamePage
      title="Sklep"
      subtitle="Za Catch Coins kupisz Balle i Razz Berry. Pakiety w złotówkach dają Energię i Master Balla."
    >
      {isLoading || !profile ? (
        <p className="text-sm text-muted-foreground">Wczytuję sklep…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl">Za Catch Coins</h2>
              <p className="text-sm text-muted-foreground">
                Masz {profile.catch_coins} Catch Coins
              </p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BALLS.filter((ball) => ball.price !== null).map((ball) => (
                <div key={ball.key} className="glass-panel rounded-2xl p-5">
                  <ShopIcon sprite={ball.sprite} label={ball.label} />
                  <p className="mt-3 font-display text-xl">{ball.label}</p>
                  <p className="text-xs text-muted-foreground">{ball.note}</p>
                  <p className="mt-2 text-sm">
                    Masz: {(profile as any)[ball.field] ?? 0} · {ball.price} CC / szt.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[1, 5, 10].map((amount) => (
                      <Button
                        key={amount}
                        size="sm"
                        variant={amount === 1 ? "default" : "outline"}
                        disabled={busy || profile.catch_coins < amount * (ball.price ?? 0)}
                        onClick={() => void purchase(ball.key, amount, ball.label)}
                      >
                        +{amount} · {amount * (ball.price ?? 0)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="glass-panel rounded-2xl p-5">
                <ShopIcon sprite={RAZZ.sprite} label={RAZZ.label} />
                <p className="mt-3 font-display text-xl">{RAZZ.label}</p>
                <p className="text-xs text-muted-foreground">{RAZZ.note}</p>
                <p className="mt-2 text-sm">
                  Masz: {profile.razz_berries} · {RAZZ.price} CC / szt.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[1, 5, 10].map((amount) => (
                    <Button
                      key={amount}
                      size="sm"
                      variant={amount === 1 ? "default" : "outline"}
                      disabled={busy || profile.catch_coins < amount * RAZZ.price}
                      onClick={() => void purchase("razz", amount, RAZZ.label)}
                    >
                      +{amount} · {amount * RAZZ.price}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="glass-panel rounded-2xl p-5">
                <ShopIcon sprite="ss-ticket" label="Bilet Podróży" />
                <p className="mt-3 font-display text-xl">Bilet Podróży</p>
                <p className="text-xs text-muted-foreground">Jednorazowy bilet na lot w otwartym oknie regionu.</p>
                <p className="mt-2 text-sm">Masz: {profile.travel_tickets} · {TRAVEL_TICKET_PRICE} CC</p>
                <Button className="mt-3" size="sm" disabled={busy || profile.catch_coins < TRAVEL_TICKET_PRICE} onClick={() => void purchase("travel_ticket", 1, "Bilet Podróży")}>Kup bilet</Button>
              </div>

              {HEAL_ITEMS.map((item) => (
                <div key={item.key} className="glass-panel rounded-2xl p-5">
                  <ShopIcon sprite={item.sprite} label={item.label} />
                  <p className="mt-3 font-display text-xl">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.note}</p>
                  <p className="mt-2 text-sm">
                    Masz: {(profile as any)[item.field] ?? 0} · {item.price} CC / szt.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[1, 5, 10].map((amount) => (
                      <Button
                        key={amount}
                        size="sm"
                        variant={amount === 1 ? "default" : "outline"}
                        disabled={busy || profile.catch_coins < amount * item.price}
                        onClick={() => void purchase(item.key, amount, item.label)}
                      >
                        +{amount} · {amount * item.price}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="glass-panel rounded-2xl p-5">
                <ShopIcon sprite="master-ball" label="Master Ball" />
                <p className="mt-3 font-display text-xl">Master Ball</p>
                <p className="text-xs text-muted-foreground">
                  Łapie zawsze. Za monety kosztuje bardzo dużo — taniej w pakiecie PLN.
                </p>
                <p className="mt-2 text-sm">
                  Masz: {profile.master_balls} · {MASTER_BALL_CC} CC / szt.
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  disabled={busy || profile.catch_coins < MASTER_BALL_CC || Boolean(profile.master_ball_bought_at && new Date(profile.master_ball_bought_at).getTime() + MASTER_BALL_COOLDOWN_MS > now)}
                  onClick={() => void purchase("master", 1, "Master Ball")}
                >
                  Kup za {MASTER_BALL_CC} CC
                </Button>
                {profile.master_ball_bought_at && new Date(profile.master_ball_bought_at).getTime() + MASTER_BALL_COOLDOWN_MS > now ? <p className="mt-2 text-xs text-muted-foreground">Kolejny zakup za {formatDuration(new Date(profile.master_ball_bought_at).getTime() + MASTER_BALL_COOLDOWN_MS - now)}</p> : null}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">Pakiety w złotówkach</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Płatności prawdziwymi pieniędzmi są teraz wyłączone — pakiety poniżej to zapowiedź.
              Wszystko potrzebne do gry kupisz za Catch Coins.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {SHOP_PACKAGES.map((pack) => (
                <div key={pack.id} className="glass-panel rounded-2xl p-5 opacity-60">
                  <ShopIcon sprite={pack.sprite} label={pack.name} />
                  <p className="mt-3 font-display text-xl">{pack.name}</p>
                  <p className="text-xs text-muted-foreground">{pack.description}</p>
                  <p className="mt-2 text-sm text-aurora">{pack.grants}</p>
                  <p className="mt-2 font-display text-2xl">
                    {pack.pricePln.toFixed(2).replace(".", ",")} zł
                  </p>
                  <Button className="mt-3" size="sm" variant="outline" disabled>
                    Wkrótce
                  </Button>
                </div>
              ))}
            </div>
          </section>
          <Dialog open={Boolean(checkout)} onOpenChange={(open) => { if (!open) setCheckout(null); }}>
            <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
              <DialogHeader><DialogTitle>{checkout?.name}</DialogTitle><DialogDescription>Dokończ płatność w bezpiecznym formularzu.</DialogDescription></DialogHeader>
              {checkout ? <GameCheckout priceId={checkout.priceId} /> : null}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </GamePage>
  );
}

function ShopIcon({ sprite, label }: { sprite: string; label: string }) {
  return (
    <img
      src={itemSprite(sprite)}
      alt={label}
      loading="lazy"
      width={40}
      height={40}
      className="h-10 w-10 [image-rendering:pixelated]"
    />
  );
}
