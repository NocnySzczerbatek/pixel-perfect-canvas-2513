DROP POLICY IF EXISTS "chat_messages_authenticated_read" ON public.chat_messages;
REVOKE ALL ON public.chat_messages FROM authenticated, anon;
GRANT ALL ON public.chat_messages TO service_role;

CREATE OR REPLACE FUNCTION public.send_chat_message(
  _author_id uuid, _channel text, _content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trainer_name text;
  _message_id uuid;
  _clean_content text := btrim(_content);
BEGIN
  IF _channel NOT IN ('global', 'trade') THEN
    RAISE EXCEPTION 'Invalid channel';
  END IF;
  IF char_length(_clean_content) < 1 OR char_length(_clean_content) > 280 THEN
    RAISE EXCEPTION 'Invalid message length';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_author_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE author_id = _author_id AND created_at > now() - interval '3 seconds'
  ) THEN
    RAISE EXCEPTION 'Rate limit';
  END IF;

  SELECT trainer_name INTO _trainer_name FROM public.profiles WHERE id = _author_id;
  IF _trainer_name IS NULL OR btrim(_trainer_name) = '' THEN
    RAISE EXCEPTION 'Trainer profile required';
  END IF;

  INSERT INTO public.chat_messages (author_id, trainer_name, channel, content)
  VALUES (_author_id, left(_trainer_name, 40), _channel, _clean_content)
  RETURNING id INTO _message_id;
  RETURN _message_id;
END;
$$;
REVOKE ALL ON FUNCTION public.send_chat_message(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_chat_message(uuid, text, text) TO service_role;