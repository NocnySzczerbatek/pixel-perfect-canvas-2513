import { useEffect, useState } from "react";

import { FALLBACK_TRAINER_ART, trainerArt } from "@/lib/trainerArt";
import { cn } from "@/lib/utils";

type Props = {
  trainerClass?: string | null;
  alt?: string;
  className?: string;
};

export function TrainerAvatar({ trainerClass, alt, className }: Props) {
  const initial = trainerArt(trainerClass);
  const [src, setSrc] = useState(initial);

  useEffect(() => setSrc(initial), [initial]);

  return (
    <img
      src={src}
      alt={alt ?? `Portret trenera: ${trainerClass ?? "Trener"}`}
      loading="lazy"
      width={256}
      height={256}
      onError={() => setSrc(FALLBACK_TRAINER_ART)}
      className={cn("rounded-xl border border-border/60 object-cover", className)}
    />
  );
}
