import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { User, Shield, Key, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-xs text-slate-400">Configure user profile, role permissions, and AI Provider settings.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-sky-400" /> User Profile Information
        </h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-semibold mb-1">Full Name</span>
            <p className="text-white font-bold text-sm">{user?.name}</p>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold mb-1">Email Address</span>
            <p className="text-white font-bold text-sm">{user?.email}</p>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold mb-1">Assigned Role</span>
            <Badge variant="purple">{user?.role}</Badge>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold mb-1">Account Status</span>
            <Badge variant="emerald">Active</Badge>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-indigo-400" /> AI Provider Configuration
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">LLM API Provider Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium"
            >
              <option value="gpt-4o-mini">OpenAI GPT-4o-mini (Default Cloud)</option>
              <option value="gemini-1.5-flash">Google Gemini 1.5 Flash</option>
              <option value="claude-3-haiku">Anthropic Claude 3 Haiku</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">API Key (Optional)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              If left blank, TransformAI uses the built-in deterministic fact-grounding transformation engine.
            </p>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saved ? 'Settings Saved!' : 'Save Settings'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
