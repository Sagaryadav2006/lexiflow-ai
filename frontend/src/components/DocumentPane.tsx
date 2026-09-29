import { useState, useRef, useEffect } from 'react';
import type { Clause } from '../hooks/useAgentStream';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from '../hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Bot, ArrowRight, ChevronLeft, ChevronRight, ShieldAlert, ShieldCheck, Copy, Check } from 'lucide-react';

interface DocumentPaneProps {
  clauses: Clause[];
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  onCommitSuccess?: (clauseId: string, final_text: string) => void;
}

export function DocumentPane({ clauses, currentIndex, setCurrentIndex, onCommitSuccess }: DocumentPaneProps) {
  const { toast } = useToast();
  const [isCommitting, setIsCommitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const safeIndex = clauses && clauses.length > 0 ? Math.max(0, Math.min(currentIndex, clauses.length - 1)) : 0;

  useEffect(() => {
    const activePill = pillRefs.current[safeIndex];
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [safeIndex, clauses.length]);

  if (!clauses || clauses.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-400 bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-800/80 shadow-2xl">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide text-zinc-300">Analyzing document...</p>
      </div>
    );
  }

  const activeClause = clauses[safeIndex];
  if (!activeClause) return null;

  const score = activeClause.risk_score || 0;
  const hasRisk = score >= 4;
  const isCritical = score >= 7;

  const highRiskCount = clauses.filter(c => (c.risk_score || 0) >= 7).length;

  const handleCommit = async () => {
    if (!onCommitSuccess || !activeClause.amended_text) return;
    setIsCommitting(true);
    try {
      const response = await fetch(`http://localhost:8000/api/clauses/${activeClause.clause_id}/commit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amended_text: activeClause.amended_text })
      });
      if (!response.ok) throw new Error("Failed to commit clause");
      const data = await response.json();
      toast({ title: "Clause Fixed", description: "The predatory clause was amended successfully.", variant: "default" });
      onCommitSuccess(activeClause.clause_id, data.final_text);
    } catch (error) {
      toast({ title: "Error", description: "Could not commit the clause.", variant: "destructive" });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCopy = () => {
    if (activeClause.amended_text) {
      navigator.clipboard.writeText(activeClause.amended_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderTextWithPills = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(<[A-Z_]+_\d+>)/g);
    return parts.map((part, i) => {
      if (part.match(/^<[A-Z_]+_\d+>$/)) {
        return <span key={i} className="inline-block bg-indigo-950/90 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-xs shadow-sm">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl shadow-black/40">
      <div className="px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-xl flex justify-between items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight whitespace-nowrap">Contract Clause Review</h2>
          {highRiskCount > 0 ? (
            <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
              <ShieldAlert className="w-3.5 h-3.5" /> {highRiskCount} Critical Flags Detected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5" /> All Clear
            </Badge>
          )}
        </div>

        <div className="flex flex-1 min-w-0 justify-start items-center px-2 py-1 overflow-x-auto gap-2">
          {clauses.map((c, i) => {
            const isActive = i === safeIndex;
            const cScore = c.risk_score || 0;
            const dotColor = cScore <= 3 ? 'bg-emerald-400' : cScore <= 6 ? 'bg-amber-400' : 'bg-rose-500';
            return (
              <button
                key={i}
                ref={el => { pillRefs.current[i] = el; }}
                onClick={() => setCurrentIndex(i)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 first:ml-auto last:mr-auto ${isActive ? 'bg-indigo-600 text-white border border-indigo-500 shadow-md shadow-indigo-950/50' : 'bg-zinc-950/80 text-zinc-400 border border-zinc-800 hover:bg-zinc-800/80 hover:text-zinc-200'}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`}></span>
                Clause {i + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium text-zinc-400 whitespace-nowrap">
            Clause {safeIndex + 1} of {clauses.length}
          </span>
          <div className="flex gap-1.5">
            <Button variant="outline" size="icon" className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40 h-8 w-8" onClick={() => setCurrentIndex(prev => prev - 1)} disabled={safeIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40 h-8 w-8" onClick={() => setCurrentIndex(prev => prev + 1)} disabled={safeIndex === clauses.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeClause.clause_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left h-full"
          >
            <div className="lg:col-span-5 flex flex-col space-y-3 h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Original Clause Text</span>
                <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-[11px] px-2.5 py-0.5 font-medium">PII Shield Active</Badge>
              </div>
              <div className="flex-1 p-6 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 shadow-inner overflow-y-auto">
                <p className="text-zinc-200 leading-relaxed text-[15px] font-normal whitespace-pre-line text-left">
                  {renderTextWithPills(activeClause.original_text)}
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col space-y-5">
              <div className="p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-400" />
                    AI Risk Analysis
                  </span>
                  <Badge variant="outline" className={score <= 3 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-bold px-3 py-1" : isCritical ? "bg-rose-500/10 text-rose-400 border-rose-500/30 text-xs font-bold px-3 py-1" : "bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-bold px-3 py-1"}>
                    {score}/10 {score <= 3 ? 'SAFE' : isCritical ? 'CRITICAL' : 'HIGH RISK'}
                  </Badge>
                </div>
                <Progress value={score * 10} className={score <= 3 ? "bg-emerald-950/60 h-2" : isCritical ? "bg-rose-950/60 h-2" : "bg-amber-950/60 h-2"} indicatorClassName={score <= 3 ? "bg-emerald-500" : isCritical ? "bg-rose-500" : "bg-amber-500"} />
              </div>

              {!hasRisk ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-left">
                  <p className="text-emerald-200 leading-relaxed text-sm flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
                    Playbook Compliant — This clause conforms to standard legal playbook guidelines and requires no redline modifications.
                  </p>
                </div>
              ) : (
                <>
                  {activeClause.prosecutor_flags && activeClause.prosecutor_flags.length > 0 && (
                    <div className="space-y-2.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Identified Legal Risks</span>
                      <div className="space-y-2.5">
                        {activeClause.prosecutor_flags.map((flag, i) => (
                          <div key={i} className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4 text-left text-rose-200 text-sm leading-relaxed flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeClause.playbook_rules && activeClause.playbook_rules.length > 0 && (
                    <div className="space-y-2.5 mt-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Playbook Violations</span>
                      <div className="space-y-2">
                        {activeClause.playbook_rules.map((rule, i) => (
                          <div key={i} className="bg-zinc-950/90 border border-zinc-800/90 rounded-xl px-4 py-3 text-left text-zinc-200 text-sm flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-indigo-400 mt-0.5" />
                            <span>{rule}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeClause.amended_text && (
                    <div className="space-y-2.5 mt-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">AI Proposed Safe Text</span>
                      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 text-left text-zinc-100 leading-relaxed text-[15px] whitespace-pre-line relative group">
                        <p className="mb-6">{activeClause.amended_text}</p>
                        <div className="flex justify-end gap-3 items-center border-t border-emerald-500/20 pt-4">
                          <Button variant="outline" size="sm" onClick={handleCopy} className="border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-200">
                            {copied ? <><Check className="w-4 h-4 mr-1.5" /> Copied!</> : <><Copy className="w-4 h-4 mr-1.5" /> Copy Redline</>}
                          </Button>
                          <Button onClick={handleCommit} disabled={isCommitting} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50">
                            {isCommitting ? "Committing..." : "One-Click Commit"} <ArrowRight className="w-4 h-4 ml-1.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}