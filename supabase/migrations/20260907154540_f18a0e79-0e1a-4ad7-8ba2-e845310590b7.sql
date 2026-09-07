DROP POLICY IF EXISTS profiles_select_all_authenticated ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.public_trainers()
RETURNS TABLE (
  id uuid,
  trainer_name text,
  trainer_level integer,
  trainer_exp integer,
  catch_coins integer,
  region text,
  featured_badge text,
  shield_until timestamp with time zone,
  pvp_wins integer,
  pvp_losses integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.trainer_name, p.trainer_level, p.trainer_exp, p.catch_coins,
         p.region, p.featured_badge, p.shield_until, p.pvp_wins, p.pvp_losses
  FROM public.profiles p
$$;
REVOKE ALL ON FUNCTION public.public_trainers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_trainers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_trainers() TO service_role;

DROP POLICY IF EXISTS gym_badges_select_all_authenticated ON public.gym_badges;
CREATE POLICY gym_badges_select_own ON public.gym_badges FOR SELECT TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS gts_select_all_authenticated ON public.gts_listings;
CREATE POLICY gts_select_active_or_own ON public.gts_listings FOR SELECT TO authenticated
USING (status = 'active' OR auth.uid() = seller_id OR auth.uid() = buyer_id);

REVOKE INSERT, UPDATE, DELETE ON public.payment_orders FROM authenticated;
REVOKE ALL ON public.payment_orders FROM anon;
GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;