CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  trainer_name TEXT UNIQUE NOT NULL,
  trainer_level INT NOT NULL DEFAULT 1,
  trainer_exp INT NOT NULL DEFAULT 0,
  energy INT NOT NULL DEFAULT 100,
  energy_bottles INT NOT NULL DEFAULT 5,
  poke_balls INT NOT NULL DEFAULT 10,
  catch_coins INT NOT NULL DEFAULT 500,
  region TEXT,
  tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE,
  featured_badge TEXT DEFAULT 'kanto_champion',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.player_pokemon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species_id INT NOT NULL,
  species_name TEXT NOT NULL,
  nickname TEXT,
  level INT NOT NULL DEFAULT 1,
  exp INT NOT NULL DEFAULT 0,
  hp_current INT NOT NULL DEFAULT 20,
  hp_max INT NOT NULL DEFAULT 20,
  fainted BOOLEAN NOT NULL DEFAULT FALSE,
  in_party BOOLEAN NOT NULL DEFAULT TRUE,
  is_starter BOOLEAN NOT NULL DEFAULT FALSE,
  caught_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_pokemon TO authenticated;
GRANT ALL ON public.player_pokemon TO service_role;
ALTER TABLE public.player_pokemon ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_pokemon_select_own" ON public.player_pokemon FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "player_pokemon_insert_own" ON public.player_pokemon FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "player_pokemon_update_own" ON public.player_pokemon FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "player_pokemon_delete_own" ON public.player_pokemon FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.pvp_battles_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  coins_stolen INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pvp_battles_log TO authenticated;
GRANT ALL ON public.pvp_battles_log TO service_role;
ALTER TABLE public.pvp_battles_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pvp_log_select_participants" ON public.pvp_battles_log FOR SELECT TO authenticated USING (auth.uid() = winner_id OR auth.uid() = loser_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();