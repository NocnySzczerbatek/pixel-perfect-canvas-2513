import { speciesTypes } from "@/lib/pokedex";

const TYPE_STYLES: Record<string, string> = {
  Ogień: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  Woda: "bg-sky-500/20 text-sky-300 border-sky-400/40",
  Trawa: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  Elektryczny: "bg-yellow-500/20 text-yellow-200 border-yellow-400/40",
  Lód: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
  Walka: "bg-red-500/20 text-red-300 border-red-400/40",
  Trucizna: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40",
  Ziemia: "bg-amber-600/20 text-amber-300 border-amber-500/40",
  Lot: "bg-indigo-400/20 text-indigo-200 border-indigo-300/40",
  Psychiczny: "bg-pink-500/20 text-pink-300 border-pink-400/40",
  Robak: "bg-lime-500/20 text-lime-300 border-lime-400/40",
  Skała: "bg-stone-500/25 text-stone-300 border-stone-400/40",
  Duch: "bg-violet-500/20 text-violet-300 border-violet-400/40",
  Smok: "bg-purple-500/20 text-purple-300 border-purple-400/40",
  Ciemność: "bg-slate-600/30 text-slate-300 border-slate-400/40",
  Stal: "bg-zinc-400/20 text-zinc-200 border-zinc-300/40",
  Baśniowy: "bg-rose-400/20 text-rose-200 border-rose-300/40",
  Normalny: "bg-neutral-400/20 text-neutral-200 border-neutral-300/40",
};

export function TypeBadges({
  speciesId,
  types,
  className = "",
}: {
  speciesId?: number;
  types?: string[];
  className?: string;
}) {
  const list = types ?? (speciesId ? speciesTypes(speciesId) : []);
  if (list.length === 0) return null;
  return (
    <span className={`flex flex-wrap justify-center gap-1 ${className}`}>
      {list.map((type) => (
        <span
          key={type}
          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${TYPE_STYLES[type] ?? TYPE_STYLES["Normalny"]}`}
        >
          {type}
        </span>
      ))}
    </span>
  );
}
