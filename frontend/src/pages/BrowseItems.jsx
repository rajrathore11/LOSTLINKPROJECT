import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Database,
  Filter,
  Package,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { Badge, Button, Select, Shell, Shimmer } from '../components/ui.jsx';
import ItemCard from '../components/ItemCard.jsx';
import { CATEGORIES, ZONES } from '../lib/constants.js';
import { rankMatches, scoreCandidate, ZONES_LOOKUP } from '../lib/matcher.js';

const SORTS = [
  { id: 'relevance', label: 'Best match' },
  { id: 'recent', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
];

export default function BrowseItems() {
  const { items, source, matchCounts, loadDemo } = useApp();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [type, setType] = useState('all');
  const [cat, setCat] = useState('all');
  const [zone, setZone] = useState('all');
  const [sort, setSort] = useState(params.get('q') ? 'relevance' : 'recent');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const q = params.get('q') || '';
    setQuery(q);
    if (q) setSort('relevance');
  }, [params]);

  const results = useMemo(() => {
    let pool = items;
    if (type !== 'all') pool = pool.filter((i) => i.type === type);
    if (cat !== 'all') pool = pool.filter((i) => i.category === cat);
    if (zone !== 'all') pool = pool.filter((i) => ZONES_LOOKUP(i.location)?.id === zone);

    if (!query.trim()) {
      return pool
        .map((i) => ({ ...i, score: null }))
        .sort((a, b) =>
          sort === 'oldest'
            ? new Date(a.created_at) - new Date(b.created_at)
            : new Date(b.created_at) - new Date(a.created_at),
        );
    }

    // Local semantic ranking — instant, no server round-trip.
    const scored = pool
      .map((i) => ({ ...i, ...scoreCandidate(query, i) }))
      .filter((i) => i.score > 0.22);
    if (sort === 'recent') return scored.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sort === 'oldest') return scored.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return scored.sort((a, b) => b.score - a.score);
  }, [items, query, type, cat, zone, sort]);

  const applyQuery = (val) => {
    setQuery(val);
    const next = new URLSearchParams(params);
    if (val.trim()) next.set('q', val.trim());
    else next.delete('q');
    setParams(next, { replace: true });
  };

  const activeFilters = [type !== 'all', cat !== 'all', zone !== 'all'].filter(Boolean).length;
  const topScore = results.find((r) => typeof r.score === 'number');

  return (
    <Shell className="pb-16">
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        {/* header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-tight text-white">Browse the board</h1>
            <p className="mt-1 text-[13px] text-slate-400">
              {query.trim()
                ? <>Ranked by meaning, not keywords — {results.length} hit{results.length === 1 ? '' : 's'}.</>
                : `${items.length} listings across campus, newest first.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="violet" icon={Zap}>{source === 'supabase' ? 'Live · Supabase' : source === 'api' ? 'API' : 'Local cache'}</Badge>
            <Button size="sm" variant="ghost" icon={Database} onClick={loadDemo} title="Add sample listings for the demo">
              Demo data
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={SlidersHorizontal}
              onClick={() => setFiltersOpen((v) => !v)}
              className="relative"
            >
              Filters
              {activeFilters > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                  {activeFilters}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* search bar */}
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => applyQuery(e.target.value)}
              placeholder="Describe it: “black buds, white cable”, “steel watch”…"
              className="h-12 w-full rounded-xl border border-white/10 bg-ink-900/80 pl-10 pr-24 text-[13.5px] text-white placeholder:text-slate-500 focus:border-violet-500/60"
            />
            {query && (
              <button
                onClick={() => applyQuery('')}
                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {topScore && (
              <span className="absolute right-11 top-1/2 -translate-y-1/2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                top {Math.round(topScore.score * 100)}%
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-[152px]">
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </div>
        </div>

        {/* type pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            ['all', 'Everything'],
            ['lost', 'Lost'],
            ['found', 'Found'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setType(id)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                type === id ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-white/10" />
          <button
            onClick={() => { setCat('all'); setZone('all'); }}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${cat === 'all' && zone === 'all' ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-white'}`}
          >
            All categories
          </button>
        </div>

        {/* filter tray */}
        {filtersOpen && (
          <div className="mt-3 rounded-2xl border border-white/[0.07] bg-ink-850/60 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label mb-2 flex items-center gap-1.5"><Filter className="h-3 w-3" /> Category</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCat('all')}
                    className={`rounded-lg border px-2.5 py-1 text-[11.5px] ${cat === 'all' ? 'border-violet-500/50 bg-violet-500/15 text-violet-200' : 'border-white/10 text-slate-400 hover:text-white'}`}
                  >
                    All
                  </button>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCat(c.id)}
                      className={`rounded-lg border px-2.5 py-1 text-[11.5px] ${cat === c.id ? 'border-violet-500/50 bg-violet-500/15 text-violet-200' : 'border-white/10 text-slate-400 hover:text-white'}`}
                    >
                      {c.id}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="label mb-2">Zone</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setZone('all')}
                    className={`rounded-lg border px-2.5 py-1 text-[11.5px] ${zone === 'all' ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200' : 'border-white/10 text-slate-400 hover:text-white'}`}
                  >
                    All zones
                  </button>
                  {ZONES.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setZone(z.id)}
                      className={`rounded-lg border px-2.5 py-1 text-[11.5px] ${zone === z.id ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200' : 'border-white/10 text-slate-400 hover:text-white'}`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* results */}
        <div className="mt-5">
          {source === 'loading' ? (
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Shimmer key={i} className="h-[268px]" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
              <Package className="mx-auto h-9 w-9 text-slate-600" />
              <p className="mt-3 text-[14px] font-semibold text-slate-300">Nothing lines up yet</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-slate-500">
                Try dropping a filter, or post a lost report — it stays armed and gets scored against every new item.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-[11.5px] text-slate-500">
                <span>{results.length} result{results.length === 1 ? '' : 's'}</span>
                {query.trim() && (
                  <span className="flex items-center gap-1 text-violet-300">
                    <Sparkles className="h-3 w-3" /> scored locally · 0 ms network
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-4">
                {results.map((it) => (
                  <ItemCard
                    key={it.id}
                    item={it}
                    score={it.score}
                    reasons={it.reasons}
                    matches={matchCounts[it.id]?.length || 0}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
