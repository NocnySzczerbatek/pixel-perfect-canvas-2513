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

export type LevelUpMove = { name: string; slug: string; level: number };

/** Ruchy zdobywane przez poziomowanie, posortowane po poziomie nauki. */
export function fetchLevelUpMoves(speciesId: number) {
  return cached(`moves2:${speciesId}`, async () => {
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
      .map(([slug, level]) => ({ name: pretty(slug), slug, level }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)) as LevelUpMove[];
  });
}

/** Angielskie nazwy typów z PokéAPI na polskie plakietki używane w grze. */
const TYPE_PL: Record<string, string> = {
  normal: "Normalny",
  fire: "Ogień",
  water: "Woda",
  grass: "Trawa",
  electric: "Elektryczny",
  ice: "Lód",
  fighting: "Walka",
  poison: "Trucizna",
  ground: "Ziemia",
  flying: "Lot",
  psychic: "Psychiczny",
  bug: "Robak",
  rock: "Skała",
  ghost: "Duch",
  dragon: "Smok",
  dark: "Ciemność",
  steel: "Stal",
  fairy: "Baśniowy",
};

const CLASS_PL: Record<string, string> = {
  physical: "Fizyczny",
  special: "Specjalny",
  status: "Status",
};

export type MoveDetail = {
  slug: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  category: string;
};

/** Statystyki jednego ruchu (typ, moc, celność, PP, kategoria). */
export function fetchMoveDetail(slug: string) {
  return cached(`move:${slug}`, async () => {
    const data = await api<{
      type: { name: string };
      power: number | null;
      accuracy: number | null;
      pp: number | null;
      damage_class: { name: string } | null;
    }>(`move/${slug}`);
    return {
      slug,
      type: TYPE_PL[data.type.name] ?? "Normalny",
      power: data.power ?? null,
      accuracy: data.accuracy ?? null,
      pp: data.pp ?? null,
      category: CLASS_PL[data.damage_class?.name ?? "status"] ?? "Status",
    } as MoveDetail;
  });
}

/** Statystyki wielu ruchów naraz (z limitem równoległych zapytań). */
export async function fetchMoveDetails(slugs: string[]): Promise<Record<string, MoveDetail>> {
  const out: Record<string, MoveDetail> = {};
  const queue = [...slugs];
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length > 0) {
      const slug = queue.shift();
      if (!slug) break;
      try {
        out[slug] = await fetchMoveDetail(slug);
      } catch {
        /* pojedynczy ruch bez danych — pomijamy */
      }
    }
  });
  await Promise.all(workers);
  return out;
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

export type EvolutionStage = {
  id: number;
  name: string;
  /** Warunek uzyskania tej formy (pusty dla formy obecnej). */
  requirement: string;
};

/** Cała linia ewolucyjna od obecnej formy w przód (z warunkiem każdej formy). */
export function fetchEvolutionLine(speciesId: number) {
  return cached(`line:${speciesId}`, async () => {
    const species = await api<{ name: string; evolution_chain: { url: string } | null }>(
      `pokemon-species/${speciesId}`,
    );
    const self: EvolutionStage = { id: speciesId, name: pretty(species.name), requirement: "" };
    if (!species.evolution_chain) return [self];
    const chainId = species.evolution_chain.url.split("/").filter(Boolean).pop();
    const chain = await api<{ chain: ChainNode }>(`evolution-chain/${chainId}`);

    const find = (node: ChainNode): ChainNode | null => {
      if (node.species.name === species.name) return node;
      for (const next of node.evolves_to) {
        const hit = find(next);
        if (hit) return hit;
      }
      return null;
    };
    const start = find(chain.chain);
    if (!start) return [self];

    const out: EvolutionStage[] = [self];
    const walk = (node: ChainNode) => {
      for (const next of node.evolves_to) {
        const detail = next.evolution_details[0];
        const requirement = detail?.min_level
          ? `od poziomu ${detail.min_level}`
          : detail?.min_happiness
            ? `przy przyjaźni ${detail.min_happiness}+`
            : detail?.item
              ? `przy użyciu ${pretty(detail.item.name)}`
              : detail?.trigger
                ? pretty(detail.trigger.name)
                : "ewolucja";
        out.push({
          id: Number(next.species.url.split("/").filter(Boolean).pop() ?? 0),
          name: pretty(next.species.name),
          requirement,
        });
        walk(next);
      }
    };
    walk(start);
    return out;
  });
}
