import * as React from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Lock, MessageCircle, RotateCcw, X } from "lucide-react";
import { Button } from "./ui/button";
import { Mark } from "./Logo";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm your AI racket technician. Ask me anything about strings, tension, setups or racket specs.",
};

const SUGGESTIONS = ["Is 52 lbs too tight for poly?", "Best string for tennis elbow?", "How often should I restring?"];

const HIDDEN_ON = ["/login", "/signup", "/payment-success"];

/** Floating AI technician. Club members chat live; everyone else sees what Club unlocks. */
export function ChatBot() {
  const [location] = useLocation();
  const { ent, loading } = useMe();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (loading || HIDDEN_ON.includes(location)) return null;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            aria-label="Ask the AI racket technician"
            className="fixed bottom-24 right-4 z-40 grid size-14 place-items-center rounded-full bg-ink text-bg shadow-lift md:bottom-6 md:right-6"
          >
            <MessageCircle className="size-6" />
            <span className="absolute right-1 top-1 size-3 rounded-full bg-ball ring-2 ring-ink" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-ink/30 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.section
              key="panel"
              role="dialog"
              aria-label="AI racket technician"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
              className={cn(
                "fixed z-50 flex flex-col overflow-hidden bg-surface shadow-lift ring-1 ring-line",
                "inset-x-0 bottom-0 h-[85dvh] rounded-t-3xl",
                "md:inset-auto md:bottom-6 md:right-6 md:h-[min(640px,80vh)] md:w-[400px] md:rounded-3xl",
              )}
            >
              <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-surface-2">
                    <Mark className="size-6" />
                  </span>
                  <div>
                    <p className="font-semibold leading-tight">Racket technician</p>
                    <p className="text-xs text-muted">{ent.chat ? "AI · replies in seconds" : "Club members only"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close chat">
                  <X />
                </Button>
              </header>
              {ent.chat ? <ChatPanel /> : <LockedPanel onNavigate={() => setOpen(false)} />}
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function LockedPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="safe-bottom flex flex-1 flex-col items-center justify-center px-8 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-ball text-ball-ink">
        <Lock className="size-6" />
      </span>
      <h2 className="display mt-5 text-3xl">Talk to a technician, any time.</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Live chat with our AI racket technician is part of 10IS Club — ask about tension, string swaps, arm pain or a frame you're eyeing.
      </p>
      <Button asChild className="mt-6" onClick={onNavigate}>
        <Link href="/pricing">See Club</Link>
      </Button>
    </div>
  );
}

function ChatPanel() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const convId = React.useRef<number | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  React.useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  function patchLast(fn: (m: ChatMessage) => ChatMessage) {
    setMessages((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      if (!convId.current) {
        const conv = await api<{ id: number }>("POST", "/api/conversations", { title: content.slice(0, 60) });
        convId.current = conv.id;
      }
      const res = await fetch(`/api/conversations/${convId.current}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "The technician couldn't reply. Please try again.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const data = JSON.parse(line.slice(5));
          if (data.content) patchLast((m) => ({ ...m, content: m.content + data.content }));
          if (data.error) throw new Error(data.error);
        }
      }
    } catch (err) {
      patchLast((m) => ({
        ...m,
        error: true,
        content: m.content || (err instanceof Error ? err.message : "Something went wrong."),
      }));
    } finally {
      setStreaming(false);
    }
  }

  function reset() {
    convId.current = null;
    setMessages([GREETING]);
  }

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed",
                m.role === "user"
                  ? "rounded-br-md bg-ink text-bg"
                  : m.error
                    ? "rounded-bl-md bg-brand-soft text-brand"
                    : "rounded-bl-md bg-surface-2 text-ink",
              )}
            >
              {m.role === "assistant" && !m.content ? (
                <span className="flex gap-1 py-1" aria-label="Typing">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 120}ms` }} />
                  ))}
                </span>
              ) : m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none text-inherit prose-p:my-1.5 prose-p:text-inherit prose-ul:my-1.5 prose-li:my-0.5 prose-li:text-inherit prose-strong:text-inherit">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-ink/30 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="safe-bottom border-t border-line px-3 pt-3 [&>*]:mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-end gap-2">
          {messages.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={reset} aria-label="New conversation" disabled={streaming}>
              <RotateCcw />
            </Button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Ask about strings, tension…"
            aria-label="Message"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-bg px-4 py-2.5 text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
          <Button type="submit" size="icon" disabled={!input.trim()} loading={streaming} aria-label="Send">
            {!streaming && <ArrowUp />}
          </Button>
        </div>
      </form>
    </>
  );
}
