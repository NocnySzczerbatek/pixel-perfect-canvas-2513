import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

export type TourStep = {
  /** Wartość atrybutu data-tour elementu do podświetlenia. */
  target?: string;
  title: string;
  body: string;
};

type Rect = { top: number; left: number; width: number; height: number };

function readRect(target: string | undefined): Rect | null {
  if (!target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function GuidedTour({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[Math.min(index, steps.length - 1)];

  useEffect(() => {
    if (!open) setIndex(0);
  }, [open]);

  const sync = useCallback(() => {
    setRect(readRect(step?.target));
  }, [step?.target]);

  useEffect(() => {
    if (!open || !step) return;
    const el = step.target
      ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      : null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    sync();
    const timer = window.setTimeout(sync, 450);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [open, step, sync]);

  const cardStyle = useMemo(() => {
    if (!rect) return undefined;
    const below = rect.top + rect.height + 16;
    const spaceBelow = window.innerHeight - below;
    if (spaceBelow > 220) return { top: below };
    return { top: Math.max(16, rect.top - 236) };
  }, [rect]);

  if (!open || !step) return null;

  const isLast = index >= steps.length - 1;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Samouczek">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_hsl(var(--background)/0.82)] transition-all duration-300"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      ) : null}
      <div
        className="glass-panel absolute left-1/2 w-[min(92vw,32rem)] -translate-x-1/2 rounded-2xl p-6"
        style={cardStyle ?? { top: "50%", transform: "translate(-50%, -50%)" }}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-primary">
          Samouczek {index + 1}/{steps.length}
        </p>
        <h2 className="mt-2 font-display text-2xl">{step.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Pomiń
          </Button>
          <div className="flex gap-2">
            {index > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setIndex((i) => i - 1)}>
                Wstecz
              </Button>
            ) : null}
            <Button size="sm" onClick={() => (isLast ? onClose() : setIndex((i) => i + 1))}>
              {isLast ? "Zaczynam grać" : "Dalej"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
