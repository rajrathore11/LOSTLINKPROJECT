import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './store/AppContext.jsx';
import Navbar from './components/Navbar.jsx';
import Assistant from './components/Assistant.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import BrowseItems from './pages/BrowseItems.jsx';
import ReportItem from './pages/ReportItem.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import MatchRoom from './pages/MatchRoom.jsx';
import { MessageCircle, Sparkles, X } from 'lucide-react';

function Toast() {
  const { toast, setToast } = useApp();
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[60] w-[min(420px,92vw)] -translate-x-1/2">
      <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-ink-800/95 p-3.5 shadow-lift backdrop-blur-xl">
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toast.type === 'match' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-violet-500/20 text-violet-300'}`}>
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-white">{toast.title}</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">{toast.body}</p>
        </div>
        <button onClick={() => setToast(null)} className="text-slate-500 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Shell() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <Navbar onOpenAssistant={() => setAssistantOpen(true)} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home onOpenAssistant={() => setAssistantOpen(true)} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/browse" element={<BrowseItems />} />
          <Route path="/report" element={<ReportItem />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/matches" element={<MatchRoom />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="*" element={<Home onOpenAssistant={() => setAssistantOpen(true)} />} />
        </Routes>
      </main>
      <Assistant open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      {!assistantOpen && (
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-glow transition-transform hover:scale-105"
          aria-label="Open LostLink Assistant"
          title="Ask LostLink"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppProvider>
        <Shell />
      </AppProvider>
    </Router>
  );
}
