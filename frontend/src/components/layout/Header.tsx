import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, ShieldCheck, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user } = useAuth();

  return (
    <header className="h-20 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          {title || `Good day, ${user?.name || 'User'}`}
        </h2>
        <p className="text-xs text-slate-400">
          {subtitle || 'Convert complex documents into grounded multi-audience outputs.'}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Link
          to="/new-transformation"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 hover:brightness-110 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ New Transformation</span>
        </Link>

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Grounded Fact Validator Active</span>
        </div>
      </div>
    </header>
  );
};
