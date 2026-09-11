import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const channelSchema = z.enum(["global", "trade"]);

export type ChatChannel = z.infer<typeof channelSchema>;

export type ChatMessage = {
  id: string;
  trainer_name: string;
  channel: ChatChannel;
  content: string;
  created_at: string;
  is_mine: boolean;
};

export const getChatMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { channel: ChatChannel }) => ({ channel: channelSchema.parse(input?.channel) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, author_id, trainer_name, channel, content, created_at")
      .eq("channel", data.channel)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Nie udało się pobrać czatu.");
    return ((rows ?? []) as Array<Omit<ChatMessage, "is_mine"> & { author_id: string }>)
      .reverse()
      .map(({ author_id, ...message }) => ({ ...message, is_mine: author_id === context.userId }));
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { channel: ChatChannel; content: string }) => ({
    channel: channelSchema.parse(input?.channel),
    content: z.string().trim().min(1).max(280).parse(input?.content),
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("send_chat_message", {
      _author_id: context.userId,
      _channel: data.channel,
      _content: data.content,
    });
    if (error?.message.includes("Rate limit")) throw new Error("Odczekaj 3 sekundy przed kolejną wiadomością.");
    if (error?.message.includes("Trainer profile")) throw new Error("Najpierw ustaw nick trenera.");
    if (error) throw new Error("Nie udało się wysłać wiadomości.");
    return { ok: true as const };
  });