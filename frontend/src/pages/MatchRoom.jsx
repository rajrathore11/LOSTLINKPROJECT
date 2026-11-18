import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Filter, Link2, Radar, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { Badge, Button, Card, Dial, Meter, SectionLabel, Shell, Shimmer } from '../components/ui.jsx';
import { rankMatches, confidence } from '../lib/matcher.js';

/**
 * Match Room — the demo money-shot.
 * Every lost↔found pair across the whole board, ranked, explainable, no clicks needed.
 */
export default function MatchRoom() {
  const { items, source, refresh } = useApp();
  const [min, setMin] = useState(45);
  const [refreshing, setRefreshing] = useState(false);

  const pairs = useMemo(() => {
    const lost = items.filter((i) => i.type === 'lost');
    const out = [];
    const seen = new Set();
    lost.forEach((l) => {
      rankMatches(l, items, { oppositeOf: 'lost', limit: 3, min: min / 100 }).forEach((m) => {
        const key = [l.id, m.id].sort().join('|');
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ left: l, right: m });
      });
    });
    return out.sort((a, b) => b.right.score - a.right.score);
  }, [items, min]);

  const strong = pairs.filter((p) => p.right.score >= 0.62).length;

  return (
    <Shell className="pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-display text-[26px] font-bold tracking-tight text-white">
              <Radar className="h-6 w-6 text-violet-400" /> Match Room
            </h1>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-slate-400">
              Every lost report cross-checked against every found item — ranked by meaning, with reasons attached.
              This is what runs quietly in the background for the whole campus.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="violet" icon={Zap}>{pairs.length} pairs</Badge>
            <Badge tone="emerald" icon={Sparkles}>{strong} strong</Badge>
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              loading={refreshing}
              onClick={async () => {
                setRefreshing(true);
                await refresh();
                setRefreshing(false);
              }}
            >
              Rescan
            </Button>
          </div>
        </div>

        <Card className="mt-5 flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[12px] text-slate-400">Confidence floor</span>
          </div>
          <input
            type="range"
            min={30}
            max={80}
            step={5}
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
            className="h-1.5 w-full max-w-[240px] cursor-pointer appearance-none rounded-full bg-white/10 accent-violet-500"
          />
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11.5px] font-semibold text-white">{min}%</span>
          <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />≥62 strong</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />45–61 possible</span>
          </div>
        </Card>

        <div className="mt-5 space-y-3">
          {source === 'loading' && [0, 1, 2].map((i) => <Shimmer key={i} className="h-[132px]" />)}

          {source !== 'loading' && pairs.length === 0 && (
            <Card className="p-10 text-center">
              <Radar className="mx-auto h-9 w-9 text-slate-600" />
              <p className="mt-3 text-[14px] font-semibold text-slate-300">No pairs above {min}%</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-slate-500">
                Lower the confidence floor, or post more reports — the room fills up as the board grows.
              </p>
            </Card>
          )}

          {pairs.map(({ left, right }) => {
            const conf = confidence(right.score);
            return (
              <Card key={`${left.id}-${right.id}`} hover className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Dial score={right.score} size={52} tone={conf.tone === 'emerald' ? '#a3e635' : conf.tone === 'amber' ? '#fbbf24' : '#a78bfa'} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link to={`/item/${left.id}`} className="max-w-[180px] truncate text-[13px] font-semibold text-white hover:text-violet-300">
                          {left.title}
                        </Link>
                        <Link2 className="h-3 w-3 shrink-0 text-slate-600" />
                        <Link to={`/item/${right.id}`} className="max-w-[180px] truncate text-[13px] font-semibold text-white hover:text-violet-300">
                          {right.title}
                        </Link>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                        <span className="rounded bg-rose-500/12 px-1.5 py-0.5 text-rose-300">lost · {left.location}</span>
                        <ArrowRight className="h-2.5 w-2.5 text-slate-600" />
                        <span className="rounded bg-emerald-500/12 px-1.5 py-0.5 text-emerald-300">found · {right.location}</span>
                        <span className="text-slate-600">·</span>
                        <span>{conf.label}</span>
                      </p>
                    </div>
                  </div>

                  <div className="sm:w-[240px]">
                    <Meter value={conf.pct} tone={conf.tone === 'emerald' ? 'emerald' : conf.tone === 'amber' ? 'amber' : 'violet'} height={5} />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(right.reasons || []).slice(0, 3).map((r) => (
                        <span key={r.k} className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-300">{r.text}</span>
                      ))}
                    </div>
                  </div>

                  <Link to={`/item/${right.id}`} className="shrink-0">
                    <Button size="sm" variant="secondary" icon={ArrowRight}>Review</Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
