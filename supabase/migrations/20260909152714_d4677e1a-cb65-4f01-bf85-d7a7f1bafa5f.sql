CREATE TABLE public.region_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 1,
  first_visit_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_visit_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, region)
);

GRANT SELECT ON public.region_visits TO authenticated;
GRANT ALL ON public.region_visits TO service_role;

ALTER TABLE public.region_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trenerzy widza wlasne wizyty" ON public.region_visits
  FOR SELECT TO authenticated USING (owner_id = auth.uid());