import React from 'react';
import { Loader2 } from 'lucide-react';

/** Page shell with the aurora + grid backdrop. */
export function Shell({ children, className = '' }) {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-ink-950 ${className}`}>
      <div className="pointer-events-none absolute inset-0 aurora" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] grid-lines opacity-60" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Frosted card. */
export function Card({ children, className = '', as: Tag = 'div', hover = false, ...rest }) {
  return (
    <Tag
      className={`surface rounded-2xl ${hover ? 'transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-lift' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function SectionLabel({ children, icon: Icon, right }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-violet-400" />}
        <span className="label">{children}</span>
      </div>
      {right}
    </div>
  );
}

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-500 text-white shadow-glow hover:brightness-110',
  secondary: 'bg-white/[0.06] text-slate-100 border border-white/10 hover:bg-white/[0.1]',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/[0.06]',
  danger: 'bg-rose-500/15 text-rose-200 border border-rose-500/30 hover:bg-rose-500/25',
  success: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/25',
};

const SIZES = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2.5',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  ...rest
}) {
  return (
    <button
      className={`inline-flex select-none items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

const TONES = {
  emerald: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25',
  amber: 'bg-amber-500/12 text-amber-300 border-amber-500/25',
  violet: 'bg-violet-500/12 text-violet-300 border-violet-500/25',
  cyan: 'bg-cyan-500/12 text-cyan-300 border-cyan-500/25',
  rose: 'bg-rose-500/12 text-rose-300 border-rose-500/25',
  slate: 'bg-white/[0.05] text-slate-300 border-white/10',
};

export function Badge({ children, tone = 'slate', icon: Icon, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONES[tone] || TONES.slate} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-[13px] font-medium text-slate-300">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1.5 block text-[11.5px] text-slate-500">{hint}</span>}
      {error && <span className="mt-1.5 block text-[11.5px] text-rose-300">{error}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-xl bg-ink-900/70 border border-white/10 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-colors hover:border-white/20 focus:border-violet-500/60';

export function Input({ className = '', ...rest }) {
  return <input className={`${inputBase} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }) {
  return <textarea className={`${inputBase} resize-none leading-relaxed ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select className={`${inputBase} hide-native-select cursor-pointer ${className}`} {...rest}>
      {children}
    </select>
  );
}

/** Thin progress meter with a gradient fill. */
export function Meter({ value = 0, tone = 'violet', height = 6, className = '' }) {
  const grads = {
    violet: 'from-violet-500 to-cyan-400',
    emerald: 'from-emerald-400 to-lime-300',
    amber: 'from-amber-400 to-orange-400',
    rose: 'from-rose-500 to-pink-400',
  };
  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/[0.07] ${className}`} style={{ height }}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${grads[tone] || grads.violet} transition-[width] duration-700 ease-out`}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/** Circular confidence dial. */
export function Dial({ score = 0, size = 54, stroke = 5, label, tone = '#a78bfa' }) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * pct) / 100}
            style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-white">
          {pct}
          <span className="text-[8px] text-slate-400">%</span>
        </span>
      </div>
      {label && <span className="text-[12px] text-slate-400">{label}</span>}
    </div>
  );
}

export function Shimmer({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-400">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-[15px] font-semibold text-slate-200">{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Tooltip({ children, text }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-white/10 bg-ink-800 px-2.5 py-1.5 text-[11px] leading-snug text-slate-300 opacity-0 shadow-lift transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
