CREATE POLICY "chat_messages_no_direct_access"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (false);