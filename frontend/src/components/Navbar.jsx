import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  Command,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Radar,
  ScanSearch,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { Badge, Button } from './ui.jsx';

const LINKS = [
  { to: '/browse', label: 'Browse', icon: ScanSearch },
  { to: '/matches', label: 'Match Room', icon: Radar },
  { to: '/report', label: 'Report', icon: Plus },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Navbar({ onOpenAssistant }) {
  const { profile, signOut, notifs, markAllRead } = useApp();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const bellRef = useRef(null);
  const unread = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    setOpen(false);
    setBell(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBell(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // ⌘K / Ctrl+K opens the assistant
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenAssistant?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenAssistant]);

  const isActive = (p) => pathname === p || (p !== '/' && pathname.startsWith(p));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-glow">
              <Radar className="h-[18px] w-[18px] text-white" />
              <span className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
            </span>
            <span className="font-display text-[17px] font-bold tracking-tight text-white">
              Lost<span className="text-gradient-violet">Link</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {LINKS.filter((l) => l.to !== '/report' || profile).map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive(l.to) ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAssistant}
              className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] text-slate-400 transition-colors hover:border-violet-500/40 hover:text-white md:flex"
            >
              <Command className="h-3.5 w-3.5" />
              Ask LostLink
              <kbd className="ml-1 rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-slate-400">K</kbd>
            </button>

            <div className="relative" ref={bellRef}>
              <button
                onClick={() => {
                  setBell((v) => !v);
                  if (!bell) markAllRead();
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {bell && (
                <div className="absolute right-0 mt-2 w-[330px] overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-lift">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                    <span className="text-[13px] font-semibold text-white">Activity</span>
                    <span className="text-[11px] text-slate-500">{notifs.length} events</span>
                  </div>
                  <div className="max-h-[340px] overflow-y-auto">
                    {notifs.length === 0 && (
                      <p className="px-4 py-8 text-center text-[12.5px] text-slate-500">
                        No activity yet. Report an item to start scanning.
                      </p>
                    )}
                    {notifs.map((n) => (
                      <div key={n.id} className="border-b border-white/[0.04] px-4 py-3 last:border-0">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                              n.type === 'match' ? 'bg-emerald-400' : 'bg-violet-400'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-medium text-slate-200">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500">{n.body}</p>
                            <p className="mt-1 text-[10.5px] text-slate-600">
                              {new Date(n.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {profile ? (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  to="/dashboard"
                  className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-[12.5px] text-slate-300 transition-colors hover:text-white"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 text-[11px] font-bold text-white">
                    {(profile.full_name || 'U')[0].toUpperCase()}
                  </span>
                  <span className="max-w-[90px] truncate">{profile.full_name?.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition-colors hover:text-rose-300"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="hidden md:block">
                <Button size="sm" icon={LogIn}>Sign in</Button>
              </Link>
            )}

            <button
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 lg:hidden"
              aria-label="Menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-white/[0.06] bg-ink-900 px-4 py-3 lg:hidden">
            {LINKS.filter((l) => l.to !== '/report' || profile).map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[13.5px] text-slate-300 hover:bg-white/[0.05]"
              >
                <span className="flex items-center gap-2.5">
                  <l.icon className="h-4 w-4 text-violet-400" /> {l.label}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </Link>
            ))}
            <div className="mt-2 border-t border-white/[0.06] pt-2">
              {profile ? (
                <button
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] text-rose-300"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              ) : (
                <Link to="/login" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] text-white">
                  <User className="h-4 w-4" /> Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* mobile floating action */}
      {profile && (
        <Link
          to="/report"
          className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-glow lg:hidden"
          aria-label="Report item"
        >
          <Plus className="h-6 w-6 text-white" />
        </Link>
      )}
    </>
  );
}

export { Badge };
