import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ExpBar } from "@/components/game/ExpBar";
import { TypeBadges } from "@/components/game/TypeBadges";
import { artworkUrl } from "@/lib/game-data";
import { ivPercent, ivRating } from "@/lib/iv";
import type { PokemonRow } from "@/lib/trainer.functions";

export function PokemonCard({
  pokemon,
  children,
}: {
  pokemon: PokemonRow;
  children?: ReactNode;
}) {
  const iv = ivPercent(pokemon);
  const rating = ivRating(iv);
  const hpPercent = Math.max(
    0,
    Math.min(100, Math.round((pokemon.hp_current / Math.max(1, pokemon.hp_max)) * 100)),
  );
  return (
    <article className="glass-panel relative rounded-2xl p-5 text-center">
      {pokemon.is_shiny ? (
        <span
          title="Shiny — rzadka odmiana kolorystyczna"
          className="absolute right-3 top-3 rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-300/50"
        >
          ★ Shiny
        </span>
      ) : null}
      <Link to="/pokemon/$id" params={{ id: pokemon.id }} className="block tile-hover">
        <img
          src={artworkUrl(pokemon.species_id, pokemon.is_shiny)}
          alt={pokemon.nickname ?? pokemon.species_name}
          loading="lazy"
          width={220}
          height={220}
          className="mx-auto h-28 w-28 object-contain"
        />
        <p className="mt-2 font-display text-2xl">{pokemon.nickname ?? pokemon.species_name}</p>
      </Link>
      {pokemon.nickname ? (
        <p className="text-xs text-muted-foreground">{pokemon.species_name}</p>
      ) : null}
      <TypeBadges speciesId={pokemon.species_id} className="mt-2" />
      <p className="mt-2">
        <span
          title="IV wpływa wyłącznie na statystyki — nigdy na poziom"
          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${rating.className}`}
        >
          {iv}% IV · {rating.label}
        </span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Lvl {pokemon.level}
        {pokemon.is_starter ? " · Starter" : ""}
        {pokemon.fainted ? " · Zemdlony" : ""}
      </p>
      {pokemon.nature ? (
        <p className="text-xs text-muted-foreground">
          Natura {pokemon.nature}
          {pokemon.ability ? ` · ${pokemon.ability}` : ""}
        </p>
      ) : null}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-ice transition-all"
          style={{ width: `${hpPercent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        HP {pokemon.hp_current}/{pokemon.hp_max}
      </p>
      <ExpBar
        speciesId={pokemon.species_id}
        level={pokemon.level}
        exp={pokemon.exp}
        className="mt-2 text-left"
      />
      <Link
        to="/pokemon/$id"
        params={{ id: pokemon.id }}
        className="mt-3 inline-block text-xs font-medium text-aurora underline-offset-4 hover:underline"
      >
        Szczegóły i trening
      </Link>
      {children ? <div className="mt-4 flex flex-col gap-2">{children}</div> : null}
    </article>
  );
}
