import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';

export function ContractBuilder() {
  const [agreement_type, setAgreementType] = useState('Master Services Agreement (MSA)');
  const [jurisdiction, setJurisdiction] = useState('California, United States');
  const [primary_party, setPrimaryParty] = useState('Acme Technologies Inc.');
  const [counter_party, setCounterParty] = useState('Global Enterprise Solutions LLC');
  const [posture, setPosture] = useState('Balanced & Mutual');
  const [special_provisions, setSpecialProvisions] = useState(
    'Include 30-day cure period for material breach, strict confidentiality with DPDP Act 2023 and GDPR provisions, and mutual indemnity for IP infringement.'
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [draftedContract, setDraftedContract] = useState<string>('');

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/contracts/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agreement_type,
            jurisdiction,
            primary_party,
            counter_party,
            posture,
            special_provisions,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate contract: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.drafted_contract) {
        setDraftedContract(data.drafted_contract);
      }
    } catch (error) {
      console.error('Error calling /api/contracts/generate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f8f7f4] text-slate-900 font-sans">
      {/* Header Area */}
      <div className="border-b border-slate-200/90 pb-6 mb-8 max-w-4xl mx-auto">
        <div className="mb-2">
          <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
            LLM DRAFTING ENGINE
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Contract Builder Engine
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Generative LLM workflow for compliant contract drafting.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-4xl mx-auto">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">
                AGREEMENT TYPE
              </label>
              <select
                value={agreement_type}
                onChange={(e) => setAgreementType(e.target.value)}
                className="w-full bg-[#fbfbfa] border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-inner"
              >
                <option value="Master Services Agreement (MSA)">Master Services Agreement (MSA)</option>
                <option value="Non-Disclosure Agreement (NDA)">Non-Disclosure Agreement (NDA)</option>
                <option value="SaaS Service Level Agreement (SLA)">SaaS Service Level Agreement (SLA)</option>
                <option value="Data Processing Addendum (DPA)">Data Processing Addendum (DPA)</option>
                <option value="Independent Contractor Agreement">Independent Contractor Agreement</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">
                GOVERNING JURISDICTION
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full bg-[#fbfbfa] border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-inner"
              >
                <option value="California, United States">California, United States</option>
                <option value="Delaware, United States">Delaware, United States</option>
                <option value="New York, United States">New York, United States</option>
                <option value="England & Wales, United Kingdom">England & Wales, United Kingdom</option>
                <option value="New Delhi, India (DPDP Act 2023)">New Delhi, India (DPDP Act 2023)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">
                PRIMARY PARTY (DISCLOSING / CLIENT)
              </label>
              <input
                type="text"
                value={primary_party}
                onChange={(e) => setPrimaryParty(e.target.value)}
                placeholder="e.g. Acme Technologies Inc."
                className="w-full bg-[#fbfbfa] border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-inner"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">
                COUNTER-PARTY (RECEIVING / VENDOR)
              </label>
              <input
                type="text"
                value={counter_party}
                onChange={(e) => setCounterParty(e.target.value)}
                placeholder="e.g. Global Enterprise Solutions LLC"
                className="w-full bg-[#fbfbfa] border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">
                DRAFTING POSTURE / BIAS
              </label>
              <select
                value={posture}
                onChange={(e) => setPosture(e.target.value)}
                className="w-full bg-[#fbfbfa] border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-inner"
              >
                <option value="Balanced & Mutual">Balanced & Mutual (Recommended)</option>
                <option value="Pro-Buyer / Client Favorable">Pro-Buyer / Client Favorable</option>
                <option value="Pro-Vendor / Aggressive Protection">Pro-Vendor / Aggressive Protection</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">
                GOVERNING LAW FRAMEWORK
              </label>
              <div className="w-full bg-[#fbfbfa] border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-700 shadow-inner flex items-center justify-between">
                <span>Standardized Clause Matrix</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">
              SPECIAL PROVISIONS & CLAUSE INSTRUCTIONS
            </label>
            <textarea
              rows={4}
              value={special_provisions}
              onChange={(e) => setSpecialProvisions(e.target.value)}
              placeholder="Specify custom warranties, restrictive covenants, data protection measures, termination triggers, or fallback clauses..."
              className="w-full bg-[#fbfbfa] border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-inner resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Wand2 className="w-4 h-4 animate-spin" />
                <span>Drafting Contract...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Generate Compliant Agreement</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Rendered Drafted Contract Section */}
      {draftedContract && (
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm font-serif leading-loose whitespace-pre-wrap text-slate-900 text-sm">
            {draftedContract}
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractBuilder;
