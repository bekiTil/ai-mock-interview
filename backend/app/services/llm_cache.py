"""Two-tier LLM response cache: exact + semantic.

  Tier 1 (exact): SHA-256 over (problem_id, normalized_query). O(1) SQLite hit.
  Tier 2 (semantic): cosine similarity over fastembed embeddings, scoped to
                     the same problem_id, threshold defaulting to 0.92.

The cache is intentionally scoped to (problem_id, last_user_message) — NOT
the full conversation history. That makes it suitable for FAQ-style queries
("Explain Two Sum", "Hint?", "Optimal approach?") that repeat across users,
and we explicitly bypass it for code-aware turns (see should_cache()).
"""

from __future__ import annotations

import hashlib
import logging
import re
import sqlite3
import threading
import time
from pathlib import Path
from typing import Optional

import numpy as np

from app.config import settings

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Query normalization & cache-bypass detection
# ---------------------------------------------------------------------------

_PUNCT_RE = re.compile(r"[^\w\s]+")
_WS_RE = re.compile(r"\s+")


def normalize(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    text = text.lower().strip()
    text = _PUNCT_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text)
    return text.strip()


# Heuristics for "this turn depends on the candidate's specific code, don't cache."
_CODE_AWARE_HINTS = (
    "my code",
    "my solution",
    "this code",
    "this loop",
    "my approach",
    "the code i wrote",
    "i wrote",
    "i tried",
    "i have",
    "look at my",
    "review my",
    "check my",
)


def should_cache(query: str, has_user_code: bool) -> bool:
    """Decide whether this candidate turn is cacheable.

    Skip caching when:
      - the candidate is referring to their own code (responses must be unique)
      - the editor has non-trivial code (signals we're past the planning phase)
      - the query is too short (one-word inputs are too generic)
    """
    q = normalize(query)
    if not q or len(q) < 3:
        return False
    if has_user_code:
        return False
    if any(hint in q for hint in _CODE_AWARE_HINTS):
        return False
    return True


# ---------------------------------------------------------------------------
# Embedder (lazy-loaded, single instance)
# ---------------------------------------------------------------------------


class Embedder:
    """Wraps fastembed's TextEmbedding. Lazy-loaded on first use so import
    of this module doesn't pay for model download."""

    def __init__(self, model_name: str):
        self.model_name = model_name
        self._model = None
        self._lock = threading.Lock()

    def _ensure_loaded(self):
        if self._model is not None:
            return
        with self._lock:
            if self._model is not None:
                return
            try:
                from fastembed import TextEmbedding  # type: ignore
            except ImportError as e:
                raise RuntimeError(
                    "fastembed not installed — `pip install fastembed`"
                ) from e
            log.info("loading embedder: %s", self.model_name)
            self._model = TextEmbedding(model_name=self.model_name)

    def embed(self, text: str) -> np.ndarray:
        self._ensure_loaded()
        # TextEmbedding.embed returns a generator yielding numpy arrays.
        vec = next(self._model.embed([text]))  # type: ignore[union-attr]
        return _normalize_vec(np.asarray(vec, dtype=np.float32))


def _normalize_vec(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    if n == 0:
        return v
    return v / n


# ---------------------------------------------------------------------------
# SQLite store
# ---------------------------------------------------------------------------


_SCHEMA = """
CREATE TABLE IF NOT EXISTS llm_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    query_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    embedding BLOB,
    hit_count INTEGER NOT NULL DEFAULT 0,
    created_at REAL NOT NULL,
    UNIQUE(problem_id, query_hash)
);
CREATE INDEX IF NOT EXISTS idx_cache_problem ON llm_cache(problem_id);
CREATE INDEX IF NOT EXISTS idx_cache_problem_hash ON llm_cache(problem_id, query_hash);
"""


class LLMCache:
    def __init__(
        self,
        db_path: str,
        embedder: Embedder,
        threshold: float = 0.92,
        min_query_len: int = 8,
    ):
        self.db_path = db_path
        self.embedder = embedder
        self.threshold = threshold
        self.min_query_len = min_query_len
        self._lock = threading.Lock()
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(_SCHEMA)
            conn.commit()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    # ----- core API -----

    def get(self, problem_id: str, query: str) -> Optional[str]:
        """Return cached response text if exact or semantic match found."""
        normalized = normalize(query)
        if not normalized:
            return None
        qhash = _hash(problem_id, normalized)

        # Tier 1: exact hit.
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id, response_text FROM llm_cache "
                "WHERE problem_id = ? AND query_hash = ?",
                (problem_id, qhash),
            ).fetchone()
        if row is not None:
            self._bump_hit(row["id"])
            log.info("llm_cache: exact hit for problem=%s", problem_id)
            return row["response_text"]

        # Tier 2: semantic. Skip very short queries.
        if len(normalized) < self.min_query_len:
            return None

        try:
            qvec = self.embedder.embed(normalized)
        except Exception as e:  # noqa: BLE001
            log.warning("llm_cache: embedder failed (%s), skipping semantic", e)
            return None

        best_id, best_text, best_sim = None, None, 0.0
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, query_text, response_text, embedding FROM llm_cache "
                "WHERE problem_id = ? AND embedding IS NOT NULL",
                (problem_id,),
            ).fetchall()

        for row in rows:
            cand = np.frombuffer(row["embedding"], dtype=np.float32)
            sim = float(np.dot(qvec, cand))
            if sim > best_sim:
                best_sim = sim
                best_id = row["id"]
                best_text = row["response_text"]

        if best_text is not None and best_sim >= self.threshold:
            self._bump_hit(best_id)
            log.info(
                "llm_cache: semantic hit for problem=%s sim=%.3f",
                problem_id,
                best_sim,
            )
            return best_text

        return None

    def put(self, problem_id: str, query: str, response: str) -> None:
        normalized = normalize(query)
        if not normalized:
            return
        qhash = _hash(problem_id, normalized)

        # Always store the embedding (even for short queries); cost is tiny
        # and it lets us upgrade the threshold without re-embedding later.
        try:
            vec = self.embedder.embed(normalized)
            blob: Optional[bytes] = vec.tobytes()
        except Exception as e:  # noqa: BLE001
            log.warning("llm_cache: embedder failed during put (%s)", e)
            blob = None

        with self._lock, self._connect() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO llm_cache "
                "(problem_id, query_hash, query_text, response_text, embedding, "
                " hit_count, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
                (problem_id, qhash, normalized, response, blob, time.time()),
            )
            conn.commit()

    # ----- internal -----

    def _bump_hit(self, row_id: int) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                "UPDATE llm_cache SET hit_count = hit_count + 1 WHERE id = ?",
                (row_id,),
            )
            conn.commit()

    # ----- ops/debug -----

    def stats(self) -> dict:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS rows, COALESCE(SUM(hit_count), 0) AS hits "
                "FROM llm_cache"
            ).fetchone()
        return {
            "entries": row["rows"] if row else 0,
            "total_hits": row["hits"] if row else 0,
            "db_path": self.db_path,
            "threshold": self.threshold,
        }


def _hash(problem_id: str, normalized_query: str) -> str:
    h = hashlib.sha256()
    h.update(problem_id.encode("utf-8"))
    h.update(b"\x00")
    h.update(normalized_query.encode("utf-8"))
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Module-level singleton (lazy)
# ---------------------------------------------------------------------------

_cache: Optional[LLMCache] = None


def get_cache() -> Optional[LLMCache]:
    """Returns the singleton cache, or None if caching is disabled."""
    global _cache
    if not settings.LLM_CACHE_ENABLED:
        return None
    if _cache is None:
        embedder = Embedder(model_name=settings.LLM_CACHE_EMBED_MODEL)
        _cache = LLMCache(
            db_path=settings.LLM_CACHE_DB_PATH,
            embedder=embedder,
            threshold=settings.LLM_CACHE_THRESHOLD,
            min_query_len=settings.LLM_CACHE_MIN_QUERY_LEN,
        )
    return _cache
