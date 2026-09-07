import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Project, Source, Transformation, GeneratedContent } from '../types';
import { Badge } from '../components/ui/Badge';
import {
  FolderKanban,
  FileText,
  Sparkles,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  Sliders,
  History
} from 'lucide-react';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'outputs' | 'history'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const projData = await apiRequest<Project>(`/projects/${id}`);
        setProject(projData);

        // Fetch sources for project
        const sourcesData = await apiRequest<Source[]>(`/sources/project/${id}`).catch(() => []);
        setSources(sourcesData);

        // Fetch transformations for project
        const transData = await apiRequest<Transformation[]>(`/transformations/project/${id}`).catch(() => []);
        setTransformations(transData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <p className="text-sm text-slate-400 py-8">Loading project workspace...</p>;
  if (!project) return <p className="text-sm text-rose-400 py-8">Project not found.</p>;

  // Flatten all generated outputs across transformations
  const allOutputs: GeneratedContent[] = transformations.flatMap((t) => t.outputs || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <Badge variant="sky">{project.status}</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">{project.description || 'Enterprise content workspace.'}</p>
        </div>

        <Link
          to={`/new-transformation?projectId=${project.id}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-sky-500/20 hover:brightness-110 transition-all self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Transformation</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-6 text-sm font-semibold text-slate-400">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'overview' ? 'border-sky-500 text-sky-400' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'sources' ? 'border-sky-500 text-sky-400' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Sources ({sources.length})
        </button>
        <button
          onClick={() => setActiveTab('outputs')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'outputs' ? 'border-sky-500 text-sky-400' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Generated Outputs ({allOutputs.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'history' ? 'border-sky-500 text-sky-400' : 'border-transparent hover:text-slate-200'
          }`}
        >
          History ({transformations.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-bold uppercase">Sources Uploaded</span>
              <p className="text-2xl font-extrabold text-white mt-2">{sources.length}</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-bold uppercase">Transformations Run</span>
              <p className="text-2xl font-extrabold text-white mt-2">{transformations.length}</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-bold uppercase">Approved Outputs</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                {allOutputs.filter((o) => o.status === 'APPROVED').length}
              </p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-base font-bold text-white mb-4">Latest Generated Outputs</h3>
            {allOutputs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No outputs generated yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allOutputs.slice(0, 4).map((out) => (
                  <div
                    key={out.id}
                    onClick={() => navigate(`/output/${out.id}`)}
                    className="glass-card p-4 rounded-xl border border-slate-800 cursor-pointer flex items-center justify-between hover:border-sky-500/40"
                  >
                    <div>
                      <Badge variant={out.status === 'APPROVED' ? 'emerald' : 'amber'} size="sm">
                        {out.status}
                      </Badge>
                      <h4 className="text-sm font-bold text-white mt-1.5">{out.title}</h4>
                      <p className="text-[11px] text-slate-400">Version {out.current_version}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-sky-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Project Sources</h3>
            <Link
              to={`/new-transformation?projectId=${project.id}`}
              className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold"
            >
              + Add Source
            </Link>
          </div>
          {sources.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No sources uploaded to this project yet.</p>
          ) : (
            <div className="divide-y divide-slate-800">
              {sources.map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/sources/${s.id}`)}
                  className="py-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/40 px-2 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-sky-400" />
                    <div>
                      <p className="text-sm font-bold text-slate-200">{s.name}</p>
                      <span className="text-[11px] text-slate-400">{s.type} • {(s.file_size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <Badge variant="sky">{s.processing_status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'outputs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allOutputs.map((out) => (
            <div
              key={out.id}
              onClick={() => navigate(`/output/${out.id}`)}
              className="glass-card p-5 rounded-xl border border-slate-800 cursor-pointer flex items-center justify-between"
            >
              <div>
                <Badge variant={out.status === 'APPROVED' ? 'emerald' : 'amber'}>{out.status}</Badge>
                <h4 className="text-sm font-bold text-white mt-2">{out.title}</h4>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Format: {out.type}</span>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-slate-800 text-sky-400 text-xs font-semibold">
                Review & Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Transformation History</h3>
          <div className="space-y-3">
            {transformations.map((t) => (
              <div key={t.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sky-400">Transformation #{t.id.slice(0, 8)}</span>
                  <Badge variant="emerald">{t.status}</Badge>
                </div>
                <p>Audience: {t.configuration.audience} | Tone: {t.configuration.tone} | Language: {t.configuration.language}</p>
                <span className="text-[10px] text-slate-500 mt-2 block">{new Date(t.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
