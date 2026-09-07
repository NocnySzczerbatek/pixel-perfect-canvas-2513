-- Remove client-writable policies on gts_listings; all GTS mutations go through server logic.
DROP POLICY IF EXISTS gts_insert_own ON public.gts_listings;
DROP POLICY IF EXISTS gts_update_own ON public.gts_listings;
DROP POLICY IF EXISTS gts_delete_own ON public.gts_listings;

-- Explicitly revoke direct write privileges: these tables are only mutated by trusted server code.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.player_pokemon FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.gts_listings FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.payment_orders FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.tournament_entries FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.tournaments FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.gym_badges FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.daily_quests FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.oak_research FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.player_items FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.player_buffs FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.player_bonuses FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.pvp_battles_log FROM authenticated, anon;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.player_pokemon TO service_role;
GRANT ALL ON public.gts_listings TO service_role;
GRANT ALL ON public.payment_orders TO service_role;
GRANT ALL ON public.tournament_entries TO service_role;
GRANT ALL ON public.tournaments TO service_role;
GRANT ALL ON public.gym_badges TO service_role;
GRANT ALL ON public.daily_quests TO service_role;
GRANT ALL ON public.oak_research TO service_role;
GRANT ALL ON public.player_items TO service_role;
GRANT ALL ON public.player_buffs TO service_role;
GRANT ALL ON public.player_bonuses TO service_role;
GRANT ALL ON public.pvp_battles_log TO service_role;