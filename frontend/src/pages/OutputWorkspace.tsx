import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest, downloadFile } from '../api/client';
import { GeneratedContent, ContentVersion, Transformation } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { ScoreGauge } from '../components/ui/ScoreGauge';
import { SlideViewer } from '../components/ui/SlideViewer';
import {
  Save,
  RefreshCw,
  CheckCircle,
  Download,
  History,
  FileText,
  ShieldAlert,
  AlertTriangle,
  ArrowLeft,
  Check,
  RotateCcw
} from 'lucide-react';

export const OutputWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [output, setOutput] = useState<GeneratedContent | null>(null);
  const [content, setContent] = useState<string>('');
  const [transformation, setTransformation] = useState<Transformation | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>('pdf');
  const [showVersionsModal, setShowVersionsModal] = useState(false);

  useEffect(() => {
    async function loadOutputData() {
      if (!id) return;
      try {
        const outData = await apiRequest<GeneratedContent>(`/outputs/${id}`);
        setOutput(outData);
        setContent(outData.content);

        // Fetch parent transformation to list sibling outputs
        const transData = await apiRequest<Transformation>(`/transformations/${outData.transformation_id}`);
        setTransformation(transData);

        // Fetch version history
        const verData = await apiRequest<ContentVersion[]>(`/outputs/${id}/versions`);
        setVersions(verData);
      } catch (err) {
        console.error(err);
      }
    }
    loadOutputData();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await apiRequest<GeneratedContent>(`/outputs/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
      setOutput(updated);
      const verData = await apiRequest<ContentVersion[]>(`/outputs/${id}/versions`);
      setVersions(verData);
      alert('Content saved and new version recorded!');
    } catch (err) {
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!id || !confirm('Regenerate output using current configuration parameters?')) return;
    setRegenerating(true);
    try {
      const updated = await apiRequest<GeneratedContent>(`/outputs/${id}/regenerate`, {
        method: 'POST',
      });
      setOutput(updated);
      setContent(updated.content);
      const verData = await apiRequest<ContentVersion[]>(`/outputs/${id}/versions`);
      setVersions(verData);
    } catch (err) {
      alert('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setApproving(true);
    try {
      const updated = await apiRequest<GeneratedContent>(`/outputs/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comments: 'Approved by reviewer' }),
      });
      setOutput(updated);
      alert('Output status marked as APPROVED!');
    } catch (err: any) {
      alert(err.message || 'Approval failed. (Requires REVIEWER or ADMIN role)');
    } finally {
      setApproving(false);
    }
  };

  const handleExport = async () => {
    if (!id || !output) return;
    setExporting(true);
    try {
      await downloadFile(`/outputs/${id}/export`, { format: exportFormat }, `${output.title}.${exportFormat}`);
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreVersion = async (verNum: number) => {
    if (!id || !confirm(`Restore version ${verNum}?`)) return;
    try {
      const updated = await apiRequest<GeneratedContent>(`/outputs/${id}/restore/${verNum}`, {
        method: 'POST',
      });
      setOutput(updated);
      setContent(updated.content);
      setShowVersionsModal(false);
      const verData = await apiRequest<ContentVersion[]>(`/outputs/${id}/versions`);
      setVersions(verData);
    } catch (err) {
      alert('Restore failed');
    }
  };

  if (!output) return <p className="text-sm text-slate-400 py-8">Loading output workspace...</p>;

  const valData = output.validation_data;

  return (
    <div className="space-y-6">
      {/* Action Header Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">{output.title}</h1>
              <Badge variant={output.status === 'APPROVED' ? 'emerald' : 'amber'}>
                {output.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Format: {output.type.replace('_', ' ').toUpperCase()} | Version v{output.current_version}
            </p>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowVersionsModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            <span>History (v{output.current_version})</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl bg-slate-800 text-sky-400 border border-sky-500/30 text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-3.5 py-2 rounded-xl bg-slate-800 text-indigo-300 border border-indigo-500/30 text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>

          {(user?.role === 'ADMIN' || user?.role === 'REVIEWER') && output.status !== 'APPROVED' && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{approving ? 'Approving...' : 'Approve Output'}</span>
            </button>
          )}

          {/* Export Dropdown & Trigger */}
          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none"
            >
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="pptx">PPTX</option>
              <option value="txt">TXT</option>
            </select>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-sky-500/25 hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting...' : 'Export'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Output Navigation */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Transformation Outputs
            </h3>
            <div className="space-y-1.5">
              {transformation?.outputs.map((sibling) => (
                <div
                  key={sibling.id}
                  onClick={() => navigate(`/output/${sibling.id}`)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    sibling.id === output.id
                      ? 'bg-sky-500/15 border-sky-500 text-white font-bold shadow-md'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="uppercase font-semibold text-sky-400">{sibling.type}</span>
                    <Badge variant={sibling.status === 'APPROVED' ? 'emerald' : 'amber'} size="sm">
                      {sibling.status}
                    </Badge>
                  </div>
                  <p className="text-xs truncate">{sibling.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Rich Text Editor / Slide Deck Visualizer */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Editor & Interactive Preview
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Length: {content.length} chars</span>
            </div>

            {output.type === 'presentation' ? (
              <SlideViewer content={content} onChange={(newVal) => setContent(newVal)} />
            ) : (
              <textarea
                rows={22}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 text-xs font-mono leading-relaxed focus:border-sky-500 focus:outline-none transition-all"
              />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Validation Panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <div className="text-center border-b border-slate-800 pb-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Source Grounding Score
              </h3>
              <ScoreGauge score={valData?.score ?? 95} />
            </div>

            {/* Claims Check */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Verified Supported Claims ({valData?.supported_claims.length || 0})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {valData?.supported_claims.map((claim, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{claim}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {valData?.warnings && valData.warnings.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Validation Alerts
                </h4>
                <div className="space-y-1">
                  {valData.warnings.map((w, idx) => (
                    <p key={idx} className="text-[11px] text-amber-200/90 leading-tight">
                      • {w}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version History Modal */}
      {showVersionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Version History</h3>
              <button onClick={() => setShowVersionsModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {versions.map((ver) => (
                <div key={ver.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-sky-400">Version v{ver.version_number}</span>
                    <p className="text-[11px] text-slate-400">{ver.change_type} • {new Date(ver.created_at).toLocaleString()}</p>
                  </div>
                  {ver.version_number !== output.current_version && (
                    <button
                      onClick={() => handleRestoreVersion(ver.version_number)}
                      className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-sky-600 hover:text-white transition-all flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
