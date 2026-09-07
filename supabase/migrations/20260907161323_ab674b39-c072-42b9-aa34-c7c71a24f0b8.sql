-- Remove client-side write access to game-state tables; all mutations go through server logic.
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;

DROP POLICY IF EXISTS player_pokemon_insert_own ON public.player_pokemon;
DROP POLICY IF EXISTS player_pokemon_update_own ON public.player_pokemon;
DROP POLICY IF EXISTS player_pokemon_delete_own ON public.player_pokemon;

DROP POLICY IF EXISTS player_items_insert_own ON public.player_items;
DROP POLICY IF EXISTS player_items_update_own ON public.player_items;
DROP POLICY IF EXISTS player_items_delete_own ON public.player_items;

DROP POLICY IF EXISTS gym_badges_insert_own ON public.gym_badges;
DROP POLICY IF EXISTS gym_badges_delete_own ON public.gym_badges;

DROP POLICY IF EXISTS daily_quests_insert_own ON public.daily_quests;
DROP POLICY IF EXISTS daily_quests_update_own ON public.daily_quests;
DROP POLICY IF EXISTS daily_quests_delete_own ON public.daily_quests;

DROP POLICY IF EXISTS oak_research_insert_own ON public.oak_research;
DROP POLICY IF EXISTS oak_research_update_own ON public.oak_research;
DROP POLICY IF EXISTS oak_research_delete_own ON public.oak_research;

REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.player_pokemon FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.player_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.gym_badges FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.daily_quests FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.oak_research FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payment_orders FROM authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.player_pokemon FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.player_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.gym_badges FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.daily_quests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.oak_research FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.payment_orders FROM anon;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.player_pokemon TO service_role;
GRANT ALL ON public.player_items TO service_role;
GRANT ALL ON public.gym_badges TO service_role;
GRANT ALL ON public.daily_quests TO service_role;
GRANT ALL ON public.oak_research TO service_role;
GRANT ALL ON public.payment_orders TO service_role;