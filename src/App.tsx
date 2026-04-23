/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Membership from './pages/Membership';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-sans atmosphere-luxury">
        <div className="flex flex-col items-center gap-6">
           <div className="w-16 h-16 relative">
              <div className="absolute inset-0 border-4 border-white/[0.03] rounded-2xl"></div>
              <div className="absolute inset-0 border-4 border-rose-500 border-t-transparent rounded-2xl animate-spin shadow-lg shadow-rose-500/20"></div>
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Initializing Identity</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? (user.email === '890305@wty.com' ? <Navigate to="/admin" /> : <Navigate to="/" />) : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route 
          path="/admin" 
          element={user?.email === '890305@wty.com' ? <Admin /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/membership" 
          element={user ? <Membership /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={user ? (user.email === '890305@wty.com' ? <Navigate to="/admin" /> : <Home />) : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}
