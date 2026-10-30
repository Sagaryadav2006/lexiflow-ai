import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Send, ShieldCheck, Loader2 } from 'lucide-react';
import { useSessionStorage } from '../hooks/useSessionStorage';

interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: string[];
}

export function LexiCounsel() {
  const [messages, setMessages] = useSessionStorage<Message[]>(
    'counsel_chat_history',
    [
      {
        role: 'ai',
        content:
          'I am Lexi-Counsel, your AI legal expert on the DPDP Act 2023 and Indian Contract Act. How can I assist you today?',
      },
    ]
  );
  const [input, setInput] = useSessionStorage<string>('counsel_input_query', '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/counsel/seed`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Server returned HTTP ${response.status}`);
      }

      alert('Database Seeded successfully!');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Database seeding failed: ${errorMsg}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMessage: Message = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/counsel/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const aiMessage: Message = {
        role: 'ai',
        content: data.answer || 'No response returned from legal corpus.',
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      const aiErrorMessage: Message = {
        role: 'ai',
        content: `Error: Unable to retrieve legal counsel (${errMsg}). Please check backend connectivity or try again.`,
      };
      setMessages((prev) => [...prev, aiErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f7f4] text-slate-900 overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">
            Lexi-Counsel (RAG Database)
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-mono text-slate-500">
              Interactive legal encyclopedia powered by Indian Contract Act & DPDP Act 2023 vectors.
            </span>
            <button
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
              className="text-xs text-slate-400 hover:text-emerald-600 cursor-pointer transition disabled:opacity-50"
              title="Seed MongoDB vector store with DPDP and Contract Act statutory chunks"
            >
              {isSeeding ? '[Seeding Database...]' : '[Initialize Database]'}
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            DPDP & ICA INDEXED
          </span>
        </div>
      </header>

      {/* Chat Canvas */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => {
          if (msg.role === 'user') {
            return (
              <div
                key={idx}
                className="bg-slate-50 rounded-xl border border-slate-200 p-4 max-w-2xl ml-auto text-sm font-medium text-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    Legal Counsel Query
                  </span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-emerald-300 shadow-sm p-6 max-w-3xl"
            >
              <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center space-x-2 mb-4 rounded-t-xl">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">STATUTORY CITATION & ANALYSIS</span>
              </div>
              <p className="font-serif text-slate-900 leading-loose text-sm whitespace-pre-line">
                {msg.content}
              </p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Statutory Sources:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {msg.sources.map((source, sIdx) => (
                      <span
                        key={sIdx}
                        className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-mono font-medium inline-block mr-2 mt-2"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="bg-white rounded-2xl border border-emerald-300 shadow-sm p-6 max-w-3xl">
            <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center space-x-2 mb-4 rounded-t-xl">
              <Loader2 className="w-3.5 h-3.5 text-emerald-700 animate-spin shrink-0" />
              <span>Consulting statutory vectors...</span>
            </div>
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-5/6" />
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Lexi-Counsel about Indian Contract Act sections, DPDP 2023 compliance, or enforceability..."
            className="bg-[#fbfbfa] border border-slate-300 rounded-xl p-3 text-sm font-sans w-full focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 shrink-0 disabled:opacity-50 transition"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default LexiCounsel;
