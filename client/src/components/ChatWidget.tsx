import { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    setIsPro(localStorage.getItem('pro_user') === 'true');
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function createConversation(): Promise<number> {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Chat' }),
    });
    const data = await res.json();
    return data.id as number;
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);

    let convId = conversationId;
    if (!convId) {
      convId = await createConversation();
      setConversationId(convId);
    }

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: userMsg }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const { content } = JSON.parse(payload);
            if (content) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: updated[updated.length - 1].content + content,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-[52px] h-[52px] bg-hevini-red text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
          style={{ borderRadius: '2px' }}
          aria-label="Open chat"
        >
          <MessageSquare size={20} />
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[360px] h-[520px] bg-[#0F0F0F] border border-[#222] flex flex-col shadow-2xl"
          style={{ borderRadius: '2px' }}
        >
          {/* Header */}
          <div className="bg-hevini-red px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-black tracking-widest uppercase text-xs">10IS Technician</span>
              <span
                className="bg-white text-hevini-red text-[8px] font-black px-1.5 py-0.5 tracking-wider uppercase leading-none"
                style={{ borderRadius: '2px' }}
              >
                PRO
              </span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {!isPro ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 bg-hevini-red/10 flex items-center justify-center mb-4" style={{ borderRadius: '2px' }}>
                <MessageSquare size={20} className="text-hevini-red" />
              </div>
              <p className="text-white font-bold text-xs mb-2 uppercase tracking-widest">Pro Feature</p>
              <p className="text-net-grey text-xs leading-relaxed mb-6 max-w-[200px]">
                Get expert AI string advice from the 10IS Technician.
              </p>
              <button
                onClick={() => {
                  localStorage.setItem('pro_user', 'true');
                  setIsPro(true);
                }}
                className="bg-hevini-red text-white text-[11px] font-bold tracking-widest uppercase px-6 py-2.5 hover:bg-red-700 transition-colors"
                style={{ borderRadius: '2px' }}
              >
                Upgrade to Pro
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {messages.length === 0 && (
                  <p className="text-net-grey text-xs text-center py-6 leading-relaxed">
                    Ask about strings, tension, gauges, or your setup.
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] text-xs px-3 py-2 leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-hevini-red text-white'
                          : 'bg-[#1a1a1a] text-court-white'
                      }`}
                      style={{ borderRadius: '2px' }}
                    >
                      {msg.content || (streaming && msg.role === 'assistant' ? (
                        <span className="opacity-50">...</span>
                      ) : '')}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-[#1a1a1a] flex gap-2 flex-shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask about strings..."
                  disabled={streaming}
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs px-3 py-2 placeholder:text-net-grey focus:outline-none focus:border-hevini-red transition-colors disabled:opacity-50"
                  style={{ borderRadius: '2px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={streaming || !input.trim()}
                  className="bg-hevini-red text-white p-2 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  style={{ borderRadius: '2px' }}
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
