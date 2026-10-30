import React, { useState } from 'react';
import { Wand2, AlertCircle, Copy, Download } from 'lucide-react';
import { useSessionStorage } from '../hooks/useSessionStorage';

interface BuilderFormData {
  agreementType: string;
  jurisdiction: string;
  primaryParty: string;
  counterParty: string;
  draftingPosture: string;
  specialProvisions: string;
}

const initialFormData: BuilderFormData = {
  agreementType: 'Master Services Agreement (MSA)',
  jurisdiction: 'California, United States',
  primaryParty: 'Acme Technologies Inc.',
  counterParty: 'Global Enterprise Solutions LLC',
  draftingPosture: 'Balanced & Mutual',
  specialProvisions:
    'Include 30-day cure period for material breach, strict confidentiality with DPDP Act 2023 and GDPR provisions, and mutual indemnity for IP infringement.',
};

export function ContractBuilder() {
  const [formData, setFormData] = useSessionStorage<BuilderFormData>(
    'builder_form_data',
    initialFormData
  );
  const [draftedContract, setDraftedContract] = useSessionStorage<string>(
    'builder_contract_output',
    ''
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    agreementType,
    jurisdiction,
    primaryParty,
    counterParty,
    draftingPosture,
    specialProvisions,
  } = formData;

  const updateField = (field: keyof BuilderFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const payload = {
        agreement_type: agreementType,
        jurisdiction: jurisdiction,
        primary_party: primaryParty,
        counter_party: counterParty,
        posture: draftingPosture,
        special_provisions: specialProvisions,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/contracts/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(response.statusText || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.drafted_contract) {
        setDraftedContract(data.drafted_contract);
      }
    } catch (error: any) {
      console.error('Error calling /api/contracts/generate:', error);
      setErrorMessage(error.message || 'Failed to generate contract. Check API connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const contractOutput = draftedContract;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contractOutput);
      alert('Contract copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([contractOutput], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Drafted_Contract.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                value={agreementType}
                onChange={(e) => updateField('agreementType', e.target.value)}
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
                onChange={(e) => updateField('jurisdiction', e.target.value)}
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
                value={primaryParty}
                onChange={(e) => updateField('primaryParty', e.target.value)}
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
                value={counterParty}
                onChange={(e) => updateField('counterParty', e.target.value)}
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
                value={draftingPosture}
                onChange={(e) => updateField('draftingPosture', e.target.value)}
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
              value={specialProvisions}
              onChange={(e) => updateField('specialProvisions', e.target.value)}
              placeholder="Specify custom warranties, restrictive covenants, data protection measures, termination triggers, or fallback clauses..."
              className="w-full bg-[#fbfbfa] border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 shadow-inner resize-y"
            />
          </div>

          {errorMessage && (
            <div className="text-red-500 text-xs font-bold mb-4 bg-red-100 p-3 rounded-lg border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {errorMessage}
            </div>
          )}

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

          {/* Action Buttons: Copy & Download */}
          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Contract</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download (.doc)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractBuilder;
