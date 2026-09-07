import { useQuery } from "@tanstack/react-query";
import { Sparkles, Timer, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { getBonusState } from "@/lib/bonuses.functions";

function countdown(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function BonusPanel({ enabled }: { enabled: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data } = useQuery({
    queryKey: ["bonus-state"],
    queryFn: () => getBonusState(),
    enabled,
    refetchInterval: 60_000,
  });

  if (!data) return null;

  return (
    <section className="glass-panel mt-6 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Bonusy spotkań
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Szansa na Shiny: <span className="text-foreground">{data.shiny_chance_text}</span> · rzadkie
          spotkania ×{data.rare_multiplier.toFixed(2)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {data.buffs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Brak aktywnych bonusów czasowych — wygraj walkę w Sali, aby zdobyć +50% na 60 minut.
          </p>
        ) : (
          data.buffs.map((buff) => (
            <span
              key={buff.id}
              className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs"
              title={`${buff.source} · +${buff.shiny_bonus_pct}% Shiny`}
            >
              <Timer className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="font-medium">{buff.label}</span>
              <span className="text-primary">+{buff.shiny_bonus_pct}%</span>
              <span className="tabular-nums text-muted-foreground">
                {countdown(buff.expires_at, now)}
              </span>
            </span>
          ))
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden />
          Trwałe bonusy: +{data.permanent_shiny_pct}% (limit +{data.permanent_cap_pct}%)
        </span>
        {data.permanent.map((bonus) => (
          <span
            key={bonus.id}
            className="rounded-lg border border-border/60 bg-card/60 px-2.5 py-1 text-xs"
          >
            {bonus.label} +{bonus.shiny_bonus_pct}%
          </span>
        ))}
      </div>
    </section>
  );
}
