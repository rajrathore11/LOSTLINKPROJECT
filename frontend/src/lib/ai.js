/**
 * LostLink AI layer — 100% free, no API key.
 *
 * Provider order (first one that succeeds wins):
 *   1. Puter.js   -> window.puter.ai.chat(...)   (free, key-less, loads from index.html)
 *   2. Pollinations text API (free, key-less HTTP GET)
 *   3. Local reasoner -> answers strictly from the item list already in the browser
 *
 * Layer 3 means the assistant *never* shows a dead spinner: it can always
 * answer "do I have anything matching a black bottle?" from local data.
 */
import { rankMatches, analyse, ZONES_LOOKUP } from './matcher.js';

const TIMEOUT = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

const withTimeout = (p, ms = 22000) => Promise.race([p, TIMEOUT(ms)]);

export const isHinglish = (text = '') =>
  /\b(kya|mujhe|mera|meri|mere|mila|mili|mile|milaa|gum|khoya|khoi|kho|gaya|gayi|dhundo|dhoondho|kahan|kaunsa|kaunsi|kisi|chahiye|wala|wali|hai|hain|tha|thi|mein|par|nahi|nahin|yahin|wapis|kitne|kitni|raha|rahi)\b/i.test(text);

/* ------------------------------------------------------------------ */
/* 1. Puter                                                            */
/* ------------------------------------------------------------------ */
async function viaPuter(messages) {
  const puter = typeof window !== 'undefined' ? window.puter : null;
  if (!puter?.ai?.chat) throw new Error('puter unavailable');
  // Puter needs a one-time free sign-in. Skip instantly instead of making the
  // user stare at a spinner while a login popup is pending.
  try {
    if (puter.auth?.isSignedIn && !puter.auth.isSignedIn()) throw new Error('puter not signed in');
  } catch (e) {
    if (e.message === 'puter not signed in') throw e;
  }
  const res = await withTimeout(puter.ai.chat(messages, { model: 'gpt-4o-mini' }), 9000);
  const text =
    typeof res === 'string'
      ? res
      : res?.message?.content?.[0]?.text ||
        res?.message?.content ||
        res?.text ||
        (Array.isArray(res) ? res[0]?.text : '');
  if (!text || typeof text !== 'string') throw new Error('puter empty');
  return text.trim();
}

/* ------------------------------------------------------------------ */
/* 2. Pollinations text                                                */
/* ------------------------------------------------------------------ */
async function viaPollinations(messages) {
  const sys = messages.find((m) => m.role === 'system')?.content || '';
  const convo = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
  const prompt = encodeURIComponent(`${sys}\n\n${convo}\nAssistant:`);
  const res = await withTimeout(
    fetch(`https://text.pollinations.ai/${prompt}?model=openai&referrer=tracefind`, {
      headers: { Accept: 'text/plain' },
    }),
    11000,
  );
  if (!res.ok) throw new Error(`pollinations ${res.status}`);
  const text = (await res.text()).trim();
  if (!text || text.length < 4) throw new Error('pollinations empty');
  return text;
}

/* ------------------------------------------------------------------ */
/* 3. Local reasoner (always works, reads the real item pool)          */
/* ------------------------------------------------------------------ */
function localAnswer(question, items = [], profile) {
  const q = question.toLowerCase();
  const name = profile?.full_name?.split(' ')[0] || 'there';

  const hinglish = isHinglish(question);

  if (/hi|hello|hey|namaste/.test(q) && q.length < 25) {
    if (hinglish) return `Namaste ${name}! Main campus ke lost & found board par search kar sakta hoon. Jaise: "canteen ke paas black earbuds mile kya?"`;
    return `Hi ${name}! I can search the campus lost & found board for you. Try: "any black earbuds found near the canteen?"`;
  }

  const stats = {
    total: items.length,
    lost: items.filter((i) => i.type === 'lost').length,
    found: items.filter((i) => i.type === 'found').length,
    resolved: items.filter((i) => i.status === 'resolved').length,
  };

  if (/how many|total|stat|summary|report|kitne|kitni/.test(q) && !/match/.test(q)) {
    if (hinglish) return `Abhi board par ${stats.lost} lost reports, ${stats.found} mili hui items, aur ${stats.resolved} items wapas ho chuki hain. Item describe karo, main closest matches dhoondhunga.`;
    return `Right now the board has ${stats.lost} lost reports, ${stats.found} found items, and ${stats.resolved} already returned. Describe an item and I'll rank the closest matches.`;
  }

  // Respect intent: "found" questions shouldn't return lost reports (and vice versa).
  const asksForFound = /\bfound\b|kisi ne|someone (found|returned)|\b(mila|mili|mile|milaa|milega|milenge)\b|\b(nahi mil|mil nahi|mil raha|mil rahi)\b/i.test(q);
  const saysLost = /\blost\b|kho|i lost|misplaced|gum|khoya|khoi|gaya|gayi/i.test(q);
  const wantsLostReports = /\b(lost reports?|what did i lose)\b/i.test(q);
  const targetType = asksForFound ? 'found' : wantsLostReports && !saysLost ? 'lost' : saysLost ? 'found' : null;
  const pool = targetType ? items.filter((i) => i.type === targetType) : items;
  const hits = rankMatches(question, pool, { limit: 4, min: 0.3 });
  if (hits.length) {
    const first = hits[0];
    const extra = first.reasons?.map((r) => r.text).join(', ') || 'similar description';
    if (hinglish) {
      return [
        `"${question.trim()}" se ${hits.length} matching listing${hits.length > 1 ? 's' : ''} mili.`,
        '',
        `• **${first.title}** (${first.type}) — ${first.location} — ${Math.round(first.score * 100)}% match. Wajah: ${extra}.`,
        ...hits.slice(1).map((h) => `• **${h.title}** (${h.type}) — ${h.location} — ${Math.round(h.score * 100)}% match.`),
        '',
        'Listing kholo aur ownership verify karne ke liye "This is mine" par click karo.',
      ].join('\n');
    }
    return [
      `I found ${hits.length} listing${hits.length > 1 ? 's' : ''} that line up with "${question.trim()}".`,
      '',
      `• **${first.title}** (${first.type}) — ${first.location} — ${Math.round(first.score * 100)}% match. Reason: ${extra}.`,
      ...hits.slice(1).map((h) => `• **${h.title}** (${h.type}) — ${h.location} — ${Math.round(h.score * 100)}% match.`),
      '',
      'Open the item and hit "This is mine" to send a verified claim.',
    ].join('\n');
  }

  const a = analyse(question);
  const kind = [...a.concepts][0];
  const zone = ZONES_LOOKUP(question);
  if (hinglish) {
    return [
      `Abhi ${zone ? `${zone.label} ke paas ` : ''}${kind ? `"${kind}" type ki ` : ''}koi matching listing nahi mili.`,
      '',
      'Aap lost report post kar sakte ho, ya colour, material aur location bata kar dobara search kar sakte ho.',
    ].join('\n');
  }
  return [
    `No live listing matches ${kind ? `a "${kind}"` : 'that description'}${zone ? ` around the ${zone.label}` : ''} yet.`,
    '',
    'Two things you can do:',
    `1. Post a **lost report** — I'll auto-tag it and keep scanning new found items against it.`,
    `2. Widen it: mention colour, material or the zone (library, canteen, lab, hostel) and I'll re-rank.`,
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */
const SYSTEM = `You are LostLink Assistant, the helper inside a college Lost & Found portal.
Rules:
- Be brief: max 90 words, use markdown bullets.
- Only refer to items from the LISTINGS block. Never invent an item, a phone number or a name.
- If nothing matches, say so plainly and suggest posting a lost report.
- You can mention percentages given in the LISTINGS block.
- Reply in the user's language. If they write in Hinglish (Hindi words in Latin script mixed with English), reply naturally in Hinglish using Latin script.`;

function listingsBlock(items) {
  if (!items?.length) return 'LISTINGS: (empty)';
  const rows = items.slice(0, 14).map(
    (i) =>
      `- ${i.title} | ${i.type} | ${i.category} | ${i.location} | ${new Date(i.date_lost_found || i.created_at).toDateString()} | ${(i.description || '').slice(0, 90)}`,
  );
  return `LISTINGS:\n${rows.join('\n')}`;
}

/**
 * Ask the assistant a question.
 * @returns {Promise<{text:string, engine:'puter'|'pollinations'|'local'}>}
 */
export async function askAssistant({ question, items = [], history = [], profile = null }) {
  const messages = [
    { role: 'system', content: `${SYSTEM}\n\n${listingsBlock(items)}` },
    ...history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ];

  // Race the free providers so the first one that answers wins — no stacking waits.
  const attempts = [
    ['puter', viaPuter(messages)],
    ['pollinations', viaPollinations(messages)],
  ].map(([name, promise]) =>
    promise.then(
      (text) => ({ name, text }),
      (err) => {
        console.warn(`[ai] ${name} failed:`, err.message);
        return null;
      },
    ),
  );

  // Give the models a short head start; if they're slow, answer locally at once.
  const localFast = new Promise((resolve) => setTimeout(() => resolve({ name: 'local', text: localAnswer(question, items, profile) }), 6500));
  const winner = await Promise.race([...attempts, localFast]);
  if (winner?.text) return { text: winner.text, engine: winner.name };
  return { text: localAnswer(question, items, profile), engine: 'local' };
}

/** Explain why two listings are a match, in one friendly line. */
export async function explainMatch(a, b) {
  const localText = `Descriptions overlap on ${(b.reasons || []).map((r) => r.text).join(', ') || 'category and timing'}.`;
  const prompt = `Lost item: "${a.title} — ${a.description}" (${a.location})
Found item: "${b.title} — ${b.description}" (${b.location})
Score: ${Math.round((b.score || 0) * 100)}%.
In one short sentence, tell the owner why these are likely the same object and what to ask to verify ownership.`;
  try {
    const { text } = await askAssistant({
      question: prompt,
      items: [a, b],
      history: [],
    });
    return text.replace(/\n+/g, ' ').slice(0, 240);
  } catch {
    return localText;
  }
}

/** Draft a lost-report description from a couple of inputs (used in Report page). */
export async function draftDescription({ title, category, location, extra = '' }) {
  const prompt = `Write a 2-sentence first-person lost-item report for a college portal.
Item: ${title || 'unknown'}. Category: ${category || 'unknown'}. Last seen around: ${location || 'campus'}. Extra: ${extra || 'none'}.
Mention colour/material if given. No names, no phone numbers.`;
  try {
    const { text } = await askAssistant({ question: prompt, items: [], history: [] });
    return text.replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 320);
  } catch {
    return '';
  }
}

/** Free key-less image generation (Pollinations). Returns a URL. */
export function sceneImageUrl(prompt, { width = 900, height = 600, seed } = {}) {
  const p = encodeURIComponent(prompt);
  const s = seed ?? Math.floor(Math.random() * 100000);
  return `https://image.pollinations.ai/prompt/${p}?width=${width}&height=${height}&seed=${s}&nologo=true&referrer=tracefind`;
}
