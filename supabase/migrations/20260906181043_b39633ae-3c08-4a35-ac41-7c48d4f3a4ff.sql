ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS energy_updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE public.encounters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  biome text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('wild','bot','pvp')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','caught','fled','resolved','skipped')),
  species_id integer,
  species_name text,
  species_type text,
  level integer NOT NULL DEFAULT 1,
  hp_current integer NOT NULL DEFAULT 20,
  hp_max integer NOT NULL DEFAULT 20,
  bot_team jsonb,
  energy_cost integer NOT NULL DEFAULT 0,
  reward_exp integer NOT NULL DEFAULT 0,
  reward_coins integer NOT NULL DEFAULT 0,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.encounters TO authenticated;
GRANT ALL ON public.encounters TO service_role;

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encounters_select_own" ON public.encounters FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "encounters_insert_own" ON public.encounters FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "encounters_update_own" ON public.encounters FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "encounters_delete_own" ON public.encounters FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER update_encounters_updated_at BEFORE UPDATE ON public.encounters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX encounters_owner_created_idx ON public.encounters (owner_id, created_at DESC);