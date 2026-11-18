/**
 * Data layer.
 *
 * Why this exists: the old app fetched everything from a free Render instance
 * that cold-starts for ~50s, which looked like a frozen "buffering" screen.
 * Reads now go straight to Supabase (ms), and every write is queued with an
 * optimistic local copy so the UI never blocks on a sleeping server.
 */
import { supabase, isSupabaseConfigured } from '../supabaseClient.js';
import { API_BASE } from './constants.js';

const LS_ITEMS = 'tracefind.items.v3';
const LS_PROFILE = 'tracefind.profile.v2';
const LS_CLAIMS = 'tracefind.claims.v2';

/* ---------------------------- demo seed ---------------------------- */
const now = Date.now();
const h = 3600e3;
const seed = [
  { id: 'd1', user_id: 'demo-1', type: 'found', title: 'Black earbuds', description: 'CMF buds, black case, white cable inside', category: 'Electronics', location: 'Canteen', date_lost_found: new Date(now - 3 * h).toISOString(), status: 'active', created_at: new Date(now - 3 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=760&q=70&auto=format&fit=crop', owner: 'Aman' },
  { id: 'd2', user_id: 'demo-2', type: 'lost', title: 'Steel wristwatch', description: 'Fenton stainless steel wrist watch, silver dial', category: 'Accessories', location: 'Library', date_lost_found: new Date(now - 9 * h).toISOString(), status: 'active', created_at: new Date(now - 9 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=760&q=70&auto=format&fit=crop', owner: 'Riya' },
  { id: 'd3', user_id: 'demo-3', type: 'lost', title: 'College ID card', description: 'Blue lanyard, 3rd sem CSE, name starts with R', category: 'Documents', location: 'Lab 302', date_lost_found: new Date(now - 1.2 * h).toISOString(), status: 'active', created_at: new Date(now - 1.2 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=760&q=70&auto=format&fit=crop', owner: 'Rahul' },
  { id: 'd4', user_id: 'demo-4', type: 'found', title: 'Blue lanyard with ID', description: 'Student ID card on blue lace, found near lab stairs', category: 'Documents', location: 'Lab 302', date_lost_found: new Date(now - 0.6 * h).toISOString(), status: 'active', created_at: new Date(now - 0.6 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=760&q=70&auto=format&fit=crop', owner: 'Sneha' },
  { id: 'd5', user_id: 'demo-5', type: 'found', title: 'Brown leather wallet', description: 'Chestnut cardholder pouch, few notes and a metro card', category: 'Wallets & Bags', location: 'Bus stand', date_lost_found: new Date(now - 2.2 * h).toISOString(), status: 'active', created_at: new Date(now - 2.2 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=760&q=70&auto=format&fit=crop', owner: 'Karan' },
  { id: 'd6', user_id: 'demo-6', type: 'lost', title: 'My purse', description: 'Small tan moneybag, kept bus pass inside', category: 'Wallets & Bags', location: 'Bus stop', date_lost_found: new Date(now - 4.5 * h).toISOString(), status: 'active', created_at: new Date(now - 4.5 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=760&q=70&auto=format&fit=crop', owner: 'Neha' },
  { id: 'd7', user_id: 'demo-7', type: 'found', title: 'Steel water bottle', description: '1 litre silver flask with a dents on cap', category: 'Others', location: 'Sports ground', date_lost_found: new Date(now - 6 * h).toISOString(), status: 'active', created_at: new Date(now - 6 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=760&q=70&auto=format&fit=crop', owner: 'Dev' },
  { id: 'd8', user_id: 'demo-8', type: 'lost', title: 'Scientific calculator', description: 'Casio fx-991, name written in marker on back', category: 'Books & Stationery', location: 'Classroom 12', date_lost_found: new Date(now - 11 * h).toISOString(), status: 'active', created_at: new Date(now - 11 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=760&q=70&auto=format&fit=crop', owner: 'Isha' },
  { id: 'd9', user_id: 'demo-9', type: 'found', title: 'Casio calculator', description: 'fx-991ES plus, black, found on last bench', category: 'Books & Stationery', location: 'Classroom 12', date_lost_found: new Date(now - 10 * h).toISOString(), status: 'active', created_at: new Date(now - 10 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=760&q=70&auto=format&fit=crop', owner: 'Varun' },
  { id: 'd10', user_id: 'demo-10', type: 'found', title: 'Room keys', description: 'Two keys on a red plastic keychain', category: 'Keys', location: 'Hostel gate', date_lost_found: new Date(now - 30 * h).toISOString(), status: 'resolved', created_at: new Date(now - 30 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=760&q=70&auto=format&fit=crop', owner: 'Ankit' },
  { id: 'd11', user_id: 'demo-11', type: 'lost', title: 'Charger and cable', description: 'White 25W type-c adapter with braided cable', category: 'Electronics', location: 'Library', date_lost_found: new Date(now - 5.5 * h).toISOString(), status: 'active', created_at: new Date(now - 5.5 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=760&q=70&auto=format&fit=crop', owner: 'Pooja' },
  { id: 'd12', user_id: 'demo-12', type: 'found', title: 'Type-C charger', description: 'White fast charger, braided type c cord', category: 'Electronics', location: 'Reading room', date_lost_found: new Date(now - 7 * h).toISOString(), status: 'active', created_at: new Date(now - 7 * h).toISOString(), image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=760&q=70&auto=format&fit=crop', owner: 'Sameer' },
];

/* ---------------------------- helpers ---------------------------- */
const read = (k, fb) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fb;
  } catch {
    return fb;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore quota */
  }
};

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

export const seedItems = () => seed.map((s) => ({ ...s }));

export function localItems() {
  const stored = read(LS_ITEMS, null);
  if (!stored) {
    write(LS_ITEMS, seed);
    return seed;
  }
  return stored;
}

export function mergeItem(item) {
  const list = localItems().filter((i) => i.id !== item.id);
  write(LS_ITEMS, [item, ...list]);
}

/* ---------------------------- auth ---------------------------- */
export async function getProfile() {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await withTimeout(supabase.auth.getUser(), 4000);
      if (data?.user) {
        const meta = data.user.user_metadata || {};
        return {
          id: data.user.id,
          email: data.user.email,
          full_name: meta.full_name || meta.name || data.user.email?.split('@')[0],
          phone: meta.phone || '',
          demo: false,
        };
      }
    } catch {
      /* fall through to demo */
    }
  }
  return read(LS_PROFILE, null);
}

export async function saveDemoProfile(profile) {
  write(LS_PROFILE, profile);
  return profile;
}

export async function signOut() {
  localStorage.removeItem(LS_PROFILE);
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
  }
}

/* ---------------------------- items ---------------------------- */
/**
 * Fetch listings. Supabase first (fast), Render API second, local seed last.
 */
export async function fetchItems() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('items').select('id,user_id,type,title,description,category,location,date_lost_found,image_url,status,created_at').order('created_at', { ascending: false }).limit(200),
        5000,
      );
      if (!error && data?.length) return { items: data, source: 'supabase' };
    } catch {
      /* fall through */
    }
  }
  try {
    const res = await withTimeout(fetch(`${API_BASE}/api/items`), 6000);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) return { items: data, source: 'api' };
    }
  } catch {
    /* fall through */
  }
  return { items: localItems(), source: 'local' };
}

export async function createItem(payload) {
  const local = {
    ...payload,
    id: (crypto.randomUUID && crypto.randomUUID()) || `local-${Date.now()}`,
    status: 'active',
    created_at: new Date().toISOString(),
    pending: true,
  };
  mergeItem(local);

  // Best-effort remote write; never blocks the UX.
  (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch(`${API_BASE}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });
    } catch {
      /* stays local until next successful sync */
    }
  })();

  return local;
}

export async function fetchItem(id) {
  const local = localItems().find((i) => i.id === id);
  if (local) return local;
  if (isSupabaseConfigured()) {
    try {
      const { data } = await withTimeout(supabase.from('items').select('*').eq('id', id).maybeSingle(), 4000);
      if (data) return data;
    } catch { /* ignore */ }
  }
  try {
    const res = await withTimeout(fetch(`${API_BASE}/api/items/${id}`), 5000);
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return null;
}

/* ---------------------------- claims ---------------------------- */
export function submitClaim({ item, message, claimant }) {
  const claims = read(LS_CLAIMS, []);
  const claim = {
    id: `claim-${Date.now()}`,
    item_id: item.id,
    item_title: item.title,
    message,
    status: 'pending',
    claimant: claimant?.full_name || claimant?.email || 'Anonymous',
    created_at: new Date().toISOString(),
  };
  write(LS_CLAIMS, [claim, ...claims]);
  return claim;
}

export function myClaims() {
  return read(LS_CLAIMS, []);
}

/* ---------------------------- stats ---------------------------- */
export function boardStats(items) {
  const lost = items.filter((i) => i.type === 'lost');
  const found = items.filter((i) => i.type === 'found');
  const resolved = items.filter((i) => i.status === 'resolved');
  const rate = items.length ? Math.round((resolved.length / items.length) * 100) : 0;
  return {
    total: items.length,
    lost: lost.length,
    found: found.length,
    resolved: resolved.length,
    rate,
  };
}
