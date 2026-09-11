CREATE OR REPLACE FUNCTION public.start_daily_quest_day(_owner_id uuid, _quest_date date, _quests jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF jsonb_typeof(_quests) <> 'array' OR jsonb_array_length(_quests) <> 9 THEN
    RAISE EXCEPTION 'Exactly 9 quests required';
  END IF;

  INSERT INTO public.daily_quest_days (owner_id, quest_date)
  VALUES (_owner_id, _quest_date)
  ON CONFLICT (owner_id, quest_date) DO NOTHING;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  DELETE FROM public.daily_quests WHERE owner_id = _owner_id AND quest_date = _quest_date;
  INSERT INTO public.daily_quests (
    owner_id, quest_date, slot, quest_type, difficulty, target, target_key, biome,
    title, description, reward_coins, reward_item_key, reward_item_quantity
  )
  SELECT
    _owner_id, _quest_date, x.slot, x.quest_type, x.difficulty, x.target, x.target_key,
    x.biome, x.title, x.description, x.reward_coins, x.reward_item_key, x.reward_item_quantity
  FROM jsonb_to_recordset(_quests) AS x(
    slot integer, quest_type text, difficulty text, target integer, target_key text,
    biome text, title text, description text, reward_coins integer,
    reward_item_key text, reward_item_quantity integer
  );
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.start_daily_quest_day(uuid, date, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_daily_quest_day(uuid, date, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.reroll_daily_quest(
  _owner_id uuid, _quest_date date, _quest_id uuid, _replacement jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _difficulty text;
  _status text;
BEGIN
  SELECT difficulty, status INTO _difficulty, _status
  FROM public.daily_quests
  WHERE id = _quest_id AND owner_id = _owner_id AND quest_date = _quest_date
  FOR UPDATE;
  IF NOT FOUND OR _status <> 'active' OR _difficulty <> (_replacement->>'difficulty') THEN
    RETURN false;
  END IF;

  UPDATE public.daily_quest_days
  SET reroll_used = true
  WHERE owner_id = _owner_id AND quest_date = _quest_date AND reroll_used = false;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.daily_quests SET
    slot = (_replacement->>'slot')::integer,
    quest_type = _replacement->>'quest_type',
    difficulty = _replacement->>'difficulty',
    target = (_replacement->>'target')::integer,
    target_key = _replacement->>'target_key',
    biome = _replacement->>'biome',
    title = _replacement->>'title',
    description = _replacement->>'description',
    reward_coins = (_replacement->>'reward_coins')::integer,
    reward_item_key = _replacement->>'reward_item_key',
    reward_item_quantity = (_replacement->>'reward_item_quantity')::integer,
    progress = 0,
    status = 'active',
    rerolled = true
  WHERE id = _quest_id AND owner_id = _owner_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.reroll_daily_quest(uuid, date, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reroll_daily_quest(uuid, date, uuid, jsonb) TO service_role;