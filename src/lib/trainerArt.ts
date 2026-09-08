import turysta from "@/assets/pixel/trainers/turysta.png";
import wedkarz from "@/assets/pixel/trainers/wedkarz.png";
import naukowiec from "@/assets/pixel/trainers/naukowiec.png";
import youngster from "@/assets/pixel/trainers/youngster.png";
import lady from "@/assets/pixel/trainers/lady.png";
import czarnyPas from "@/assets/pixel/trainers/czarny-pas.png";
import blizniaczki from "@/assets/pixel/trainers/blizniaczki.png";
import rowerzysta from "@/assets/pixel/trainers/rowerzysta.png";
import gornik from "@/assets/pixel/trainers/gornik.png";
import ornitolog from "@/assets/pixel/trainers/ornitolog.png";
import pokemaniak from "@/assets/pixel/trainers/pokemaniak.png";
import harcerz from "@/assets/pixel/trainers/harcerz.png";
import kelnerka from "@/assets/pixel/trainers/kelnerka.png";
import rockowiec from "@/assets/pixel/trainers/rockowiec.png";
import treserRobakow from "@/assets/pixel/trainers/treser-robakow.png";
import psychik from "@/assets/pixel/trainers/psychik.png";
import bogatyDzieciak from "@/assets/pixel/trainers/bogaty-dzieciak.png";
import weteran from "@/assets/pixel/trainers/weteran.png";

import duch from "@/assets/pixel/leaders/duch.png";
import elektryczny from "@/assets/pixel/leaders/elektryczny.png";
import lod from "@/assets/pixel/leaders/lod.png";
import lot from "@/assets/pixel/leaders/lot.png";
import normalny from "@/assets/pixel/leaders/normalny.png";
import ogien from "@/assets/pixel/leaders/ogien.png";
import psychiczny from "@/assets/pixel/leaders/psychiczny.png";
import robak from "@/assets/pixel/leaders/robak.png";
import skala from "@/assets/pixel/leaders/skala.png";
import smok from "@/assets/pixel/leaders/smok.png";
import stal from "@/assets/pixel/leaders/stal.png";
import trawa from "@/assets/pixel/leaders/trawa.png";
import trucizna from "@/assets/pixel/leaders/trucizna.png";
import walka from "@/assets/pixel/leaders/walka.png";
import woda from "@/assets/pixel/leaders/woda.png";
import wrozka from "@/assets/pixel/leaders/wrozka.png";
import ziemia from "@/assets/pixel/leaders/ziemia.png";

/** Pixel-artowe sprite'y klas trenerów. */
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

/** Pixel-artowi Liderzy Sal — sprite dobierany po typie Sali. */
const LEADER_ART: Record<string, string> = {
  Duch: duch,
  Elektryczny: elektryczny,
  Lód: lod,
  Lot: lot,
  Normalny: normalny,
  Ogień: ogien,
  Psychiczny: psychiczny,
  Robak: robak,
  Skała: skala,
  Smok: smok,
  Stal: stal,
  Trawa: trawa,
  Trucizna: trucizna,
  Walka: walka,
  Woda: woda,
  Wróżka: wrozka,
  Ziemia: ziemia,
};

export const FALLBACK_TRAINER_ART = youngster;
export const FALLBACK_LEADER_ART = normalny;

export function trainerArt(trainerClass?: string | null): string {
  if (!trainerClass) return FALLBACK_TRAINER_ART;
  return ART[trainerClass] ?? FALLBACK_TRAINER_ART;
}

export function leaderArt(gymType?: string | null): string {
  if (!gymType) return FALLBACK_LEADER_ART;
  return LEADER_ART[gymType] ?? FALLBACK_LEADER_ART;
}
