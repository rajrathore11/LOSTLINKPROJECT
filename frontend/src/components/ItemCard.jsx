import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Dumbbell,
  FileText,
  Glasses,
  ImageOff,
  KeyRound,
  MapPin,
  Package,
  Shirt,
  Smartphone,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Badge, Dial, Meter } from './ui.jsx';
import { catHue } from '../lib/constants.js';
import { confidence } from '../lib/matcher.js';

const ICONS = {
  Smartphone, Wallet, FileText, KeyRound, BookOpen, Shirt, Glasses, Dumbbell, Package,
};

const ago = (d) => {
  const ms = Date.now() - new Date(d).getTime();
  const h = Math.floor(ms / 3600e3);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};

export default function ItemCard({ item, score, reasons, matches = 0, compact = false }) {
  const Icon = ICONS[item.category] || Package;
  const hue = catHue(item.category);
  const conf = typeof score === 'number' ? confidence(score) : null;

  return (
    <Link
      to={`/item/${item.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850/80 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.16] hover:shadow-lift"
    >
      {/* media */}
      <div className="relative h-[136px] overflow-hidden" style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 22%), hsl(${hue + 40} 55% 12%))` }}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-full items-center justify-center opacity-40">
            <Icon className="h-11 w-11 text-white" strokeWidth={1.3} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/10 to-transparent" />

        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge tone={item.type === 'lost' ? 'rose' : 'emerald'} className="backdrop-blur-md">
            {item.type === 'lost' ? 'Lost' : 'Found'}
          </Badge>
          {item.status === 'resolved' && <Badge tone="cyan">Returned</Badge>}
          {item.pending && <Badge tone="amber">Syncing</Badge>}
        </div>

        {conf && (
          <div className="absolute right-3 top-3 rounded-xl border border-white/15 bg-ink-950/70 px-2 py-1 backdrop-blur-md">
            <span className="text-[11px] font-bold text-white">{conf.pct}%</span>
          </div>
        )}

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1.5 text-[11px] text-slate-300">
          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{item.location}</span>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-[14px] font-semibold text-white">{item.title}</h3>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-violet-300" />
        </div>

        {!compact && (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-400">{item.description}</p>
        )}

        {reasons?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reasons.slice(0, 2).map((r) => (
              <span key={r.k} className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-emerald-300">
                {r.text}
              </span>
            ))}
          </div>
        )}

        {typeof score === 'number' && <Meter value={conf.pct} tone={conf.tone === 'emerald' ? 'emerald' : conf.tone === 'amber' ? 'amber' : 'violet'} height={4} />}

        <div className="mt-auto flex items-center justify-between pt-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {ago(item.created_at)}
          </span>
          {matches > 0 ? (
            <span className="flex items-center gap-1 rounded-md bg-violet-500/12 px-1.5 py-0.5 font-semibold text-violet-300">
              <Sparkles className="h-2.5 w-2.5" />
              {matches} match{matches > 1 ? 'es' : ''}
            </span>
          ) : (
            <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10.5px] text-slate-400">{item.category}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
