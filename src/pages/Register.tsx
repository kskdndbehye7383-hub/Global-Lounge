// src/pages/Register.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Mail, Lock, User, AlertCircle, Sparkles } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password || !displayName) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      try {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName,
          bio: "I'm new here and looking to connect!",
          createdAt: serverTimestamp()
        });
      } catch (dbError) {
        handleFirestoreError(dbError, 'create', `/users/${user.uid}`);
      }
      
      await auth.signOut();
      navigate('/login', { state: { message: "Account created successfully! Please log in to start connecting." } });
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message || 'Failed to create an account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans bg-[#050505] overflow-hidden atmosphere-luxury">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-6">
        <div className="flex justify-center mb-10">
           <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500/10 via-transparent to-sky-400/10 rounded-[2.5rem] border border-white/[0.05] flex items-center justify-center shadow-2xl relative group">
            <div className="absolute inset-0 bg-indigo-500/5 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-1000" />
            <Sparkles className="w-10 h-10 text-indigo-400 relative z-10 fill-indigo-400/10" />
          </div>
        </div>
        <h2 className="text-center text-5xl font-serif italic text-white tracking-tight">
          Elite Access
        </h2>
        <p className="mt-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
           Join the global league of connections
        </p>
      </div>

      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel py-12 px-6 shadow-[0_40px_80px_rgba(0,0,0,0.5)] sm:rounded-[3.5rem] sm:px-12 border border-white/[0.05] mx-4 sm:mx-0">
          
          {error && (
            <div className="mb-8 bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 flex items-start gap-4 backdrop-blur-md slide-in">
              <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[11px] font-bold text-rose-200 uppercase tracking-wider">{error}</p>
            </div>
          )}

          <form className="space-y-8" onSubmit={handleRegister}>
            <div className="group">
              <label className="block text-[10px] font-black text-slate-500 mb-4 ml-1 uppercase tracking-[0.3em] group-focus-within:text-indigo-400 transition-colors">Public Moniker</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="block w-full pl-16 bg-[#030303] border border-white/[0.08] rounded-3xl py-6 text-white placeholder-slate-800 focus:outline-none focus:border-indigo-500/40 sm:text-[16px] font-serif italic transition-all focus:shadow-[0_0_40px_rgba(99,102,241,0.05)]"
                  placeholder="Identify yourself"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-slate-500 mb-4 ml-1 uppercase tracking-[0.3em] group-focus-within:text-sky-400 transition-colors">Email Channel</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-600 group-focus-within:text-sky-400 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="block w-full pl-16 bg-[#030303] border border-white/[0.08] rounded-3xl py-6 text-white placeholder-slate-800 focus:outline-none focus:border-sky-500/40 sm:text-[16px] font-serif italic transition-all focus:shadow-[0_0_40px_rgba(56,189,248,0.05)]"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-slate-500 mb-4 ml-1 uppercase tracking-[0.3em] group-focus-within:text-rose-400 transition-colors">Secret Phrase</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-rose-400 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-16 bg-[#030303] border border-white/[0.08] rounded-3xl py-6 text-white placeholder-slate-800 focus:outline-none focus:border-rose-500/40 sm:text-[16px] font-serif italic transition-all focus:shadow-[0_0_40px_rgba(244,63,94,0.05)]"
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-6 px-4 rounded-3xl shadow-[0_20px_40px_rgba(99,102,241,0.1)] text-[12px] font-black text-white bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 transition-all disabled:opacity-20 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0 uppercase tracking-[0.3em]"
              >
                {loading ? 'Securing Access...' : 'Finalize Registration'}
              </button>
            </div>
          </form>

          <div className="mt-12 text-center">
            <Link
              to="/login"
              className="text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.3em] p-4 group"
            >
              Known Identity? <span className="text-indigo-400 group-hover:text-indigo-300 transition-colors underline underline-offset-8 decoration-indigo-500/20">Establish Session</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
