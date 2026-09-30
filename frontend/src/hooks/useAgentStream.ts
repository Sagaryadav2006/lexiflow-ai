import { useState, useEffect } from "react";

export interface Clause {
  clause_id: string;
  original_text: string;
  masked_text: string;
  prosecutor_flags: string[];
  risk_score: number;
  playbook_rules: string[];
  amended_text: string;
  iteration_count: number;
}

export function useAgentStream(contractId: string | null, initialClauses: Clause[] = []) {
  const [clauses, setClauses] = useState<Clause[]>(initialClauses);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!contractId) return;

    setIsStreaming(true);
    setClauses(initialClauses); // Set initial pending clauses

    // Use environment variable for cloud deployment, fallback to localhost
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const eventSource = new EventSource(`${API_BASE_URL}/api/contracts/${contractId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === "clause_error") {
          console.error("Clause streaming error:", data.error);
          return;
        }

        setClauses((prev) => {
          const idx = prev.findIndex(c => c.clause_id === data.clause_id);
          const updateObj = {
            ...data,
            prosecutor_flags: data.risk_analysis || [],
            playbook_rules: data.violations || []
          };

          if (idx !== -1) {
            const newClauses = [...prev];
            newClauses[idx] = { ...newClauses[idx], ...updateObj };
            return newClauses;
          } else {
            return [...prev, {
              ...updateObj,
              masked_text: data.original_text,
              iteration_count: 0
            }];
          }
        });
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    };

    eventSource.onerror = (err) => {
      console.log("EventSource closed or error", err);
      setIsStreaming(false);
      eventSource.close(); // Prevent auto-reconnect when server finishes stream
    };

    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  }, [contractId]);

  return { clauses, setClauses, isStreaming };
}