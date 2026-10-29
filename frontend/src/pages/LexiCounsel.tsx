import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Send, Sparkles, ShieldCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  citation?: string;
  text: string;
  timestamp: string;
}

const initialMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'user',
    text: 'What are the statutory requirements under Section 27 of the Indian Contract Act regarding non-compete clauses for departing enterprise employees?',
    timestamp: '10:42 AM',
  },
  {
    id: 'msg-2',
    sender: 'ai',
    citation: 'ICA 1872 § 27 • RESTRAINT OF TRADE & EMPLOYMENT PRECEDENT',
    text: 'Under Section 27 of the Indian Contract Act, 1872, any agreement by which anyone is restrained from exercising a lawful profession, trade, or business of any kind is void to that extent. Unlike Anglo-American common law jurisdictions that apply a test of "reasonableness", Indian jurisprudence (established in Niranjan Shankar Golikari v. Century Spg. & Mfg. Co. and reaffirmed in Percept D\'Mark v. Zaheer Khan) strictly invalidates post-termination non-compete covenants. However, non-solicitation of clients/employees and non-disclosure of trade secrets remain enforceable if reasonably circumscribed in duration and scope.',
    timestamp: '10:42 AM',
  },
  {
    id: 'msg-3',
    sender: 'user',
    text: 'How does the Digital Personal Data Protection (DPDP) Act, 2023 impact cross-border data transfers in vendor agreements?',
    timestamp: '10:44 AM',
  },
  {
    id: 'msg-4',
    sender: 'ai',
    citation: 'DPDP ACT 2023 § 16 • CROSS-BORDER TRANSFERS & FIDUCIARY SAFEGUARDS',
    text: 'Under Section 16 of the DPDP Act 2023, personal data transfers outside India are permissible unless the Central Government restricts transfer to specific jurisdictions via a "negative list" notification. Crucially, enterprise Data Fiduciaries must execute contractual addenda that mandate Data Processors implement verifiable technical and organizational security safeguards (Section 8(5)), guarantee erasure upon withdrawal of consent or purpose realization (Section 8(7)), and report personal data breaches without delay to the Data Protection Board of India (DPBI) and affected Data Principals.',
    timestamp: '10:45 AM',
  },
];

export function LexiCounsel() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const userText = inputQuery.trim();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      const aiReply: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        citation: 'STATUTORY VECTOR RAG • INDIAN CONTRACT ACT & DPDP CORPUS',
        text: `Analysis of query against statutory corpus: Based on relevant provisions and institutional precedents, enforceability turns upon whether the clause imposes an absolute restriction or creates a conditional obligation. For cross-border agreements under Indian jurisdiction, ensure reciprocal indemnity carve-outs, clear dispute resolution escalations (Arbitration and Conciliation Act 1996), and explicit compliance with DPDP Act 2023 data fiduciary obligations.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiReply]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f7f4] text-slate-900 overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">
            Lexi-Counsel (RAG Database)
          </h1>
          <p className="text-[11px] font-mono text-slate-500">
            Interactive legal encyclopedia powered by Indian Contract Act & DPDP Act 2023 vectors.
          </p>
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
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div
                key={msg.id}
                className="bg-slate-50 rounded-xl border border-slate-200 p-4 max-w-2xl ml-auto text-sm font-medium text-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    Legal Counsel Query
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
                </div>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className="bg-white rounded-2xl border border-emerald-300 shadow-sm p-6 max-w-3xl"
            >
              <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center space-x-2 mb-4 rounded-t-xl">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">{msg.citation || 'STATUTORY CITATION'}</span>
              </div>
              <p className="font-serif text-slate-900 leading-loose text-sm whitespace-pre-line">
                {msg.text}
              </p>
            </div>
          );
        })}

        {isTyping && (
          <div className="bg-white rounded-2xl border border-emerald-300 shadow-sm p-6 max-w-3xl animate-pulse">
            <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center space-x-2 mb-4 rounded-t-xl">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
              <span>RETRIEVING STATUTORY VECTORS & PRECEDENTS...</span>
            </div>
            <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-5/6" />
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask Lexi-Counsel about Indian Contract Act sections, DPDP 2023 compliance, or enforceability..."
            className="bg-[#fbfbfa] border border-slate-300 rounded-xl p-3 text-sm font-sans w-full focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isTyping}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 shrink-0 disabled:opacity-50 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default LexiCounsel;
