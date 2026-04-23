// src/pages/Admin.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, orderBy, query } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ShieldCheck, LogOut, Save, AlertCircle, CheckCircle2, List } from 'lucide-react';

export default function Admin() {
  const [inputText, setInputText] = useState('');
  const [errorLines, setErrorLines] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedCodes, setSavedCodes] = useState<string[]>([]);
  
  const navigate = useNavigate();

  // Protect route
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || user.email !== '890305@wty.com') {
      navigate('/login');
    } else {
      fetchSavedCodes();
    }
  }, [navigate]);

  const fetchSavedCodes = async () => {
    try {
      const q = query(collection(db, 'activation_codes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const codes = snapshot.docs.map(doc => doc.data().code);
      setSavedCodes(codes);
    } catch (err) {
      console.error("Failed to fetch codes");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const validateLines = (text: string) => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n');
    const invalidLines: number[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed === '') return; // skip empty lines visually
      
      // Strict regex: exactly 16 digits, nothing else
      const isValid = /^\d{16}$/.test(trimmed);
      if (!isValid) {
        invalidLines.push(index);
      }
    });
    
    return invalidLines;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
    
    // Live validation
    if (value.trim()) {
      const invalid = validateLines(value);
      setErrorLines(invalid);
      if (invalid.length > 0) {
        setErrorMsg(`Lines ${invalid.map(i => i + 1).join(', ')} must be exactly 16 digits.`);
        setSuccessMsg('');
      } else {
        setErrorMsg('');
      }
    } else {
      setErrorLines([]);
      setErrorMsg('');
    }
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setErrorMsg("Please enter at least one code.");
      return;
    }

    const invalid = validateLines(inputText);
    if (invalid.length > 0) {
      setErrorMsg("Please fix validation errors before saving. Each line must be exactly 16 digits.");
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const lines = inputText.split('\n').filter(l => l.trim() !== '');
      
      // Save all codes to Firestore backend
      const promises = lines.map(code => {
        return addDoc(collection(db, 'activation_codes'), {
          code: code.trim(),
          addedBy: auth.currentUser?.email,
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(promises);
      
      setSuccessMsg(`Successfully saved ${lines.length} codes.`);
      setInputText('');
      fetchSavedCodes();
      
    } catch (err) {
      handleFirestoreError(err, 'create', '/activation_codes');
      setErrorMsg("Failed to save codes to database.");
    } finally {
      setLoading(false);
    }
  };

  if (!auth.currentUser || auth.currentUser.email !== '890305@wty.com') return null;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-400 font-sans flex flex-col atmosphere-luxury">
      <header className="flex-none flex items-center justify-between px-8 py-6 bg-[#030303]/80 backdrop-blur-3xl border-b border-white/[0.05] z-10">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-serif italic text-white flex items-center gap-4">
              SoulConnect Hub
              <span className="text-[10px] font-black px-3 py-1 bg-rose-500/5 text-rose-500 border border-rose-500/10 rounded-full uppercase tracking-widest">Confidential Area</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Authenticated As</span>
            <span className="text-xs font-medium text-white">{auth.currentUser.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-slate-500 hover:text-white hover:bg-rose-500 transition-all flex items-center justify-center group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Editor Section */}
        <div className="lg:col-span-7 flex flex-col bg-[#030303] border border-white/[0.05] rounded-[3rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)] h-[calc(100vh-14rem)]">
          <div className="px-10 py-8 border-b border-white/[0.03] flex justify-between items-center">
            <div>
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Token Generation Logic</h2>
              <p className="text-2xl font-serif italic text-white">Access Key Ingestion</p>
            </div>
            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/5 flex flex-col items-center justify-center border border-white/[0.05]">
              <span className="text-xl font-serif italic text-indigo-400 leading-none">
                {inputText.split('\n').filter(l => l.trim() !== '').length}
              </span>
              <span className="text-[8px] font-black text-indigo-400/50 uppercase tracking-widest">Nodes</span>
            </div>
          </div>
          
          <div className="p-10 flex-1 flex flex-col gap-8 overflow-hidden">
            {errorMsg && (
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 flex items-start gap-4 backdrop-blur-3xl slide-in">
                <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                <p className="text-[11px] font-black text-rose-200 uppercase tracking-widest leading-relaxed">{errorMsg}</p>
              </div>
            )}
            
            {successMsg && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex items-start gap-4 backdrop-blur-3xl slide-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-[11px] font-black text-emerald-200 uppercase tracking-widest leading-relaxed">{successMsg}</p>
              </div>
            )}

            <div className="relative flex-1 rounded-[2rem] overflow-hidden border border-white/[0.05] transition-all bg-[#020202] flex shadow-inner group focus-within:border-indigo-500/20">
              {/* Line numbers */}
              <div className="w-16 shrink-0 bg-white/[0.02] border-r border-white/[0.03] pt-6 pb-6 text-right pr-4 select-none overflow-hidden text-[10px] font-mono text-slate-700">
                {inputText.split('\n').map((_, i) => (
                  <div key={i} className={`h-6 leading-6 ${errorLines.includes(i) ? 'text-rose-500 font-bold bg-rose-500/5' : ''}`}>
                    {(i + 1).toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
              
              <textarea
                value={inputText}
                onChange={handleInputChange}
                className="w-full flex-1 resize-none bg-transparent text-white font-mono text-sm pt-6 pb-6 px-8 focus:outline-none leading-6 tracking-[0.1em] placeholder-slate-800"
                placeholder="PROCEED WITH CAUTION&#10;ENTER 16-DIGIT TOKENS"
                spellCheck="false"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || inputText.trim() === '' || errorLines.length > 0}
              className="w-full py-6 rounded-[2rem] bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-[12px] font-black text-white shadow-[0_20px_40px_rgba(16,185,129,0.1)] transition-all disabled:opacity-20 disabled:cursor-not-allowed flex justify-center items-center gap-4 uppercase tracking-[0.4em] transform hover:-translate-y-1 active:translate-y-0"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Encrypting & Storing...' : 'Crystalize Records'}
            </button>
          </div>
        </div>

        {/* Database Records Section */}
        <div className="lg:col-span-5 flex flex-col bg-[#030303] border border-white/[0.05] rounded-[3rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)] h-[calc(100vh-14rem)]">
           <div className="px-10 py-8 border-b border-white/[0.03] flex justify-between items-center">
             <div>
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Secure Archive</h2>
              <p className="text-xl font-serif italic text-white flex items-center gap-4">
                Active Tokens
              </p>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-indigo-400">
               <List className="w-5 h-5" />
             </div>
          </div>
          
          <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
            {savedCodes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 px-10 text-center space-y-6">
                 <ShieldCheck className="w-16 h-16 opacity-10" />
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">The secure database vault is currently empty.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedCodes.map((code, idx) => (
                  <div key={idx} className="flex justify-between items-center px-6 py-5 bg-[#020202] border border-white/[0.03] rounded-3xl group hover:border-emerald-500/20 transition-all slide-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex items-center gap-5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                      <span className="font-mono tracking-[0.2em] text-white text-sm group-hover:text-emerald-400 transition-colors">
                        {code.replace(/(\d{4})/g, '$1 ').trim()}
                      </span>
                    </div>
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Status: Ready</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
