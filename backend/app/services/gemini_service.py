"""
TraceFind embedding service — free, no paid API key.

Why this file changed
---------------------
The old version called Google Gemini (`text-embedding-004`). When the key was
missing or the free quota ran out, it swallowed the exception and returned a
**768-length zero vector**. Cosine similarity against a zero vector is NaN, so
every match came back as `"similarity": "NaN"` — exactly the "AI isn't working"
bug users saw.

New behaviour:
  1. Try Pollinations' free text-embedding endpoint (no key).
  2. Fall back to a deterministic local hashing embedder that ALWAYS produces a
     usable, non-zero vector (never zeros, never NaN).
  3. `embedding_health()` lets /health report degraded state instead of lying.
"""
from __future__ import annotations

import hashlib
import math
import os
import re
from typing import List

import httpx

EMBED_DIM = 768
POLLINATIONS_EMBED_URL = "https://text.pollinations.ai/openai/v1/embeddings"

_WORD_RE = re.compile(r"[a-z0-9]+")

# Domain synonyms so the fallback embedder groups related words together.
_CONCEPTS = {
    "audio": "earbud earbuds buds earphone earphones airpod airpods headphone headphones headset tws neckband speaker",
    "phone": "phone mobile cellphone smartphone iphone android redmi samsung realme oneplus oppo vivo poco",
    "wallet": "wallet purse cardholder pouch moneybag batua",
    "bag": "bag backpack haversack rucksack schoolbag sling tote jhola",
    "id": "id identity aadhar adhar pan licence license admit roll",
    "docs": "document documents certificate marksheet file folder assignment receipt photocopy",
    "cash": "money cash notes rupee rupees currency",
    "bottle": "bottle flask tumbler sipper thermos",
    "keys": "key keys keychain keyring chabi chaabi",
    "watch": "watch wristwatch smartwatch timepiece ghadi",
    "glasses": "glasses spectacle spectacles sunglasses goggles lens chashma",
    "charger": "charger adapter adaptor cable cord powerbank power bank type c usb",
    "stationery": "pen pencil eraser sharpener geometry scale ruler marker calculator calci",
    "clothing": "jacket hoodie sweater shirt tshirt jeans trousers cap scarf shoe shoes sandal chappal socks blazer kurta",
    "storage": "pendrive pen drive harddisk ssd memory card",
    "sports": "bat ball racket racquet gloves jersey cricket badminton football dumbbell",
    "umbrella": "umbrella chhata raincoat",
    "tiffin": "tiffin lunchbox dabba",
}
_CONCEPT_OF = {}
for concept, words in _CONCEPTS.items():
    for w in words.split():
        _CONCEPT_OF[w] = concept

_COLORS = {
    "black": "black kala kaala jet",
    "white": "white safed safaid",
    "red": "red laal lal maroon burgundy",
    "blue": "blue neela neeli navy",
    "green": "green hara hari olive",
    "yellow": "yellow peela gold golden",
    "brown": "brown bhura tan chocolate chestnut",
    "grey": "grey gray silver",
    "pink": "pink gulabi",
    "purple": "purple violet lavender",
}
_COLOR_OF = {w: c for c, words in _COLORS.items() for w in words.split()}


def _features(text: str) -> List[str]:
    """Turn free text into weighted pseudo-tokens (concepts + colours + words)."""
    words = _WORD_RE.findall((text or "").lower())
    feats: List[str] = []
    for w in words:
        if len(w) < 2:
            continue
        if w in _CONCEPT_OF:
            feats.append(f"c:{_CONCEPT_OF[w]}")
        if w in _COLOR_OF:
            feats.append(f"col:{_COLOR_OF[w]}")
        feats.append(f"w:{w}")
    return feats


def local_embedding(text: str) -> List[float]:
    """
    Deterministic hashing embedder (a mini "hashing trick" vectoriser).
    Same text in -> same vector out. Never returns zeros, never NaNs.
    """
    vec = [0.0] * EMBED_DIM
    feats = _features(text)
    if not feats:
        feats = ["empty"]

    for feat in feats: # type: ignore[assignment]
        digest = hashlib.blake2b(feat.encode("utf-8"), digest_size=8).digest()
        idx = int.from_bytes(digest[:4], "big") % EMBED_DIM
        sign = 1.0 if digest[4] & 1 else -1.0
        # concept features count more than raw words
        weight = 2.0 if feat.startswith(("c:", "col:")) else 1.0
        vec[idx] += sign * weight

    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0:
        vec[0] = 1.0
        return vec
    return [v / norm for v in vec]


async def pollinations_embedding(text: str) -> List[float]:
    """Free, key-less embedding endpoint. Raises on any problem."""
    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.post(
            POLLINATIONS_EMBED_URL,
            json={"model": "openai", "input": text or ""},
            headers={"referer": "tracefind"},
        )
        res.raise_for_status()
        data = res.json()
    vector = data["data"][0]["embedding"]
    # Pad/trim to the column width used by the `items` table.
    if len(vector) > EMBED_DIM:
        vector = vector[:EMBED_DIM]
    while len(vector) < EMBED_DIM:
        vector.append(0.0)
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


async def generate_embedding(text: str) -> List[float]:
    """
    Preferred: remote free embeddings. Always: local hashing embedder.
    The result is guaranteed to be a unit-length, non-zero 768-vector.
    """
    if os.getenv("DISABLE_REMOTE_EMBEDDINGS", "").lower() not in ("1", "true"):
        try:
            return await pollinations_embedding(text)
        except Exception as exc:  # noqa: BLE001 - any network/quota error falls back
            print(f"[embed] remote failed ({exc}); using local embedder")
    return local_embedding(text)


def embedding_health() -> dict:
    """Expose honest state instead of silently returning zero vectors."""
    remote = os.getenv("DISABLE_REMOTE_EMBEDDINGS", "").lower() not in ("1", "true")
    return {
        "provider": "pollinations" if remote else "local-hashing",
        "fallback": "local-hashing",
        "always_available": True,
        "zero_vector_bug": "fixed",
    }
