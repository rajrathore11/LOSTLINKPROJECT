import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  Copy,
  Hash,
  Loader2,
  MapPin,
  MessageSquare,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { Badge, Button, Card, Dial, Field, SectionLabel, Shell, Textarea } from '../components/ui.jsx';
import MatchPanel from '../components/MatchPanel.jsx';
import { fetchItem, submitClaim } from '../lib/data.js';
import { rankMatches, suggestTags, confidence } from '../lib/matcher.js';
import { ZONES_LOOKUP } from '../lib/matcher.js';
import { catHue } from '../lib/constants.js';

const ago = (d) => {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600e3);
  return h < 24 ? `${h || 1}h ago` : `${Math.floor(h / 24)}d ago`;
};

export default function ItemDetail() {
  const { id } = useParams();
  const { items, profile, notify } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [item, setItem] = useState(() => items.find((i) => i.id === id) || null);
  const [loading, setLoading] = useState(!item);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimMsg, setClaimMsg] = useState('');
  const [claimDone, setClaimDone] = useState(false);
  const [pickupCode, setPickupCode] = useState('');

  useEffect(() => {
    let alive = true;
    if (!item) {
      setLoading(true);
      fetchItem(id).then((found) => {
        if (alive) {
          setItem(found);
          setLoading(false);
        }
      });
    }
    return () => { alive = false; };
  }, [id]);

  const matches = useMemo(() => {
    if (!item) return [];
    return rankMatches(item, items.filter((i) => i.id !== item.id), {
      oppositeOf: item.type,
      limit: 6,
      min: 0.34,
    });
  }, [item, items]);

  const tags = useMemo(() => (item ? suggestTags(item) : []), [item]);

  if (loading) {
    return (
      <Shell className="pb-20">
        <div className="mx-auto max-w-6xl px-4 pt-10"><div className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading listing…</div></div>
      </Shell>
    );
  }

  if (!item) {
    return (
      <Shell className="pb-20">
        <div className="mx-auto max-w-3xl px-4 pt-16 text-center">
          <p className="text-[16px] font-semibold text-white">Listing not found</p>
          <p className="mt-1.5 text-[13px] text-slate-400">It may have been removed or already returned.</p>
          <Link to="/browse" className="mt-5 inline-block"><Button variant="secondary" icon={ArrowLeft}>Back to browse</Button></Link>
        </div>
      </Shell>
    );
  }

  const hue = catHue(item.category);
  const zone = ZONES_LOOKUP(item.location);
  const topConf = matches[0] ? confidence(matches[0].score) : null;
  const isOwner = profile && (item.user_id === profile.id || item.owner === profile.full_name);

  const sendClaim = () => {
    if (!profile) {
      notify({ type: 'info', title: 'Sign in first', body: 'Claims need a verified account so owners know who is asking.' });
      navigate('/login');
      return;
    }
    submitClaim({ item, message: claimMsg, claimant: profile });
    const code = `TF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setPickupCode(code);
    setClaimDone(true);
    notify({
      type: 'info',
      title: 'Claim sent for review',
      body: `Owner of “${item.title}” will see your proof. Pickup code ${code} activates after approval.`,
      itemId: item.id,
    });
  };

  return (
    <Shell className="pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-[12.5px] text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {location.state?.justPosted && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-3.5 py-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-[12.5px] leading-relaxed text-emerald-100">
              Posted. {matches.length > 0
                ? `${matches.length} possible match${matches.length > 1 ? 'es' : ''} found below — review them now.`
                : 'Nothing similar yet — your report stays armed and will alert you automatically.'}
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* main */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="relative h-[240px] sm:h-[300px]" style={{ background: `linear-gradient(135deg, hsl(${hue} 62% 20%), hsl(${hue + 45} 55% 10%))` }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 opacity-60">
                    <Tag className="h-10 w-10 text-white" strokeWidth={1.3} />
                    <span className="text-[11.5px] text-white/70">No photo attached</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950 to-transparent" />
                <div className="absolute left-4 top-4 flex gap-2">
                  <Badge tone={item.type === 'lost' ? 'rose' : 'emerald'}>{item.type === 'lost' ? 'Lost report' : 'Found item'}</Badge>
                  <Badge tone={item.status === 'resolved' ? 'cyan' : 'slate'}>{item.status}</Badge>
                  {item.pending && <Badge tone="amber">Syncing</Badge>}
                </div>
              </div>

              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="font-display text-[22px] font-bold leading-tight text-white">{item.title}</h1>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(item.date_lost_found || item.created_at).toDateString()}</span>
                      <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{item.category}</span>
                      <span className="text-slate-600">· reported {ago(item.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Share2}
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.href);
                        notify({ type: 'info', title: 'Link copied', body: 'Share it in your class group.' });
                      }}
                    >
                      Share
                    </Button>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-line text-[13.5px] leading-relaxed text-slate-300">{item.description}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tags.map((t) => <Badge key={t} tone="violet" icon={Tag}>{t}</Badge>)}
                  {zone && <Badge tone="cyan" icon={MapPin}>{zone.label} zone</Badge>}
                </div>
              </div>
            </Card>

            {/* matches */}
            <div>
              <SectionLabel
                icon={Sparkles}
                right={
                  <span className="text-[11.5px] text-slate-500">
                    {matches.length} candidate{matches.length === 1 ? '' : 's'} vs {item.type === 'lost' ? 'found' : 'lost'} listings
                  </span>
                }
              >
                Match room
              </SectionLabel>

              {matches.length === 0 ? (
                <Card className="p-5 text-center">
                  <p className="text-[13px] font-medium text-slate-300">No counterpart yet</p>
                  <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-slate-500">
                    This listing is now armed. Every new {item.type === 'lost' ? 'found' : 'lost'} report gets scored
                    against it, and you'll get an alert above 60%.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {matches.map((m) => (
                    <MatchPanel
                      key={m.id}
                      left={item}
                      right={m}
                      onClaim={isOwner ? null : () => { setClaimOpen(true); }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* side rail */}
          <div className="space-y-3.5">
            {topConf && (
              <Card className="p-4">
                <SectionLabel icon={BadgeCheck}>Best match confidence</SectionLabel>
                <div className="flex items-center gap-4">
                  <Dial score={matches[0].score} size={72} tone="#a3e635" />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-white">{matches[0].title}</p>
                    <p className="text-[11px] text-slate-500">{matches[0].location} · {matches[0].type}</p>
                  </div>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                  <strong className="text-white">{topConf.label}</strong> — {matches[0].reasons?.map((r) => r.text).join(' · ') || 'description overlap'}.
                </p>
              </Card>
            )}

            <Card className="p-4">
              <SectionLabel icon={ShieldCheck}>Is this yours?</SectionLabel>
              {claimDone ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-2.5">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <p className="text-[12px] text-emerald-100">Claim submitted for owner review.</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                    <p className="label mb-1">Pickup code (locked)</p>
                    <p className="font-mono text-[18px] font-bold tracking-[0.2em] text-white">{pickupCode}</p>
                    <p className="mt-1 text-[10.5px] text-slate-500">Unlocks when the owner approves.</p>
                  </div>
                </div>
              ) : claimOpen ? (
                <div className="space-y-3">
                  <Field label="Private proof for the owner" hint="Something only the true owner would know — a scratch, an inside item, an engraving. Never shown publicly.">
                    <Textarea rows={4} value={claimMsg} onChange={(e) => setClaimMsg(e.target.value)} placeholder="e.g. The case has a small crack near the hinge and a 'R' sticker inside." />
                  </Field>
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" icon={ShieldCheck} onClick={sendClaim}>Send claim</Button>
                    <Button size="sm" variant="ghost" onClick={() => setClaimOpen(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[12px] leading-relaxed text-slate-400">
                    Owners only see your proof, never your contact details, until they approve.
                  </p>
                  <Button size="sm" variant="success" icon={ShieldCheck} onClick={() => setClaimOpen(true)} className="w-full">
                    This is mine
                  </Button>
                  <Button size="sm" variant="secondary" icon={MessageSquare} onClick={() => notify({ type: 'info', title: 'Ask the owner a question', body: 'Anonymous question relay is in the next sprint.' })} className="w-full">
                    Ask a question
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <SectionLabel icon={User}>Reported by</SectionLabel>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-[13px] font-bold text-white">
                  {(item.owner || (item.profiles?.full_name) || 'U')[0]}
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold text-white">{isOwner ? 'You' : item.owner || item.profiles?.full_name || 'Verified student'}</p>
                  <p className="text-[11px] text-slate-500">{isOwner ? 'Your listing' : 'Contact unlocks after approval'}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => { navigator.clipboard?.writeText(item.id); notify({ type: 'info', title: 'Item ID copied', body: item.id }); }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-[11.5px] text-slate-300 hover:border-white/20"
                >
                  <Copy className="h-3 w-3" /> Copy ID
                </button>
                <button
                  onClick={() => notify({ type: 'info', title: 'QR handover', body: 'Scan-to-claim QR is generated at the desk during pickup.' })}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-[11.5px] text-slate-300 hover:border-white/20"
                >
                  <QrCode className="h-3 w-3" /> QR code
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
