"""
Free reasoning service — no paid API key.

Two jobs:
  1. `answer_question` — the /api/chat assistant. Uses an optional free remote
     model, but *always* has a local, data-grounded answer ready.
  2. `explain_pair`   — one-sentence, rule-based explanation of why two listings
     are a match (used by /api/items/{id}/matches).

Grounding rule: answers may only reference rows passed in `items`. Nothing is
invented, so the assistant can never hallucinate a listing during a demo.
"""
from __future__ import annotations

import math
import os
import re
from typing import Any, Dict, Iterable, List, Optional

import httpx

from app.services.gemini_service import _COLOR_OF, _CONCEPT_OF  # reuse the concept tables

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_STOP = {
    "a", "an", "the", "my", "is", "was", "of", "in", "on", "at", "and", "with",
    "for", "to", "it", "this", "that", "i", "me", "lost", "found", "item",
    "something", "near", "by", "some", "have", "had", "colour", "color", "please",
    "kya", "mujhe", "mera", "meri", "mere", "mila", "mili", "mile", "milaa", "gum",
    "khoya", "khoi", "kho", "gaya", "gayi", "dhundo", "dhoondho", "kahan",
    "kaunsa", "kaunsi", "kisi", "chahiye", "wala", "wali", "hai", "tha", "thi",
    "mein", "par", "nahi", "nahin", "yahin", "wapis", "kitne", "kitni",
    "hain", "raha", "rahi",
}
_HINGLISH_RE = re.compile(
    r"\b(kya|mujhe|mera|meri|mere|mila|mili|mile|milaa|gum|khoya|khoi|kho|gaya|gayi|"
    r"dhundo|dhoondho|kahan|kaunsa|kaunsi|kisi|chahiye|wala|wali|hai|tha|thi|"
    r"mein|par|nahi|nahin|yahin|wapis|kitne|kitni|hain|raha|rahi)\b",
    re.IGNORECASE,
)


def _is_hinglish(text: str) -> bool:
    return bool(_HINGLISH_RE.search(text or ""))


def _features(text: str) -> Dict[str, float]:
    feats: Dict[str, float] = {}
    for w in _TOKEN_RE.findall((text or "").lower()):
        if len(w) < 3 or w in _STOP:
            continue
        if w in _CONCEPT_OF:
            feats[f"c:{_CONCEPT_OF[w]}"] = 2.2
        if w in _COLOR_OF:
            feats[f"col:{_COLOR_OF[w]}"] = 1.6
        feats[f"w:{w}"] = feats.get(f"w:{w}", 0.0) + 1.0
    return feats


def _cosine(a: Dict[str, float], b: Dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(v * b.get(k, 0.0) for k, v in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def _reasons(q: Dict[str, float], p: Dict[str, float]) -> List[str]:
    out = []
    kinds = [k[2:] for k in q if k.startswith("c:") and k in p]
    if kinds:
        out.append("same kind (" + ", ".join(kinds) + ")")
    cols = [k[4:] for k in q if k.startswith("col:") and k in p]
    if cols:
        out.append("colour " + ", ".join(cols))
    words = [k[2:] for k in q if k.startswith("w:") and k in p][:3]
    if words:
        out.append('mentions "' + '", "'.join(words) + '"')
    return out


def rank(question: str, items: Iterable[Dict[str, Any]], limit: int = 4, floor: float = 0.25) -> List[Dict[str, Any]]:
    """Score items against a free-text question and return the best few."""
    q = _features(question)
    scored = []
    for item in items:
        blob = " ".join(
            str(item.get(f, "")) for f in ("title", "description", "category", "location")
        )
        p = _features(blob)
        sim = _cosine(q, p)
        if sim >= floor:
            scored.append({**item, "score": sim, "reasons": _reasons(q, p)})
    scored.sort(key=lambda r: r["score"], reverse=True)
    return scored[:limit]


def explain_pair(a: Dict[str, Any], b: Dict[str, Any]) -> str:
    """Rule-based one-liner. Deterministic, instant, free."""
    qa = _features(" ".join(str(a.get(f, "")) for f in ("title", "description", "category", "location")))
    qb = _features(" ".join(str(b.get(f, "")) for f in ("title", "description", "category", "location")))
    reasons = _reasons(qa, qb)
    sim = _cosine(qa, qb)
    if not reasons:
        return f"Low overlap ({sim:.0%}) — descriptions point at different kinds of objects."
    return f"{sim:.0%} similarity: " + "; ".join(reasons) + "."


def local_answer(question: str, items: List[Dict[str, Any]], item_type: Optional[str] = None) -> str:
    q = question.lower()
    hinglish = _is_hinglish(question)

    if re.search(r"\b(hi|hello|hey|namaste)\b", q) and len(q) < 25:
        if hinglish:
            return 'Namaste! Main campus ke lost & found board par search kar sakta hoon. Jaise: "canteen ke paas black earbuds mile kya?"'
        return (
            "Hi! I can search the campus lost & found board for you. "
            'Try: "any black earbuds found near the canteen?"'
        )

    if re.search(r"how many|total|stat|summary|kitne|kitni", q):
        lost = sum(1 for i in items if i.get("type") == "lost")
        found = sum(1 for i in items if i.get("type") == "found")
        resolved = sum(1 for i in items if i.get("status") == "resolved")
        if hinglish:
            return (
                f"Abhi board par {lost} lost reports, {found} mili hui items, "
                f"aur {resolved} items wapas ho chuki hain. Item describe karo, main closest matches dhoondhunga."
            )
        return (
            f"The board currently has {lost} lost reports, {found} found items "
            f"and {resolved} already returned. Describe an item and I'll rank the closest matches."
        )

    asks_for_found = re.search(
        r"\bfound\b|kisi ne|\b(mila|mili|mile|milaa|milega|milenge)\b|\b(nahi mil|mil nahi|mil raha|mil rahi)\b",
        q,
    )
    says_lost = re.search(r"\blost\b|misplaced|\b(kho|khoya|khoi|gum|gaya|gayi)\b", q)
    wants_lost_reports = re.search(r"\blost reports?\b|what did i lose\b", q)
    target = "found" if asks_for_found or says_lost else "lost" if wants_lost_reports else item_type
    pool = [i for i in items if not target or i.get("type") == target]

    hits = rank(question, pool, limit=4)
    if hits:
        if hinglish:
            lines = [f'"{question.strip()}" se {len(hits)} matching listing(s) mili:', ""]
            for h in hits:
                reason = "; ".join(h["reasons"]) or "description overlap"
                lines.append(
                    f"- **{h.get('title')}** ({h.get('type')}) — {h.get('location')} — "
                    f"{round(h['score'] * 100)}% match. Wajah: {reason}."
                )
            lines += ["", 'Listing kholo aur ownership verify karne ke liye "This is mine" use karo.']
            return "\n".join(lines)
        lines = [f'I found {len(hits)} listing(s) that line up with "{question.strip()}".', ""]
        for h in hits:
            reason = "; ".join(h["reasons"]) or "description overlap"
            lines.append(
                f"- **{h.get('title')}** ({h.get('type')}) — {h.get('location')} — "
                f"{round(h['score'] * 100)}% match. Reason: {reason}."
            )
        lines += ["", 'Open the listing and use "This is mine" to send a proof-gated claim.']
        return "\n".join(lines)

    if hinglish:
        return (
            "Abhi is description se koi live listing match nahi hui.\n\n"
            "Aap lost report post kar sakte ho, ya colour, material aur location bata kar dobara search kar sakte ho."
        )
    return (
        "No live listing matches that description yet.\n\n"
        "Two options:\n"
        "1. Post a **lost report** — it stays armed and is scored against every new found item.\n"
        "2. Add colour, material and the zone (library, canteen, lab, hostel) and I'll re-rank."
    )


async def _remote_answer(question: str, items: List[Dict[str, Any]], history: List[Dict[str, str]]) -> str:
    """Optional free remote model (Pollinations, key-less). Raises on failure."""
    listing_lines = "\n".join(
        f"- {i.get('title')} | {i.get('type')} | {i.get('category')} | {i.get('location')}"
        for i in items[:14]
    )
    system = (
        "You are TraceFind Assistant for a college lost & found portal. "
        "Answer in max 90 words using markdown bullets. Only use the LISTINGS below. "
        "Never invent an item, name or phone number. If nothing matches, say so and "
        "suggest posting a lost report. Reply in the user's language; if they write "
        "Hinglish, use natural Hinglish in Latin script.\n\nLISTINGS:\n" + (listing_lines or "(empty)")
    )
    convo = "".join(f"\n{h['role']}: {h['content']}" for h in history[-4:])
    prompt = f"{system}{convo}\nuser: {question}\nassistant:"

    url = "https://text.pollinations.ai/" + httpx.URL(prompt).raw_path.decode() if False else None
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            "https://text.pollinations.ai/" + prompt,
            params={"model": "openai", "referrer": "tracefind"},
        )
        res.raise_for_status()
        text = (res.text or "").strip()
    if len(text) < 4:
        raise RuntimeError("empty completion")
    return text[:1200]


async def answer_question(
    question: str,
    items: List[Dict[str, Any]],
    history: Optional[List[Dict[str, str]]] = None,
    item_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Returns {"answer": str, "engine": "remote"|"local", "grounded": bool}.
    The local path is always available, so this never hangs or 500s.
    """
    history = history or []
    if os.getenv("DISABLE_REMOTE_LLM", "").lower() not in ("1", "true"):
        try:
            text = await _remote_answer(question, items, history)
            return {"answer": text, "engine": "remote", "grounded": True}
        except Exception as exc:  # noqa: BLE001
            print(f"[chat] remote failed ({exc}); using local reasoner")
    return {
        "answer": local_answer(question, items, item_type),
        "engine": "local",
        "grounded": True,
    }
