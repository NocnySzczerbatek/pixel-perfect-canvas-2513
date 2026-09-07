CREATE TABLE public.player_buffs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buff_key text NOT NULL,
  label text NOT NULL,
  source text NOT NULL,
  shiny_bonus_pct integer NOT NULL DEFAULT 0,
  rare_bonus_pct integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.player_buffs TO authenticated;
GRANT ALL ON public.player_buffs TO service_role;

ALTER TABLE public.player_buffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_buffs_select_own" ON public.player_buffs
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX player_buffs_owner_expires_idx ON public.player_buffs (owner_id, expires_at DESC);

CREATE TRIGGER update_player_buffs_updated_at
  BEFORE UPDATE ON public.player_buffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.player_bonuses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bonus_key text NOT NULL,
  label text NOT NULL,
  shiny_bonus_pct integer NOT NULL DEFAULT 0,
  rare_bonus_pct integer NOT NULL DEFAULT 0,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_id, bonus_key)
);

GRANT SELECT ON public.player_bonuses TO authenticated;
GRANT ALL ON public.player_bonuses TO service_role;

ALTER TABLE public.player_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_bonuses_select_own" ON public.player_bonuses
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER update_player_bonuses_updated_at
  BEFORE UPDATE ON public.player_bonuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();