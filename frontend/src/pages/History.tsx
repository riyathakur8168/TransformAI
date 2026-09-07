import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { AuditLog } from '../types';
import { History as HistoryIcon, Clock, User, ShieldCheck } from 'lucide-react';

export const History: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await apiRequest<AuditLog[]>('/admin/audit-logs').catch(() => []);
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transformation History & Audit Logs</h1>
        <p className="text-xs text-slate-400">Complete immutable record of all document transformations, edits, approvals, and exports.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        {loading ? (
          <p className="text-xs text-slate-400 py-6">Loading audit timeline...</p>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">No history records logged yet.</div>
        ) : (
          <div className="relative border-l-2 border-slate-800 ml-4 space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-sky-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-400 uppercase tracking-wider">{log.action}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200">
                    Resource: <strong className="text-white">{log.resource_type}</strong> ({log.resource_id?.slice(0, 8)})
                  </p>
                  <span className="text-[11px] text-slate-400 block">User: {log.user_name || 'System Operator'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
