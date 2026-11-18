import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { Badge, Button, Dial } from './ui.jsx';
import { explainMatch } from '../lib/ai.js';

const fact = (label, value) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    <p className="truncate text-[12.5px] font-medium text-slate-200">{value || '—'}</p>
  </div>
);

/**
 * Side-by-side review of a candidate match.
 * `left` = the item the user owns / searched, `right` = the candidate.
 */
export default function MatchPanel({ left, right, onClaim }) {
  const [expl, setExpl] = useState(null);
  const [busy, setBusy] = useState(false);

  const askWhy = async () => {
    setBusy(true);
    try {
      setExpl(await explainMatch(left, right));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-ink-850/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Dial score={right.score} size={56} tone="#a3e635" />
          <div>
            <p className="text-[13px] font-semibold text-white">{right.title}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-slate-400">
              <MapPin className="h-3 w-3" /> {right.location}
              <span className="text-slate-600">·</span>
              <Badge tone={right.type === 'lost' ? 'rose' : 'emerald'}>{right.type}</Badge>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={Wand2} loading={busy} onClick={askWhy}>
            Why this match?
          </Button>
          <Link to={`/item/${right.id}`}>
            <Button size="sm" variant="ghost" icon={ArrowRight}>Open</Button>
          </Link>
        </div>
      </div>

      {/* comparison strip */}
      <div className="mt-3.5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/[0.06] sm:grid-cols-4">
        {[
          ['Category', `${left.category} → ${right.category}`],
          ['Zone', `${left.location} → ${right.location}`],
          ['Colour / kind', (right.reasons || []).slice(0, 2).map((r) => r.text).join(' · ') || 'textual overlap'],
          ['Score', `${Math.round(right.score * 100)}% confidence`],
        ].map(([k, v]) => (
          <div key={k} className="bg-ink-900/80 px-3 py-2.5">{fact(k, v)}</div>
        ))}
      </div>

      {expl && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-violet-500/25 bg-violet-500/[0.07] px-3 py-2.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
          <p className="text-[12px] leading-relaxed text-slate-200">{expl}</p>
        </div>
      )}

      {onClaim && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
          <Button size="sm" variant="success" icon={ShieldCheck} onClick={() => onClaim(right)}>
            This is mine — verify
          </Button>
          <Button size="sm" variant="ghost" icon={X}>Not mine</Button>
          <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-500">
            <Check className="h-3 w-3 text-emerald-400" /> Owner approval required before contact
          </span>
        </div>
      )}
    </div>
  );
}
