CREATE TABLE public.item_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('fixed','auction')),
  item_key text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99),
  price integer NOT NULL CHECK (price > 0),
  current_bid integer,
  current_bidder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','cancelled','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE TABLE public.item_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.item_listings(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX item_listings_active_idx ON public.item_listings (status, kind, created_at DESC);
CREATE INDEX item_listings_seller_idx ON public.item_listings (seller_id);
CREATE INDEX item_bids_listing_idx ON public.item_bids (listing_id, created_at DESC);

GRANT SELECT ON public.item_listings TO authenticated;
GRANT ALL ON public.item_listings TO service_role;
GRANT SELECT ON public.item_bids TO authenticated;
GRANT ALL ON public.item_bids TO service_role;

ALTER TABLE public.item_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_listings_select_active_or_own ON public.item_listings
  FOR SELECT TO authenticated
  USING (status = 'active' OR auth.uid() = seller_id OR auth.uid() = buyer_id OR auth.uid() = current_bidder_id);

CREATE POLICY item_bids_select_own_or_seller ON public.item_bids
  FOR SELECT TO authenticated
  USING (
    auth.uid() = bidder_id
    OR EXISTS (SELECT 1 FROM public.item_listings l WHERE l.id = listing_id AND l.seller_id = auth.uid())
  );