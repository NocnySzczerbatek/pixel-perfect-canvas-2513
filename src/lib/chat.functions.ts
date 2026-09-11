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
    const { data: rows, error } = await context.supabase
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
    const [{ data: profile }, { data: recent }] = await Promise.all([
      context.supabase.from("profiles").select("trainer_name").eq("id", context.userId).maybeSingle(),
      context.supabase.from("chat_messages").select("created_at").eq("author_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (!profile?.trainer_name) throw new Error("Najpierw ustaw nick trenera.");
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 3000) {
      throw new Error("Odczekaj 3 sekundy przed kolejną wiadomością.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("chat_messages").insert({
      author_id: context.userId,
      trainer_name: String(profile.trainer_name).slice(0, 40),
      channel: data.channel,
      content: data.content,
    });
    if (error) throw new Error("Nie udało się wysłać wiadomości.");
    return { ok: true as const };
  });