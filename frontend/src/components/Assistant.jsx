import React, { useEffect, useRef, useState } from 'react';
import { Bot, CornerDownLeft, Loader2, Send, Sparkles, User, X, Zap } from 'lucide-react';
import { askAssistant, isHinglish } from '../lib/ai.js';
import { rankMatches } from '../lib/matcher.js';
import { useApp } from '../store/AppContext.jsx';
import { Badge } from './ui.jsx';

const STARTERS = [
  'Any black earbuds found near the canteen?',
  'Mera black wallet canteen mein kho gaya, kisi ko mila?',
  'What did I lose this week?',
  'I lost my ID card — is anything similar posted?',
  'How many items are unresolved?',
];

const renderInline = (line, key) => {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span key={key}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
};

export default function Assistant({ open, onClose }) {
  const { items, profile } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, [open, messages, busy]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const send = async (raw) => {
    const question = (raw ?? input).trim();
    if (!question || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setBusy(true);

    // Instant local hits so the user sees something in <50ms.
    const quick = rankMatches(question, items, { limit: 3, min: 0.4 });
    if (quick.length) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: isHinglish(question)
            ? `${quick.length} matching listing${quick.length > 1 ? 's' : ''} mili — sabse close **${quick[0].title}** (${Math.round(quick[0].score * 100)}%). Aur details dekh raha hoon…`
            : `${quick.length} live listing${quick.length > 1 ? 's' : ''} already line up — top is **${quick[0].title}** (${Math.round(quick[0].score * 100)}%). Asking the model for details…`,
          engine: 'instant',
        },
      ]);
    }

    const { text, engine: eng } = await askAssistant({
      question,
      items,
      history: messages.slice(-4),
      profile,
    });
    setEngine(eng);
    setMessages((m) => [...m, { role: 'assistant', content: text, engine: eng }]);
    setBusy(false);
  };

  if (!open) return null;

  const engineTone = engine === 'puter' ? 'emerald' : engine === 'pollinations' ? 'cyan' : engine ? 'violet' : 'slate';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-ink-900 shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
              <Bot className="h-4 w-4 text-white" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-lime-300 ring-2 ring-ink-900" />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-white">LostLink Assistant</p>
              <p className="text-[11px] text-slate-500">Answers from live listings only</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* messages */}
        <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="text-[13px] leading-relaxed text-slate-300">
                  I search the lost &amp; found board and won't make up listings.
                  Ask in English or Hinglish — jo aapko easy lage.
                </p>
              </div>
              <div className="space-y-2">
                <p className="label">Try</p>
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-left text-[12.5px] text-slate-300 transition-colors hover:border-violet-500/40 hover:text-white"
                  >
                    <span>{s}</span>
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  m.role === 'user' ? 'bg-white/[0.08] text-slate-300' : 'bg-gradient-to-br from-violet-600 to-cyan-500 text-white'
                }`}
              >
                {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              </span>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-white/[0.08] text-slate-100'
                    : 'border border-white/[0.07] bg-ink-850 text-slate-300'
                }`}
              >
                {m.content.split('\n').map((line, idx) => (
                  <p key={idx} className={line.startsWith('•') || /^\d\./.test(line) ? 'mt-1 pl-0.5' : 'mt-0.5'}>
                    {renderInline(line, idx)}
                  </p>
                ))}
                {m.engine && m.engine !== 'instant' && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Zap className="h-2.5 w-2.5 text-slate-500" />
                    <span className="text-[10px] uppercase tracking-wide text-slate-500">
                      {m.engine === 'local' ? 'on-device reasoner' : m.engine}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              </span>
              <div className="flex items-center gap-1 rounded-2xl border border-white/[0.07] bg-ink-850 px-3.5 py-3">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                    style={{ animationDelay: `${d * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* composer */}
        <div className="border-t border-white/[0.07] p-3">
          {engine && (
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={engineTone} icon={Zap}>
                {engine === 'local' ? 'offline-safe mode' : engine}
              </Badge>
              <span className="text-[10.5px] text-slate-500">grounded in live listings</span>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/70 px-3 py-1.5 focus-within:border-violet-500/50"
          >
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the item or ask a question…"
              className="h-9 flex-1 bg-transparent text-[13px] text-white placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-white disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
