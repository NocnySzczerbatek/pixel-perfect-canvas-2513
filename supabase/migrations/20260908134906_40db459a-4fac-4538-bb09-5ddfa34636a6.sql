CREATE TABLE public.trainer_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent text NOT NULL,
  trainer_class text,
  person text,
  won boolean NOT NULL DEFAULT false,
  reward_coins integer NOT NULL DEFAULT 0,
  reward_exp integer NOT NULL DEFAULT 0,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  report jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX trainer_battles_owner_created_idx ON public.trainer_battles (owner_id, created_at DESC);

GRANT SELECT ON public.trainer_battles TO authenticated;
GRANT ALL ON public.trainer_battles TO service_role;

ALTER TABLE public.trainer_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY trainer_battles_select_own ON public.trainer_battles
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);