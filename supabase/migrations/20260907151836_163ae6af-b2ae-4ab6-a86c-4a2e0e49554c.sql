ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS travel_tickets integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_region text,
  ADD COLUMN IF NOT EXISTS travel_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS master_ball_bought_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS premier_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dive_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dusk_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quick_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timer_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS luxury_balls integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS oak_stage integer NOT NULL DEFAULT 1;

CREATE TABLE public.player_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_id, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_items TO authenticated;
GRANT ALL ON public.player_items TO service_role;
ALTER TABLE public.player_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_items_select_own" ON public.player_items FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "player_items_insert_own" ON public.player_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "player_items_update_own" ON public.player_items FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "player_items_delete_own" ON public.player_items FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER update_player_items_updated_at BEFORE UPDATE ON public.player_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.daily_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_date date NOT NULL,
  quest_type text NOT NULL CHECK (quest_type IN ('catch', 'battle')),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  target_key text,
  target integer NOT NULL CHECK (target > 0),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0),
  reward_coins integer NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  reward_item_key text,
  reward_item_quantity integer NOT NULL DEFAULT 0 CHECK (reward_item_quantity >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'claimed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_id, quest_date, quest_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_quests TO authenticated;
GRANT ALL ON public.daily_quests TO service_role;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_quests_select_own" ON public.daily_quests FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "daily_quests_insert_own" ON public.daily_quests FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "daily_quests_update_own" ON public.daily_quests FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "daily_quests_delete_own" ON public.daily_quests FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER update_daily_quests_updated_at BEFORE UPDATE ON public.daily_quests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.oak_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage integer NOT NULL CHECK (stage > 0),
  research_type text NOT NULL CHECK (research_type IN ('catch_species', 'deliver_item', 'win_battles')),
  target_key text NOT NULL,
  target integer NOT NULL CHECK (target > 0),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0),
  reward_coins integer NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  reward_item_key text,
  reward_item_quantity integer NOT NULL DEFAULT 0 CHECK (reward_item_quantity >= 0),
  dialog_intro text NOT NULL,
  dialog_complete text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'claimed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_id, stage)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oak_research TO authenticated;
GRANT ALL ON public.oak_research TO service_role;
ALTER TABLE public.oak_research ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oak_research_select_own" ON public.oak_research FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "oak_research_insert_own" ON public.oak_research FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "oak_research_update_own" ON public.oak_research FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "oak_research_delete_own" ON public.oak_research FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER update_oak_research_updated_at BEFORE UPDATE ON public.oak_research FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();