import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  FileText,
  LayoutDashboard,
  FileSearch,
  SendToBack,
  Download,
  ArrowRight,
  FileCheck,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  AlertTriangle,
  ShieldX,
  Sparkles,
  BookOpen,
  ListOrdered,
  Search,
  X,
  ChevronRight,
  Columns2,
  GitCommit,
  Check,
  ShieldCheck,
  Copy,
  CheckCircle,
  CheckCircle2,
  Mail,
  Paperclip,
  Send,
  FileDown,
  ClipboardCheck,
  FileCheck2,
  Upload,
  Loader2,
  Bot
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ProcessedClause {
  clause_id: string;
  clause_index: number;
  title: string;
  section: string;
  risk_score: number;
  risk_category: 'Critical' | 'High' | 'Moderate' | 'Safe';
  original_text: string;
  amended_text: string;
  analysis: string[];
  exposure: string;
  exposure_amount: number;
  flags: number;
  role?: string;
  jurisdiction?: string;
  status?: string;
}

function extractTitleAndSection(text: string, index: number) {
  if (!text) return { title: `Clause ${index}`, section: `Article ${index}` };
  const firstLine = text.trim().split('\n')[0].trim();

  const sectionMatch = firstLine.match(
    /^(?:ARTICLE\s+([IVXLCDM\d]+)|SECTION\s+(\d+)|\b(\d+)[.)])\s*[:.-]?\s*([A-Za-z0-9\s&,/-]+?)(?:\.|:|\n|$)/i
  );
  if (sectionMatch) {
    const secNum = sectionMatch[1] || sectionMatch[2] || sectionMatch[3] || String(index);
    const cleanTitle = sectionMatch[4].trim();
    if (cleanTitle.length > 2 && cleanTitle.length < 60) {
      return {
        title: cleanTitle,
        section: `Article ${secNum}: ${cleanTitle}`
      };
    }
  }

  const titleLeadMatch = firstLine.match(/^([A-Z][A-Za-z0-9\s&,/-]{2,45})(?::|\.|—|-)\s+/);
  if (titleLeadMatch) {
    const cleanTitle = titleLeadMatch[1].trim();
    return {
      title: cleanTitle,
      section: `Article ${index}: ${cleanTitle}`
    };
  }

  return {
    title: `Section ${index} Provision`,
    section: `Article ${index}: General Terms`
  };
}

function parseFinancialExposure(text: string, risk_score: number): { exposureStr: string; amount: number } {
  if (!text) return { exposureStr: "$0", amount: 0 };
  const matches = text.match(/\$([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g);
  if (matches && matches.length > 0) {
    let sum = 0;
    matches.forEach(m => {
      const val = parseInt(m.replace(/[$,]/g, ''), 10);
      if (!isNaN(val)) sum += val;
    });
    if (sum > 0) {
      return { exposureStr: `$${sum.toLocaleString()}`, amount: sum };
    }
  }

  if (risk_score >= 8.0) {
    return { exposureStr: "$1,800,000", amount: 1800000 };
  } else if (risk_score >= 5.0) {
    return { exposureStr: "$250,000", amount: 250000 };
  } else if (risk_score >= 3.0) {
    return { exposureStr: "$45,000", amount: 45000 };
  }
  return { exposureStr: "$0", amount: 0 };
}

function formatClauseData(raw: any, rawIndex: number): ProcessedClause {
  const index = typeof raw.clause_index === 'number' ? raw.clause_index + 1 : rawIndex + 1;
  const original_text = raw.original_text || "";
  const amended_text = raw.amended_text || raw.defender_redline || original_text;
  const risk_score = typeof raw.risk_score === 'number' ? raw.risk_score : 0;

  let risk_category: 'Critical' | 'High' | 'Moderate' | 'Safe' = 'Safe';
  if (risk_score >= 8.0) risk_category = 'Critical';
  else if (risk_score >= 5.0) risk_category = 'High';
  else if (risk_score >= 3.0) risk_category = 'Moderate';

  let analysis: string[] = [];
  if (Array.isArray(raw.risk_analysis) && raw.risk_analysis.length > 0) {
    analysis = raw.risk_analysis;
  } else if (Array.isArray(raw.prosecutor_flags) && raw.prosecutor_flags.length > 0) {
    analysis = raw.prosecutor_flags;
  } else if (Array.isArray(raw.violations) && raw.violations.length > 0) {
    analysis = raw.violations;
  } else if (Array.isArray(raw.analysis) && raw.analysis.length > 0) {
    analysis = raw.analysis;
  } else if (risk_score > 0) {
    analysis = ["Unfavorable commercial risk exposure identified during agentic review."];
  } else {
    analysis = ["Standard conforming commercial terms without restrictive undertakings."];
  }

  const { title, section } = raw.title && raw.section
    ? { title: raw.title, section: raw.section }
    : extractTitleAndSection(original_text, index);

  const { exposureStr, amount } = parseFinancialExposure(original_text, risk_score);

  return {
    clause_id: String(raw.clause_id || raw._id || `clause-${index}`),
    clause_index: index,
    title,
    section,
    risk_score,
    risk_category,
    original_text,
    amended_text,
    analysis,
    exposure: exposureStr,
    exposure_amount: amount,
    flags: analysis.length,
    role: raw.role,
    jurisdiction: raw.jurisdiction,
    status: raw.status
  };
}

const emptyClauseFallback: ProcessedClause = {
  clause_id: 'standby',
  clause_index: 1,
  title: 'Awaiting Contract Stream',
  section: 'Preamble & Recitals',
  risk_score: 0,
  risk_category: 'Safe',
  original_text: 'No contract clauses ingested yet. Please ingest a contract or connect to a live audit stream.',
  amended_text: 'Contract clauses will populate here in real-time as the agentic audit stream processes each article.',
  analysis: ['Standby for zero-trust agentic audit stream.'],
  exposure: '$0',
  exposure_amount: 0,
  flags: 0
};

export function ReviewWorkspace() {
  // Top-Level Active Navigation View: 'summary' | 'audit' | 'export'
  const [activeTab, setActiveTab] = useState<"summary" | "audit" | "export">("summary");

  // Dynamic Backend State
  const [contractId, setContractId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('contract_id') || p.get('id') || null;
    }
    return null;
  });
  const [contractName, setContractName] = useState<string>("Master Cloud Services Agreement v4.2");
  const [role, setRole] = useState<string>("Buyer");
  const [jurisdiction, setJurisdiction] = useState<string>("California");
  const [clauses, setClauses] = useState<ProcessedClause[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamDone, setStreamDone] = useState<boolean>(false);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(!contractId);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Clause Navigator state
  const [selectedClauseIndex, setSelectedClauseIndex] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"all" | "critical" | "high" | "safe">("all");

  // Within Clause Canvas View: 'split' | 'unified'
  const [canvasViewMode, setCanvasViewMode] = useState<"split" | "unified">("split");

  // Accepted clauses state
  const [acceptedClauses, setAcceptedClauses] = useState<number[]>([]);

  // Resolution & Pushback Memo Tone
  const [emailTone, setEmailTone] = useState<"Collaborative" | "Firm" | "Unyielding">("Firm");
  const [exportFormat, setExportFormat] = useState<"docx" | "pdf" | "json">("docx");
  const [copiedToast, setCopiedToast] = useState<string>("");
  const [exportToast, setExportToast] = useState<boolean>(false);

  // Email Recipient Controlled State
  const [recipientEmail, setRecipientEmail] = useState<string>("opposing-counsel@vendorcloud.legal");

  // Contextual Copilot Chatbot State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'LexiFlow Legal Copilot initialized. Ask any question regarding this agreement, identified risk exposures, or governing statutory precedent.'
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Connect to SSE stream whenever contractId, role, or jurisdiction changes
  useEffect(() => {
    if (!contractId) return;

    setIsStreaming(true);
    setStreamDone(false);

    const streamUrl = `${API_BASE_URL}/api/contracts/${contractId}/stream?role=${encodeURIComponent(role)}&jurisdiction=${encodeURIComponent(jurisdiction)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "clause_error") {
          console.error("Clause stream error:", data.error);
          return;
        }

        const formatted = formatClauseData(data, data.clause_index ?? 0);

        setClauses((prev) => {
          const idx = prev.findIndex(
            (c) => c.clause_id === formatted.clause_id || c.clause_index === formatted.clause_index
          );
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...formatted };
            return next;
          } else {
            const next = [...prev, formatted];
            next.sort((a, b) => a.clause_index - b.clause_index);
            return next;
          }
        });

        // Automatically pre-approve safe clauses (risk < 5) to save counsel time
        if (formatted.risk_score < 5.0) {
          setAcceptedClauses((prev) =>
            prev.includes(formatted.clause_index) ? prev : [...prev, formatted.clause_index]
          );
        }

        // If no clause selected yet or selected is 1, jump to highest risk if found
        if (formatted.risk_score >= 8.0) {
          setSelectedClauseIndex((current) => (current === 1 ? formatted.clause_index : current));
        }
      } catch (err) {
        console.error("Failed to parse SSE chunk", err);
      }
    };

    eventSource.onerror = (err) => {
      console.log("EventSource finished or closed", err);
      setIsStreaming(false);
      setStreamDone(true);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  }, [contractId, role, jurisdiction]);

  // Handle Contract File Upload
  const handleUploadSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('role', role);
      formData.append('jurisdiction', jurisdiction);

      const res = await fetch(`${API_BASE_URL}/api/contracts/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Upload failed with status: ${res.status}`);
      }

      const data = await res.json();
      setContractName(uploadFile.name || data.filename || "Uploaded Contract");
      if (data.role) setRole(data.role);
      if (data.jurisdiction) setJurisdiction(data.jurisdiction);

      // Reset clauses and accepted
      setClauses([]);
      setAcceptedClauses([]);
      setSelectedClauseIndex(1);
      setContractId(data.contract_id);
      setShowUploadModal(false);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Failed to upload and analyze contract.");
    } finally {
      setIsUploading(false);
    }
  };

  // Macro-metrics calculations
  const totalClausesCount = clauses.length;
  const criticalClauses = useMemo(() => clauses.filter(c => c.risk_score >= 8.0), [clauses]);
  const highClauses = useMemo(() => clauses.filter(c => c.risk_score >= 5.0 && c.risk_score < 8.0), [clauses]);
  const moderateClauses = useMemo(() => clauses.filter(c => c.risk_score >= 3.0 && c.risk_score < 5.0), [clauses]);
  const safeClauses = useMemo(() => clauses.filter(c => c.risk_score < 3.0), [clauses]);

  const criticalCount = criticalClauses.length;
  const highCount = highClauses.length;
  const moderateCount = moderateClauses.length;
  const safeCount = safeClauses.length;
  const totalBreaches = criticalCount + highCount + moderateCount;

  // Aggregate Health Index: 0 to 100
  const aggregateHealthScore = useMemo(() => {
    if (clauses.length === 0) return 100;
    const avgRisk = clauses.reduce((acc, c) => acc + (c.risk_score || 0), 0) / clauses.length;
    return Math.max(5, Math.min(100, Math.round(100 - (avgRisk * 9.5))));
  }, [clauses]);

  const uncappedPenaltyPoints = 100 - aggregateHealthScore;

  // Financial Exposure Calculation
  const totalFinancialExposure = useMemo(() => {
    return clauses.reduce((acc, c) => {
      if (c.risk_score >= 3.0) {
        return acc + (c.exposure_amount || 0);
      }
      return acc;
    }, 0);
  }, [clauses]);

  const displayExposure = totalFinancialExposure > 0
    ? `$${totalFinancialExposure.toLocaleString()}`
    : "$0";

  // Spectrum breakdown percentages
  const critPct = totalClausesCount > 0 ? (criticalCount / totalClausesCount) * 100 : 0;
  const highModPct = totalClausesCount > 0 ? ((highCount + moderateCount) / totalClausesCount) * 100 : 0;
  const safePct = totalClausesCount > 0 ? (safeCount / totalClausesCount) * 100 : 100;

  // Top major vulnerabilities for Executive Summary
  const topVulnerabilities = useMemo(() => {
    return [...clauses]
      .filter(c => c.risk_score >= 4.0)
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 2);
  }, [clauses]);

  // Current active clause
  const activeClause = useMemo(() => {
    if (clauses.length === 0) return emptyClauseFallback;
    return clauses.find(c => c.clause_index === selectedClauseIndex) || clauses[0];
  }, [clauses, selectedClauseIndex]);

  // Filter clauses for sidebar
  const filteredClauses = useMemo(() => {
    return clauses.filter(clause => {
      const matchesQuery =
        clause.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clause.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clause.clause_index.toString().includes(searchQuery);
      if (!matchesQuery) return false;

      if (activeFilter === "critical") return clause.risk_score >= 8.0;
      if (activeFilter === "high") return clause.risk_score >= 5.0 && clause.risk_score < 8.0;
      if (activeFilter === "safe") return clause.risk_score < 5.0;
      return true;
    });
  }, [clauses, searchQuery, activeFilter]);

  const triggerCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedToast(label);
    setTimeout(() => setCopiedToast(""), 3200);
  };

  const handleToggleAccept = (idx: number) => {
    setAcceptedClauses(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  // Wire export endpoint: hits FastAPI route GET /export/docx/{contract_id}
  const handleExport = () => {
    if (!contractId) {
      setShowUploadModal(true);
      setCopiedToast("Please ingest a contract first");
      setTimeout(() => setCopiedToast(""), 3000);
      return;
    }
    setExportToast(true);
    window.open(`${API_BASE_URL}/export/docx/${contractId}`, '_blank');
    setTimeout(() => setExportToast(false), 4500);
  };

  // Contextual Chatbot Message Dispatcher
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = chatInput.trim();
    if (!query || isChatLoading) return;

    const userMsg = { role: 'user' as const, text: query };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const targetContractId = contractId || "default";
      const res = await fetch(`${API_BASE_URL}/api/contracts/${targetContractId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: query,
          current_clause_id: activeClause?.clause_id
        })
      });

      if (!res.ok) {
        throw new Error(`Chat API responded with status: ${res.status}`);
      }

      const data = await res.json();
      const reply = data.reply || data.message || "Information not present in the current contract clause.";
      setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (err: any) {
      console.error("Copilot chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error connecting to Copilot: ${err.message || "Failed to fetch response."}`
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Pushback Email Draft by Tone
  const emailDraftBody = useMemo(() => {
    const highRisk1 = criticalClauses[0] || highClauses[0] || clauses[0];
    const highRisk2 = criticalClauses[1] || highClauses[1] || clauses[1];

    const sec1Text = highRisk1 ? `Section ${highRisk1.clause_index} (${highRisk1.title})` : "Section 14 (Indemnification)";
    const sec2Text = highRisk2 ? `Section ${highRisk2.clause_index} (${highRisk2.title})` : "Section 15 (Limitation of Liability)";

    if (emailTone === "Collaborative") {
      return `Dear Opposing Counsel,

Thank you for providing the initial draft of the ${contractName}. Our client is excited about this partnership and eager to conclude negotiations smoothly.

We have proposed modest adjustments to ${sec1Text} and ${sec2Text} to ensure balanced risk allocation in line with standard commercial practices under ${jurisdiction} law:
• Symmetrical indemnification covenants for direct claims.
• A 12-month aggregate liability cap of $250,000 replacing asymmetric limitations.

Please find our native OpenXML redline attached. We look forward to your thoughts and would welcome a brief sync this week.

Sincerely,
Office of the General Counsel
Corporate Legal & Risk Operations Group`;
    }

    if (emailTone === "Unyielding") {
      return `Dear Opposing Counsel,

Our zero-trust agentic audit of the draft ${contractName} has flagged non-negotiable legal exposures that directly contradict our enterprise risk mandate under ${jurisdiction} law.

Specifically, we cannot execute under the following terms:
1. UNILATERAL INDEMNITY (${sec1Text}): Uncapped ${role.toLowerCase()} indemnification with zero vendor reciprocity violates baseline governance requirements. We mandate reciprocal, direct-claim defense limited strictly by the contractual cap.
2. DISPROPORTIONATE LIABILITY ALLOCATION (${sec2Text}): Unhedged customer exposure is untenable under ${jurisdiction} commercial standards. The liability ceiling must reflect twelve (12) months of contract value ($250,000).

Our client’s execution is contingent upon incorporating the attached OpenXML (.DOCX) redlines without dilution. Please advise by 5:00 PM EST Friday.

Sincerely,
Office of the General Counsel
Corporate Legal & Risk Operations Group`;
    }

    // Default: Firm
    return `Dear Opposing Counsel,

We have completed our audit of the draft ${contractName} under ${jurisdiction} law. While our client is eager to finalize this partnership, we cannot accept ${sec1Text} and ${sec2Text} in their current asymmetric framing:

1. ${sec1Text.toUpperCase()} UNILATERALITY:
The draft obligates ${role} to indemnify Provider without monetary ceiling for broad third-party claims and consequential damages, while providing zero reciprocal indemnity. Our redline introduces standard ${jurisdiction} bilateral parity, strictly capping indemnity within the aggregate liability mechanism.

2. ${sec2Text.toUpperCase()} LIABILITY MECHANISM:
Limiting Provider's aggregate exposure while holding ${role.toLowerCase()} uncapped creates an untenable imbalance. We have revised this to the standard twelve (12) months of aggregate contract fees paid ($250,000), with customary exclusions for gross negligence, confidentiality, and data breach covenants.

Please find our native OpenXML (.DOCX) redline attached reflecting these required adjustments. We are available for an expedited counsel conferral this Thursday at 2:00 PM EST.

Sincerely,
Office of the General Counsel
Corporate Legal & Risk Operations Group`;
  }, [emailTone, contractName, role, jurisdiction, criticalClauses, highClauses, clauses]);

  return (
    <div className="flex flex-col h-full w-full bg-[#f8f7f4] text-slate-900 antialiased select-none overflow-hidden font-sans">

      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR WITH 3 DISTINCT TABS                                  */}
      {/* ========================================================================= */}
      <header className="h-16 bg-[#0a0f1d] border-b border-slate-800 text-white flex items-center justify-between px-6 shrink-0 z-30 shadow-md">

        {/* Left Brand, Document Title & Enclave Pill */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 flex items-center justify-center text-slate-950 shadow-md ring-1 ring-amber-400/40">
              <Scale className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-sm text-white">LexiFlow AI</span>
                <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                  SOC-2 ENCLAVE
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight block">
                ZERO-TRUST AGENTIC AUDIT
              </span>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 hidden md:block"></div>

          {/* Document Context Pill */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-mono">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-200 font-semibold truncate max-w-xs">{contractName}</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-medium">{role} Stance ({jurisdiction})</span>
          </div>
        </div>

        {/* Center: 3 DISTINCT PROMINENT TAB BUTTONS */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === "summary"
                ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Executive Summary</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === "audit"
                ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <FileSearch className="w-4 h-4" />
            <span>Clause Audit Canvas</span>
          </button>

          <button
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-4 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === "export"
                ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-bold"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <SendToBack className="w-4 h-4" />
            <span className="whitespace-nowrap">Resolution & Export</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === "export" ? "bg-slate-900 text-amber-300" : "bg-emerald-950 text-emerald-300 border border-emerald-800"
            }`}>
              {acceptedClauses.length}/{totalClausesCount || 20}
            </span>
          </button>
        </div>

        {/* Right Stream status & quick trigger */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shadow-sm"
            title="Upload new contract document"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Ingest Contract</span>
          </button>

          <div className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/70 text-emerald-300 text-[11px] font-mono tracking-tight">
            <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isStreaming ? 'animate-pulse glow-emerald' : ''}`}></span>
            <span>{isStreaming ? `STREAMING (${clauses.length})` : streamDone ? `${clauses.length} SYNTHESIZED` : `${clauses.length} LOADED`}</span>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow ring-1 ring-emerald-400/40"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export .DOCX</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VIEW 1: EXECUTIVE SUMMARY TAB                                             */}
      {/* ========================================================================= */}
      {activeTab === "summary" && (
        <div className="flex-1 overflow-y-auto p-8 light-scrollbar bg-[#f8f7f4]">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* Header Title & Intro Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 pb-6">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {jurisdiction.toUpperCase()} CHANCERY MODEL 2024
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Stream Id: #{contractId ? contractId.slice(-8).toUpperCase() : 'AUDIT-8842-DL'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1.5">
                  Executive Contract Audit Summary
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                  Dual Prosecutor/Defender agent synthesis evaluating commercial liability exposure, balance sheet indemnification traps, and {jurisdiction} governance compliance.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab("audit")}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow flex items-center space-x-2"
                >
                  <span>Jump into Clause Audit</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
                <button
                  onClick={() => setActiveTab("export")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow flex items-center space-x-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Proceed to Resolution</span>
                </button>
              </div>
            </div>

            {/* 3 Prominent Macro KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* KPI CARD 1: AGGREGATE HEALTH INDEX (Gauge / Ring Display) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Aggregate Health Index</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    aggregateHealthScore < 60
                      ? 'text-red-700 bg-red-100 border-red-200'
                      : aggregateHealthScore < 80
                        ? 'text-amber-700 bg-amber-100 border-amber-200'
                        : 'text-emerald-700 bg-emerald-100 border-emerald-200'
                  }`}>
                    {aggregateHealthScore < 60 ? 'High Exposure' : aggregateHealthScore < 80 ? 'Moderate Exposure' : 'Low Exposure'}
                  </span>
                </div>

                <div className="my-5 flex items-center space-x-6">
                  {/* Visual Progress Ring Gauge */}
                  <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.8"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={aggregateHealthScore < 60 ? "text-red-500" : aggregateHealthScore < 80 ? "text-amber-500" : "text-emerald-500"}
                        strokeDasharray={`${aggregateHealthScore}, 100`}
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black font-mono text-slate-900 leading-none">{aggregateHealthScore}</span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 font-mono">/ 100</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className={`text-sm font-bold flex items-center space-x-1 ${uncappedPenaltyPoints > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      <TrendingDown className="w-4 h-4" />
                      <span>{uncappedPenaltyPoints > 0 ? `-${uncappedPenaltyPoints}pts Uncapped Penalty` : 'Optimal Benchmark'}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {criticalCount > 0
                        ? `Critical terms detected in ${criticalCount} clause${criticalCount > 1 ? 's' : ''} severely compromise buyer defense shielding.`
                        : highCount > 0
                          ? `Moderate exposures detected across ${highCount} clause${highCount > 1 ? 's' : ''}.`
                          : "Contract terms conform cleanly to standard baseline safeguards."}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>{jurisdiction} Target: <strong className="text-slate-800">85+</strong></span>
                  <span className="text-amber-600 font-semibold">Remediable via Redline</span>
                </div>
              </div>

              {/* KPI CARD 2: FINANCIAL EXPOSURE */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Financial Exposure</span>
                  <span className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </span>
                </div>

                <div className="my-4 space-y-2">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-red-600 font-mono tracking-tight">{displayExposure}</span>
                    <span className="text-xs font-medium text-slate-400">Unhedged</span>
                  </div>

                  {/* Comparative Visual Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div className="bg-red-500 h-full w-[88%] rounded-l-full"></div>
                      <div className="bg-emerald-500 h-full w-[12%] rounded-r-full"></div>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-0.5">
                      <span className="text-red-600 font-semibold">Uncapped Risk ({displayExposure})</span>
                      <span className="text-emerald-700 font-semibold">Target Cap ($250k)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Target Ceiling:</span>
                  <strong className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    $250,000 (12-Mo Fees)
                  </strong>
                </div>
              </div>

              {/* KPI CARD 3: GUARDRAIL BREACHES */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Guardrail Breaches</span>
                  <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </span>
                </div>

                <div className="my-4 space-y-3">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-slate-900 font-mono">{totalBreaches}</span>
                    <span className="text-sm font-semibold text-slate-500">Violations Identified</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="bg-red-50 border border-red-200 p-2 rounded-lg">
                      <span className="block text-red-700 font-extrabold text-sm">{criticalCount}</span>
                      <span className="text-[10px] text-red-600 uppercase font-semibold">Critical</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg">
                      <span className="block text-amber-700 font-extrabold text-sm">{highCount}</span>
                      <span className="text-[10px] text-amber-600 uppercase font-semibold">High</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                      <span className="block text-slate-700 font-extrabold text-sm">{moderateCount}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Moderate</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Conforming Clauses:</span>
                  <span className="text-emerald-700 font-bold">{safeCount} Fully Approved</span>
                </div>
              </div>

            </div>

            {/* High-Level Risk Distribution & Exposure Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Risk Spectrum Distribution & Clause Health</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit breakdown across all {totalClausesCount} contractual articles.</p>
                </div>
                <div className="flex items-center space-x-4 text-xs font-mono">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="text-slate-600">Critical ({Math.round(critPct)}%)</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-slate-600">High/Mod ({Math.round(highModPct)}%)</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600">Safe/Conforming ({Math.round(safePct)}%)</span>
                  </span>
                </div>
              </div>

              {/* Stacked Risk Progress Meter */}
              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex shadow-inner">
                <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${critPct}%` }} title={`Critical Risk: ${criticalCount} clauses`}></div>
                <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${highModPct}%` }} title={`High/Moderate Risk: ${highCount + moderateCount} clauses`}></div>
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${safePct}%` }} title={`Safe Conforming: ${safeCount} clauses`}></div>
              </div>

              {/* Major Vulnerability Highlights Strip */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {topVulnerabilities.length > 0 ? (
                  topVulnerabilities.map((vuln) => (
                    <div
                      key={vuln.clause_id}
                      className={vuln.risk_score >= 8.0 ? "bg-red-50/70 border border-red-200 rounded-xl p-4 flex items-start space-x-3.5" : "bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start space-x-3.5"}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${vuln.risk_score >= 8.0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {vuln.risk_score >= 8.0 ? <AlertTriangle className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold font-mono ${vuln.risk_score >= 8.0 ? 'text-red-950' : 'text-amber-950'}`}>
                            §{vuln.clause_index} {vuln.title.toUpperCase()}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${vuln.risk_score >= 8.0 ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'}`}>
                            {vuln.risk_category.toUpperCase()}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${vuln.risk_score >= 8.0 ? 'text-red-900' : 'text-amber-900'}`}>
                          {vuln.analysis[0] || "Unfavorable terms detected compromising liability defenses."}
                        </p>
                        <button
                          onClick={() => {
                            setSelectedClauseIndex(vuln.clause_index);
                            setActiveTab("audit");
                          }}
                          className={`text-xs font-bold underline inline-flex items-center space-x-1 pt-1 ${vuln.risk_score >= 8.0 ? 'text-red-700 hover:text-red-900' : 'text-amber-700 hover:text-amber-900'}`}
                        >
                          <span>Audit Clause {vuln.clause_index}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 flex items-center space-x-3.5">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">Zero Critical Exposures Detected</h4>
                      <p className="text-xs text-emerald-800">All scanned contract terms align with {jurisdiction} standard legal boundaries.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Callout Actions */}
              <div className="bg-[#faf9f6] border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Defender Agent Redline Set Prepared</h4>
                    <p className="text-xs text-slate-500">
                      {acceptedClauses.length} of {totalClausesCount} clauses verified. Review the full split-pane text or generate the pushback letter for counsel.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <button
                    onClick={() => setActiveTab("audit")}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center space-x-2 shadow-sm"
                  >
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Inspect {totalClausesCount} Clauses</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CLAUSE AUDIT CANVAS (MAX VERTICAL SPLIT-PANE VIEW)                */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="flex-1 flex overflow-hidden relative">

          {/* --------------------------------------------------------------------- */}
          {/* LEFT SIDEBAR: THE CLAUSE MATRIX NAVIGATOR                             */}
          {/* --------------------------------------------------------------------- */}
          <aside className="w-80 bg-[#0c1322] border-r border-slate-800 flex flex-col shrink-0 overflow-hidden text-slate-300 shadow-xl z-10">

            {/* Sidebar Header & Search Box */}
            <div className="p-3.5 border-b border-slate-800 bg-[#090e1a] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Clause Matrix ({clauses.length})
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {clauses.length} Ingested
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Filter ${clauses.length} clauses or rules...`}
                  className="w-full bg-[#121b2f] border border-slate-700/80 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 font-sans"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filter Buttons */}
              <div className="grid grid-cols-4 gap-1 pt-0.5">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`py-1 rounded text-[10px] font-mono font-medium transition text-center ${
                    activeFilter === "all"
                      ? "bg-slate-700 text-white font-bold ring-1 ring-slate-600"
                      : "bg-slate-800/60 text-slate-400 hover:text-white"
                  }`}
                >
                  All {clauses.length}
                </button>
                <button
                  onClick={() => setActiveFilter("critical")}
                  className={`py-1 rounded text-[10px] font-mono font-medium transition text-center ${
                    activeFilter === "critical"
                      ? "bg-red-900/90 text-red-200 font-bold ring-1 ring-red-600"
                      : "bg-red-950/40 text-red-400 hover:bg-red-900/40"
                  }`}
                >
                  🚨 Crit {criticalCount}
                </button>
                <button
                  onClick={() => setActiveFilter("high")}
                  className={`py-1 rounded text-[10px] font-mono font-medium transition text-center ${
                    activeFilter === "high"
                      ? "bg-amber-900/90 text-amber-200 font-bold ring-1 ring-amber-600"
                      : "bg-amber-950/40 text-amber-400 hover:bg-amber-900/40"
                  }`}
                >
                  ⚠️ High {highCount}
                </button>
                <button
                  onClick={() => setActiveFilter("safe")}
                  className={`py-1 rounded text-[10px] font-mono font-medium transition text-center ${
                    activeFilter === "safe"
                      ? "bg-emerald-900/90 text-emerald-200 font-bold ring-1 ring-emerald-600"
                      : "bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40"
                  }`}
                >
                  ✅ Safe {safeCount}
                </button>
              </div>
            </div>

            {/* Scrollable Clause List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
              {filteredClauses.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-mono">
                  {isStreaming ? (
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                      <span>Streaming clauses...</span>
                    </div>
                  ) : (
                    "No clauses matching query."
                  )}
                </div>
              ) : (
                filteredClauses.map((clause) => {
                  const isSelected = selectedClauseIndex === clause.clause_index;
                  const isCrit = clause.risk_score >= 8.0;
                  const isHigh = clause.risk_score >= 5.0 && clause.risk_score < 8.0;
                  const isAccepted = acceptedClauses.includes(clause.clause_index);

                  return (
                    <div
                      key={clause.clause_id}
                      onClick={() => setSelectedClauseIndex(clause.clause_index)}
                      className={`p-3 cursor-pointer transition-all flex flex-col text-left group border-l-4 ${
                        isSelected
                          ? 'bg-[#141f36] text-white border-amber-400 shadow-md ring-1 ring-inset ring-slate-700/50'
                          : 'border-transparent hover:bg-[#0f172a] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            #{clause.clause_index.toString().padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                            {clause.section.split(':')[0]}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            isCrit
                              ? 'bg-red-500 glow-red'
                              : isHigh
                                ? 'bg-amber-400 glow-amber'
                                : 'bg-emerald-400 glow-emerald'
                          }`}></span>
                          <span className={`text-[10px] font-mono font-bold ${
                            isCrit ? 'text-red-400' : isHigh ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {clause.risk_score.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className={`text-xs font-semibold mt-1.5 leading-snug line-clamp-1 ${
                        isSelected ? 'text-white font-bold' : 'text-slate-200'
                      }`}>
                        {clause.title}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px] font-mono">
                        <span className="text-slate-400">
                          Risk: <span className={isCrit ? 'text-red-400 font-semibold' : 'text-slate-300'}>{clause.exposure}</span>
                        </span>

                        <div className="flex items-center space-x-1.5">
                          {isAccepted && (
                            <span className="text-[9px] font-sans px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Accepted
                            </span>
                          )}
                          <span className={`px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-850 text-slate-400'
                          }`}>
                            {clause.flags} {clause.flags === 1 ? 'flag' : 'flags'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#090e1a] text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                <span>{jurisdiction} Model</span>
              </span>
              <span className="text-amber-400 font-semibold">Bilateral Parity</span>
            </div>
          </aside>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT MAIN CANVAS: EXPANDED FULL-HEIGHT SPLIT-PANE LEGAL READING VIEW  */}
          {/* --------------------------------------------------------------------- */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[#f8f7f4]">

            {/* Header Bar for Active Clause */}
            <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-950 font-mono bg-slate-100 border border-slate-300 px-2.5 py-1 rounded shadow-inner">
                  CLAUSE #{activeClause.clause_index.toString().padStart(2, '0')}
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                      {activeClause.title}
                    </h2>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      activeClause.risk_score >= 8.0
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : activeClause.risk_score >= 5.0
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {activeClause.risk_category} Risk • {activeClause.risk_score.toFixed(1)}/10
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {activeClause.section} • Potential Exposure: <strong className="text-slate-800">{activeClause.exposure}</strong>
                  </span>
                </div>
              </div>

              {/* View Toggles & Actions */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs">
                  <button
                    onClick={() => setCanvasViewMode("split")}
                    className={`px-3 py-1 rounded-md transition font-medium text-xs flex items-center space-x-1.5 ${
                      canvasViewMode === "split"
                        ? "bg-white text-slate-900 shadow-sm font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Columns2 className="w-3.5 h-3.5" />
                    <span>Split-Pane View</span>
                  </button>
                  <button
                    onClick={() => setCanvasViewMode("unified")}
                    className={`px-3 py-1 rounded-md transition font-medium text-xs flex items-center space-x-1.5 ${
                      canvasViewMode === "unified"
                        ? "bg-white text-slate-900 shadow-sm font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>Word Track-Changes</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsChatOpen((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition border flex items-center space-x-1.5 ${
                    isChatOpen
                      ? "bg-amber-400 text-slate-950 border-amber-400 shadow-sm font-bold"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                  title="Toggle Legal Copilot Chatbot"
                >
                  <Bot className="w-3.5 h-3.5 text-amber-500" />
                  <span>Toggle Copilot</span>
                </button>

                <button
                  onClick={() => handleToggleAccept(activeClause.clause_index)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition border flex items-center space-x-1.5 ${
                    acceptedClauses.includes(activeClause.clause_index)
                      ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{acceptedClauses.includes(activeClause.clause_index) ? "Redline Accepted" : "Accept Redline"}</span>
                </button>
              </div>
            </div>

            {/* Deep-Dive Reading Panes (Independent Scrollable Areas) */}
            <div className="flex-1 overflow-hidden p-6 light-scrollbar">

              {canvasViewMode === "split" ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full items-stretch">

                  {/* LEFT PANE: ORIGINAL CONTRACT TEXT + PROSECUTOR ALERT */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                    {/* Sub-header */}
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                        <span className="text-xs font-bold text-slate-800 tracking-wider uppercase font-sans">
                          ORIGINAL CONTRACT TEXT
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        activeClause.risk_score >= 8.0
                          ? 'bg-red-100 text-red-900 border-red-300 glow-red'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {activeClause.risk_score >= 8.0 ? `CRITICAL RISK (${activeClause.risk_score.toFixed(1)}/10) • PROSECUTOR ALERT` : `RISK: ${activeClause.risk_score.toFixed(1)}/10`}
                      </span>
                    </div>

                    {/* Content Scroll Container */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1 light-scrollbar">
                      <div className="relative pl-7 pr-4 py-5 bg-[#fdfdfb] rounded-xl border border-slate-200 shadow-inner font-serif">
                        <span className="absolute left-2.5 top-5 font-mono text-slate-400 text-xs font-semibold">§{activeClause.clause_index}.1</span>
                        <p className="contract-clause-text text-slate-900 whitespace-pre-wrap">
                          "{activeClause.original_text}"
                        </p>
                      </div>

                      {/* Dedicated Prosecutor AI Alert Box */}
                      <div className="border border-red-300 bg-red-50/70 rounded-xl p-5 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-red-950 font-bold text-xs uppercase tracking-wide">
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                            <span>PROSECUTOR AGENT ALERT — THREAT EXTRACTION</span>
                          </div>
                          <span className="text-[10px] font-mono font-semibold h-auto w-auto flex-wrap px-2 py-1 text-center rounded bg-red-200/80 text-red-900">
                            {jurisdiction} § Governance Check
                          </span>
                        </div>

                        <p className="text-xs text-red-950 font-semibold">
                          Prosecutor AI identified {activeClause.analysis.length} major vulnerabilities in this drafting:
                        </p>

                        <ul className="space-y-2 text-xs text-red-950">
                          {activeClause.analysis.map((point, pIdx) => (
                            <li key={pIdx} className="flex items-start space-x-2 bg-white/80 p-2.5 rounded-lg border border-red-200">
                              <span className="font-bold text-red-600 font-mono text-[11px] shrink-0 mt-0.5">{pIdx + 1}.</span>
                              <span className="leading-relaxed">{point}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="pt-2 border-t border-red-200/80 flex items-center justify-between text-[11px] font-mono text-red-900">
                          <span>Assessed Unhedged Exposure: <strong className="font-bold text-red-700">{activeClause.exposure}</strong></span>
                          <span>Statute: {jurisdiction} Commercial Code</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT PANE: DEFENDER STRATEGY & BILATERAL REDLINE */}
                  <div className="bg-white rounded-2xl border border-emerald-300 shadow-sm overflow-hidden flex flex-col h-full">
                    {/* Sub-header */}
                    <div className="px-5 py-3 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-emerald-950 tracking-wider uppercase font-sans">
                          DEFENDER STRATEGY: BILATERAL MUTUALITY + FEE CAP
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 border border-emerald-300">
                        AGENT CONFIDENCE: 99.4%
                      </span>
                    </div>

                    {/* Content Scroll Container */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1 light-scrollbar">
                      <div className="relative pl-7 pr-4 py-5 bg-white rounded-xl border border-emerald-200 shadow-sm font-serif">
                        <span className="absolute left-2.5 top-5 font-mono text-emerald-700 text-xs font-semibold">§{activeClause.clause_index}.1*</span>
                        <p className="contract-clause-text text-slate-900 whitespace-pre-wrap">
                          "{activeClause.amended_text}"
                        </p>
                      </div>

                      {/* Rationale & Countermeasures */}
                      <div className="bg-[#f0fdf4] border border-emerald-200 rounded-xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs uppercase tracking-wide">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>DEFENDER AGENT COUNTER-STRATEGY & BENCHMARKS</span>
                          </div>
                          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold border border-emerald-300">
                            {jurisdiction} Model Form 2024
                          </span>
                        </div>

                        <p className="text-xs text-emerald-950 leading-relaxed">
                          Replaces unilateral risk assignment with standard bilateral indemnification enforceable under <strong>{jurisdiction} Court of Chancery</strong> precedent. Explicitly caps exposure to 12 months contract value and eliminates speculative unhedged loss parameters.
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                            <span className="text-slate-500 block text-[10px] uppercase">Unhedged Risk</span>
                            <span className="font-bold text-red-600">{activeClause.exposure}</span>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                            <span className="text-slate-500 block text-[10px] uppercase">Remediated Cap</span>
                            <span className="font-bold text-emerald-700">$250,000 (12-Mo)</span>
                          </div>
                        </div>

                        {/* Quick Actions Strip */}
                        <div className="pt-3 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
                          <button
                            onClick={() => triggerCopy(activeClause.amended_text, "Amended clause copied!")}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-sm flex items-center space-x-1.5 transition"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Redline Text</span>
                          </button>

                          <button
                            onClick={() => handleToggleAccept(activeClause.clause_index)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition ${
                              acceptedClauses.includes(activeClause.clause_index)
                                ? "bg-slate-900 text-white hover:bg-slate-800"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{acceptedClauses.includes(activeClause.clause_index) ? "Revision Accepted" : "Accept Redline"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* Unified Track-Changes Visualizer */
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6 h-full overflow-y-auto light-scrollbar">
                  <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                        UNIFIED TRACK-CHANGES VISUALIZER (WORD OPENXML PARITY)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Standard Microsoft Word inline strikethrough & underline formatting. Author: <span className="font-mono text-emerald-700">DefenderAgent (LexiFlow AI)</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-mono">
                      <span className="diff-del text-[11px]">Deleted Text</span>
                      <span className="text-slate-400">→</span>
                      <span className="diff-ins text-[11px]">Proposed Insertion</span>
                    </div>
                  </div>

                  <div className="contract-clause-text p-8 bg-[#faf9f6] rounded-xl border border-slate-300 leading-loose text-slate-900 shadow-inner">
                    <div className="text-xs font-mono text-slate-400 mb-3 uppercase tracking-wider">
                      Section {activeClause.clause_index}.1 — {activeClause.title}
                    </div>

                    <p className="mb-4">
                      <span className="diff-del font-serif">{activeClause.original_text}</span>
                    </p>
                    <p>
                      <span className="diff-ins font-serif">{activeClause.amended_text}</span>
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 font-mono">
                    <div className="flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Native .docx compilation ready via openxml bridge.</span>
                    </div>
                    <button
                      onClick={() => triggerCopy(`${activeClause.title}\n\nDELETED:\n${activeClause.original_text}\n\nINSERTED:\n${activeClause.amended_text}`, "Full track-changes copied to clipboard!")}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded border border-slate-300 font-sans font-semibold text-xs shadow-sm"
                    >
                      Copy Markup Block
                    </button>
                  </div>
                </div>
              )}

            </div>
          </main>

          {/* Contextual Legal Copilot Slide-Out Panel */}
          {isChatOpen && (
            <aside className="w-[400px] shrink-0 bg-slate-950 border-l border-slate-800 flex flex-col h-full text-slate-200 z-20 shadow-2xl">
              {/* Copilot Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wide flex items-center space-x-1.5 font-mono">
                      <span>LEGAL COPILOT</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                        {jurisdiction}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate max-w-[220px]">
                      Clause #{activeClause.clause_index}: {activeClause.title}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Close Copilot"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 light-scrollbar">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] font-mono text-slate-500 mb-1 px-1">
                      {msg.role === 'user' ? 'Counsel' : 'LexiFlow AI'}
                    </span>
                    <div
                      className={`rounded-xl px-3.5 py-2.5 text-xs max-w-[92%] leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-amber-500 text-slate-950 font-medium'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex items-center space-x-2 text-xs text-amber-400 font-mono py-2 px-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing active clause & statutory precedent...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Ask about Clause #${activeClause.clause_index} or ${jurisdiction} law... (Enter to send)`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none font-sans leading-relaxed"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Shift+Enter for newline
                    </span>
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isChatLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition flex items-center space-x-1.5 shadow"
                    >
                      <span>Send</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </form>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: RESOLUTION & EXPORT TAB                                           */}
      {/* ========================================================================= */}
      {activeTab === "export" && (
        <div className="flex-1 overflow-y-auto p-8 light-scrollbar bg-[#f8f7f4]">
          <div className="max-w-6xl mx-auto space-y-8">

            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-6">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    STEP 3: RESOLUTION & TRANSMISSION
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Audit Complete</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1.5">
                  Contract Resolution & Opposing Counsel Pushback
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Review approved redlines, tune negotiation tone, and compile client-ready Word OpenXML (.DOCX) packages.
                </p>
              </div>

              {/* Progress Pill */}
              <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center space-x-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs font-mono">
                  {acceptedClauses.length}
                </div>
                <div className="text-xs font-mono">
                  <div className="font-bold text-slate-900">{acceptedClauses.length} / {totalClausesCount} Accepted</div>
                  <div className="text-slate-500">{Math.max(0, totalClausesCount - acceptedClauses.length)} Pending Review</div>
                </div>
              </div>
            </div>

            {/* Approved Redlines Summary Strip */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                    Audit Synthesis & Approved Redlines
                  </h3>
                </div>
                <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  {totalClausesCount > 0 ? Math.round((acceptedClauses.length / totalClausesCount) * 100) : 100}% Ready for Execution
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Approved Clauses</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{acceptedClauses.length} of {totalClausesCount}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Pending Items</span>
                  <span className="text-lg font-bold text-amber-600 font-mono">{Math.max(0, totalClausesCount - acceptedClauses.length)} Clauses</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Liability Capped</span>
                  <span className="text-lg font-bold text-emerald-600 font-mono">$250,000</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Chancery Parity</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">100% {jurisdiction.slice(0, 4).toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Two Main Cards: Pushback Email Panel & Native Export Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* 1. INTERACTIVE PUSHBACK EMAIL GENERATOR (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 pb-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Counterparty Pushback Email Generator</h3>
                      <p className="text-xs text-slate-500">Drafted by {jurisdiction} Chancery Bilateral Advocate Engine</p>
                    </div>
                  </div>

                  {/* Tone Switcher */}
                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-300 text-xs font-mono">
                    {(["Collaborative", "Firm", "Unyielding"] as const).map((tone) => (
                      <button
                        key={tone}
                        onClick={() => setEmailTone(tone)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                          emailTone === tone
                            ? "bg-white text-slate-900 shadow-sm font-bold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Headers */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="w-16 text-slate-500 font-semibold shrink-0">TO:</span>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-inner"
                      placeholder="opposing-counsel@vendorcloud.legal"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="w-16 text-slate-500 font-semibold">CC:</span>
                    <span className="text-slate-600">generalcounsel@enterprise.legal</span>
                  </div>
                  <div className="flex items-center pt-1 border-t border-slate-200">
                    <span className="w-16 text-slate-500 font-semibold">SUBJECT:</span>
                    <span className="text-slate-900 font-bold truncate">Re: {contractName} — {role} Redline & Chancery Parity Revisions</span>
                  </div>
                </div>

                {/* Body Editor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                    Generated Attorney Rationale Memo ({emailTone} Stance):
                  </label>
                  <textarea
                    readOnly
                    rows={10}
                    value={emailDraftBody}
                    className="w-full bg-[#fbfbfa] border border-slate-300 rounded-xl p-4 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-inner resize-none overflow-y-auto light-scrollbar"
                  ></textarea>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span>Attached: REDLINED_{contractName.replace(/\s+/g, '_')}.docx</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => triggerCopy(emailDraftBody, "Pushback email draft copied to clipboard!")}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-sm flex items-center space-x-1.5 transition"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Email Text</span>
                    </button>

                    <button
                      onClick={() => {
                        window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent("Re: Master Cloud Services Agreement - Redlines")}&body=${encodeURIComponent(emailDraftBody)}`;
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      <span>Send to Counsel</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. EXPORT NATIVE .DOCX CARD (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Export Native OpenXML Package</h3>
                    <p className="text-xs text-slate-500">Word 2016-365 Certified Contract Engine</p>
                  </div>
                </div>

                {/* Format Options */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                    Select Output Specification:
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 bg-emerald-50/50 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="exportType"
                          checked={exportFormat === "docx"}
                          onChange={() => setExportFormat("docx")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block font-mono">.DOCX (Native Track Changes)</span>
                          <span className="text-[11px] text-slate-500">Author tagged as DefenderAgent (LexiFlow AI)</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="exportType"
                          checked={exportFormat === "pdf"}
                          onChange={() => setExportFormat("pdf")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block font-mono">.PDF (Executive Counsel Brief)</span>
                          <span className="text-[11px] text-slate-500">Side-by-side comparative table with risk annotations</span>
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="exportType"
                          checked={exportFormat === "json"}
                          onChange={() => setExportFormat("json")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block font-mono">.JSON (Delaware Audit Payload)</span>
                          <span className="text-[11px] text-slate-500">Structured telemetry for Enterprise CLM ingest</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Metadata Box */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono text-slate-600">
                  <div className="flex justify-between">
                    <span>Target Jurisdiction:</span>
                    <strong className="text-slate-900">{jurisdiction}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Clauses Included:</span>
                    <strong className="text-slate-900">{totalClausesCount} Clauses</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Liability Cap:</span>
                    <strong className="text-emerald-700">$250,000 Cap</strong>
                  </div>
                </div>

                {/* Primary Download Button */}
                <button
                  onClick={handleExport}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-lg ring-1 ring-emerald-400/50 flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Native Redlined Document (.DOCX)</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCKED BOTTOM STATUS BAR                                                  */}
      {/* ========================================================================= */}
      <footer className="h-11 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-20 text-xs font-mono text-slate-600">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-900">{acceptedClauses.length} of {totalClausesCount} Revisions Accepted</span>
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="hidden sm:inline">
            Format: <strong className="text-slate-800">Microsoft Word OpenXML (.docx)</strong>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-[11px] text-slate-400">Zero-Trust Guardrail v4.2</span>
          <button
            onClick={() => setActiveTab("export")}
            className="text-amber-600 font-bold hover:underline"
          >
            Export Redline →
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* TOAST NOTIFICATIONS                                                       */}
      {/* ========================================================================= */}
      {copiedToast && (
        <div className="fixed bottom-14 right-6 z-50 bg-slate-950 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-3 text-xs">
          <ClipboardCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-mono font-medium">{copiedToast}</span>
        </div>
      )}

      {exportToast && (
        <div className="fixed bottom-14 right-6 z-50 bg-[#0c1322] text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-3.5 max-w-md">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-white font-sans">
              Compiling OpenXML Redline Package...
            </div>
            <div className="text-[11px] text-slate-300 font-mono mt-0.5">
              Applied {acceptedClauses.length} revisions under {jurisdiction} Model. Download triggered.
            </div>
          </div>
          <button
            onClick={() => setExportToast(false)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTRACT INGESTION MODAL                                                  */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1322] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg p-6 text-white space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Ingest Contract for Zero-Trust Audit</h3>
                  <p className="text-xs text-slate-400">PDF or Word (.docx) with PII Scrubbing & Agentic Redlining</p>
                </div>
              </div>
              {contractId && (
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Drop Area */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Select Contract File (.pdf, .docx):
                </label>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-xl p-6 text-center transition cursor-pointer bg-[#121b2f]/60">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileText className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
                  {uploadFile ? (
                    <div className="text-sm font-semibold text-emerald-400 font-mono truncate">
                      {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-300 font-medium">Click or drag & drop contract file here</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Supports enterprise multi-page PDF & native DOCX</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Role & Jurisdiction Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Client Role:</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-[#121b2f] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                  >
                    <option value="Buyer">Buyer (Defensive)</option>
                    <option value="Seller">Seller (Vendor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Governing Jurisdiction:</label>
                  <select
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="w-full bg-[#121b2f] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                  >
                    <option value="California">California (§16600 Guardrails)</option>
                    <option value="Delaware">Delaware (Chancery Parity)</option>
                    <option value="New York">New York (Commercial Division)</option>
                    <option value="India">India (Contract Act, 1872 & DPDP Act 2023)</option>
                  </select>
                </div>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300 font-mono">
                  {uploadError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                {contractId && (
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 transition shadow flex items-center space-x-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing & Masking PII...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start Agentic Audit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ReviewWorkspace;