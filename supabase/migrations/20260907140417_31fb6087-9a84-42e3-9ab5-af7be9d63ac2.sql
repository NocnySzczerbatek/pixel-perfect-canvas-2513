ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS great_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultra_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS master_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS razz_berries integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS mega_stones integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shield_until timestamptz,
  ADD COLUMN IF NOT EXISTS pvp_wins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pvp_losses integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.gym_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  region text NOT NULL,
  gym_index integer NOT NULL,
  badge_key text NOT NULL,
  badge_name text NOT NULL,
  leader_name text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, region, gym_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_badges TO authenticated;
GRANT ALL ON public.gym_badges TO service_role;
ALTER TABLE public.gym_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_badges_select_all_authenticated" ON public.gym_badges
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gym_badges_insert_own" ON public.gym_badges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "gym_badges_delete_own" ON public.gym_badges
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.gts_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  pokemon_id uuid,
  species_id integer NOT NULL,
  species_name text NOT NULL,
  species_type text,
  level integer NOT NULL DEFAULT 1,
  price integer NOT NULL,
  snapshot jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  sold_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gts_listings TO authenticated;
GRANT ALL ON public.gts_listings TO service_role;
ALTER TABLE public.gts_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gts_select_all_authenticated" ON public.gts_listings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "gts_insert_own" ON public.gts_listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "gts_update_own" ON public.gts_listings
  FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "gts_delete_own" ON public.gts_listings
  FOR DELETE TO authenticated USING (auth.uid() = seller_id);

CREATE INDEX IF NOT EXISTS gts_listings_status_idx ON public.gts_listings (status, created_at DESC);