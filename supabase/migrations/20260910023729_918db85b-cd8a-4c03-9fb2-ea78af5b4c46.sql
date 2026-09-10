CREATE TABLE IF NOT EXISTS public.region_mastery_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  region text NOT NULL,
  tier integer NOT NULL,
  reward_text text NOT NULL DEFAULT '',
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, region, tier)
);

GRANT SELECT ON public.region_mastery_claims TO authenticated;
GRANT ALL ON public.region_mastery_claims TO service_role;
ALTER TABLE public.region_mastery_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "region_mastery_claims_select_own" ON public.region_mastery_claims
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.weekly_event_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  event_key text NOT NULL,
  reward_text text NOT NULL DEFAULT '',
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, week_start)
);

GRANT SELECT ON public.weekly_event_claims TO authenticated;
GRANT ALL ON public.weekly_event_claims TO service_role;
ALTER TABLE public.weekly_event_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_event_claims_select_own" ON public.weekly_event_claims
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.breeding_eggs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_a uuid,
  parent_b uuid,
  parent_a_name text NOT NULL DEFAULT '',
  parent_b_name text NOT NULL DEFAULT '',
  species_id integer NOT NULL,
  species_name text NOT NULL,
  level integer NOT NULL DEFAULT 5,
  iv_hp integer NOT NULL DEFAULT 0,
  iv_atk integer NOT NULL DEFAULT 0,
  iv_def integer NOT NULL DEFAULT 0,
  iv_spa integer NOT NULL DEFAULT 0,
  iv_spd integer NOT NULL DEFAULT 0,
  iv_spe integer NOT NULL DEFAULT 0,
  nature text,
  ability text,
  active_moves text[],
  inherited jsonb NOT NULL DEFAULT '[]'::jsonb,
  ready_at timestamptz NOT NULL,
  hatched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.breeding_eggs TO authenticated;
GRANT ALL ON public.breeding_eggs TO service_role;
ALTER TABLE public.breeding_eggs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "breeding_eggs_select_own" ON public.breeding_eggs
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS breeding_eggs_owner_idx ON public.breeding_eggs (owner_id, hatched_at);

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

GRANT SELECT ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships_select_involved" ON public.friendships
  FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships (addressee_id, status);