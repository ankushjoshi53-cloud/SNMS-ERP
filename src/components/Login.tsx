import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Lock, Mail, Server, Shield, CheckCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [environment, setEnvironment] = useState<'demo' | 'live'>('demo');

  useEffect(() => {
    api.environment.get()
      .then(res => {
        if (res && res.environment) {
          setEnvironment(res.environment);
        }
      })
      .catch(err => console.error('Error fetching environment:', err));
  }, []);

  const handleEnvironmentChange = async (env: 'demo' | 'live') => {
    if (env === environment) return;
    try {
      await api.environment.set(env);
      setEnvironment(env);
      window.location.reload();
    } catch (err) {
      console.error('Error setting environment:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setError('');
    setLoading(true);

    try {
      // Pass the identifier as both employeeId and email to support flexible lookup
      const data = await api.auth.login({ employeeId: identifier, email: identifier, password });
      localStorage.setItem('erp_token', data.token);
      localStorage.setItem('erp_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Demo accounts convenience logins with Employee IDs
  const demoLogins = [
    { label: 'Super Admin', empId: 'EMP001', email: 'admin@erp.com', pass: 'admin123', color: 'bg-indigo-500' },
    { label: 'QA Manager', empId: 'EMP002', email: 'qa@erp.com', pass: 'qa123', color: 'bg-indigo-500' },
    { label: 'Plant Operator', empId: 'EMP003', email: 'plant@erp.com', pass: 'plant123', color: 'bg-emerald-500' }
  ];

  const triggerDemo = (demoEmpId: string, demoPass: string) => {
    setIdentifier(demoEmpId);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-8 relative z-10 transition-all duration-300">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-indigo-950/40 border border-indigo-900/40 rounded-xl text-indigo-400 mb-3 shadow-inner">
            <Server className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">Lead-Acid Battery ERP</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">Serial Number & Traceability Suite</p>
        </div>

        {/* Dynamic Environment Selector Switch */}
        <div className="mb-6 p-1 bg-slate-950 border border-slate-850 rounded-xl flex shadow-inner">
          <button
            type="button"
            onClick={() => handleEnvironmentChange('demo')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-250 cursor-pointer ${
              environment === 'demo'
                ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Demo Mode (Learning)
          </button>
          <button
            type="button"
            onClick={() => handleEnvironmentChange('live')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-250 cursor-pointer ${
              environment === 'live'
                ? 'bg-amber-600 text-white shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Mode (Pristine)
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
              Employee ID / Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                placeholder="e.g., EMP001 or operator@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
              Security Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-medium rounded-lg py-2.5 text-sm shadow-md transition duration-150 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Verify & Log In</span>
              </>
            )}
          </button>
        </form>

        {/* Environment-specific quick login credential boxes */}
        {environment === 'demo' && (
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Demo Environment Quick Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoLogins.map(demo => (
                <button
                  key={demo.label}
                  type="button"
                  onClick={() => triggerDemo(demo.empId, demo.pass)}
                  className="text-left p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800/60 hover:border-slate-700 transition group cursor-pointer"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full ${demo.color}`} />
                    <span className="text-[11px] font-bold text-slate-200 group-hover:text-indigo-400 transition">
                      {demo.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate font-mono flex justify-between gap-1">
                    <span>ID: {demo.empId}</span>
                    <span className="opacity-40 text-[9px] truncate">{demo.email.split('@')[0]}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 p-2.5 bg-indigo-950/20 border border-indigo-900/30 rounded-lg flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-indigo-300 leading-normal font-sans">
                Click any role above to automatically load credentials. You can now log in using either <strong>Employee ID</strong> (e.g. <code className="font-mono bg-indigo-950/40 px-1 py-0.5 rounded text-white">EMP001</code>) or email address!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
