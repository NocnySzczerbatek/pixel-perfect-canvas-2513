CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  week_end date NOT NULL,
  status text NOT NULL DEFAULT 'registration',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournaments_select_all" ON public.tournaments FOR SELECT TO authenticated USING (true);

CREATE TABLE public.tournament_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  battles_today integer NOT NULL DEFAULT 0,
  last_battle_at timestamptz,
  final_place integer,
  reward_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);

GRANT SELECT ON public.tournament_entries TO authenticated;
GRANT ALL ON public.tournament_entries TO service_role;
ALTER TABLE public.tournament_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournament_entries_select_all" ON public.tournament_entries FOR SELECT TO authenticated USING (true);

CREATE INDEX tournament_entries_board_idx ON public.tournament_entries (tournament_id, points DESC);
CREATE INDEX tournament_entries_player_idx ON public.tournament_entries (player_id);

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tournament_entries_updated_at BEFORE UPDATE ON public.tournament_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();