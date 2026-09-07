import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Source } from '../types';
import { Badge } from '../components/ui/Badge';
import { FileText, ArrowLeft, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const SourceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    async function loadSource() {
      if (!id) return;
      try {
        const data = await apiRequest<Source>(`/sources/${id}`);
        setSource(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSource();
  }, [id]);

  const handleReanalyze = async () => {
    if (!id) return;
    setReanalyzing(true);
    try {
      await apiRequest(`/sources/${id}/analyze`, { method: 'POST' });
      const updated = await apiRequest<Source>(`/sources/${id}`);
      setSource(updated);
    } catch (err) {
      alert('Fact analysis failed');
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-400 py-8">Loading source analysis...</p>;
  if (!source) return <p className="text-sm text-rose-400 py-8">Source not found.</p>;

  const analysis = source.analysis;
  const facts = analysis?.structured_data;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Workspace
        </button>
        <button
          onClick={handleReanalyze}
          disabled={reanalyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-sky-400 border border-slate-700 text-xs font-bold hover:bg-slate-700 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin' : ''}`} />
          <span>{reanalyzing ? 'Extracting Facts...' : 'Re-run Fact Analysis'}</span>
        </button>
      </div>

      {/* Main Source Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-sky-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">{source.name}</h1>
              <p className="text-xs text-slate-400">
                Format: {source.type} | Size: {(source.file_size / 1024).toFixed(1)} KB | Status: {source.processing_status}
              </p>
            </div>
          </div>
          <Badge variant="emerald">Source Grounded</Badge>
        </div>
      </div>

      {/* Structured Facts Inspector Grid */}
      {analysis && facts ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Facts & Summary */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              Extracted Key Facts
            </h3>
            <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <strong className="text-white block mb-1">Executive Summary:</strong>
              {analysis.summary}
            </p>
            <div className="space-y-2">
              {facts.key_facts.map((f, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risks & Recommendations */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Identified Risks & Directives
            </h3>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase">Risks & Vulnerabilities:</span>
              {facts.risks.map((r, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                  ⚠️ {r}
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-sky-400 uppercase">Strategic Recommendations:</span>
              {facts.recommendations.map((rec, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200">
                  👉 {rec}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 py-4">No structured fact extraction found. Click "Re-run Fact Analysis".</p>
      )}

      {/* Raw Text Viewer */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Raw Extracted Document Text</h3>
        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-96">
          {source.raw_text}
        </pre>
      </div>
    </div>
  );
};
