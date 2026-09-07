ALTER TABLE public.player_pokemon
  ADD COLUMN IF NOT EXISTS iv_hp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iv_atk integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iv_def integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iv_spa integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iv_spd integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iv_spe integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nature text,
  ADD COLUMN IF NOT EXISTS ability text,
  ADD COLUMN IF NOT EXISTS training_points integer NOT NULL DEFAULT 0;

ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS trainer_class text,
  ADD COLUMN IF NOT EXISTS trainer_person text;

UPDATE public.player_pokemon
SET iv_hp = floor(random() * 32)::int,
    iv_atk = floor(random() * 32)::int,
    iv_def = floor(random() * 32)::int,
    iv_spa = floor(random() * 32)::int,
    iv_spd = floor(random() * 32)::int,
    iv_spe = floor(random() * 32)::int
WHERE iv_hp = 0 AND iv_atk = 0 AND iv_def = 0 AND iv_spa = 0 AND iv_spd = 0 AND iv_spe = 0;

UPDATE public.player_pokemon
SET nature = (ARRAY['Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed','Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild','Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'])[1 + floor(random() * 25)::int]
WHERE nature IS NULL;

UPDATE public.player_pokemon
SET ability = (ARRAY['Overgrow','Blaze','Torrent','Static','Intimidate','Levitate','Guts','Sturdy','Swift Swim','Chlorophyll','Keen Eye','Inner Focus','Synchronize','Rock Head'])[1 + floor(random() * 14)::int]
WHERE ability IS NULL;