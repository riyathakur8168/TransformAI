import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Project, Source, Transformation } from '../types';
import { Badge } from '../components/ui/Badge';
import {
  Upload,
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  Layers,
  ShieldCheck,
  Check
} from 'lucide-react';

export const NewTransformation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';

  const [step, setStep] = useState<number>(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  
  // Step 1: Source
  const [sourceMode, setSourceMode] = useState<'upload' | 'paste'>('upload');
  const [sourceName, setSourceName] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceId, setSourceId] = useState<string>('');

  // Step 2: Outputs
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([
    'executive_summary',
    'linkedin',
    'advisory',
    'presentation'
  ]);

  // Step 3: Customize Controls
  const [audience, setAudience] = useState('Executives');
  const [tone, setTone] = useState('Professional');
  const [language, setLanguage] = useState('English');
  const [detailLevel, setDetailLevel] = useState('Medium');
  const [objective, setObjective] = useState('Inform');
  const [style, setStyle] = useState('Professional');

  // Generation state
  const [loading, setLoading] = useState(false);
  const [genProgress, setGenProgress] = useState<string[]>([]);
  const [createdTransId, setCreatedTransId] = useState<string>('');

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await apiRequest<Project[]>('/projects');
        setProjects(data);
        if (!selectedProjectId && data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchProjects();
  }, []);

  const toggleOutput = (type: string) => {
    if (selectedOutputs.includes(type)) {
      if (selectedOutputs.length > 1) {
        setSelectedOutputs(selectedOutputs.filter((o) => o !== type));
      }
    } else {
      setSelectedOutputs([...selectedOutputs, type]);
    }
  };

  const handleSourceUpload = async () => {
    if (!selectedProjectId) {
      alert('Please select or create a project first.');
      return;
    }
    setLoading(true);
    try {
      let createdSource: Source;

      if (sourceMode === 'paste') {
        if (!sourceText.trim()) {
          alert('Please enter source text.');
          setLoading(false);
          return;
        }
        createdSource = await apiRequest<Source>('/sources/text', {
          method: 'POST',
          body: JSON.stringify({
            project_id: selectedProjectId,
            name: sourceName || 'Pasted Source Document',
            text: sourceText,
          }),
        });
      } else {
        if (!selectedFile) {
          alert('Please select a file to upload.');
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('project_id', selectedProjectId);
        formData.append('file', selectedFile);

        createdSource = await apiRequest<Source>('/sources/upload', {
          method: 'POST',
          body: formData,
        });
      }

      setSourceId(createdSource.id);
      setStep(2);
    } catch (err: any) {
      alert(err.message || 'Source processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    setStep(4);
    setLoading(true);
    setGenProgress(['✓ Source processed & chunked', '✓ Structured facts extracted']);

    try {
      setTimeout(() => {
        setGenProgress((prev) => [...prev, '● Generating multi-audience outputs']);
      }, 800);

      const trans = await apiRequest<Transformation>('/transformations', {
        method: 'POST',
        body: JSON.stringify({
          project_id: selectedProjectId,
          source_id: sourceId,
          output_types: selectedOutputs,
          configuration: {
            audience,
            tone,
            language,
            detail_level: detailLevel,
            objective,
            style,
          },
        }),
      });

      setGenProgress((prev) => [
        ...prev,
        '✓ Outputs generated',
        '✓ Grounding validation check completed (Score computed)',
      ]);

      setCreatedTransId(trans.id);
      setLoading(false);
      setTimeout(() => {
        if (trans.outputs && trans.outputs.length > 0) {
          navigate(`/output/${trans.outputs[0].id}`);
        } else {
          navigate(`/projects/${selectedProjectId}`);
        }
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Generation failed');
      setStep(3);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-white">Create New Transformation</h1>
        <p className="text-sm text-slate-400">
          Transform raw documents into structured, grounded communication formats.
        </p>
      </div>

      {/* Stepper Indicator */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        {[
          { num: 1, label: '01 Source' },
          { num: 2, label: '02 Outputs' },
          { num: 3, label: '03 Customize' },
          { num: 4, label: '04 Generate' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                step === s.num
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                  : step > s.num
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </div>
            <span
              className={`text-xs font-semibold hidden md:inline ${
                step === s.num ? 'text-sky-400' : 'text-slate-400'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 1: Source Upload / Paste */}
      {step === 1 && (
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white">01. Select Project & Provide Source</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">
              Target Project Workspace
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
            <button
              onClick={() => setSourceMode('upload')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                sourceMode === 'upload' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Upload Document (PDF / DOCX / TXT / PPTX)
            </button>
            <button
              onClick={() => setSourceMode('paste')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                sourceMode === 'paste' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Paste Text Directly
            </button>
          </div>

          {sourceMode === 'upload' ? (
            <div className="border-2 border-dashed border-slate-700 hover:border-sky-500/50 rounded-2xl p-10 text-center transition-all bg-slate-900/40">
              <Upload className="w-10 h-10 text-sky-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-200 mb-1">
                {selectedFile ? selectedFile.name : 'Drag & Drop Document File'}
              </p>
              <p className="text-xs text-slate-400 mb-4">Supported formats: PDF, DOCX, TXT, PPTX (Max 25MB)</p>
              <label className="px-4 py-2.5 rounded-xl bg-slate-800 text-sky-400 text-xs font-bold cursor-pointer hover:bg-slate-700 transition-all inline-block">
                Choose File
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.pptx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="Security Assessment Notes Q2"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Source Text Content</label>
                <textarea
                  rows={8}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Paste report text, technical brief, or meeting notes..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSourceUpload}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center gap-2 hover:brightness-110"
            >
              <span>{loading ? 'Processing Document...' : 'Next: Select Outputs'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Outputs */}
      {step === 2 && (
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white">02. Select Target Communication Formats</h3>
          <p className="text-xs text-slate-400">Choose output formats to generate simultaneously from the extracted source facts.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'executive_summary', label: 'Executive Summary', desc: 'Structured strategic summary for leadership.', implemented: true },
              { id: 'linkedin', label: 'LinkedIn Post', desc: 'Engaging professional post with key takeaways & hashtags.', implemented: true },
              { id: 'advisory', label: 'Advisory Notice', desc: 'Formal alert directive with risk assessment & action items.', implemented: true },
              { id: 'presentation', label: 'Presentation Deck', desc: 'Multi-slide presentation deck breakdown.', implemented: true },
              { id: 'twitter', label: 'X/Twitter Thread', desc: 'Concise thread format.', implemented: false },
              { id: 'infographic', label: 'Infographic Spec', desc: 'Visual data breakdown outline.', implemented: false },
            ].map((out) => {
              const selected = selectedOutputs.includes(out.id);
              return (
                <div
                  key={out.id}
                  onClick={() => out.implemented && toggleOutput(out.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    !out.implemented
                      ? 'opacity-50 border-slate-800 bg-slate-900/20 cursor-not-allowed'
                      : selected
                      ? 'bg-sky-500/15 border-sky-500 shadow-lg shadow-sky-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {selected && <Check className="w-4 h-4 text-sky-400" />}
                      {out.label}
                    </h4>
                    {out.implemented ? (
                      <Badge variant={selected ? 'sky' : 'default'}>{selected ? 'Selected' : 'Available'}</Badge>
                    ) : (
                      <Badge variant="purple">Coming Soon</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{out.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center gap-2 hover:brightness-110"
            >
              <span>Next: Customize Controls</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Transformation Controls */}
      {step === 3 && (
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white">03. Configure Transformation Parameters</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-sky-500 focus:outline-none"
              >
                {['General Public', 'Government Officials', 'Executives', 'Technical Team', 'Security Team', 'Students', 'Custom'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-sky-500 focus:outline-none"
              >
                {['Formal', 'Professional', 'Simple', 'Educational', 'Technical'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-sky-500 focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Detail Level</label>
              <select
                value={detailLevel}
                onChange={(e) => setDetailLevel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-sky-500 focus:outline-none"
              >
                {['Short', 'Medium', 'Detailed'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Objective</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-sky-500 focus:outline-none"
              >
                {['Inform', 'Educate', 'Awareness', 'Alert', 'Brief', 'Persuade'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Style</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:border-sky-500 focus:outline-none"
              >
                {['Professional', 'Technical', 'Educational', 'Concise', 'News-style'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleStartGeneration}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs shadow-xl shadow-sky-500/25 flex items-center gap-2 hover:brightness-110"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Content</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Live Generation Timeline */}
      {step === 4 && (
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center mx-auto text-sky-400 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-white">Generating Grounded Outputs</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            TransformAI engine is extracting structured facts, applying configuration parameters, and running validation checks.
          </p>

          <div className="max-w-sm mx-auto space-y-3 text-left bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
            {genProgress.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs font-semibold text-slate-200">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
