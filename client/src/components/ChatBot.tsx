import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useUser } from "@/contexts/UserContext";
import signatureLogo from "@/assets/Hevini_08_Signature.png";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export function ChatBot() {
  const { canUseChat, isAdmin, loading } = useUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI Racket Technician. Ask me anything about strings, tension, setups, or racket specs.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async (): Promise<number> => {
    if (conversationId) return conversationId;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: "Chat session" }),
    });
    const data = await res.json();
    setConversationId(data.id);
    return data.id;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsStreaming(true);
    try {
      const convId = await startConversation();
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text }),
      });
      if (!response.body) throw new Error("No stream");
      setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant")
                  updated[updated.length - 1] = { ...last, content: last.content + json.content };
                return updated;
              });
            }
            if (json.done) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant")
                  updated[updated.length - 1] = { ...last, streaming: false };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) return null;

  return (
    <>
      <motion.button
        className="fixed bottom-6 right-6 z-50 rounded-full bg-[#0A0A0A] border border-[#2A2A2A] text-white shadow-2xl shadow-black/50 flex items-center gap-2.5 px-4 py-2.5 hover:border-[#444] transition-colors"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open 10IS Technician chat"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }} className="flex items-center gap-2">
              <X className="w-4 h-4 text-net-grey" />
              <span className="text-[11px] font-bold uppercase text-net-grey" style={{ letterSpacing: "0.1em" }}>Close</span>
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }} className="flex items-center gap-2">
              <img src={signatureLogo} alt="" className="w-5 h-5 object-contain" />
              <span className="text-[11px] font-bold uppercase text-court-white" style={{ letterSpacing: "0.08em" }}>Chat with 10IS AI</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-[#0F0F0F] border border-[#1E1E1E] rounded-[4px] shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
            style={{ height: "520px" }}
          >
            <div className="px-4 py-3 bg-hevini-red text-white flex items-center gap-3 shrink-0">
              <img src={signatureLogo} alt="" className="w-6 h-6 object-contain" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] leading-tight uppercase" style={{ letterSpacing: "0.08em" }}>
                  10IS Technician
                </div>
              </div>
              {(canUseChat || isAdmin) && (
                <span className="text-[10px] font-bold bg-hevini-red-dark px-2 py-0.5 uppercase" style={{ letterSpacing: "0.1em" }}>
                  Club
                </span>
              )}
            </div>

            {!(canUseChat || isAdmin) ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center bg-[#0F0F0F]">
                <div className="w-16 h-16 rounded-full bg-hevini-red/10 border border-hevini-red/40 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-hevini-red" />
                </div>
                <div>
                  <p className="text-hevini-red text-[10px] font-bold uppercase mb-2" style={{ letterSpacing: "0.15em" }}>
                    Club Feature
                  </p>
                  <p className="text-sm text-net-grey leading-relaxed">
                    Live chat with your 10IS Technician. String advice, injury-safe setups, and tension tuning — all in one conversation.
                  </p>
                </div>
                <Link href="/pricing" className="w-full" onClick={() => setOpen(false)}>
                  <Button
                    className="w-full bg-hevini-red hover:bg-hevini-red-dark text-white rounded-[2px] font-bold uppercase border-0"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    Upgrade to Club — $1.99/mo
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth bg-[#0F0F0F]">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-hevini-red text-white rounded-[4px] rounded-br-none"
                            : "bg-[#1A1A1A] text-court-white rounded-[4px] rounded-bl-none"
                        }`}
                      >
                        {msg.content}
                        {msg.streaming && (
                          <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 rounded-sm animate-pulse" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start">
                      <div className="bg-[#1A1A1A] rounded-[4px] rounded-bl-none px-3 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-net-grey" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-[#1E1E1E] shrink-0 bg-[#0F0F0F]">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about strings, tension, rackets..."
                      className="flex-1 h-10 text-sm rounded-[2px] bg-[#1A1A1A] border border-[#262626] text-court-white placeholder:text-net-grey focus-visible:ring-1 focus-visible:ring-hevini-red focus-visible:border-hevini-red"
                      disabled={isStreaming}
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 rounded-[2px] bg-hevini-red hover:bg-hevini-red-dark text-white shrink-0 border-0"
                      onClick={sendMessage}
                      disabled={!input.trim() || isStreaming}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-net-grey text-center mt-2 uppercase" style={{ letterSpacing: "0.1em" }}>
                    AI advice — consult a pro stringer for final setup
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
