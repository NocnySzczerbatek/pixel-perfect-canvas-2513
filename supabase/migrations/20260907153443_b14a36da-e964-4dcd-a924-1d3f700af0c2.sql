CREATE OR REPLACE FUNCTION public.fulfill_game_purchase(
  _owner_id uuid,
  _checkout_session_id text,
  _payment_intent_id text,
  _price_id text,
  _environment text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.payment_orders%ROWTYPE;
BEGIN
  IF _price_id NOT IN ('energy_bottles_3_pln', 'energy_chest_pln', 'master_ball_pln') THEN
    RAISE EXCEPTION 'Unknown product';
  END IF;

  INSERT INTO public.payment_orders (owner_id, checkout_session_id, payment_intent_id, price_id, status, environment)
  VALUES (_owner_id, _checkout_session_id, NULLIF(_payment_intent_id, ''), _price_id, 'pending', _environment)
  ON CONFLICT (checkout_session_id) DO NOTHING;

  SELECT * INTO _order
  FROM public.payment_orders
  WHERE checkout_session_id = _checkout_session_id
  FOR UPDATE;

  IF _order.owner_id <> _owner_id OR _order.price_id <> _price_id OR _order.environment <> _environment THEN
    RAISE EXCEPTION 'Purchase data mismatch';
  END IF;

  IF _order.fulfilled_at IS NOT NULL THEN
    RETURN false;
  END IF;

  IF _price_id = 'energy_bottles_3_pln' THEN
    UPDATE public.profiles SET energy_bottles = energy_bottles + 3 WHERE id = _owner_id;
  ELSIF _price_id = 'energy_chest_pln' THEN
    UPDATE public.profiles SET energy_bottles = energy_bottles + 10, catch_coins = catch_coins + 500 WHERE id = _owner_id;
  ELSIF _price_id = 'master_ball_pln' THEN
    UPDATE public.profiles SET master_balls = master_balls + 1 WHERE id = _owner_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player profile not found';
  END IF;

  UPDATE public.payment_orders
  SET status = 'paid', payment_intent_id = COALESCE(NULLIF(_payment_intent_id, ''), payment_intent_id), fulfilled_at = now()
  WHERE id = _order.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_game_purchase(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_game_purchase(uuid, text, text, text, text) TO service_role;