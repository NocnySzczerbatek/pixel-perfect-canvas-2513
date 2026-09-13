CREATE OR REPLACE FUNCTION public.public_trainer_rankings()
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
  pvp_losses integer,
  caught_pokemon bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.trainer_name,
    p.trainer_level,
    p.trainer_exp,
    p.catch_coins,
    p.region,
    p.featured_badge,
    p.shield_until,
    p.pvp_wins,
    p.pvp_losses,
    COUNT(pp.id)::bigint AS caught_pokemon
  FROM public.profiles p
  LEFT JOIN public.player_pokemon pp ON pp.owner_id = p.id
  GROUP BY p.id
$$;

REVOKE ALL ON FUNCTION public.public_trainer_rankings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_trainer_rankings() TO service_role;