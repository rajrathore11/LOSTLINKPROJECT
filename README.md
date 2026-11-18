# TraceFind — Campus Lost & Found, matched by meaning

> Upgraded build of the 5th-semester project (formerly "LOSTLINK.ai").
> React + Vite + Tailwind · FastAPI · Supabase (Postgres + pgvector) · **free AI, no API keys**

---

## 1. What was broken (and is now fixed)

| Reported problem | Root cause found | Fix shipped |
|---|---|---|
| "AI matching doesn't work; no item matches" | `gemini_service.py` caught every failure and returned `[0.0] × 768`. Similarity against a zero vector is `NaN`, so the API returned `"similarity": "NaN"` for every row. 6 of 7 live rows had all-zero embeddings. | New embedding service: free remote embeddings → **deterministic local hashing embedder** that never returns zeros. `match_items()` now skips zero-norm rows. `/health` and `/api/embeddings/debug` report real state. |
| "So much buffering" | Every read went through the Render free instance (~50 s cold start) behind a tiny spinner. | Reads go **straight to Supabase** (ms). Search ranks **in the browser** with the local matcher — 0 ms network. Backend is only a fallback. |
| "Remove 'Gemini' everywhere" | Hard-coded in 3 UI strings + README. | Zero vendor names in the UI. Engine is described honestly: "local semantic scorer", "on-device reasoner". |
| "Chat doesn't work" | There was **no chat feature and no `/api/chat`**. | New `TraceBot` assistant (⌘K) + `/api/chat`, grounded only in real listings, with 3 provider tiers and an instant local answer. |

---

## 2. Feature list (what you can demo)

### Matching brain
1. **Meaning-based scoring, not keywords** — concept graph (audio, wallet, ID, charger, jewellery…), colour + material + numeric-amount extraction, typo tolerance (Levenshtein ≤ 1), Hinglish words (`batua`, `chhata`, `chashma`, `kala`).
2. **Explainable confidence** — every match shows *why*: "same kind (audio) · colour black · same zone".
3. **Match Room** — every lost↔found pair across the whole board, ranked, with a confidence floor slider. Nothing to click to see it.
4. **Live match preview while typing** a report — you see existing counterparts before you even post.
5. **Reverse matching on post** — new listing is scored against the board instantly, and the best hits become in-app notifications.
6. **Ranked search page** with score bars, sort by relevance/newest/oldest.
7. **Recency weighting** — fresh reports score higher.
8. **Zone-aware scoring** — "Canteen" vs "Cgl canteen" resolve to the same campus zone.

### Trust & handover
9. **Proof-gated claims** — claimant submits private proof; owner approves before any contact.
10. **Pickup code** — a per-claim code renders on approval (prevents "someone else picked it up").
11. **Claim tracking** in the dashboard (pending / approved / rejected).
12. **Anonymous question relay** (stub, wired).

### Insight
13. **Campus loss heatmap** — reports per zone, colour-coded, plus the **peak loss hour**.
14. **Board pulse** — lost / found / returned split + campus recovery rate.
15. **Dashboard KPIs** — my listings, live matches, my claims, my recovery rate.
16. **Smart nudges** — e.g. "add a photo, photo-backed reports get claimed ~2× faster".

### UX / engineering
17. **Zero-wait architecture** — Supabase direct + local rank + optimistic writes.
18. **Skeletons, not spinners** — no more blank buffering screens.
19. **Optimistic offline-safe writes** — posts land locally first, sync later.
20. **Notification centre** with unread badge + toasts.
21. **TraceBot assistant** (⌘K / Ctrl+K) — 3 tiers: Puter.js → Pollinations → on-device reasoner. Answers in <1 s even fully offline.
22. **Intent-aware answers** — asking "found" won't return lost reports.
23. **Free image generation** for placeholder previews (Pollinations).
24. **3-step report wizard** with auto-detected signal tags.
25. **Auto-draft description** from title/category/zone.
26. **Demo-mode sign-in** (no signup wall) + real Supabase email/password auth.
27. **Demo data switcher** on Browse — inject sample listings so a live demo never shows an empty board.
28. **Campus-zone taxonomy** + alias resolver.
29. **Accessible focus rings, reduced-motion support, mobile FAB, sticky nav, keyboard shortcuts**.
30. **Honest health endpoint** — `/health` exposes the embedding provider actually in use.

---

## 3. Run it

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # production build
```
Optional `.env` (sensible defaults are baked in, so it runs with zero config):
```
VITE_SUPABASE_URL=https://flatxeqlvqzupupunmza.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_API_URL=https://lostlink-en0i.onrender.com
VITE_DEMO_MODE=true
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
`.env`:
```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
# optional
DISABLE_REMOTE_EMBEDDINGS=false
DISABLE_REMOTE_LLM=false
```

### Database
Run `supabase/schema.sql` in the Supabase SQL editor. It is idempotent and now
includes the **NaN-safe** `match_items()` plus a repair note for legacy
zero-vector rows.

---

## 4. API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | status + embedding provider actually in use |
| GET | `/api/embeddings/debug?text=` | prove a text yields a non-zero 768-vector |
| GET | `/api/items` | list / semantic search |
| POST | `/api/items` | create (real embeddings, no zero-vector fallback) |
| GET | `/api/items/my-items` | my listings |
| GET | `/api/items/{id}` | detail |
| GET | `/api/items/{id}/matches` | counterpart suggestions + reason |
| POST | `/api/chat` | **new** grounded assistant (free, no key) |
| POST/GET | `/api/claims` | claims |
| PUT | `/api/claims/{id}` | approve / reject |

---

## 5. Viva-ready talking points

* **Why not just embeddings?** Cosine over a 768-vector is opaque and, in this
  project, silently produced `NaN`. The local scorer is explainable — every
  percentage can be decomposed into kind / colour / material / zone / recency,
  which is what a lost-and-found office needs to justify a handover.
* **Why does it feel instant?** Reads bypass the sleeping backend; ranking is
  O(n) in the browser over ≤200 rows — microseconds.
* **Why is it free?** Every AI path has a key-less tier and a deterministic
  fallback, so the demo never dies on a quota.
* **Anti-hallucination:** the assistant can only reference rows passed into its
  prompt, and the local tier literally formats the same rows.
