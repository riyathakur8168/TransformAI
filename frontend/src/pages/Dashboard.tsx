import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Project } from '../types';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import {
  FolderKanban,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [projData, statsData] = await Promise.all([
          apiRequest<Project[]>('/projects'),
          apiRequest<any>('/admin/analytics'),
        ]);
        setProjects(projData);
        setAnalytics(statsData);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner Greeting */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/40 border border-sky-500/20 relative overflow-hidden shadow-2xl">
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Sparkles className="w-64 h-64 text-sky-400" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>AI Fact Grounding Engine Active</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Good day, {user?.name || 'User'}
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Transform your complex source documents into audience-specific formats with source-grounded validation and export engines.
          </p>
          <div className="pt-2 flex items-center gap-4">
            <Link
              to="/new-transformation"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-sky-500/25 hover:brightness-110 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>+ New Transformation</span>
            </Link>
            <Link
              to="/projects"
              className="px-5 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200 font-semibold text-sm hover:bg-slate-800 transition-all"
            >
              View Projects
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Total Projects</span>
            <FolderKanban className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-3xl font-black text-white">{analytics?.total_projects ?? projects.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Active workspaces</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Transformations</span>
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-black text-white">{analytics?.total_transformations ?? 12}</p>
          <p className="text-[11px] text-slate-400 mt-1">Generated output sets</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Reviews</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white">
            {(analytics?.total_outputs || 0) - (analytics?.approved_outputs || 0)}
          </p>
          <p className="text-[11px] text-amber-400 mt-1">Awaiting approval</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Approved Outputs</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">{analytics?.approved_outputs ?? 4}</p>
          <p className="text-[11px] text-emerald-400 mt-1">Ready for export</p>
        </div>
      </div>

      {/* Recent Projects Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Recent Projects</h3>
            <p className="text-xs text-slate-400">Select a project to inspect sources, outputs, or start transformations.</p>
          </div>
          <Link
            to="/projects"
            className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Loading project data...</p>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <FolderKanban className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">No transformations yet.</p>
            <Link
              to="/new-transformation"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> Start Transformation
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Sources</th>
                  <th className="py-3 px-4">Transformations</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-100">
                      <Link to={`/projects/${proj.id}`} className="hover:text-sky-400">
                        {proj.name}
                      </Link>
                      {proj.description && (
                        <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs">{proj.description}</p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        {proj.sources_count || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        {proj.transformations_count || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={proj.status === 'ACTIVE' ? 'sky' : 'emerald'}>
                        {proj.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {new Date(proj.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => navigate(`/projects/${proj.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-sky-600 hover:text-white transition-all text-xs font-semibold"
                      >
                        Open Workspace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
