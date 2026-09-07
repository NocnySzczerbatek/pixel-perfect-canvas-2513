ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS candy_normal integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS candy_xl integer NOT NULL DEFAULT 0;

ALTER TABLE public.player_pokemon
  ADD COLUMN IF NOT EXISTS friendship integer NOT NULL DEFAULT 70;