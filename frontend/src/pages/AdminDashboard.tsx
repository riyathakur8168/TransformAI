import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { User, AuditLog } from '../types';
import { Badge } from '../components/ui/Badge';
import { Users, Shield, History, BarChart3 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      const [uData, lData, aData] = await Promise.all([
        apiRequest<User[]>('/admin/users'),
        apiRequest<AuditLog[]>('/admin/audit-logs'),
        apiRequest<any>('/admin/analytics'),
      ]);
      setUsers(uData);
      setLogs(lData);
      setAnalytics(aData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiRequest(`/admin/users/${userId}/role?role=${newRole}`, {
        method: 'PUT',
      });
      loadAdminData();
    } catch (err) {
      alert('Role update failed');
    }
  };

  if (loading) return <p className="text-sm text-slate-400 py-8">Loading admin panel...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-400" /> Admin Control Workspace
        </h1>
        <p className="text-xs text-slate-400">Manage user access roles, audit records, and platform metrics.</p>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-bold uppercase">Total Users</span>
          <p className="text-2xl font-extrabold text-white mt-1">{analytics?.total_users ?? users.length}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-bold uppercase">Total Projects</span>
          <p className="text-2xl font-extrabold text-sky-400 mt-1">{analytics?.total_projects ?? 0}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-bold uppercase">Sources Uploaded</span>
          <p className="text-2xl font-extrabold text-indigo-400 mt-1">{analytics?.total_sources ?? 0}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-bold uppercase">Approved Outputs</span>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{analytics?.approved_outputs ?? 0}</p>
        </div>
      </div>

      {/* User Management Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-400" /> User Role Management
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Reassign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="py-3.5 px-4 font-semibold text-white">{u.name}</td>
                  <td className="py-3.5 px-4 text-slate-300">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={u.role === 'ADMIN' ? 'purple' : u.role === 'REVIEWER' ? 'amber' : 'sky'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="OPERATOR">OPERATOR</option>
                      <option value="REVIEWER">REVIEWER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
