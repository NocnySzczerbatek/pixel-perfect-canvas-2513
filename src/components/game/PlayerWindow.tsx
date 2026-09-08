import { Link } from "@tanstack/react-router";
import { Backpack, BookOpen, HeartPulse, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AVATARS, avatarSrc } from "@/lib/avatars";

export type PlayerWindowProfile = {
  trainer_name: string;
  trainer_level: number;
  trainer_exp: number;
  trainer_exp_next: number;
  energy: number;
  energy_max: number;
  energy_bottles: number;
  catch_coins: number;
  poke_balls: number;
  avatar_key: string | null;
  region_name: string | null;
};

/** Okno Gracza: awatar, postęp, zasoby i skróty — bez osobnej podstrony. */
export function PlayerWindow({
  open,
  onClose,
  profile,
  energyHint,
  onTour,
  onLogout,
  onPickAvatar,
}: {
  open: boolean;
  onClose: () => void;
  profile: PlayerWindowProfile | null;
  energyHint?: string | undefined;
  onTour: () => void;
  onLogout: () => void;
  onPickAvatar: (key: string) => void;
}) {
  const expPct = profile
    ? Math.max(
        0,
        Math.min(100, Math.round((profile.trainer_exp / Math.max(1, profile.trainer_exp_next)) * 100)),
      )
    : 0;
  const energyPct = profile
    ? Math.max(0, Math.min(100, Math.round((profile.energy / Math.max(1, profile.energy_max)) * 100)))
    : 0;

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">
            {profile?.trainer_name ?? "Trener"}
          </SheetTitle>
          <SheetDescription>
            {profile?.region_name ? `Region ${profile.region_name}` : "Okno gracza"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-4">
          <img
            src={avatarSrc(profile?.avatar_key)}
            alt="Twoja postać"
            loading="lazy"
            width={512}
            height={768}
            className="h-40 w-auto object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.25)]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Poziom trenera
            </p>
            <p className="font-display text-3xl">{profile?.trainer_level ?? "—"}</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-aurora" style={{ width: `${expPct}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile
                ? `${profile.trainer_exp} / ${profile.trainer_exp_next} EXP · brakuje ${Math.max(
                    0,
                    profile.trainer_exp_next - profile.trainer_exp,
                  )}`
                : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border/60 p-3">
          <div className="flex items-center justify-between text-sm">
            <span>Energia</span>
            <span className="tabular-nums">
              {profile ? `${profile.energy} / ${profile.energy_max}` : "—"}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-ice" style={{ width: `${energyPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {energyHint ?? "+1 pkt co 3 minuty"}
            {profile ? ` · Flakony: ${profile.energy_bottles}` : ""}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Catch Coins</p>
            <p className="font-display text-2xl">{profile?.catch_coins ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Poké Balle</p>
            <p className="font-display text-2xl">{profile?.poke_balls ?? "—"}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Twoja postać</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {AVATARS.map((avatar) => {
              const active = (profile?.avatar_key ?? "m1") === avatar.key;
              return (
                <button
                  key={avatar.key}
                  type="button"
                  onClick={() => onPickAvatar(avatar.key)}
                  title={avatar.label}
                  className={`rounded-xl border p-1 transition ${active ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/60"}`}
                >
                  <img
                    src={avatar.src}
                    alt={avatar.label}
                    loading="lazy"
                    width={512}
                    height={768}
                    className="h-20 w-full object-contain"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/ekwipunek" onClick={onClose}>
              <Backpack className="h-4 w-4" aria-hidden />
              Ekwipunek
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/pokedex" onClick={onClose}>
              <BookOpen className="h-4 w-4" aria-hidden />
              Pokédex
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/centrum" onClick={onClose}>
              <HeartPulse className="h-4 w-4" aria-hidden />
              Centrum Pokémon
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/profil" onClick={onClose}>
              <UserRound className="h-4 w-4" aria-hidden />
              Profil
            </Link>
          </Button>
        </div>

        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onTour}>
            Samouczek
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onLogout}>
            Wyloguj
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
