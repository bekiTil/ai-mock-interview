"""
Problem bank loader service.

Place this at: backend/app/services/problem_bank.py

Responsibilities:
  - Load bank_clean.json from disk once at startup
  - Expose lookup / list / random-pick helpers
  - Keep the rest of the backend ignorant of where problems come from
"""

from __future__ import annotations

import json
import random
from functools import lru_cache
from pathlib import Path
from typing import Optional

from app.schemas.problem import Problem, ProblemBank


# Default location: backend/problems/bank_clean.json
# Override with env var PROBLEM_BANK_PATH if you want.
_DEFAULT_BANK_PATH = Path(__file__).resolve().parents[2] / "problems" / "bank_clean.json"


class ProblemBankError(RuntimeError):
    """Raised when the bank is missing, malformed, or a lookup fails."""


@lru_cache(maxsize=1)
def _load_bank() -> ProblemBank:
    """Parse and validate the bank JSON exactly once per process."""
    import os

    path = Path(os.getenv("PROBLEM_BANK_PATH", str(_DEFAULT_BANK_PATH)))
    if not path.exists():
        raise ProblemBankError(
            f"Problem bank not found at {path}. "
            "Did you drop bank_clean.json into backend/problems/?"
        )

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise ProblemBankError(f"Problem bank at {path} is not valid JSON: {e}") from e

    try:
        bank = ProblemBank.model_validate(data)
    except Exception as e:
        raise ProblemBankError(f"Problem bank failed validation: {e}") from e

    if not bank.problems:
        raise ProblemBankError("Problem bank is empty.")

    # Enforce unique IDs — the picker uses id as a key.
    seen: set[str] = set()
    for p in bank.problems:
        if p.id in seen:
            raise ProblemBankError(f"Duplicate problem id in bank: {p.id}")
        seen.add(p.id)

    return bank


# -----------------------------------------------------------------------------
# Public API
# -----------------------------------------------------------------------------

def list_problems() -> list[Problem]:
    """Return all problems. Caller decides what to project (summary/public/full)."""
    return list(_load_bank().problems)


def get_problem(problem_id: str) -> Problem:
    """Return a single problem by slug id, or raise ProblemBankError."""
    for p in _load_bank().problems:
        if p.id == problem_id:
            return p
    raise ProblemBankError(f"Problem not found: {problem_id}")


def random_problem(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    exclude_ids: Optional[list[str]] = None,
    seed: Optional[int] = None,
) -> Problem:
    """
    Return a uniformly random problem, optionally filtered.

    `exclude_ids` is handy for "give me a different problem" — just pass the
    current problem's id so the picker never returns the same one twice in a row.
    """
    pool = _load_bank().problems
    if category is not None:
        pool = [p for p in pool if p.category == category]
    if difficulty is not None:
        pool = [p for p in pool if p.difficulty == difficulty]
    if exclude_ids:
        blocked = set(exclude_ids)
        remaining = [p for p in pool if p.id not in blocked]
        # Only apply the exclusion if it leaves at least one problem; otherwise
        # fall back to the unfiltered pool so we never 404 on a refresh.
        if remaining:
            pool = remaining

    if not pool:
        raise ProblemBankError("No problems match the requested filters.")

    rng = random.Random(seed) if seed is not None else random
    return rng.choice(pool)


def bank_stats() -> dict:
    """For /problems/stats or startup logging."""
    bank = _load_bank()
    cats: dict[str, int] = {}
    diffs: dict[str, int] = {}
    for p in bank.problems:
        cats[p.category] = cats.get(p.category, 0) + 1
        diffs[p.difficulty] = diffs.get(p.difficulty, 0) + 1
    return {
        "total": len(bank.problems),
        "by_category": cats,
        "by_difficulty": diffs,
        "version": bank.version,
    }
