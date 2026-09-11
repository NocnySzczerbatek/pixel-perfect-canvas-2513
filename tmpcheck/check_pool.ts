import { biomePool } from "../src/lib/encounter-pool";
import { findBiome } from "../src/lib/biomes";
import { FULL_DEX } from "../src/lib/full-dex";
const byId = new Map(FULL_DEX.map(e => [e.id, e]));
const regions = ["Kanto","Johto","Hoenn","Sinnoh","Unova","Kalos","Alola","Galar","Paldea"];
for (const slug of ["las","ocean","wulkan"]) {
  const b = findBiome(slug)!;
  const aff = b.types.length ? b.types : [b.element];
  for (const r of regions) {
    for (const lvl of [1, 15, 40, 80]) {
      const pool = biomePool(slug, r, lvl);
      const bad = pool.filter(s => {
        const e = byId.get(s.id);
        return !e || !e.types.some(t => aff.includes(t));
      });
      if (bad.length) console.log("BAD", slug, r, lvl, bad.map(x=>x.name).join(","));
    }
  }
  const pool = biomePool(slug, "Kanto", 20);
  console.log(slug, "affinity:", aff.join("/"), "| pula", pool.length, "|", pool.slice(0,10).map(p=>`${p.name}(${byId.get(p.id)!.types.join("/")})`).join(", "));
}
console.log("done");
