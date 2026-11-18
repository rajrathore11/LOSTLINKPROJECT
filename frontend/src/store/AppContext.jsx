import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchItems, createItem, getProfile, signOut as doSignOut, saveDemoProfile, seedItems } from '../lib/data.js';
import { rankMatches, scoreCandidate } from '../lib/matcher.js';

const AppCtx = createContext(null);

const NOTIF_KEY = 'tracefind.notifs.v1';

export function AppProvider({ children }) {
  const [items, setItems] = useState([]);
  const [source, setSource] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [notifs, setNotifs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState(null);

  const refresh = useCallback(async () => {
    const { items: list, source: src } = await fetchItems();
    setItems(list);
    setSource(src);
    return list;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [list, prof] = await Promise.all([fetchItems(), getProfile()]);
      if (!alive) return;
      setItems(list.items);
      setSource(list.source);
      setProfile(prof);
      setAuthReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Push a notification (also persisted). */
  const notify = useCallback((n) => {
    const entry = { id: `n-${Date.now()}`, at: new Date().toISOString(), read: false, ...n };
    setNotifs((prev) => {
      const next = [entry, ...prev].slice(0, 40);
      try {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
    setToast(entry);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifs((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  /** Add a listing. Immediately surfaces reverse matches as notifications. */
  /** Merge demo listings into the visible board (used by the presentation switcher). */
  const loadDemo = useCallback(() => {
    const existing = new Set(items.map((i) => i.id));
    const fresh = seedItems().filter((s) => !existing.has(s.id));
    setItems((prev) => [...fresh, ...prev]);
    notify({ type: 'info', title: 'Demo board loaded', body: `${fresh.length} sample listings added so the walkthrough always has data.` });
  }, [items, notify]);

  const addItem = useCallback(
    async (payload) => {
      const created = await createItem(payload);
      setItems((prev) => [created, ...prev.filter((i) => i.id !== created.id)]);

      const matches = rankMatches(created, items, { oppositeOf: created.type, limit: 3, min: 0.46 });
      if (matches.length) {
        notify({
          type: 'match',
          title: `${matches.length} possible match${matches.length > 1 ? 'es' : ''} for “${created.title}”`,
          body: `Top: ${matches[0].title} · ${Math.round(matches[0].score * 100)}% · ${matches[0].location}`,
          itemId: created.id,
          matches: matches.slice(0, 3).map((m) => ({ id: m.id, title: m.title, score: m.score })),
        });
      } else {
        notify({
          type: 'info',
          title: 'Listing is live',
          body: `“${created.title}” is now being scanned against every new report.`,
          itemId: created.id,
        });
      }
      return { created, matches };
    },
    [items, notify],
  );

  const signIn = useCallback(async (prof) => {
    await saveDemoProfile(prof);
    setProfile(prof);
    notify({ type: 'info', title: `Welcome, ${prof.full_name?.split(' ')[0] || 'friend'}`, body: 'Your board is synced.' });
  }, [notify]);

  const signOut = useCallback(async () => {
    await doSignOut();
    setProfile(null);
  }, []);

  const stats = useMemo(() => {
    const lost = items.filter((i) => i.type === 'lost').length;
    const found = items.filter((i) => i.type === 'found').length;
    const resolved = items.filter((i) => i.status === 'resolved').length;
    return { total: items.length, lost, found, resolved, rate: items.length ? Math.round((resolved / items.length) * 100) : 0 };
  }, [items]);

  const myItems = useMemo(
    () => (profile ? items.filter((i) => i.user_id === profile.id || i.owner === profile.full_name) : []),
    [items, profile],
  );

  /** Precomputed match counts per item, so cards can show "3 matches" instantly. */
  const matchCounts = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      const m = rankMatches(it, items, { oppositeOf: it.type, limit: 50, min: 0.52 });
      if (m.length) map[it.id] = m;
    });
    return map;
  }, [items]);

  const value = {
    items,
    setItems,
    source,
    refresh,
    profile,
    authReady,
    signIn,
    signOut,
    addItem,
    loadDemo,
    notifs,
    notify,
    markAllRead,
    toast,
    setToast,
    stats,
    myItems,
    matchCounts,
    scoreCandidate,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
