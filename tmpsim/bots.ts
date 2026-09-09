import { simulateTeamBattle } from "@/lib/battle";
import { allyFighter, foeFighter } from "@/lib/fighters";
import { REGION_SPECIES } from "@/lib/pokedex";

const pool = REGION_SPECIES["kalos"]!;
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;

function ally(level: number, speciesId: number) {
  return allyFighter({
    id: String(speciesId),
    species_id: speciesId,
    species_name: "Ally",
    level,
    hp_current: 999,
    hp_max: 999,
    iv_hp: 16, iv_atk: 16, iv_def: 16, iv_spa: 16, iv_spd: 16, iv_spe: 16,
  } as any);
}

function run(partySize: number, level: number, botSize: number, iv: number, power: number) {
  let wins = 0;
  const trials = 200;
  for (let t = 0; t < trials; t += 1) {
    const allies = Array.from({ length: partySize }, () => ally(level, pick(pool).id));
    const foes = Array.from({ length: botSize }, () => {
      const s = pick(pool);
      return foeFighter({ species_id: s.id, species_name: s.name, level: level + 1 + Math.floor(Math.random() * 4) }, iv, power);
    });
    if (simulateTeamBattle(allies, foes).won) wins += 1;
  }
  return Math.round((wins / trials) * 100);
}

for (const level of [10, 20, 36]) {
  for (const botSize of [3, 5]) {
    console.log(
      `Lvl${level} vs bot x${botSize}: solo=${run(1, level, botSize, 28, 1.3)}% | 3 mons=${run(3, level, botSize, 28, 1.3)}% | 6 mons=${run(6, level, botSize, 28, 1.3)}%`,
    );
  }
}
