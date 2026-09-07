CREATE TABLE public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  checkout_session_id text NOT NULL UNIQUE,
  payment_intent_id text UNIQUE,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'sandbox',
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_orders_select_own"
ON public.payment_orders FOR SELECT TO authenticated
USING (auth.uid() = owner_id);

CREATE INDEX payment_orders_owner_created_idx ON public.payment_orders(owner_id, created_at DESC);
CREATE INDEX payment_orders_status_idx ON public.payment_orders(status);

CREATE TRIGGER update_payment_orders_updated_at
BEFORE UPDATE ON public.payment_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();