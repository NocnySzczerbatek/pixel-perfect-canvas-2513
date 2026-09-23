-- Remove tautological SELECT policies (USING (true)) on tournament tables.
-- All reads happen server-side through the service role, so no broad client read is needed.
DROP POLICY IF EXISTS "tournaments_select_all" ON public.tournaments;
DROP POLICY IF EXISTS "tournament_entries_select_all" ON public.tournament_entries;

-- Players may read only their own tournament entry rows.
CREATE POLICY "tournament_entries_select_own"
  ON public.tournament_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = player_id);
