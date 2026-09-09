/** Pozycje regionów na stylizowanej mapie świata (procenty kontenera).
 * Siatka 3×3 dopasowana do wysp na grafice mapy podróży. */
export const REGION_MAP_POINTS: Record<string, { x: number; y: number }> = {
  kanto: { x: 19, y: 20 },
  johto: { x: 50, y: 18 },
  hoenn: { x: 78, y: 20 },
  sinnoh: { x: 19, y: 47 },
  unova: { x: 50, y: 47 },
  kalos: { x: 82, y: 47 },
  alola: { x: 19, y: 78 },
  galar: { x: 50, y: 78 },
  paldea: { x: 79, y: 79 },
};
