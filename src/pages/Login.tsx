// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Mail, Lock, AlertCircle, CheckCircle2, Heart } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = location.state?.message;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Admin redirect logic
      if (userCredential.user.email === '890305@wty.com') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Failed to log in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans bg-[#050505] overflow-hidden atmosphere-luxury">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-10">
          <div className="w-24 h-24 bg-gradient-to-tr from-rose-500/10 via-transparent to-indigo-500/10 rounded-[2.5rem] border border-white/[0.05] flex items-center justify-center shadow-2xl relative group">
            <div className="absolute inset-0 bg-rose-500/5 blur-3xl group-hover:bg-rose-500/20 transition-all duration-1000" />
            <Heart className="w-10 h-10 text-rose-500 relative z-10 fill-rose-500/10" />
          </div>
        </div>
        <h2 className="text-center text-5xl font-serif italic text-white tracking-tight">
          SoulConnect
        </h2>
        <p className="mt-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
          Refined Connections for the Elite
        </p>
      </div>

      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel py-12 px-6 shadow-[0_40px_80px_rgba(0,0,0,0.5)] sm:rounded-[3.5rem] sm:px-12 border border-white/[0.05] mx-4 sm:mx-0">
          
          {successMessage && (
            <div className="mb-8 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex items-start gap-4 backdrop-blur-md slide-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
              <p className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-8 bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 flex items-start gap-4 backdrop-blur-md slide-in">
              <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
              <p className="text-[11px] font-bold text-rose-200 uppercase tracking-wider">{error}</p>
            </div>
          )}

          <form className="space-y-8" onSubmit={handleLogin}>
            <div className="group">
              <label className="block text-[10px] font-black text-slate-500 mb-4 ml-1 uppercase tracking-[0.3em] group-focus-within:text-rose-400 transition-colors">Access Identifier</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-600 group-focus-within:text-rose-400 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="block w-full pl-16 bg-[#030303] border border-white/[0.08] rounded-3xl py-6 text-white placeholder-slate-800 focus:outline-none focus:border-rose-500/40 sm:text-[16px] font-serif italic transition-all focus:shadow-[0_0_40px_rgba(244,63,94,0.05)]"
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="group">
              <div className="flex justify-between items-center mb-4 mx-1">
                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] group-focus-within:text-indigo-400 transition-colors">Secret Key</label>
                 <a href="#" className="text-[9px] font-black text-rose-500/60 hover:text-rose-400 uppercase tracking-widest transition-colors">Forgot?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-16 bg-[#030303] border border-white/[0.08] rounded-3xl py-6 text-white placeholder-slate-800 focus:outline-none focus:border-indigo-500/40 sm:text-[16px] font-serif italic transition-all focus:shadow-[0_0_40px_rgba(99,102,241,0.05)]"
                  placeholder="Password"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-6 px-4 rounded-3xl shadow-[0_20px_40px_rgba(244,63,94,0.1)] text-[12px] font-black text-white bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 transition-all disabled:opacity-20 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0 uppercase tracking-[0.3em]"
              >
                {loading ? 'Initializing...' : 'Establish Session'}
              </button>
            </div>
          </form>

          <div className="mt-12 text-center">
            <Link
              to="/register"
              className="text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.3em] p-4 group"
            >
              Don't have an ID? <span className="text-rose-500 group-hover:text-rose-400 transition-colors underline underline-offset-8 decoration-rose-500/20">Register Access</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
