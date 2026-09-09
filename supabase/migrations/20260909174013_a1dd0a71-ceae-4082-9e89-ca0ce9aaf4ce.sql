CREATE TABLE IF NOT EXISTS public.daily_login (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_claim_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

GRANT SELECT ON public.daily_login TO authenticated;
GRANT ALL ON public.daily_login TO service_role;

ALTER TABLE public.daily_login ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_login_select_own" ON public.daily_login
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER update_daily_login_updated_at
  BEFORE UPDATE ON public.daily_login
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  label text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, achievement_key)
);

GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_select_own" ON public.achievements
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);