import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
  MapPin,
  Sparkles,
  Tag,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { Badge, Button, Card, Field, Input, Select, Shell, Textarea } from '../components/ui.jsx';
import { CATEGORIES, ZONES } from '../lib/constants.js';
import { rankMatches, suggestTags } from '../lib/matcher.js';
import { draftDescription, sceneImageUrl } from '../lib/ai.js';
import { supabase } from '../supabaseClient.js';

const STEPS = ['What is it?', 'Where & when', 'Details'];

export default function ReportItem() {
  const { profile, addItem, items, notify } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    type: 'lost',
    title: '',
    description: '',
    category: 'Electronics',
    location: '',
    date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
  });
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value ?? e }));
  const tags = useMemo(() => suggestTags(form), [form]);

  // live "already on the board?" preview while typing
  const livePreview = useMemo(() => {
    const text = `${form.title} ${form.description}`.trim();
    if (text.length < 4) return [];
    return rankMatches({ ...form, title: form.title, description: form.description }, items, {
      oppositeOf: form.type,
      limit: 3,
      min: 0.45,
    });
  }, [form, items]);

  const autoDraft = async () => {
    setDrafting(true);
    const text = await draftDescription({ title: form.title, category: form.category, location: form.location, extra: form.description });
    if (text) setForm((f) => ({ ...f, description: text }));
    else notify({ type: 'info', title: 'Draft unavailable offline', body: 'Write a line yourself — even 4–5 words is enough for matching.' });
    setDrafting(false);
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      // try Supabase storage first
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const path = `items/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('item-image').upload(path, file, { upsert: true });
        if (!upErr) {
          const { data } = supabase.storage.from('item-image').getPublicUrl(path);
          setImageUrl(data.publicUrl);
          setUploading(false);
          return;
        }
      }
      // fallback: local preview only
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      setError('Image upload failed — you can still post without a photo.');
    }
  };

  const generateArt = () => {
    const prompt = `clean minimal product photo of a ${form.title || 'lost item'}, ${form.category}, on a neutral dark surface, soft studio light, high detail`;
    setImageUrl(sceneImageUrl(prompt, { width: 800, height: 600 }));
  };

  const canNext = (s) => (s === 0 ? Boolean(form.title.trim()) : s === 1 ? Boolean(form.location.trim()) : true);

  const submit = async () => {
    if (!profile) {
      notify({ type: 'info', title: 'Sign in to post', body: 'An account keeps your claims private and verifiable.' });
      navigate('/login');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        user_id: profile.id,
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || form.title.trim(),
        category: form.category,
        location: form.location.trim(),
        date_lost_found: new Date(form.date).toISOString(),
        image_url: imageUrl || null,
      };
      const { created, matches } = await addItem(payload);
      navigate(`/item/${created.id}`, { state: { justPosted: true, matches } });
    } catch (err) {
      setError(err.message || 'Could not post the listing.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell className="pb-20">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-tight text-white">Report an item</h1>
            <p className="mt-1 text-[13px] text-slate-400">
              Takes ~30 seconds. The moment you post, we score it against every opposite-type listing.
            </p>
          </div>
          <Badge tone="lime" icon={Zap}>Auto-matching on</Badge>
        </div>

        {/* stepper */}
        <div className="mt-5 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  i === step ? 'bg-violet-500/15 text-violet-200' : i < step ? 'text-emerald-300' : 'text-slate-500'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  i < step ? 'bg-emerald-500/20 text-emerald-300' : i === step ? 'bg-violet-500 text-white' : 'bg-white/[0.07] text-slate-400'
                }`}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {s}
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-white/10" />}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-5">
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['lost', 'I lost it', 'Post a lost report'],
                    ['found', 'I found it', 'Post a found item'],
                  ].map(([id, label, sub]) => (
                    <button
                      key={id}
                      onClick={() => setForm((f) => ({ ...f, type: id }))}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        form.type === id
                          ? 'border-violet-500/50 bg-violet-500/10'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <p className="text-[13px] font-semibold text-white">{label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
                    </button>
                  ))}
                </div>

                <Field label="Item name" hint="Short and specific works best — “steel wristwatch”, “CMF earbuds”.">
                  <Input value={form.title} onChange={set('title')} placeholder="e.g. Black wireless earbuds" autoFocus />
                </Field>

                <Field label="Category">
                  <Select value={form.category} onChange={set('category')}>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
                  </Select>
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <Field label="Where did it happen?" hint="Pick a zone — this powers the campus heatmap.">
                  <Input
                    list="zones"
                    value={form.location}
                    onChange={set('location')}
                    placeholder="e.g. Library reading room"
                  />
                  <datalist id="zones">
                    {ZONES.map((z) => <option key={z.id} value={z.label} />)}
                  </datalist>
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {ZONES.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setForm((f) => ({ ...f, location: z.label }))}
                      className={`rounded-lg border px-2.5 py-1 text-[11.5px] ${
                        form.location === z.label
                          ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                          : 'border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
                <Field label="Date & time">
                  <Input type="datetime-local" value={form.date} onChange={set('date')} />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Field label="Description" className="flex-1" hint="Colour, material, marks, contents — anything that proves ownership.">
                    <Textarea rows={5} value={form.description} onChange={set('description')} placeholder="Black buds, white charging cable inside, small scratch on the case lid…" />
                  </Field>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" icon={Wand2} loading={drafting} onClick={autoDraft}>
                    Draft it for me
                  </Button>
                  <span className="text-[11px] text-slate-500">Uses the free assistant. Edit anything after.</span>
                </div>

                {tags.length > 0 && (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <p className="label mb-2 flex items-center gap-1.5"><Tag className="h-3 w-3" /> Auto-detected signals</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => <Badge key={t} tone="violet">{t}</Badge>)}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                      These are the concepts the matcher will weigh. Good signals = sharper matches.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-white/[0.07] p-3">
                  <p className="label mb-2 flex items-center gap-1.5"><Camera className="h-3 w-3" /> Photo (optional)</p>
                  <div className="flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-slate-300 hover:border-white/20">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} />
                    </label>
                    <Button size="sm" variant="ghost" icon={Sparkles} onClick={generateArt}>Generate preview</Button>
                    {imageUrl && (
                      <button onClick={() => setImageUrl('')} className="ml-auto flex items-center gap-1 text-[11px] text-rose-300">
                        <X className="h-3 w-3" /> remove
                      </button>
                    )}
                  </div>
                  {imageUrl && (
                    <img src={imageUrl} alt="preview" className="mt-3 h-36 w-full rounded-lg object-cover" />
                  )}
                  <p className="mt-2 text-[10.5px] text-slate-500">
                    Photos never leave your account; generated previews are placeholders only.
                  </p>
                </div>
              </div>
            )}

            {error && <p className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">{error}</p>}

            <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <Button variant="ghost" size="sm" onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}>
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>
              {step < 2 ? (
                <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canNext(step)}>
                  Continue
                </Button>
              ) : (
                <Button icon={Sparkles} loading={busy} onClick={submit}>
                  Post & find matches
                </Button>
              )}
            </div>
          </Card>

          {/* right rail: live matches + tips */}
          <div className="space-y-3.5">
            <Card className="p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="label flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Already on the board</span>
                <Badge tone="emerald">{livePreview.length}</Badge>
              </div>
              {livePreview.length === 0 ? (
                <p className="text-[12px] leading-relaxed text-slate-500">
                  Start typing a name and any similar {form.type === 'lost' ? 'found' : 'lost'} listing will appear here
                  live — before you even post.
                </p>
              ) : (
                <div className="space-y-2">
                  {livePreview.map((m) => (
                    <div key={m.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] font-semibold text-white">{m.title}</p>
                        <span className="shrink-0 text-[11px] font-bold text-emerald-300">{Math.round(m.score * 100)}%</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{m.description}</p>
                      <p className="mt-1 text-[10.5px] text-slate-500">{m.location} · {m.reasons?.[0]?.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <p className="label mb-2">Tips for sharper matches</p>
              <ul className="space-y-1.5 text-[11.5px] leading-relaxed text-slate-400">
                <li>• Mention <strong className="text-slate-200">colour + material</strong> (“black plastic”, “steel”).</li>
                <li>• Add <strong className="text-slate-200">one unique detail</strong> you'll use as proof later.</li>
                <li>• Keep hidden proof out of the public description if it's sensitive.</li>
                <li>• Post as soon as you notice — fresh reports score higher on recency.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
