CREATE TABLE public.bonus_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  bonus_key text NOT NULL,
  label text NOT NULL,
  source text NOT NULL,
  shiny_bonus_pct integer NOT NULL DEFAULT 0,
  rare_bonus_pct integer NOT NULL DEFAULT 0,
  duration_minutes integer,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  shiny_denom_before integer,
  shiny_denom_after integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX bonus_history_owner_started_idx ON public.bonus_history (owner_id, started_at DESC);

GRANT SELECT ON public.bonus_history TO authenticated;
GRANT ALL ON public.bonus_history TO service_role;

ALTER TABLE public.bonus_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY bonus_history_select_own ON public.bonus_history
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);