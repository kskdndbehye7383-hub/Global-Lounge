// src/pages/Home.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, getDoc, doc, updateDoc, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Send, LogOut, Flame, User, Search, Settings, ArrowRight, Crown, UserPlus, X, Heart, Shield, Bell, Moon } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  chatPartnerId: string; // The ID of the conversation partner
  userId: string;        // The owner of this private view
  createdAt: number | null;
  isPremium?: boolean;
}

// Safely get the API Key
const getApiKey = () => {
  try {
    // Priority: Vite env variable (for Vercel/external), then process.env (for Studio)
    return import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
  } catch {
    return '';
  }
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string>('Global');

  const [friendsList, setFriendsList] = useState<{name: string, online: boolean, avatar: string}[]>([
    {name: 'Sarah', online: true, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'},
    {name: 'Mike.T', online: false, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'},
    {name: 'Jessica', online: true, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150'},
    {name: 'Emily', online: false, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'},
    {name: 'David', online: true, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150'},
    {name: 'Chris', online: false, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'},
    {name: 'Sophia', online: true, avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?auto=format&fit=crop&q=80&w=150'},
    {name: 'Liam', online: false, avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150'},
    {name: 'Olivia', online: true, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150'},
    {name: 'Noah', online: false, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150'},
    {name: 'Ava', online: true, avatar: 'https://images.unsplash.com/photo-1531746020798-e795c5399c5c?auto=format&fit=crop&q=80&w=150'},
    {name: 'Mason', online: false, avatar: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&q=80&w=150'},
    {name: 'Isabella', online: true, avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=150'},
    {name: 'Ethan', online: false, avatar: 'https://images.unsplash.com/photo-1506863530036-1efeddceb993?auto=format&fit=crop&q=80&w=150'},
    {name: 'Mona', online: true, avatar: 'https://images.unsplash.com/photo-1516239482977-b550ba7253f2?auto=format&fit=crop&q=80&w=150'},
    {name: 'Alex', online: true, avatar: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=150'}
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    getDoc(doc(db, 'users', user.uid)).then(docSnap => {
      if (docSnap.exists()) {
        setCurrentUserProfile(docSnap.data());
      }
    });

    const q = query(
      collection(db, 'messages'), 
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as ChatMessage;
        if (data.chatPartnerId === selectedPartner) {
          msgs.push({ id: doc.id, ...data });
        }
      });
      // Sort in-memory to avoid composite index requirement
      msgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(msgs);
    }, (error) => {
      console.error("Messages fetch error:", error);
    });

    return () => unsubscribe();
  }, [navigate, selectedPartner]);

  const generateAutoReply = async (userMessage: string) => {
    if (!ai) {
      console.error("Auto-reply error: AI module not initialized");
      return;
    }

    setIsTyping(true);
    try {
      // Use the selected partner if it's a specific bot, otherwise pick random
      const targetPartner = selectedPartner !== 'Global' 
        ? (friendsList.find(f => f.name === selectedPartner) || friendsList.filter(f => f.online)[0])
        : friendsList.filter(f => f.online)[Math.floor(Math.random() * friendsList.filter(f => f.online).length)];
      
      const speaker = targetPartner;

      let replyText = '';
      try {
        const model = ai.getGenerativeModel({ 
          model: "gemini-1.5-flash-latest",
          systemInstruction: `You are ${speaker.name}, a friendly user on a dating/social app. Reply to the user in a short, engaging, and casual way. Be conversational and slightly flirty or just very friendly. Keep it under 20 words.`
        });
        
        const result = await model.generateContent(userMessage);
        replyText = result.response.text();
      } catch (innerError) {
        console.warn("AI Reply failed:", innerError);
      }

      if (replyText && auth.currentUser) {
        await addDoc(collection(db, 'messages'), {
          text: replyText,
          senderId: `bot_${speaker.name}`,
          senderName: speaker.name,
          chatPartnerId: selectedPartner === 'Global' ? 'Global' : speaker.name,
          isPremium: true, // Bots are always premium
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Auto-reply error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAddFriend = (name: string, avatar: string) => {
    if (!currentUserProfile?.isPremium) {
      alert("VIP Required: Please upgrade your membership to connect with specific identities.");
      navigate('/membership');
      return;
    }

    const exists = friendsList.some(f => f.name === name);
    if (exists) {
      alert(`${name} is already in your secure network.`);
      return;
    }

    setFriendsList(prev => [{ name, online: true, avatar }, ...prev]);
    alert(`Identity Sync Successful: ${name} added to your connections.`);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    if (!currentUserProfile?.isPremium) {
      alert("VIP Required: Please upgrade your membership to send messages.");
      navigate('/membership');
      return;
    }

    const user = auth.currentUser;
    const senderName = currentUserProfile?.displayName || user.email?.split('@')[0] || 'Unknown User';
    const userMsg = newMessage.trim();

    try {
      await addDoc(collection(db, 'messages'), {
        text: userMsg,
        senderId: user.uid,
        senderName: senderName,
        userId: user.uid,
        chatPartnerId: selectedPartner,
        isPremium: currentUserProfile?.isPremium || false,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
      
      // Trigger AI reply after a short delay
      setTimeout(() => generateAutoReply(userMsg), 1000);
    } catch (err) {
      handleFirestoreError(err, 'create', '/messages');
    }
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim()) return;

    if (!currentUserProfile?.isPremium) {
      alert("VIP Required: Please upgrade your membership to add friends.");
      navigate('/membership');
      return;
    }
    
    setFriendsList(prev => [{name: friendEmail.split('@')[0], online: true, avatar: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?auto=format&fit=crop&q=80&w=150`}, ...prev]);
    setFriendEmail('');
    setShowAddFriend(false);
    alert(`Friend request sent to ${friendEmail}!`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const updateProfile = async (field: string, value: any) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        [field]: value
      });
      setCurrentUserProfile((prev: any) => ({ ...prev, [field]: value }));
    } catch (err) {
      console.error("Profile update error:", err);
    }
  };

  if (!auth.currentUser) return null;

  return (
    <div className="flex h-screen bg-[#050505] text-slate-100 font-sans overflow-hidden atmosphere-luxury">
      
      {/* Sidebar */}
      <div className="hidden md:flex w-[320px] flex-col border-r border-white/5 bg-white/[0.01] backdrop-blur-3xl relative z-20">
        
        {/* User Card Header */}
        <div className="p-8 border-b border-white/[0.03] flex items-center justify-between bg-gradient-to-br from-rose-500/5 to-indigo-500/5">
          <div className="flex items-center gap-4 relative">
            <div className={`w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center p-0.5 shadow-2xl ${currentUserProfile?.isPremium ? 'bg-gradient-to-tr from-amber-400 via-yellow-200 to-orange-500 shadow-amber-500/10' : 'bg-gradient-to-tr from-rose-500/20 to-indigo-500/20'}`}>
              <div className="w-full h-full rounded-[0.8rem] bg-[#0A0A0A] flex items-center justify-center border border-white/5 relative overflow-hidden">
                 {currentUserProfile?.avatarUrl ? (
                    <img src={currentUserProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                    <User className="w-6 h-6 text-slate-500" />
                 )}
              </div>
            </div>
            {/* VIP Crown Overlay */}
            {currentUserProfile?.isPremium && (
               <div className="absolute -top-2 -left-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg p-1.5 shadow-xl shadow-orange-500/40 rotate-[-12deg] z-30">
                 <Crown className="w-3.5 h-3.5 text-white" />
               </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-white text-[15px] flex items-center gap-1.5 truncate">
                {currentUserProfile?.displayName || auth.currentUser.email?.split('@')[0]}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Now</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.1] transition-all hover:rotate-90 duration-500"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Upgrade Banner */}
        {!currentUserProfile?.isPremium && (
          <div className="mx-6 mt-8 p-6 rounded-3xl bg-gradient-to-br from-amber-400/10 via-transparent to-orange-500/5 border border-amber-500/20 relative overflow-hidden group cursor-pointer" onClick={() => navigate('/membership')}>
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-1000" />
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-3">
                 <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                   <Crown className="w-4 h-4 text-amber-500" />
                 </div>
                 <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Prestige</span>
               </div>
               <h4 className="text-base font-bold text-white mb-1">Join the Elite</h4>
               <p className="text-xs text-slate-400 mb-4 leading-relaxed opacity-70">Access exclusive lounges and priority matching.</p>
               <div className="flex items-center gap-2 text-[11px] font-bold text-amber-500 hover:text-amber-400 transition-colors">
                 Upgrade Membership <ArrowRight className="w-3 h-3" />
               </div>
             </div>
          </div>
        )}

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">

            {/* Add Friend Section */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6 px-1">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Connections</h3>
              </div>

              {showAddFriend ? (
                <div className="mb-6 bg-white/[0.02] p-6 rounded-[2rem] border border-white/[0.05] shadow-2xl slide-in relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <button onClick={() => setShowAddFriend(false)} className="text-slate-600 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">New Identity Search</h4>
                  <form onSubmit={handleAddFriend} className="space-y-4">
                    <input 
                      type="email" 
                      required
                      value={friendEmail}
                      onChange={e => setFriendEmail(e.target.value)}
                      className="w-full bg-[#050505] border border-white/[0.08] rounded-2xl py-4 px-5 text-xs text-white focus:outline-none focus:border-indigo-500/40 transition-colors"
                      placeholder="Enter identity email..."
                    />
                    <button type="submit" className="w-full py-4 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20">
                      Add Connection
                    </button>
                  </form>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    if (!currentUserProfile?.isPremium) {
                      alert("VIP Required: Please upgrade your membership to discover new connections.");
                      navigate('/membership');
                      return;
                    }
                    setShowAddFriend(true);
                  }}
                  className="w-full mb-6 p-5 rounded-[2rem] bg-gradient-to-br from-indigo-500/10 to-rose-500/5 border border-white/[0.05] hover:border-indigo-500/30 transition-all flex items-center justify-center gap-4 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Discover New Identity</span>
                </button>
              )}

              <div className="space-y-2">
                {friendsList.map((f, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedPartner(f.name)}
                    className={`flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer group ${selectedPartner === f.name ? 'bg-white/[0.08] border-white/[0.1]' : 'hover:bg-white/[0.03] border-transparent hover:border-white/[0.05]'}`}
                  >
                     <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center relative shadow-xl border transition-all transform group-hover:scale-105 ${selectedPartner === f.name ? 'border-indigo-500' : 'border-white/[0.05]'}`}>
                       <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                       <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#050505] rounded-full ${f.online ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                     </div>
                     <div>
                       <span className={`text-sm font-bold transition-colors ${selectedPartner === f.name ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{f.name}</span>
                       <p className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors uppercase tracking-widest mt-0.5">{f.online ? 'Online' : 'Offline'}</p>
                     </div>
                  </div>
                ))}
              </div>
           </div>


           <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Featured Lounge</h3>
           </div>

           {/* Featured Room Item */}
           <div 
             onClick={() => setSelectedPartner('Global')}
             className={`flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all cursor-pointer group relative overflow-hidden ${selectedPartner === 'Global' ? 'bg-white/[0.08] border-white/[0.1]' : 'bg-gradient-to-br from-indigo-500/5 to-rose-500/5 border-white/[0.05] hover:border-white/[0.1]'}`}
           >
              <div className={`w-12 h-12 rounded-xl bg-slate-900 border flex items-center justify-center relative shadow-2xl transform transition-transform group-hover:scale-110 ${selectedPartner === 'Global' ? 'border-rose-500' : 'border-white/5'}`}>
                <Flame className={`w-6 h-6 ${selectedPartner === 'Global' ? 'text-rose-500 fill-rose-500/20' : 'text-rose-500/50'}`} />
                <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#050505] rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate text-sm">Global Lounge</p>
                <p className="text-[10px] text-slate-500 truncate uppercase mt-0.5 font-bold tracking-widest">Public Interaction</p>
              </div>
           </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/[0.03]">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 bg-white/[0.02] hover:bg-rose-500/10 hover:text-rose-400 transition-all border border-white/[0.05] hover:border-rose-500/20"
           >
             <LogOut className="w-4 h-4" />
             End Session
           </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full bg-[#050505]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.05)_0%,transparent_50%)] pointer-events-none" />
        
        {/* Chat Header */}
        <header className="flex-none flex items-center justify-between px-8 py-6 bg-black/40 backdrop-blur-xl border-b border-white/[0.03] relative z-10">
          <div className="flex items-center gap-5">
             <div className="md:hidden w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mr-1">
               <ArrowRight className="w-5 h-5 text-slate-400 rotate-180" />
             </div>
             <div>
               <h1 className="text-xl font-serif italic text-white flex items-center gap-3">
                 {selectedPartner === 'Global' ? (
                   <>
                     <Flame className="w-6 h-6 text-rose-500" /> 
                     Global Lounge
                   </>
                 ) : (
                   <>
                     <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                       <img 
                         src={friendsList.find(f => f.name === selectedPartner)?.avatar} 
                         className="w-full h-full object-cover" 
                         alt="" 
                       />
                     </div>
                     {selectedPartner}
                   </>
                 )}
               </h1>
               <div className="flex items-center gap-2 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                 <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.15em]">{messages.length + (isTyping ? 1 : 0)} Live Synchronizations</p>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (!currentUserProfile?.isPremium) {
                  alert("VIP Required: Please upgrade your membership to discover new connections.");
                  navigate('/membership');
                  return;
                }
                setShowAddFriend(true);
              }}
              className="w-11 h-11 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-all transform hover:scale-105 border border-white/[0.05]"
            >
              <UserPlus className="w-5 h-5" />
            </button>

            {!currentUserProfile?.isPremium && (
               <button onClick={() => navigate('/membership')} className="md:hidden w-11 h-11 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center transition-all hover:bg-amber-400 hover:text-black">
                 <Crown className="w-4 h-4" />
               </button>
            )}
            <button className="hidden sm:flex w-11 h-11 rounded-xl glass-panel items-center justify-center text-slate-400 hover:text-white transition-all transform hover:scale-105">
              <Search className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="md:hidden w-11 h-11 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <main className="flex-1 overflow-y-auto p-8 space-y-10 relative z-10 scrollbar-thin">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-6">
              <div className="w-24 h-24 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center rotate-6 transform hover:rotate-0 transition-transform duration-500">
                 <Flame className="w-12 h-12 text-rose-500 opacity-20" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-600 mb-1">Silence is Golden</p>
                <p className="text-xs text-slate-700">Await the first spark of conversation.</p>
              </div>
            </div>
          )}
          
          {messages.map((msg, index) => {
            const isMe = msg.senderId === auth.currentUser?.uid;
            const showName = index === 0 || messages[index - 1].senderId !== msg.senderId;
            const bot = friendsList.find(f => f.name === msg.senderName);
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-4xl mx-auto w-full`}>
                {showName && !isMe && (
                  <button 
                    onClick={() => handleQuickAddFriend(msg.senderName, bot?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=50')}
                    className="flex items-center gap-3 mb-3 ml-1 group/bot transition-all hover:translate-x-1"
                  >
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl group-hover/bot:border-indigo-500/50 transition-all transform group-hover/bot:scale-110">
                      <img src={bot?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=50'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[11px] font-black text-white flex items-center gap-1.5 uppercase tracking-wider group-hover/bot:text-indigo-400 transition-colors">
                        {msg.senderName}
                        {msg.isPremium && <Crown className="w-3 h-3 text-amber-500" />}
                        <UserPlus className="w-2.5 h-2.5 opacity-0 group-hover/bot:opacity-100 ml-1" />
                      </span>
                      <span className="text-[9px] text-slate-600 font-bold tracking-widest uppercase">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Initializing'}
                      </span>
                    </div>
                  </button>
                )}
                
                <div 
                  className={`relative max-w-[85%] sm:max-w-[65%] px-7 py-5 text-[15px] leading-[1.7] transform transition-transform hover:scale-[1.01]
                    ${
                    isMe 
                      ? 'bg-gradient-to-br from-indigo-500/90 to-rose-500/90 text-white rounded-[2rem] rounded-tr-md shadow-[0_20px_40px_rgba(244,63,94,0.1)] border border-white/10' 
                      : (msg.isPremium 
                            ? 'glass-panel text-white rounded-[2rem] rounded-tl-md border-amber-500/20 shadow-[0_20px_40px_rgba(251,191,36,0.05)]' 
                            : 'glass-card text-slate-200 rounded-[2rem] rounded-tl-md'
                        )
                  }`}
                >
                  {msg.text}
                  {isMe && (
                    <div className="absolute -bottom-5 right-2 opacity-30 text-[9px] font-black text-white uppercase tracking-widest italic">
                      Sent
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {isTyping && (
             <div className="flex flex-col items-start max-w-4xl mx-auto w-full">
               <div className="flex items-center gap-3 mb-3 ml-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                  <span className="text-[10px] text-rose-500 font-black tracking-[0.2em] uppercase italic">Synapse firing...</span>
               </div>
               <div className="glass-card px-6 py-4 rounded-full flex gap-2">
                 <div className="w-2 h-2 bg-indigo-500/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                 <div className="w-2 h-2 bg-indigo-500/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                 <div className="w-2 h-2 bg-indigo-500/60 rounded-full animate-bounce"></div>
               </div>
             </div>
          )}

          <div ref={messagesEndRef} className="h-8" />
        </main>

        {/* Input Footer */}
        <footer className="flex-none p-8 bg-black/40 backdrop-blur-2xl border-t border-white/[0.03] relative z-10">
          <div className="max-w-5xl mx-auto w-full">
            <form onSubmit={handleSendMessage} className="flex items-end gap-5 relative">
              <div className={`flex-1 glass-panel rounded-[2.5rem] flex items-center p-2 transition-all shadow-2xl relative
                ${currentUserProfile?.isPremium ? 'border-amber-500/20 focus-within:border-amber-500/50' : 'border-white/10 focus-within:border-indigo-500/30'}`}
              >
                <div className="absolute -left-12 bottom-4 hidden lg:block">
                  <Heart className={`w-6 h-6 ${currentUserProfile?.isPremium ? 'text-amber-500' : 'text-slate-700'}`} fill={currentUserProfile?.isPremium ? 'currentColor' : 'none'} />
                </div>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!currentUserProfile?.isPremium}
                  placeholder={currentUserProfile?.isPremium ? "Speak your mind, VIP..." : "Unlock Premium to Chat"}
                  className={`flex-1 bg-transparent text-white px-6 py-4 focus:outline-none placeholder-slate-600 text-[16px] font-medium leading-relaxed ${!currentUserProfile?.isPremium && 'cursor-not-allowed'}`}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || !currentUserProfile?.isPremium}
                  className={`p-4 text-white rounded-[1.8rem] focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shrink-0 m-1 shadow-2xl
                  ${currentUserProfile?.isPremium ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:shadow-orange-500/40' : 'bg-slate-800'}`}
                >
                  {currentUserProfile?.isPremium ? <Send className="w-6 h-6" /> : <Shield className="w-6 h-6 text-slate-500" />}
                </button>
              </div>
            </form>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl slide-in">
           <div className="bg-[#0A0A0A] w-full max-w-2xl rounded-[3.5rem] border border-white/[0.08] shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden relative">
              <div className="absolute top-0 right-0 p-10">
                <button onClick={() => setIsSettingsOpen(false)} className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center text-slate-500 hover:text-white border border-white/[0.05] transition-all hover:rotate-90">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-16">
                 <div className="mb-12">
                   <h2 className="text-4xl font-serif italic text-white flex items-center gap-5">
                     Prestige Profile
                   </h2>
                   <p className="text-slate-500 mt-2 font-bold uppercase tracking-[0.2em] text-[10px]">Configure your digital presence</p>
                 </div>

                 <div className="space-y-12">
                    {/* Avatar Selection */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-6 uppercase tracking-[0.25em]">Identity Token</label>
                      <div className="flex flex-wrap gap-6">
                        {[
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
                          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
                          'https://images.unsplash.com/photo-1531746020798-e795c5399c5c?auto=format&fit=crop&q=80&w=150',
                          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
                          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'
                        ].map((url, i) => (
                          <button 
                            key={i}
                            onClick={() => updateProfile('avatarUrl', url)}
                            className={`w-20 h-20 rounded-[1.8rem] overflow-hidden border-2 transition-all p-1.5 ${currentUserProfile?.avatarUrl === url ? 'border-indigo-500 scale-110 shadow-lg shadow-indigo-500/30' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'}`}
                          >
                            <img src={url} alt="Avatar" className="w-full h-full object-cover rounded-[1.2rem]" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Display Name */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 mb-4 uppercase tracking-[0.25em]">Public Moniker</label>
                      <input 
                        type="text"
                        defaultValue={currentUserProfile?.displayName || ''}
                        onBlur={(e) => updateProfile('displayName', e.target.value)}
                        className="w-full bg-[#050505] border border-white/[0.08] rounded-3xl p-6 text-white text-lg focus:outline-none focus:border-rose-500/40 transition-colors font-serif italic"
                        placeholder="Choose your moniker..."
                      />
                    </div>

                    {/* App Options */}
                    <div className="grid grid-cols-4 gap-6">
                       {[
                         {icon: Heart, label: 'Loves', color: 'rose'},
                         {icon: Bell, label: 'Alerts', color: 'indigo'},
                         {icon: Shield, label: 'Vault', color: 'emerald'},
                         {icon: Moon, label: 'Atmosphere', color: 'sky'}
                       ].map((opt, i) => (
                         <button key={i} className="flex flex-col items-center gap-4 p-6 bg-[#050505] rounded-[2rem] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
                           <div className={`w-14 h-14 rounded-2xl bg-${opt.color}-500/10 flex items-center justify-center text-${opt.color}-500 transition-all group-hover:scale-110 group-hover:bg-${opt.color}-500 group-hover:text-white shadow-inner`}>
                             <opt.icon className="w-6 h-6" />
                           </div>
                           <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-400 transition-colors">{opt.label}</span>
                         </button>
                       ))}
                    </div>

                    <button 
                      onClick={() => setIsSettingsOpen(false)}
                      className="w-full py-6 mt-4 bg-white text-black rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] hover:bg-indigo-500 hover:text-white transition-all transform hover:-translate-y-1 active:translate-y-0"
                    >
                      Crystalize Settings
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}


