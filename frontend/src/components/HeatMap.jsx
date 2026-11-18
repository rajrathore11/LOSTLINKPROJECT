import React, { useMemo } from 'react';
import { Flame, MapPin } from 'lucide-react';
import { ZONES } from '../lib/constants.js';
import { ZONES_LOOKUP } from '../lib/matcher.js';
import { Badge } from './ui.jsx';

/**
 * Campus Loss Heatmap — an actual differentiator for the demo.
 * Aggregates reports per zone and shows where things go missing most,
 * plus a "risky hours" strip derived from report timestamps.
 */
export default function HeatMap({ items }) {
  const { zones, peakHour, total } = useMemo(() => {
    const counts = ZONES.map((z) => ({ ...z, lost: 0, found: 0 }));
    items.forEach((it) => {
      const z = ZONES_LOOKUP(it.location);
      if (!z) return;
      const row = counts.find((c) => c.id === z.id);
      if (row) row[it.type === 'lost' ? 'lost' : 'found'] += 1;
    });

    const hours = new Array(24).fill(0);
    items.forEach((it) => {
      const d = new Date(it.date_lost_found || it.created_at);
      if (!Number.isNaN(d.getTime())) hours[d.getHours()] += 1;
    });
    const peak = hours.indexOf(Math.max(...hours));

    return {
      zones: counts.sort((a, b) => b.lost + b.found - (a.lost + a.found)),
      peakHour: peak,
      total: items.length,
    };
  }, [items]);

  const max = Math.max(1, ...zones.map((z) => z.lost + z.found));

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-ink-850/70 p-4">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-amber-400" />
          <span className="label">Campus loss heatmap</span>
        </div>
        <Badge tone="amber">{total} reports</Badge>
      </div>

      <div className="space-y-2">
        {zones.map((z) => {
          const val = z.lost + z.found;
          const pct = Math.round((val / max) * 100);
          const hot = pct >= 70;
          return (
            <div key={z.id} className="flex items-center gap-2.5">
              <span className="w-[104px] shrink-0 truncate text-[11.5px] text-slate-400">{z.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    hot
                      ? 'bg-gradient-to-r from-rose-500 to-amber-400'
                      : pct >= 40
                        ? 'bg-gradient-to-r from-amber-400 to-lime-300'
                        : 'bg-gradient-to-r from-violet-500 to-cyan-400'
                  }`}
                  style={{ width: `${Math.max(3, pct)}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-slate-500">{val}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2">
        <MapPin className="h-3 w-3 shrink-0 text-amber-300" />
        <p className="text-[11.5px] leading-snug text-amber-100/90">
          Peak loss hour: <strong className="font-semibold">{String(peakHour).padStart(2, '0')}:00–{String((peakHour + 1) % 24).padStart(2, '0')}:00</strong>
          {' · '}patrol reminder goes to the top zone.
        </p>
      </div>
    </div>
  );
}
