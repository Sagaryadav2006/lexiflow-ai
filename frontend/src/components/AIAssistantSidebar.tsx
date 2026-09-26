import { useState } from 'react';
import type { Clause } from '../hooks/useAgentStream';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { useToast } from '../hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Bot, ArrowRight } from 'lucide-react';

interface SidebarProps {
  activeClause: Clause | undefined;
  onCommitSuccess: (clauseId: string, final_text: string) => void;
}

export function AIAssistantSidebar({ activeClause, onCommitSuccess }: SidebarProps) {
  const { toast } = useToast();
  const [isCommitting, setIsCommitting] = useState(false);

  if (!activeClause) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-950/60 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl">
        <Bot className="w-16 h-16 mb-6 opacity-30 text-blue-400" />
        <p className="text-sm font-medium tracking-wide">Select a clause to review AI insights</p>
      </div>
    );
  }

  const hasRisk = activeClause.risk_score > 0;

  const handleCommit = async () => {
    setIsCommitting(true);
    try {
      const response = await fetch(`http://localhost:8000/api/clauses/${activeClause.clause_id}/commit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amended_text: activeClause.amended_text })
      });

      if (!response.ok) throw new Error("Failed to commit clause");

      const data = await response.json();

      toast({
        title: "Clause Fixed",
        description: "The predatory clause was amended and deanonymized successfully.",
        variant: "default",
      });

      onCommitSuccess(activeClause.clause_id, data.final_text);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Could not commit the clause.",
        variant: "destructive",
      });
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/60 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3 bg-slate-900/50">
        <div className="p-2 bg-blue-500/10 rounded-xl">
          <Bot className="w-5 h-5 text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100 tracking-tight">AI Assistant</h2>
      </div>

      <ScrollArea className="flex-1 p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeClause.clause_id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* Risk Score */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Predatory Risk</span>
                <span className={hasRisk ? "text-rose-500 font-bold text-lg" : "text-emerald-500 font-bold text-lg"}>
                  {activeClause.risk_score}/10
                </span>
              </div>
              <Progress value={activeClause.risk_score * 10} className={hasRisk ? "bg-rose-950/50 h-2" : "bg-emerald-950/50 h-2"} indicatorClassName={hasRisk ? "bg-rose-500" : "bg-emerald-500"} />
              {activeClause.prosecutor_flags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {activeClause.prosecutor_flags.map((flag, i) => (
                    <Badge key={i} variant="outline" className="bg-rose-950/30 text-rose-500 border-rose-500/50 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                      {flag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Playbook Rules */}
            {activeClause.playbook_rules?.length > 0 && (
              <div className="space-y-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Applied Playbook Rules</span>
                <ul className="space-y-3">
                  {activeClause.playbook_rules.map((rule, i) => (
                    <li key={i} className="text-sm text-blue-200/90 bg-blue-950/20 p-4 rounded-xl border border-blue-900/30 leading-relaxed shadow-sm">
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Amended Text */}
            {hasRisk && activeClause.amended_text && (
              <div className="space-y-5 pt-6 border-t border-slate-800/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proposed Safe Text</span>
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="p-5 rounded-xl bg-emerald-950/10 border border-emerald-900/30 font-serif text-slate-300 text-[15px] leading-relaxed tracking-wide shadow-sm relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  {activeClause.amended_text}
                </motion.div>

                <Button
                  onClick={handleCommit}
                  disabled={isCommitting}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-blue-900/20 transition-all duration-200 hover:shadow-blue-900/40"
                >
                  {isCommitting ? "Committing..." : (
                    <>One-Click Commit <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            )}

            {!hasRisk && (
              <div className="flex items-center gap-3 p-5 rounded-xl bg-emerald-950/10 border border-emerald-900/30 text-emerald-500 mt-8">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">This clause conforms to standard playbook guidelines and looks safe.</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
