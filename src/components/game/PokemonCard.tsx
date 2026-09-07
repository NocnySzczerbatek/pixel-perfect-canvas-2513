import type { ReactNode } from "react";

import { artworkUrl } from "@/lib/game-data";
import type { PokemonRow } from "@/lib/trainer.functions";

export function PokemonCard({
  pokemon,
  children,
}: {
  pokemon: PokemonRow;
  children?: ReactNode;
}) {
  const hpPercent = Math.max(
    0,
    Math.min(100, Math.round((pokemon.hp_current / Math.max(1, pokemon.hp_max)) * 100)),
  );
  return (
    <article className="glass-panel rounded-2xl p-5 text-center">
      <img
        src={artworkUrl(pokemon.species_id)}
        alt={pokemon.nickname ?? pokemon.species_name}
        loading="lazy"
        width={220}
        height={220}
        className="mx-auto h-28 w-28 object-contain"
      />
      <p className="mt-2 font-display text-2xl">{pokemon.nickname ?? pokemon.species_name}</p>
      {pokemon.nickname ? (
        <p className="text-xs text-muted-foreground">{pokemon.species_name}</p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        Lvl {pokemon.level}
        {pokemon.is_starter ? " · Starter" : ""}
        {pokemon.fainted ? " · Zemdlony" : ""}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[hsl(var(--ice))] transition-all"
          style={{ width: `${hpPercent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        HP {pokemon.hp_current}/{pokemon.hp_max}
      </p>
      {children ? <div className="mt-4 flex flex-col gap-2">{children}</div> : null}
    </article>
  );
}
