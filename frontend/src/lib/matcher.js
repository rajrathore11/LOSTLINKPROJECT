/**
 * TraceFind Semantic Matcher
 * --------------------------
 * A fully local, zero-cost "semantic" matcher. No API key, no network call,
 * so results appear instantly and never break when a free tier runs out.
 *
 * It is not a neural embedding — it is a hand-built concept graph + fuzzy
 * token scorer. For lost & found listings this actually beats raw embeddings
 * because it is explainable: every score can be broken into reasons that we
 * show to the user ("same colour", "same zone", "both audio wearables").
 */

const CONCEPTS = {
  audio: ['earbud', 'earbuds', 'buds', 'earphone', 'earphones', 'airpod', 'airpods', 'headphone', 'headphones', 'headset', 'tws', 'neckband', 'speaker'],
  phone: ['phone', 'mobile', 'cellphone', 'smartphone', 'iphone', 'android', 'redmi', 'samsung', 'realme', 'oneplus', 'oppo', 'vivo', 'poco', 'moto'],
  laptop: ['laptop', 'notebook pc', 'macbook', 'chromebook', 'computer', 'pc'],
  charger: ['charger', 'adapter', 'adaptor', 'powerbank', 'power bank', 'cable', 'usb cable', 'type c', 'typec', 'cord', 'charging brick'],
  wallet: ['wallet', 'purse', 'cardholder', 'card holder', 'pouch', 'moneybag', 'batua'],
  bag: ['bag', 'backpack', 'back pack', 'haversack', 'jhola', 'rucksack', 'schoolbag', 'sling', 'tote'],
  id: ['id', 'id card', 'identity card', 'college id', 'aadhar', 'adhar', 'pan card', 'driving license', 'licence', 'roll number', 'admit card', 'student card'],
  docs: ['document', 'documents', 'certificate', 'marksheet', 'file', 'folder', 'assignment', 'lab file', 'receipt', 'photocopy', 'passport photo', 'photos'],
  cash: ['money', 'cash', 'notes', 'rupee', 'rupees', 'currency', '500', '200', '2000', '100', 'gandhi', 'paisa'],
  bottle: ['bottle', 'flask', 'tumbler', 'sipper', 'thermos', 'water bottle', 'jug', 'paani bottle'],
  keys: ['key', 'keys', 'keychain', 'keyring', 'chabi', 'chaabi'],
  watch: ['watch', 'wristwatch', 'smartwatch', 'clock', 'band', 'timepiece', 'ghadi'],
  glasses: ['glasses', 'spectacle', 'spectacles', 'sunglasses', 'goggles', 'lens', 'chashma', 'eyewear'],
  umbrella: ['umbrella', 'chhata', 'raincoat'],
  calc: ['calculator', 'calci', 'scientific calculator', 'casio'],
  sports: ['bat', 'ball', 'racket', 'racquet', 'gloves', 'shin guard', 'jersey', 'skipping rope', 'dumbbell', 'cricket', 'badminton', 'football'],
  stationery: ['pen', 'pencil', 'eraser', 'sharpener', 'geometry box', 'scale', 'ruler', 'marker', 'highlighter', 'stapler'],
  jewellery: ['ring', 'chain', 'bracelet', 'earring', 'anklet', 'pendant', 'locket'],
  clothing: ['jacket', 'hoodie', 'sweater', 'shirt', 'tshirt', 't shirt', 'jeans', 'trousers', 'trackpant', 'cap', 'scarf', 'shoe', 'shoes', 'sandal', 'chappal', 'socks', 'blazer', 'kurta', 'uniform'],
  storage: ['pendrive', 'pen drive', 'usb drive', 'harddisk', 'hard disk', 'memory card', 'ssd', 'sd card'],
  mouse: ['mouse', 'keyboard', 'mousepad'],
  tiffin: ['tiffin', 'lunchbox', 'lunch box', 'dabba', 'box'],
  makeup: ['lipstick', 'compact', 'perfume', 'deodorant', 'fragrance', 'kajal'],
  medical: ['medicine', 'tablet strip', 'inhaler', 'bandage', 'sanitizer'],
  tool: ['toolbox', 'screwdriver', 'plier', 'hammer', 'measuring tape', 'drafter'],
};

const COLORS = {
  black: ['black', 'kala', 'kaala', 'jet'],
  white: ['white', 'safed', 'safaid'],
  red: ['red', 'laal', 'lal', 'maroon', 'burgundy'],
  blue: ['blue', 'neela', 'neeli', 'navy'],
  green: ['green', 'hara', 'hari', 'olive'],
  yellow: ['yellow', 'peela', 'gold', 'golden'],
  brown: ['brown', 'bhura', 'tan', 'chocolate', 'chestnut'],
  grey: ['grey', 'gray', 'silver', 'silverish'],
  pink: ['pink', 'gulabi'],
  purple: ['purple', 'violet', 'lavender'],
  orange: ['orange', 'saffron'],
};

const MATERIALS = {
  leather: ['leather', 'chamdi', 'rexy'],
  metal: ['metal', 'steel', 'stainless', 'iron', 'aluminium', 'aluminum'],
  plastic: ['plastic', 'fiber', 'fibre'],
  glass: ['glass', 'crystal'],
  fabric: ['cotton', 'denim', 'fabric', 'canvas', 'polyester', 'wool', 'nylon'],
  wood: ['wood', 'wooden'],
  rubber: ['rubber', 'silicone'],
};

const STOP = new Set(['a', 'an', 'the', 'my', 'is', 'was', 'of', 'in', 'on', 'at', 'and', 'with', 'for', 'to', 'it', 'this', 'that', 'i', 'me', 'lost', 'found', 'item', 'something', 'near', 'by', 'some', 'have', 'had', 'colur', 'colour', 'color', 'please', 'pls', 'help', 'kya', 'mujhe', 'mera', 'meri', 'mere', 'mila', 'mili', 'mile', 'milaa', 'gum', 'khoya', 'khoi', 'kho', 'gaya', 'gayi', 'dhundo', 'dhoondho', 'kahan', 'kaunsa', 'kaunsi', 'kisi', 'chahiye', 'wala', 'wali', 'hai', 'hain', 'tha', 'thi', 'mein', 'par', 'nahi', 'nahin', 'yahin', 'wapis', 'milega', 'milenge', 'kitne', 'kitni', 'raha', 'rahi']);

const norm = (s = '') =>
  String(s)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Build reverse lookup: term -> concept id */
const CONCEPT_INDEX = new Map();
Object.entries(CONCEPTS).forEach(([concept, terms]) =>
  terms.forEach((t) => CONCEPT_INDEX.set(t, concept)),
);
const COLOR_INDEX = new Map();
Object.entries(COLORS).forEach(([c, terms]) => terms.forEach((t) => COLOR_INDEX.set(t, c)));
const MATERIAL_INDEX = new Map();
Object.entries(MATERIALS).forEach(([m, terms]) => terms.forEach((t) => MATERIAL_INDEX.set(t, m)));

const LEV = (a, b) => {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 1) return 2;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
};

/** Does `needle` appear in `hay` as a whole-word-ish substring / 1-typo variant? */
const fuzzyHas = (hay, needle) => {
  if (hay.includes(needle)) return true;
  if (needle.length < 5) return false;
  const words = hay.split(' ');
  return words.some((w) => w.length >= 4 && LEV(w, needle) <= 1);
};

/**
 * Extract weighted features from free text.
 * Returns { concepts:Set, colors:Set, materials:Set, numbers:Set, tokens:Map<token,weight> }
 */
export function analyse(text = '') {
  const n = norm(text);
  const concepts = new Set();
  const colors = new Set();
  const materials = new Set();
  const numbers = new Set();
  const tokens = new Map();

  Object.keys(CONCEPTS).forEach((c) => {
    if (CONCEPTS[c].some((t) => fuzzyHas(n, t))) concepts.add(c);
  });
  Object.keys(COLORS).forEach((c) => {
    if (COLORS[c].some((t) => fuzzyHas(n, t))) colors.add(c);
  });
  Object.keys(MATERIALS).forEach((m) => {
    if (MATERIALS[m].some((t) => fuzzyHas(n, t))) materials.add(m);
  });
  (n.match(/\b\d{1,5}\b/g) || []).forEach((d) => numbers.add(d));

  n.split(' ')
    .filter((w) => w.length > 2 && !STOP.has(w))
    .forEach((w) => {
      const canon = CONCEPT_INDEX.get(w) || COLOR_INDEX.get(w) || MATERIAL_INDEX.get(w);
      const key = canon ? `#${canon}` : w;
      tokens.set(key, (tokens.get(key) || 0) + 1);
    });

  return { norm: n, concepts, colors, materials, numbers, tokens };
}

/** Field-weighted item profile. */
export function profileItem(item) {
  const title = analyse(item.title || '');
  const body = analyse(`${item.description || ''} ${item.category || ''}`);
  const loc = analyse(item.location || '');
  const merged = {
    concepts: new Set([...title.concepts, ...body.concepts]),
    colors: new Set([...title.colors, ...body.colors]),
    materials: new Set([...title.materials, ...body.materials]),
    numbers: new Set([...title.numbers, ...body.numbers, ...loc.numbers]),
    tokens: new Map(),
    norm: `${title.norm} ${body.norm} ${loc.norm}`,
  };
  const bump = (map, w) => map.forEach((v, k) => merged.tokens.set(k, Math.min(3, (merged.tokens.get(k) || 0) + v * w)));
  bump(title.tokens, 1.6);
  bump(body.tokens, 1.0);
  bump(loc.tokens, 0.5);
  merged.titleTokens = title.tokens;
  return merged;
}

const overlap = (a, b) => {
  let n = 0;
  a.forEach((v) => { if (b.has(v)) n++; });
  return n;
};

/** Cosine-ish cosine over token weight maps. */
function tokenCosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  a.forEach((v, k) => { na += v * v; });
  b.forEach((v, k) => { nb += v * v; });
  a.forEach((v, k) => { if (b.has(k)) dot += v * (b.get(k) || 1); });
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const daysBetween = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;

/**
 * Score one candidate against a query, returning an explainable breakdown.
 * query: { text } or a full item object (for item-to-item matching).
 */
export function scoreCandidate(query, item) {
  const q = typeof query === 'string' ? analyse(query) : profileItem(query);
  const p = profileItem(item);

  const qCount = q.tokens.size || 1;
  let covered = 0;
  let knownHits = 0;
  q.tokens.forEach((w, k) => {
    if (p.tokens.has(k)) {
      covered += w;
      if (k.startsWith('#')) knownHits++;
    } else if (k.length >= 5) {
      // typo tolerance on raw words
      const hit = [...p.tokens.keys()].some((pk) => !pk.startsWith('#') && LEV(pk, k) <= 1);
      if (hit) covered += w * 0.8;
    }
  });
  const qTotal = [...q.tokens.values()].reduce((s, v) => s + v, 0) || 1;
  const pTotal = [...p.tokens.values()].reduce((s, v) => s + v, 0) || 1;
  // divide by the smaller side so a very detailed listing isn't punished
  const coverage = Math.min(1, covered / Math.min(qTotal, pTotal));
  const lexical = tokenCosine(q.tokens, p.tokens);

  const qConc = q.concepts, pConc = p.concepts;
  const conceptHits = overlap(qConc, pConc);
  const conceptScore = qConc.size ? conceptHits / qConc.size : 0;

  const colorHits = overlap(q.colors, p.colors);
  const colorScore = q.colors.size ? colorHits / q.colors.size : 0.5;
  const matHits = overlap(q.materials, p.materials);
  const matScore = q.materials.size ? matHits / q.materials.size : 0.5;
  const numScore = q.numbers.size ? overlap(q.numbers, p.numbers) / q.numbers.size : 0.5;

  const catMatch = q.norm && item.category && new RegExp(`\\b${item.category.split(' ')[0]}\\b`, 'i').test(q.norm) ? 1 : 0;

  // recency of the report (fresher listings are likelier to be the record)
  const ageDays = Math.max(0, daysBetween(item.created_at || new Date(), new Date()));
  // Recency is a tiebreaker, not a penalty: old-but-relevant listings keep a floor.
  const freshness = 0.55 + 0.45 * Math.exp(-ageDays / 45);

  const semantic = 0.40 * coverage + 0.18 * lexical + 0.42 * conceptScore;
  let score = 0.56 * semantic + 0.15 * colorScore + 0.06 * matScore + 0.05 * numScore + 0.08 * catMatch + 0.10 * freshness;
  // A shared object-kind is the single strongest signal in lost & found.
  if (conceptHits && qConc.size === 1 && pConc.size === 1) score += 0.08;

  if (!q.tokens.size) score = 0.25 + 0.1 * freshness; // empty query -> neutral
  score = Math.max(0, Math.min(1, score));

  const reasons = [];
  if (conceptHits) {
    const labels = [...qConc].filter((c) => pConc.has(c));
    reasons.push({ k: 'kind', text: `same kind (${labels.join(', ')})` });
  }
  const sharedColors = [...q.colors].filter((c) => p.colors.has(c));
  if (sharedColors.length) reasons.push({ k: 'color', text: `colour ${sharedColors.join(', ')}` });
  const sharedMat = [...q.materials].filter((m) => p.materials.has(m));
  if (sharedMat.length) reasons.push({ k: 'material', text: `material ${sharedMat.join(', ')}` });
  if (catMatch) reasons.push({ k: 'category', text: `category ${item.category}` });
  if (numScore > 0.9 && q.numbers.size) reasons.push({ k: 'number', text: `same number/amount` });
  const wordHits = [...q.tokens.keys()].filter((k) => !k.startsWith('#') && p.tokens.has(k)).slice(0, 3);
  if (wordHits.length) reasons.push({ k: 'words', text: `mentions "${wordHits.join('", "')}"` });

  return {
    score,
    reasons,
    breakdown: { coverage, lexical, conceptScore, colorScore, matScore, catMatch, freshness },
  };
}

/** Explainable item ↔ item match (used on the item detail page). */
export function explainPair(a, b) {
  const r = scoreCandidate(a, b);
  if (!r.reasons.length) return 'Descriptions point in a different direction — low overlap.';
  return `Strong overlap: ${r.reasons.map((x) => x.text).join(' · ')}.`;
}

/** Confidence bucket for a 0..1 score. */
export function confidence(score) {
  const pct = Math.round(score * 100);
  if (pct >= 80) return { label: 'Near-certain', tone: 'emerald', pct };
  if (pct >= 62) return { label: 'Strong match', tone: 'emerald', pct };
  if (pct >= 45) return { label: 'Possible match', tone: 'amber', pct };
  return { label: 'Weak signal', tone: 'slate', pct };
}

/** Rank a pool of candidates against a query, only opposite type. */
export function rankMatches(query, items, { oppositeOf = null, limit = 8, min = 0.38 } = {}) {
  const targetType = oppositeOf === 'lost' ? 'found' : oppositeOf === 'found' ? 'lost' : null;
  return items
    .filter((it) => it.status !== 'resolved')
    .filter((it) => {
      if (!targetType) return true;
      return it.type === targetType;
    })
    .map((item) => ({ ...item, ...scoreCandidate(query, item) }))
    .filter((it) => it.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Build a few "smart" AI-inferred tags/suggestions for a listing. */
export function suggestTags({ title = '', description = '', category = '', location = '' }) {
  const a = analyse(`${title} ${description} ${category} ${location}`);
  const kind = [...a.concepts][0];
  const colour = [...a.colors][0];
  const zone = ZONES_LOOKUP(location);
  const out = [];
  if (kind) out.push(kind);
  if (colour) out.push(colour);
  if (zone) out.push(zone.label.toLowerCase());
  if (a.materials.size) out.push([...a.materials][0]);
  return [...new Set(out)].slice(0, 4);
}

import { ZONES } from './constants.js';
function ZONES_LOOKUP(loc = '') {
  const n = norm(loc);
  if (!n) return null;
  const hit = ZONES.find((z) => z.aliases.some((a) => fuzzyHas(n, a)));
  return hit || null;
}
export { ZONES_LOOKUP };
