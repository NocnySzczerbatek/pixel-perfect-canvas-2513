ALTER TABLE public.player_pokemon ADD COLUMN IF NOT EXISTS is_shiny BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS is_shiny BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS player_pokemon_shiny_idx ON public.player_pokemon (owner_id) WHERE is_shiny;