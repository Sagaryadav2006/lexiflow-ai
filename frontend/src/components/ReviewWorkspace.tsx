import { useState } from 'react';
import { useAgentStream } from '../hooks/useAgentStream';
import { DocumentPane } from './DocumentPane';
import { Toaster } from './ui/toaster';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MessageCircle, X, PanelLeftClose, PanelLeftOpen, LayoutDashboard, Mail, FileText, AlertTriangle, ShieldAlert, CheckCircle, Coins, ArrowRight, Activity, Search, Scale } from 'lucide-react';
import type { Clause } from '../hooks/useAgentStream';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function extractSafeText(data: any, fallbackKey: string = 'text'): string {
  if (!data) return "No response generated.";
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    if (data.email) return typeof data.email === 'string' ? data.email : JSON.stringify(data.email);
    if (data.reply) return typeof data.reply === 'string' ? data.reply : JSON.stringify(data.reply);
    if (data.email_draft) return typeof data.email_draft === 'string' ? data.email_draft : JSON.stringify(data.email_draft);
    if (data[fallbackKey]) return typeof data[fallbackKey] === 'string' ? data[fallbackKey] : JSON.stringify(data[fallbackKey]);
    if (data.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

export function ReviewWorkspace() {
  const [contractId, setContractId] = useState<string | null>(null);
  const [initialClauses, setInitialClauses] = useState<Clause[]>([]);
  const [activeView, setActiveView] = useState('workspace');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleUpload = (id: string, clauses?: Clause[]) => {
    setContractId(id);
    if (clauses) {
      setInitialClauses(clauses);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans selection:bg-indigo-500/30">
      <aside className={`border-r border-zinc-800/80 bg-zinc-900/95 p-5 flex flex-col gap-6 fixed h-screen z-40 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20 items-center' : 'w-64'}`}>
        <div className="flex items-center justify-between w-full pt-1">
          {!isSidebarCollapsed && (
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-teal-300 bg-clip-text text-transparent truncate m-0">
              LexiFlow AI
            </h1>
          )}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors flex-shrink-0">
            {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        <div className={`flex items-center text-xs font-medium text-zinc-400 px-2.5 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60 ${isSidebarCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
          <span className="flex items-center gap-2.5" title={contractId ? 'Agent Active' : 'Agent Waiting'}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${contractId ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50' : 'bg-zinc-600'}`}></div>
            {!isSidebarCollapsed && <span className="text-zinc-300">Agent {contractId ? 'Active' : 'Standby'}</span>}
          </span>
        </div>

        <nav className="flex flex-col gap-2 mt-2 w-full">
          <Button
            variant={activeView === 'workspace' ? 'secondary' : 'ghost'}
            className={`justify-start font-medium ${isSidebarCollapsed ? 'px-2 justify-center' : ''} ${activeView === 'workspace' ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/25' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'}`}
            onClick={() => setActiveView('workspace')}
            disabled={!contractId}
            title="Audit Workspace"
          >
            <FileText className={`w-4 h-4 flex-shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
            {!isSidebarCollapsed && "Audit Workspace"}
          </Button>
          <Button
            variant={activeView === 'dashboard' ? 'secondary' : 'ghost'}
            className={`justify-start font-medium ${isSidebarCollapsed ? 'px-2 justify-center' : ''} ${activeView === 'dashboard' ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/25' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'}`}
            onClick={() => setActiveView('dashboard')}
            disabled={!contractId}
            title="Report Dashboard"
          >
            <LayoutDashboard className={`w-4 h-4 flex-shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
            {!isSidebarCollapsed && "Report Dashboard"}
          </Button>
          <Button
            variant={activeView === 'email' ? 'secondary' : 'ghost'}
            className={`justify-start font-medium ${isSidebarCollapsed ? 'px-2 justify-center' : ''} ${activeView === 'email' ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/25' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'}`}
            onClick={() => setActiveView('email')}
            disabled={!contractId}
            title="Email Generator"
          >
            <Mail className={`w-4 h-4 flex-shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
            {!isSidebarCollapsed && "Email Generator"}
          </Button>
        </nav>
      </aside>

      <main className={`flex-1 p-6 h-screen overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        {contractId ? (
          <ActiveWorkspace contractId={contractId} activeView={activeView} setActiveView={setActiveView} initialClauses={initialClauses} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <UploadForm onUpload={handleUpload} />
          </div>
        )}
      </main>

      {contractId && <FloatingChat contractId={contractId} />}
      <Toaster />
    </div>
  );
}

function FloatingChat({ contractId }: { contractId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage) return;

    const userMessage = chatMessage;
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/api/contracts/${contractId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      if (!res.ok) {
        throw new Error('Failed to fetch chat response');
      }
      const data = await res.json();
      const parsedText = extractSafeText(data, 'reply');

      setChatHistory(prev => [...prev, { role: 'model', content: parsedText }]);
    } catch (e: any) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'model', content: `Error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="z-50 fixed bottom-6 right-6 flex flex-col items-end">
      {isOpen && (
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 w-[420px] h-[540px] mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950/60 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
              <h3 className="font-semibold text-sm text-zinc-100">AI Legal Advisor</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800/60">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 && (
              <div className="text-xs text-zinc-500 italic text-center mt-6">Ask a question about the contract or general legal principles.</div>
            )}
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm overflow-hidden ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40' : 'bg-zinc-950 border border-zinc-800/80 text-zinc-200'}`}>
                  {msg.role === 'user' ? (
                    String(msg.content)
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-left">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {String(msg.content)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-xs bg-zinc-950 border border-zinc-800 text-zinc-400 animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
          </div>
          <div className="p-3.5 border-t border-zinc-800 bg-zinc-950/60">
            <form onSubmit={handleChat} className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Button type="submit" disabled={isLoading || !chatMessage} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4">
                Send
              </Button>
            </form>
          </div>
        </div>
      )}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-950/50 flex items-center justify-center transition-transform hover:scale-105"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>
    </div>
  );
}

function UploadForm({ onUpload }: { onUpload: (id: string, clauses?: Clause[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    try {
      setUploadError(null);
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:8000/api/contracts/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw { response: { data: errorData }, message: `Upload failed with status: ${res.status}` };
      }

      const data = await res.json();
      if (data.contract_id) {
        onUpload(data.contract_id, data.clauses);
      }
    } catch (err: any) {
      console.error("[Upload Error]:", err);
      const message = err.response?.data?.detail || err.message || "Failed to analyze document";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800/90 p-8 shadow-2xl w-full max-w-lg">
      <h2 className="text-2xl font-bold mb-2 tracking-tight text-zinc-100">Upload Contract</h2>
      <p className="text-zinc-400 mb-8 text-sm">Upload a PDF or Word document to begin the deterministic AI audit process.</p>

      {uploadError && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-400 text-sm flex items-start gap-3">
          <div className="break-words">
            <span className="font-semibold block mb-1">Upload Failed</span>
            {uploadError}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="border-2 border-dashed border-zinc-800 bg-zinc-950/50 rounded-xl p-8 text-center hover:border-indigo-500/50 transition-colors">
          <input
            type="file"
            id="file-upload"
            accept=".pdf,.docx"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <span className="text-sm font-medium text-zinc-300">
              {file ? file.name : 'Click to select a .docx or .pdf contract'}
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={!file || isUploading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-950/40"
        >
          {isUploading ? 'Uploading...' : 'Analyze Document'}
        </button>
      </form>
    </div>
  );
}

function ActiveWorkspace({ contractId, activeView, setActiveView, initialClauses }: { contractId: string, activeView: string, setActiveView: (view: string) => void, initialClauses: Clause[] }) {
  const { clauses, setClauses } = useAgentStream(contractId, initialClauses);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleCommitSuccess = (clauseId: string, final_text: string) => {
    setClauses(prev => prev.map(c => {
      if (c.clause_id === clauseId) {
        return {
          ...c,
          original_text: final_text,
          risk_score: 0,
          prosecutor_flags: [],
          amended_text: "",
          playbook_rules: []
        };
      }
      return c;
    }));
  };

  const onViewClause = (idx: number) => {
    setCurrentIndex(idx);
    setActiveView('workspace');
  };

  if (activeView === 'dashboard') {
    return <ReportDashboard contractId={contractId} clauses={clauses} onViewClause={onViewClause} />;
  }

  if (activeView === 'email') {
    return <EmailGeneratorView contractId={contractId} clauses={clauses} />;
  }

  const totalScore = clauses.reduce((acc, c) => acc + (c.risk_score || 0), 0);
  const maxScore = clauses.length * 10;
  const criticalCount = clauses.filter(c => (c.risk_score || 0) >= 7).length;
  const safeCount = clauses.filter(c => (c.risk_score || 0) <= 3).length;

  return (
    <div className="h-full max-w-6xl mx-auto flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-5 shrink-0">
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Total Risk Score</div>
          <div className="text-2xl font-bold text-zinc-100">{totalScore} <span className="text-zinc-500 font-normal">/ {maxScore}</span></div>
        </div>
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-500" /> Critical Risks</div>
          <div className="text-2xl font-bold text-rose-400">{criticalCount}</div>
        </div>
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Safe Clauses</div>
          <div className="text-2xl font-bold text-emerald-400">{safeCount}</div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <DocumentPane
          clauses={clauses}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          onCommitSuccess={handleCommitSuccess}
        />
      </div>
    </div>
  );
}

function ReportDashboard({ contractId, clauses, onViewClause }: { contractId: string, clauses: Clause[], onViewClause: (idx: number) => void }) {
  const totalClauses = clauses.length;
  const highRiskClauses = clauses.filter(c => (c.risk_score || 0) >= 7);
  const highRiskFlags = highRiskClauses.length;

  let financialExposure = 0;
  let hasFinancialRisk = false;
  highRiskClauses.forEach(clause => {
    const text = clause.original_text;
    const matches = text.match(/\$[0-9,]+/g);
    if (matches) {
      hasFinancialRisk = true;
      matches.forEach(m => {
        const amount = parseInt(m.replace(/[$,]/g, ''), 10);
        if (!isNaN(amount)) {
          financialExposure += amount;
        }
      });
    }
  });

  const displayExposure = hasFinancialRisk ? `$${financialExposure.toLocaleString()} Identified` : (highRiskFlags > 0 ? "Unquantified Risk Detected" : "$0 Liability");
  const isPredatory = highRiskFlags > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Executive Risk Metrics Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-400" />
            Executive Legal Health Suite
          </h2>
          <p className="text-zinc-400 mt-2 text-sm">Comprehensive risk analytics and actionable insights.</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className={`px-4 py-1.5 text-xs font-medium ${isPredatory ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
            {isPredatory ? (
              <><ShieldAlert className="w-4 h-4 mr-2 inline" /> Action Required: Predatory Terms</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2 inline" /> Audit Status: Clear</>
            )}
          </Badge>
          <Button onClick={() => window.open('http://localhost:8000/api/contracts/' + contractId + '/export/report')} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/40">
            Export Audit Report (.docx)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Coins className="w-4 h-4 text-amber-400" /> Financial Exposure</h3>
          <p className={`text-3xl font-bold ${hasFinancialRisk ? 'text-amber-400' : 'text-zinc-100'}`}>{displayExposure}</p>
        </div>
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-indigo-400" /> Risk Category Breakdown</h3>
          <div className="flex flex-col gap-2.5 mt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-300">Financial Penalties</span>
              {hasFinancialRisk ? <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30">High</Badge> : <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Low</Badge>}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-300">Liability / Indemnity</span>
              {highRiskFlags > 0 ? <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30">Moderate</Badge> : <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Safe</Badge>}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-300">Termination Rights</span>
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Safe</Badge>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Scale className="w-4 h-4 text-teal-400" /> Audit Overview</h3>
          <div>
            <p className="text-3xl font-bold text-zinc-100 mb-1">{totalClauses} <span className="text-lg font-normal text-zinc-500">clauses reviewed</span></p>
            <p className="text-sm text-zinc-400"><strong className="text-zinc-200">{highRiskFlags}</strong> flagged for immediate attention.</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
        <h3 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center gap-2"><Search className="w-5 h-5 text-indigo-400" /> Actionable Findings Table</h3>

        {clauses.filter(c => c.risk_score > 0).length === 0 ? (
          <div className="text-center p-8 text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-800">No risks detected in the document.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
            <table className="w-full text-left text-sm text-zinc-300 border-collapse">
              <thead className="text-xs uppercase bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Clause & Topic</th>
                  <th className="px-4 py-3.5 font-semibold">Severity</th>
                  <th className="px-4 py-3.5 font-semibold w-1/3">Primary Violation</th>
                  <th className="px-4 py-3.5 font-semibold w-1/3">Recommended Remedy</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/40">
                {clauses.map((clause, idx) => {
                  if (clause.risk_score === 0) return null;
                  const isHighRisk = clause.risk_score >= 7;
                  return (
                    <tr key={clause.clause_id} className="hover:bg-zinc-950/60 transition-colors">
                      <td className="px-4 py-4 font-medium text-zinc-200">Clause {idx + 1}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={isHighRisk ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}>
                          {isHighRisk ? `Critical - ${clause.risk_score}/10` : `Warning - ${clause.risk_score}/10`}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 truncate max-w-xs" title={clause.prosecutor_flags?.[0] || 'Unfavorable terms detected'}>
                        {clause.prosecutor_flags?.[0] || 'Unfavorable terms detected'}
                      </td>
                      <td className="px-4 py-4 truncate max-w-xs" title={clause.amended_text || 'Requires manual review'}>
                        {clause.amended_text ? 'Accept AI recommended amendment' : 'Requires manual review'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/50" onClick={() => onViewClause(idx)}>
                          Review <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmailGeneratorView({ contractId, clauses }: { contractId: string, clauses: Clause[] }) {
  const [isEmailGenerating, setIsEmailGenerating] = useState(false);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!emailDraft) return;
    navigator.clipboard.writeText(emailDraft);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const generateEmail = async () => {
    setIsEmailGenerating(true);
    try {
      const riskyClauses = clauses.filter(c => (c.risk_score || 0) >= 4);
      const res = await fetch(`http://localhost:8000/api/contracts/${contractId}/generate-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clauses: riskyClauses })
      });
      const data = await res.json();
      const parsedText = extractSafeText(data, 'email');

      setEmailDraft(parsedText);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEmailGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-100">Email Generator</h2>
        <p className="text-zinc-400 mt-2 text-sm">Generate a professional pushback email based on the high-risk clauses found.</p>
      </div>

      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Button onClick={generateEmail} disabled={isEmailGenerating} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/40">
            {isEmailGenerating ? "Generating..." : "Generate Pushback Email"}
          </Button>
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={handleCopy} disabled={!emailDraft} className="border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 w-28">
              {isCopied ? "Copied!" : "Copy Email"}
            </Button>
            <Button variant="outline" onClick={() => window.open('http://localhost:8000/api/contracts/' + contractId + '/export/email')} disabled={!emailDraft} className="border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-300">
              Download as .docx
            </Button>
          </div>
        </div>

        <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-xl p-6 shadow-inner min-h-[400px] text-zinc-300 font-sans leading-relaxed">
          <div className="border-b border-zinc-800/80 pb-4 mb-5 text-sm text-zinc-400 space-y-1">
            <p><strong className="text-zinc-200">To:</strong> Opposing Counsel</p>
            <p><strong className="text-zinc-200">From:</strong> LexiFlow AI</p>
            <p><strong className="text-zinc-200">Subject:</strong> Contract Redline Review</p>
          </div>
          {isEmailGenerating ? (
            <p className="text-zinc-400 animate-pulse">Drafting your email...</p>
          ) : emailDraft ? (
            <div className="prose prose-invert max-w-none text-left">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {String(emailDraft)}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-zinc-500">No draft generated yet. Click the button above to generate.</p>
          )}
        </div>
      </div>
    </div>
  );
}