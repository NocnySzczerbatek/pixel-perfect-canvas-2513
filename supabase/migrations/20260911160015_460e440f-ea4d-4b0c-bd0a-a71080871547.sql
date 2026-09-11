CREATE TABLE public.daily_quest_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_date date NOT NULL,
  reroll_used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_id, quest_date)
);
GRANT SELECT ON public.daily_quest_days TO authenticated;
GRANT ALL ON public.daily_quest_days TO service_role;
ALTER TABLE public.daily_quest_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_quest_days_select_own" ON public.daily_quest_days FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER update_daily_quest_days_updated_at BEFORE UPDATE ON public.daily_quest_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_name text NOT NULL CHECK (char_length(trainer_name) BETWEEN 1 AND 40),
  channel text NOT NULL CHECK (channel IN ('global', 'trade')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280 AND content = btrim(content)),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_authenticated_read" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE INDEX chat_messages_channel_created_idx ON public.chat_messages (channel, created_at DESC);
CREATE INDEX chat_messages_author_created_idx ON public.chat_messages (author_id, created_at DESC);