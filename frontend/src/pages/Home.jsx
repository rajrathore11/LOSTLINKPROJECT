import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CircleDollarSign,
  Flame,
  KeyRound,
  Layers,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../store/AppContext.jsx';
import { Badge, Button, Card, Meter, SectionLabel, Shell, Shimmer } from '../components/ui.jsx';
import ItemCard from '../components/ItemCard.jsx';
import HeatMap from '../components/HeatMap.jsx';
import { QUICK_CHIPS } from '../lib/constants.js';
import { rankMatches } from '../lib/matcher.js';

const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'Meaning-based matching',
    body: '“brown pouch” ↔ “chestnut cardholder”. Explainable scoring — every % shows exactly why it matched.',
    tone: 'from-violet-500/20 to-violet-500/0',
  },
  {
    icon: ShieldCheck,
    title: 'Proof-gated claims',
    body: 'Claimants answer a private verification question. Contact details unlock only after the owner approves.',
    tone: 'from-emerald-500/20 to-emerald-500/0',
  },
  {
    icon: Timer,
    title: 'Zero-wait architecture',
    body: 'Reads stream straight from Supabase and search ranks locally in-browser — no cold-start spin, ever.',
    tone: 'from-cyan-500/20 to-cyan-500/0',
  },
  {
    icon: Flame,
    title: 'Campus loss heatmap',
    body: 'See which zone loses the most items and at what hour, so the office can act before the next loss.',
    tone: 'from-amber-500/20 to-amber-500/0',
  },
  {
    icon: KeyRound,
    title: 'Private handover',
    body: 'Pickup code + handover log keeps wallets and IDs out of public chats until ownership is proven.',
    tone: 'from-rose-500/20 to-rose-500/0',
  },
  {
    icon: CircleDollarSign,
    title: 'Actually free to run',
    body: 'Every AI path has a key-less tier plus a deterministic local fallback — the demo never dies on a quota.',
    tone: 'from-lime-500/20 to-lime-500/0',
  },
];

export default function Home({ onOpenAssistant }) {
  const { items, source, stats, matchCounts } = useApp();
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const showcase = useMemo(() => rankMatches('', items, { limit: 6, min: 0 }), [items]);
  const recent = useMemo(
    () => [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6),
    [items],
  );
  const liveMatches = Object.values(matchCounts).reduce((s, m) => s + m.length, 0);

  const search = (e) => {
    e?.preventDefault();
    navigate(q.trim() ? `/browse?q=${encodeURIComponent(q.trim())}` : '/browse');
  };

  return (
    <Shell>
      {/* ---------------- hero ---------------- */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:pt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-400" />
              </span>
              <span className="text-[11.5px] font-medium text-slate-300">
                {source === 'loading' ? 'Connecting to the board…' : `${stats.total} live listings · ${liveMatches} matches running`}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 font-display text-[38px] font-extrabold leading-[1.06] tracking-tight sm:text-[52px]"
            >
              <span className="text-white">Lost something?</span>
              <br />
              <span className="text-gradient">Describe it like a human.</span>
            </motion.h1>

            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-slate-400">
              LostLink reads plain wording — <em className="text-slate-300">“black buds with a white cable”</em> — and
              lines it up with <em className="text-slate-300">“CMF earbuds, case only”</em>. Every match comes with a
              confidence score and a human-readable reason, so nobody has to trust a black box.
            </p>

            <form onSubmit={search} className="mt-6 flex max-w-xl items-center gap-2">
              <div className="relative flex-1">
                <ScanSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g. steel watch with a silver dial"
                  className="h-12 w-full rounded-xl border border-white/10 bg-ink-900/80 pl-10 pr-3 text-[13.5px] text-white placeholder:text-slate-500 focus:border-violet-500/60"
                />
              </div>
              <Button size="lg" icon={Radar} type="submit">Match</Button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500">Try:</span>
              {QUICK_CHIPS.slice(0, 4).map((c) => (
                <button
                  key={c}
                  onClick={() => navigate(`/browse?q=${encodeURIComponent(c)}`)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400 transition-colors hover:border-violet-500/40 hover:text-white"
                >
                  {c}
                </button>
              ))}
              <button
                onClick={onOpenAssistant}
                className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-200 transition-colors hover:bg-violet-500/20"
              >
                or just ask the assistant →
              </button>
            </div>

            <div className="mt-7 flex flex-wrap gap-5">
              {[
                ['Listings scanned', stats.total, Layers],
                ['Still open', stats.lost + stats.found - stats.resolved, Flame],
                ['Returned', stats.resolved, BadgeCheck],
                ['Live matches', liveMatches, Zap],
              ].map(([label, val, Icon]) => (
                <div key={label} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-violet-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[15px] font-bold leading-none text-white">{val}</p>
                    <p className="mt-0.5 text-[10.5px] uppercase tracking-wide text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* right rail: how it works + heatmap */}
          <div className="space-y-3.5">
            <Card className="p-5">
              <SectionLabel icon={Sparkles}>How a match happens</SectionLabel>
              <ol className="space-y-3">
                {[
                  ['You describe it', 'Free text. Hinglish, typos and colour words all understood.'],
                  ['We extract meaning', 'Kind, colour, material, amount, zone — a concept graph, not keywords.'],
                  ['Rank + explain', 'Opposite-type listings get scored, and each score lists its reasons.'],
                  ['Verify privately', 'Owner approves a claim, then a pickup code unlocks contact.'],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-[11px] font-bold text-violet-300">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-[12.5px] font-semibold text-white">{t}</p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">{b}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
            {source === 'loading' ? <Shimmer className="h-[280px]" /> : <HeatMap items={items} />}
          </div>
        </div>
      </section>

      {/* ---------------- fresh listings ---------------- */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <SectionLabel
          icon={TrendingUp}
          right={
            <Link to="/browse" className="flex items-center gap-1 text-[12px] font-medium text-violet-300 hover:text-violet-200">
              All listings <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          Freshly reported
        </SectionLabel>

        {source === 'loading' ? (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-[248px]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-6">
            {recent.map((it) => (
              <ItemCard key={it.id} item={it} matches={matchCounts[it.id]?.length || 0} compact />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- features ---------------- */}
      <section className="mx-auto mt-16 max-w-7xl px-4 pb-20 sm:px-6">
        <SectionLabel icon={Layers}>What makes it different</SectionLabel>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} hover className="group relative overflow-hidden p-5">
              <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-b ${f.tone} blur-2xl`} />
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-violet-300">
                <f.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 text-[13.5px] font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">{f.body}</p>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Card className="mt-8 flex flex-col items-start justify-between gap-4 overflow-hidden p-6 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-[19px] font-bold text-white">Report it once. We keep scanning.</h3>
            <p className="mt-1 max-w-lg text-[12.5px] leading-relaxed text-slate-400">
              A lost report stays armed. Every new found item is scored against it automatically and you get an
              in-app alert the moment something crosses 60%.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/report"><Button icon={Sparkles}>Report an item</Button></Link>
            <Link to="/matches"><Button variant="secondary" icon={Radar}>Match room</Button></Link>
          </div>
        </Card>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-[11.5px] text-slate-500 sm:flex-row">
          <p>© 2026 LostLink · 5th Semester project · free & open source</p>
          <p className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            Engine: explainable local semantic scorer · Assistant: key-less with on-device fallback
          </p>
        </div>
      </section>
    </Shell>
  );
}
