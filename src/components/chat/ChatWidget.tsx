import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

function friendly(msg?: string) {
  if (!msg) return "Sorry, something went wrong. Please try again.";
  try { const j = JSON.parse(msg) as { error?: string }; if (j.error) return j.error; } catch { /* plain text */ }
  return msg;
}

const SUGGESTIONS = ["How do I submit a complaint?", "What services can I request?", "What are the latest announcements?"];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, setMessages, stop, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const t = data.session?.access_token;
        return t ? { Authorization: `Bearer ${t}` } : {};
      },
    }),
  });
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, status]);
  useEffect(() => { if (open && !busy) inputRef.current?.focus(); }, [open, busy]);

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    if (error) clearError();
    sendMessage({ text: t });
    setInput("");
  }

  const last = messages[messages.length - 1];
  const waiting = status === "submitted" || (status === "streaming" && last?.role === "assistant" && !last.parts.some((p) => p.type === "text" && p.text));

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open MyPag-asa assistant"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div role="dialog" aria-label="MyPag-asa assistant" className="fixed inset-x-3 bottom-3 z-50 flex h-[min(560px,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px]">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/15 font-display text-sm font-bold">P</div>
              <div>
                <p className="font-display text-sm font-semibold leading-tight">Pag-asa Helper</p>
                <p className="text-xs opacity-75">Ask about MyPag-asa services</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { stop(); setMessages([]); clearError(); }} aria-label="New conversation" className="rounded p-1.5 hover:bg-primary-foreground/15"><RotateCcw className="h-4 w-4" /></button>
              <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded p-1.5 hover:bg-primary-foreground/15"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-background p-4 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground">Hi! I can help you find your way around MyPag-asa — complaints, service requests, announcements and your account.</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              if (!text) return null;
              return m.role === "user" ? (
                <div key={m.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground whitespace-pre-wrap">{text}</div>
              ) : (
                <div key={m.id} className="prose prose-sm max-w-none text-foreground [&_ol]:pl-5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ul]:list-disc [&_p]:my-1.5 [&_li]:my-0.5"><ReactMarkdown>{text}</ReactMarkdown></div>
              );
            })}
            {waiting && (
              <div className="flex w-fit gap-1 rounded-2xl bg-muted px-3 py-3" aria-label="Assistant is typing">
                {[0, 150, 300].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                {friendly(error.message)}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 border-t bg-card p-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              maxLength={1000}
              placeholder="Type your question…"
              className={cn("max-h-28 min-h-10 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring")}
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send"><Send /></Button>
          </form>
        </div>
      )}
    </>
  );
}
