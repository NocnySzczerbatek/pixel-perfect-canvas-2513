ALTER TABLE public.daily_quests DROP CONSTRAINT IF EXISTS daily_quests_owner_id_quest_date_quest_type_key;
ALTER TABLE public.daily_quests DROP CONSTRAINT IF EXISTS daily_quests_quest_type_check;
ALTER TABLE public.daily_quests ADD CONSTRAINT daily_quests_quest_type_check CHECK (quest_type IN ('catch','battle','steps','visit','catch_type','find_item','evolve','shiny'));
ALTER TABLE public.daily_quests ADD COLUMN IF NOT EXISTS slot integer;
ALTER TABLE public.daily_quests ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.daily_quests ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.daily_quests ADD COLUMN IF NOT EXISTS biome text;
ALTER TABLE public.daily_quests ADD COLUMN IF NOT EXISTS rerolled boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS daily_quests_owner_date_slot_idx ON public.daily_quests (owner_id, quest_date, slot);