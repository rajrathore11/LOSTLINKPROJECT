import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign, ArrowRight, Loader2, Lock, Radar, ShieldCheck, Sparkles, User } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { Badge, Button, Card, Field, Input, Shell } from '../components/ui.jsx';
import { isSupabaseConfigured, supabase } from '../supabaseClient.js';

export default function Login() {
  const { signIn, notify } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const demoLogin = async (e) => {
    e?.preventDefault();
    const handle = form.email.split('@')[0] || 'student';
    await signIn({
      id: `demo-${handle}`,
      email: form.email || `${handle}@campus.edu`,
      full_name: form.name || handle.replace(/[._]/g, ' '),
      demo: true,
    });
    navigate('/dashboard');
  };

  const realAuth = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(''); setInfo('');
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name } },
        });
        if (error) throw error;
        setInfo('Check your inbox to confirm the account, then sign in.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        if (data.user) {
          await signIn({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
            demo: false,
          });
          navigate('/dashboard');
        }
      }
    } catch (e2) {
      setErr(e2.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell className="pb-20">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-20">
        {/* pitch */}
        <div className="hidden flex-col justify-center lg:flex">
          <Badge tone="violet" icon={Sparkles}>Identity you can trust</Badge>
          <h1 className="mt-4 font-display text-[32px] font-extrabold leading-tight tracking-tight text-white">
            One account.<br /><span className="text-gradient">Every match follows you.</span>
          </h1>
          <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-slate-400">
            Claims are private and proof-gated. Owners see your verification answer, never your contact details,
            until they approve. Your listings keep scanning in the background.
          </p>
          <div className="mt-6 space-y-2.5">
            {[
              ['Proof-gated claims', 'ShieldCheck'],
              ['Match alerts in-app', 'Sparkles'],
              ['Pickup code handover', 'Radar'],
            ].map(([t]) => (
              <div key={t} className="flex items-center gap-2 text-[12.5px] text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">✓</span>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* form */}
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
              <Radar className="h-4 w-4 text-white" />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-white">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</p>
              <p className="text-[11.5px] text-slate-500">LostLink · campus lost &amp; found</p>
            </div>
          </div>

          <div className="mt-5 flex rounded-xl bg-white/[0.04] p-1">
            {[['signin', 'Sign in'], ['signup', 'Sign up']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => { setMode(id); setErr(''); setInfo(''); }}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-medium transition-colors ${mode === id ? 'bg-white/[0.09] text-white' : 'text-slate-400'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {isSupabaseConfigured() ? (
            <form onSubmit={realAuth} className="mt-4 space-y-3">
              {mode === 'signup' && (
                <Field label="Full name">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                    <Input value={form.name} onChange={set('name')} placeholder="Rahul Sharma" className="pl-9" required />
                  </div>
                </Field>
              )}
              <Field label="College email">
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <Input type="email" value={form.email} onChange={set('email')} placeholder="you@campus.edu" className="pl-9" required />
                </div>
              </Field>
              <Field label="Password" hint={mode === 'signup' ? 'At least 6 characters.' : undefined}>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" className="pl-9" required minLength={6} />
                </div>
              </Field>

              {err && <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">{err}</p>}
              {info && <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">{info}</p>}

              <Button type="submit" className="w-full" loading={busy} icon={ArrowRight}>
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>

              <div className="flex items-center gap-2 py-1">
                <span className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[10.5px] uppercase tracking-wider text-slate-600">or</span>
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>
            </form>
          ) : null}

          <form onSubmit={demoLogin} className={isSupabaseConfigured() ? '' : 'mt-4'}>
            <Field label="Continue as (demo mode)">
              <Input value={form.email} onChange={set('email')} placeholder="your name or roll number" />
            </Field>
            <Button type="submit" variant="secondary" className="mt-3 w-full" icon={Sparkles}>
              Enter demo workspace
            </Button>
            <p className="mt-2 text-center text-[10.5px] leading-relaxed text-slate-500">
              Demo mode keeps everything on this device — perfect for the presentation, no signup wall.
            </p>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-600">
            <ShieldCheck className="h-3 w-3" /> Passwords never touch our servers in demo mode
          </p>
        </Card>
      </div>
    </Shell>
  );
}
