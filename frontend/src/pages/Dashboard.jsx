import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarCheck,
  Check,
  ClipboardList,
  Flame,
  Inbox,
  Plus,
  Radar,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { Badge, Button, Card, EmptyState, Meter, SectionLabel, Shell } from '../components/ui.jsx';
import ItemCard from '../components/ItemCard.jsx';
import HeatMap from '../components/HeatMap.jsx';
import { myClaims } from '../lib/data.js';
import { rankMatches } from '../lib/matcher.js';

const TABS = [
  { id: 'mine', label: 'My listings', icon: ClipboardList },
  { id: 'matches', label: 'My matches', icon: Sparkles },
  { id: 'claims', label: 'Claims', icon: Inbox },
  { id: 'activity', label: 'Activity', icon: Bell },
];

export default function Dashboard() {
  const { profile, myItems, items, stats, matchCounts, notifs, markAllRead, refresh } = useApp();
  const [tab, setTab] = useState('mine');
  const claims = useMemo(() => myClaims(), []);
  const [handled, setHandled] = useState({});

  const myMatchList = useMemo(
    () => myItems.flatMap((mine) => (matchCounts[mine.id] || []).map((m) => ({ mine, m }))).sort((a, b) => b.m.score - a.m.score),
    [myItems, matchCounts],
  );

  if (!profile) {
    return (
      <Shell className="pb-20">
        <div className="mx-auto max-w-lg px-4 pt-20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-violet-300">
            <Inbox className="h-5 w-5" />
          </div>
          <h1 className="mt-4 font-display text-[22px] font-bold text-white">Sign in to see your dashboard</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
            Your listings, live matches and claim requests live here. One tap — no password wall in demo mode.
          </p>
          <Link to="/login" className="mt-5 inline-block"><Button icon={ArrowRight}>Continue</Button></Link>
        </div>
      </Shell>
    );
  }

  const resolvedMine = myItems.filter((i) => i.status === 'resolved').length;
  const recoveryRate = myItems.length ? Math.round((resolvedMine / myItems.length) * 100) : 0;

  return (
    <Shell className="pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        {/* header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label">Dashboard</p>
            <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight text-white">
              Hi {profile.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="mt-1 text-[13px] text-slate-400">
              {myItems.length} listing{myItems.length === 1 ? '' : 's'} · {myMatchList.length} live match{myMatchList.length === 1 ? '' : 'es'} · {stats.resolved} returned campus-wide
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={Radar} onClick={refresh}>Refresh</Button>
            <Link to="/report"><Button size="sm" icon={Plus}>New report</Button></Link>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'My listings', value: myItems.length, icon: ClipboardList, tone: 'text-violet-300' },
            { label: 'Live matches', value: myMatchList.length, icon: Sparkles, tone: 'text-emerald-300' },
            { label: 'My claims', value: claims.length, icon: Inbox, tone: 'text-cyan-300' },
            { label: 'Recovery rate', value: `${recoveryRate}%`, icon: TrendingUp, tone: 'text-amber-300' },
          ].map((k) => (
            <Card key={k.label} className="p-4">
              <div className="flex items-center justify-between">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] ${k.tone}`}>
                  <k.icon className="h-3.5 w-3.5" />
                </span>
                <span className="font-display text-[20px] font-bold text-white">{k.value}</span>
              </div>
              <p className="mt-2 text-[11.5px] text-slate-400">{k.label}</p>
            </Card>
          ))}
        </div>

        {/* tabs */}
        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-white/[0.07] pb-px">
          {TABS.map((t) => {
            const count = t.id === 'mine' ? myItems.length : t.id === 'matches' ? myMatchList.length : t.id === 'claims' ? claims.length : notifs.length;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-lg px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${
                  tab === t.id ? 'border-b-2 border-violet-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
                {count > 0 && <span className="rounded bg-white/[0.08] px-1.5 text-[10px] text-slate-300">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            {tab === 'mine' && (
              myItems.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No listings yet"
                  body="Post what you lost (or found). The report stays armed and gets scored against every new item."
                  action={<Link to="/report"><Button size="sm" icon={Plus}>Create report</Button></Link>}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                  {myItems.map((it) => (
                    <ItemCard key={it.id} item={it} matches={matchCounts[it.id]?.length || 0} compact />
                  ))}
                </div>
              )
            )}

            {tab === 'matches' && (
              myMatchList.length === 0 ? (
                <EmptyState icon={Sparkles} title="No matches on your listings yet" body="We keep scanning in the background — an in-app alert fires the moment something crosses 60%." />
              ) : (
                <div className="space-y-2.5">
                  {myMatchList.map(({ mine, m }) => (
                    <Card key={`${mine.id}-${m.id}`} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold text-white">
                          {mine.title} <span className="text-slate-500">matched with</span> {m.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-slate-400">
                          {m.reasons?.map((r) => r.text).join(' · ') || 'description overlap'}
                        </p>
                        <div className="mt-1.5 w-full max-w-[220px]">
                          <Meter value={Math.round(m.score * 100)} tone={m.score > 0.62 ? 'emerald' : 'amber'} height={4} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-white">{Math.round(m.score * 100)}%</span>
                        <Link to={`/item/${m.id}`}><Button size="sm" variant="secondary">Review</Button></Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            )}

            {tab === 'claims' && (
              claims.length === 0 ? (
                <EmptyState icon={Inbox} title="No claims sent" body="When you claim a found item, the owner's review status shows up here." />
              ) : (
                <div className="space-y-2.5">
                  {claims.map((c) => (
                    <Card key={c.id} className="flex items-center gap-3 p-3.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-cyan-300">
                        <Inbox className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-white">{c.item_title}</p>
                        <p className="line-clamp-1 text-[11px] text-slate-400">{c.message || 'No proof attached'}</p>
                      </div>
                      <Badge tone={c.status === 'approved' ? 'emerald' : 'amber'}>{c.status}</Badge>
                    </Card>
                  ))}
                </div>
              )
            )}

            {tab === 'activity' && (
              <div className="space-y-2">
                {notifs.length === 0 && <EmptyState icon={Bell} title="Nothing yet" body="Match alerts and listing events will appear here." />}
                {notifs.map((n) => (
                  <Card key={n.id} className="flex items-start gap-3 p-3.5">
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${n.type === 'match' ? 'bg-emerald-400' : 'bg-violet-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-slate-200">{n.title}</p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">{n.body}</p>
                    </div>
                    <span className="shrink-0 text-[10.5px] text-slate-600">
                      {new Date(n.at).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                    </span>
                  </Card>
                ))}
                {notifs.length > 0 && (
                  <button onClick={markAllRead} className="mt-1 flex items-center gap-1.5 text-[11.5px] text-violet-300 hover:text-violet-200">
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
            )}
          </div>

          {/* rail */}
          <div className="space-y-3.5">
            {myItems.length === 0 && (
              <Card className="p-4">
                <SectionLabel icon={Sparkles}>Start here</SectionLabel>
                <Link to="/report" className="mt-1 block"><Button size="sm" icon={Plus} className="w-full">Post your first report</Button></Link>
                <Link to="/browse" className="mt-2 block"><Button size="sm" variant="secondary" icon={Radar} className="w-full">Browse {items.length} listings</Button></Link>
                <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500">
                  Posting arms the scanner: every new opposite-type listing gets scored against yours.
                </p>
              </Card>
            )}
            <Card className="p-4">
              <SectionLabel icon={Flame}>Board pulse</SectionLabel>
              <div className="space-y-2.5">
                {[
                  ['Lost open', stats.lost, 'rose'],
                  ['Found waiting', stats.found, 'emerald'],
                  ['Returned', stats.resolved, 'cyan'],
                ].map(([label, val, tone]) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-[11.5px]">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-semibold text-white">{val}</span>
                    </div>
                    <Meter value={(val / Math.max(1, stats.total)) * 100} tone={tone} height={4} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">
                <CalendarCheck className="h-3 w-3 text-emerald-300" />
                <p className="text-[11px] text-slate-400">Campus recovery rate <strong className="text-white">{stats.rate}%</strong></p>
              </div>
            </Card>

            <HeatMap items={items} />

            <Card className="p-4">
              <SectionLabel icon={BadgeCheck}>Nudges</SectionLabel>
              <ul className="space-y-2 text-[11.5px] leading-relaxed text-slate-400">
                {myItems.some((i) => !i.image_url) && <li>• Add a photo to your listings — photo-backed reports get claimed ~2× faster.</li>}
                {myMatchList.length > 0 && <li>• You have {myMatchList.length} unreviewed match{myMatchList.length > 1 ? 'es' : ''}. Review before the owner of the found item moves it to the office.</li>}
                {!myItems.length && <li>• Post your first report to start the scanner.</li>}
                <li>• Describe hidden proof (a scratch, an inside sticker) — that's what owners ask for.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
