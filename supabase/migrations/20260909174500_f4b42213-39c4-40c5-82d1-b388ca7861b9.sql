CREATE TABLE IF NOT EXISTS public.raid_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  raid_date date NOT NULL,
  boss_key text NOT NULL,
  boss_name text NOT NULL,
  species_id integer NOT NULL,
  level integer NOT NULL,
  tier integer NOT NULL,
  won boolean NOT NULL DEFAULT false,
  damage_done integer NOT NULL DEFAULT 0,
  turns integer NOT NULL DEFAULT 0,
  reward_coins integer NOT NULL DEFAULT 0,
  rewards jsonb NOT NULL DEFAULT '[]'::jsonb,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.raid_runs TO authenticated;
GRANT ALL ON public.raid_runs TO service_role;

ALTER TABLE public.raid_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raid_runs_select_own" ON public.raid_runs
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS raid_runs_owner_date_idx ON public.raid_runs (owner_id, raid_date);