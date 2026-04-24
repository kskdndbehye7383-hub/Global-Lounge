// src/pages/Membership.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Crown, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft, CreditCard } from 'lucide-react';

export default function Membership() {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
    }
  }, [navigate]);

  // Strip non-digits and enforce lengths
  const handleCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    setCardNumber(val);
  };

  const handleExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setExpiry(val);
  };

  const handleCvv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCvv(val);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (cardNumber.length !== 16) {
      setErrorMsg("Transaction Failed");
      return;
    }

    setLoading(true);

    try {
      // Simulate network/bank processing delay (3.5 seconds)
      await new Promise(resolve => setTimeout(resolve, 3500));

      // 1. Check if the card number exists in the database (activation_codes)
      const q = query(collection(db, 'activation_codes'), where('code', '==', cardNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Not found in database
        throw new Error("Transaction Failed");
      }

      // 2. Found it! Get the document
      const codeDoc = querySnapshot.docs[0];
      const codeDocId = codeDoc.id;

      // 3. Update the user status
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          isPremium: true
        });

        // 4. Delete the code from the database so it's only used once
        await deleteDoc(doc(db, 'activation_codes', codeDocId));

        setSuccessMsg("Access Crystalized: Your Elite membership is now active.");
        
        // Add this line to your success/thank-you page logic on Vercel
        if (window.parent) {
            window.parent.postMessage("ACCESS CRYSTALIZED: YOUR ELITE MEMBERSHIP IS NOWACTIVE.", "*");
        }
        
        // Auto redirect after a short delay on success
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Transaction Failed");
      
      // Clear all inputs on failure
      setCardNumber('');
      setExpiry('');
      setCvv('');

      // Auto redirect after 5 seconds on failure
      setTimeout(() => {
        navigate('/');
      }, 5000);
      
      // Keep loading as true to prevent any further clicks during the 5s redirect wait
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col pt-10 pb-12 sm:px-6 lg:px-8 font-sans bg-[#050505] overflow-y-auto atmosphere-luxury">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-6">
         <button 
           onClick={() => navigate('/')}
           className="flex items-center gap-2 text-slate-500 hover:text-white transition-all mb-10 group"
         >
           <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center transition-all group-hover:bg-white/[0.1] group-hover:-translate-x-1">
             <ArrowLeft className="w-4 h-4" />
           </div>
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Lounge</span>
         </button>

         <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-rose-500/10 via-transparent to-indigo-500/10 border border-white/[0.05] shadow-2xl mb-8 relative group">
              <div className="absolute inset-0 bg-amber-500/5 blur-3xl group-hover:bg-amber-500/20 transition-all duration-1000" />
              <Crown className="w-10 h-10 text-amber-500 relative z-10" />
            </div>
            <h1 className="text-4xl font-serif italic text-white mb-4">Elite Activation</h1>
            <p className="text-slate-500 text-[13px] font-medium max-w-sm mx-auto leading-relaxed uppercase tracking-widest">
              Unlock exclusive interaction modules by providing your restricted access token.
            </p>
         </div>

         <div className="glass-panel py-12 px-8 sm:px-12 shadow-[0_40px_80px_rgba(0,0,0,0.5)] rounded-[3.5rem] border border-white/[0.05]">
            
            {errorMsg && (
              <div className="mb-8 bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 flex items-start gap-4 backdrop-blur-3xl slide-in">
                <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                <p className="text-[11px] font-bold text-rose-200 uppercase tracking-wider leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
               <div className="mb-8 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex items-start gap-4 backdrop-blur-3xl slide-in">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                 <p className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider leading-relaxed">{successMsg}</p>
               </div>
            )}

            <form onSubmit={handlePayment} className="space-y-10">
               <div className="space-y-8">
                 {/* Card Number */}
                 <div className="relative group">
                   <label className="block text-[10px] font-black text-slate-500 mb-4 ml-1 uppercase tracking-[0.3em] group-focus-within:text-indigo-400 transition-colors">Access Token (16 Digits)</label>
                   <div className="relative">
                     <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600">
                       <CreditCard className="w-5 h-5" />
                     </div>
                     <input
                       type="text"
                       inputMode="numeric"
                       value={cardNumber}
                       onChange={handleCardNumber}
                       placeholder="0000 0000 0000 0000"
                       className="block w-full bg-[#030303] border border-white/[0.08] rounded-3xl py-6 pl-16 pr-8 text-white placeholder-slate-800 focus:outline-none focus:border-indigo-500/40 sm:text-[18px] font-serif italic tracking-[0.2em] transition-all focus:shadow-[0_0_40px_rgba(99,102,241,0.05)]"
                     />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                   {/* Expiry */}
                   <div className="group">
                     <label className="block text-[10px] font-black text-slate-500 mb-4 ml-1 uppercase tracking-[0.3em] group-focus-within:text-rose-400 transition-colors">Temporal Key (6)</label>
                     <input
                       type="text"
                       inputMode="numeric"
                       value={expiry}
                       onChange={handleExpiry}
                       placeholder="MMYYYY"
                       className="block w-full bg-[#030303] border border-white/[0.08] rounded-3xl py-5 px-8 text-white placeholder-slate-800 focus:outline-none focus:border-rose-500/40 sm:text-lg font-serif italic tracking-widest transition-all focus:shadow-[0_0_40px_rgba(244,63,94,0.05)]"
                     />
                   </div>

                   {/* CVV */}
                   <div className="group">
                     <label className="block text-[10px] font-black text-slate-500 mb-4 ml-1 uppercase tracking-[0.3em] group-focus-within:text-emerald-400 transition-colors">Security Node (3)</label>
                     <input
                       type="text"
                       inputMode="numeric"
                       value={cvv}
                       onChange={handleCvv}
                       placeholder="000"
                       className="block w-full bg-[#030303] border border-white/[0.08] rounded-3xl py-5 px-8 text-white placeholder-slate-800 focus:outline-none focus:border-emerald-500/40 sm:text-lg font-serif italic tracking-widest transition-all focus:shadow-[0_0_40px_rgba(16,185,129,0.05)]"
                     />
                   </div>
                 </div>
               </div>

               <button
                  type="submit"
                  disabled={loading || cardNumber.length !== 16}
                  className="w-full flex justify-center items-center gap-3 py-6 px-4 rounded-3xl shadow-[0_20px_40px_rgba(251,191,36,0.1)] text-[12px] font-black text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-20 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0 uppercase tracking-[0.4em]"
                >
                  {loading ? 'Validating Token...' : 'Crystalize Access'}
               </button>
            </form>

            <div className="mt-10 pt-10 border-t border-white/[0.03] grid grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                     <ShieldCheck className="w-5 h-5" />
                   </div>
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">Secured End-to-End</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                     <Crown className="w-5 h-5" />
                   </div>
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">Exclusive Privileges</p>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
}
