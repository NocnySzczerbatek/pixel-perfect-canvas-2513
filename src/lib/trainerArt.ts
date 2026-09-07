import turysta from "@/assets/trainers/turysta.jpg";
import wedkarz from "@/assets/trainers/wedkarz.jpg";
import naukowiec from "@/assets/trainers/naukowiec.jpg";
import youngster from "@/assets/trainers/youngster.jpg";
import lady from "@/assets/trainers/lady.jpg";
import czarnyPas from "@/assets/trainers/czarny-pas.jpg";
import blizniaczki from "@/assets/trainers/blizniaczki.jpg";
import rowerzysta from "@/assets/trainers/rowerzysta.jpg";
import gornik from "@/assets/trainers/gornik.jpg";
import ornitolog from "@/assets/trainers/ornitolog.jpg";
import pokemaniak from "@/assets/trainers/pokemaniak.jpg";
import harcerz from "@/assets/trainers/harcerz.jpg";
import kelnerka from "@/assets/trainers/kelnerka.jpg";
import rockowiec from "@/assets/trainers/rockowiec.jpg";
import treserRobakow from "@/assets/trainers/treser-robakow.jpg";
import psychik from "@/assets/trainers/psychik.jpg";
import bogatyDzieciak from "@/assets/trainers/bogaty-dzieciak.jpg";
import weteran from "@/assets/trainers/weteran.jpg";

const ART: Record<string, string> = {
  Turysta: turysta,
  Wędkarz: wedkarz,
  Naukowiec: naukowiec,
  Youngster: youngster,
  Lady: lady,
  "Czarny Pas": czarnyPas,
  Bliźniaczki: blizniaczki,
  Rowerzysta: rowerzysta,
  Górnik: gornik,
  Ornitolog: ornitolog,
  Pokémaniak: pokemaniak,
  Harcerz: harcerz,
  Kelnerka: kelnerka,
  Rockowiec: rockowiec,
  "Treser Robaków": treserRobakow,
  Psychik: psychik,
  "Bogaty Dzieciak": bogatyDzieciak,
  Weteran: weteran,
};

export const FALLBACK_TRAINER_ART = youngster;

export function trainerArt(trainerClass?: string | null): string {
  if (!trainerClass) return FALLBACK_TRAINER_ART;
  return ART[trainerClass] ?? FALLBACK_TRAINER_ART;
}
