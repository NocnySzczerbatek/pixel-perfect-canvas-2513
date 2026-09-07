/** Dane z PokéAPI (ruchy z poziomowania + ewolucje) z lokalnym cache w localStorage. */

const CACHE_PREFIX = "cz-pokeapi:";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; value: T };
    if (Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    /* brak miejsca w cache — pomijamy */
  }
}

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = readCache<T>(key);
  if (hit) return hit;
  const value = await loader();
  writeCache(key, value);
  return value;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`https://pokeapi.co/api/v2/${path}`);
  if (!res.ok) throw new Error("PokéAPI nie odpowiada.");
  return (await res.json()) as T;
}

function pretty(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type LevelUpMove = { name: string; level: number };

/** Ruchy zdobywane przez poziomowanie, posortowane po poziomie nauki. */
export function fetchLevelUpMoves(speciesId: number) {
  return cached(`moves:${speciesId}`, async () => {
    const data = await api<{
      moves: {
        move: { name: string };
        version_group_details: {
          level_learned_at: number;
          move_learn_method: { name: string };
        }[];
      }[];
    }>(`pokemon/${speciesId}`);

    const best = new Map<string, number>();
    for (const entry of data.moves) {
      for (const detail of entry.version_group_details) {
        if (detail.move_learn_method.name !== "level-up") continue;
        const current = best.get(entry.move.name);
        if (current === undefined || detail.level_learned_at < current) {
          best.set(entry.move.name, detail.level_learned_at);
        }
      }
    }
    return [...best.entries()]
      .map(([name, level]) => ({ name: pretty(name), level }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)) as LevelUpMove[];
  });
}

export type EvolutionInfo = {
  toId: number;
  to: string;
  minLevel: number | null;
  minHappiness: number | null;
  item: string | null;
  trigger: string;
};

type ChainNode = {
  species: { name: string; url: string };
  evolves_to: ChainNode[];
  evolution_details: {
    min_level: number | null;
    min_happiness: number | null;
    item: { name: string } | null;
    trigger: { name: string } | null;
  }[];
};

/** Możliwe ewolucje danego gatunku wraz z progiem (poziom / przyjaźń / przedmiot). */
export function fetchEvolutions(speciesId: number) {
  return cached(`evo:${speciesId}`, async () => {
    const species = await api<{ name: string; evolution_chain: { url: string } | null }>(
      `pokemon-species/${speciesId}`,
    );
    if (!species.evolution_chain) return [] as EvolutionInfo[];
    const chainId = species.evolution_chain.url.split("/").filter(Boolean).pop();
    const chain = await api<{ chain: ChainNode }>(`evolution-chain/${chainId}`);

    const stack: ChainNode[] = [chain.chain];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node.species.name === species.name) {
        return node.evolves_to.map((next) => {
          const detail = next.evolution_details[0];
          return {
            toId: Number(next.species.url.split("/").filter(Boolean).pop() ?? 0),
            to: pretty(next.species.name),
            minLevel: detail?.min_level ?? null,
            minHappiness: detail?.min_happiness ?? null,
            item: detail?.item ? pretty(detail.item.name) : null,
            trigger: detail?.trigger ? pretty(detail.trigger.name) : "Level Up",
          };
        }) as EvolutionInfo[];
      }
      stack.push(...node.evolves_to);
    }
    return [] as EvolutionInfo[];
  });
}
