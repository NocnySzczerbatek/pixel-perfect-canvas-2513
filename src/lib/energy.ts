/**
 * Jedno źródło prawdy dla systemu Energii.
 * MAX_ENERGY jest stałe — Flakon Energii nigdy nie podnosi limitu.
 */
export const MAX_ENERGY = 100;

/** +1 punkt Energii co 3 minuty. */
export const ENERGY_TICK_MS = 3 * 60 * 1000;

/** Flakon uzupełnia Energię do pełna (nadal z capem MAX_ENERGY). */
export const BOTTLE_ENERGY = MAX_ENERGY;

/** Koszty Energii poszczególnych aktywności. */
export const ENERGY_COST = {
  gym: 10,
  raid: 8,
  trainer: 6,
} as const;

/** Zawsze przycina Energię do przedziału 0..MAX_ENERGY. */
export function clampEnergy(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_ENERGY, Math.floor(value)));
}

/**
 * Atomowe zdjęcie Energii (optimistic lock na aktualnej wartości).
 * Zwraca false, gdy inny równoległy request zmienił Energię — chroni przed
 * podwójnym kliknięciem i ujemnymi wartościami.
 */
export async function spendEnergy(
  db: any,
  userId: string,
  currentEnergy: number,
  cost: number,
): Promise<boolean> {
  if (currentEnergy < cost) return false;
  const { data } = await db
    .from("profiles")
    .update({
      energy: clampEnergy(currentEnergy - cost),
      energy_updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("energy", currentEnergy)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}

/**
 * Atomowe zużycie jednego Flakonu Energii — uzupełnia Energię do MAX_ENERGY.
 */
export async function consumeEnergyBottle(
  db: any,
  userId: string,
  currentEnergy: number,
  currentBottles: number,
): Promise<boolean> {
  if (currentBottles <= 0 || currentEnergy >= MAX_ENERGY) return false;
  const { data } = await db
    .from("profiles")
    .update({
      energy: clampEnergy(currentEnergy + BOTTLE_ENERGY),
      energy_bottles: Math.max(0, currentBottles - 1),
      energy_updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("energy", currentEnergy)
    .eq("energy_bottles", currentBottles)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}
