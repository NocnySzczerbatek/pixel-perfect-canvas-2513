import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, MessageCircle, Send } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import { getChatMessages, sendChatMessage, type ChatChannel } from "@/lib/chat.functions";

const CHANNEL_LABELS: Record<ChatChannel, string> = { global: "Czat Globalny", trade: "Czat Handlowy" };

export function PlayerChat() {
  const { session, loading } = useSession();
  const queryClient = useQueryClient();
  const fetchMessages = useServerFn(getChatMessages);
  const sendMessage = useServerFn(sendChatMessage);
  const [expanded, setExpanded] = useState(false);
  const [channel, setChannel] = useState<ChatChannel>("global");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryKey = ["player-chat", channel] as const;
  const { data: messages = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchMessages({ data: { channel } }),
    enabled: Boolean(session) && expanded,
    refetchInterval: expanded ? 5000 : false,
  });

  useEffect(() => {
    if (expanded) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [expanded, channel, messages.length]);

  if (loading || !session) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = content.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      await sendMessage({ data: { channel, content: message } });
      setContent("");
      await queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się wysłać wiadomości.");
    } finally {
      setSending(false);
    }
  };

  if (!expanded) {
    return (
      <Button className="fixed bottom-5 right-5 z-50 shadow-xl" onClick={() => setExpanded(true)}>
        <MessageCircle aria-hidden="true" /> Czat
      </Button>
    );
  }

  return (
    <aside className="glass-panel fixed bottom-5 right-5 z-50 flex h-[min(32rem,calc(100dvh-2.5rem))] w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-lg" aria-label="Czat graczy">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 font-display text-lg"><MessageCircle className="h-4 w-4" /> Czat graczy</div>
        <Button type="button" size="icon" variant="ghost" aria-label="Zwiń czat" title="Zwiń czat" onClick={() => setExpanded(false)}>
          <ChevronDown />
        </Button>
      </header>
      <Tabs value={channel} onValueChange={(value) => setChannel(value as ChatChannel)} className="px-3 pt-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global">Globalny</TabsTrigger>
          <TabsTrigger value="trade">Handlowy</TabsTrigger>
        </TabsList>
      </Tabs>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3" aria-live="polite">
        {isLoading ? <p className="text-center text-sm text-muted-foreground">Wczytuję wiadomości…</p> : null}
        {isError ? <p className="text-center text-sm text-destructive">Nie udało się pobrać czatu.</p> : null}
        {!isLoading && !isError && messages.length === 0 ? <p className="text-center text-sm text-muted-foreground">Brak wiadomości na kanale {CHANNEL_LABELS[channel].toLowerCase()}.</p> : null}
        {messages.map((message) => (
          <div key={message.id} className={`rounded-md border px-3 py-2 text-sm ${message.is_mine ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/50"}`}>
            <div className="flex items-baseline justify-between gap-3">
              <strong className="min-w-0 truncate text-xs text-primary">{message.trainer_name}</strong>
              <time className="shrink-0 text-[10px] text-muted-foreground" dateTime={message.created_at}>
                {new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}
              </time>
            </div>
            <p className="mt-1 break-words text-foreground">{message.content}</p>
          </div>
        ))}
      </div>
      <form className="border-t border-border p-3" onSubmit={submit}>
        <Textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={280} rows={2} placeholder={`Wiadomość: ${CHANNEL_LABELS[channel]}`} className="min-h-16 resize-none" />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{content.length}/280</span>
          <Button type="submit" size="sm" disabled={sending || !content.trim()}>
            <Send /> {sending ? "Wysyłanie…" : "Wyślij"}
          </Button>
        </div>
      </form>
    </aside>
  );
}