import { BALLS, RAZZ } from "@/lib/items";
import { itemSprite } from "@/lib/pokedex";

/** Siatka kafelków z Ballami — gracz wybiera, którym rzucić. */
export function BallPicker({
  balls,
  onThrow,
  busy,
  razzBerries = 0,
  useRazz = false,
  onToggleRazz,
}: {
  balls: Record<string, number>;
  onThrow: (ball: string) => void;
  busy?: boolean;
  razzBerries?: number;
  useRazz?: boolean;
  onToggleRazz?: (next: boolean) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Wybierz Poké Balla
        </h3>
        {onToggleRazz ? (
          <button
            type="button"
            disabled={razzBerries <= 0}
            onClick={() => onToggleRazz(!useRazz)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs disabled:opacity-40 ${
              useRazz ? "border-primary bg-primary/10" : "border-border/60"
            }`}
          >
            <img
              src={itemSprite(RAZZ.sprite)}
              alt={RAZZ.label}
              loading="lazy"
              width={20}
              height={20}
              className="h-5 w-5 [image-rendering:pixelated]"
            />
            {RAZZ.label} · Ilość: {razzBerries}
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {BALLS.map((ball) => {
          const owned = balls[ball.key] ?? 0;
          return (
            <button
              key={ball.key}
              type="button"
              disabled={busy || owned <= 0}
              onClick={() => onThrow(ball.key)}
              title={ball.note}
              className="tile-hover flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-3 text-left disabled:opacity-40 disabled:hover:transform-none"
            >
              <img
                src={itemSprite(ball.sprite)}
                alt={ball.label}
                loading="lazy"
                width={32}
                height={32}
                className="h-8 w-8 [image-rendering:pixelated]"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm">{ball.label}</span>
                <span className="block text-[11px] text-muted-foreground">Ilość: {owned}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
