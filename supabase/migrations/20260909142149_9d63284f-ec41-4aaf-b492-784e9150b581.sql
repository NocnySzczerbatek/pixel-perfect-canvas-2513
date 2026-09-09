ALTER TABLE public.player_pokemon
  ADD COLUMN IF NOT EXISTS active_moves text[];

UPDATE public.player_pokemon SET
  iv_hp  = greatest(0, least(31, iv_hp  - coalesce(train_hp, 0))),
  iv_atk = greatest(0, least(31, iv_atk - coalesce(train_atk, 0))),
  iv_def = greatest(0, least(31, iv_def - coalesce(train_def, 0))),
  iv_spa = greatest(0, least(31, iv_spa - coalesce(train_spa, 0))),
  iv_spd = greatest(0, least(31, iv_spd - coalesce(train_spd, 0))),
  iv_spe = greatest(0, least(31, iv_spe - coalesce(train_spe, 0)))
WHERE coalesce(train_hp,0) + coalesce(train_atk,0) + coalesce(train_def,0)
    + coalesce(train_spa,0) + coalesce(train_spd,0) + coalesce(train_spe,0) > 0;