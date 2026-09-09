CREATE TABLE IF NOT EXISTS public.league_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  region text NOT NULL,
  stage integer NOT NULL DEFAULT 1,
  cleared_stages integer NOT NULL DEFAULT 0,
  champion boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, region)
);

GRANT SELECT ON public.league_runs TO authenticated;
GRANT ALL ON public.league_runs TO service_role;

ALTER TABLE public.league_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "league_runs_select_own" ON public.league_runs
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);