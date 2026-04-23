"""
Problems API.

Place this at: backend/app/routers/problems.py

Endpoints:
  GET  /problems                -> list of ProblemSummary (for picker UI)
  GET  /problems/stats          -> bank counts (category, difficulty, version)
  GET  /problems/random         -> one random PublicProblem
  GET  /problems/{problem_id}   -> one specific PublicProblem

Note on route order: FastAPI matches routes top-to-bottom. The literal routes
(/stats, /random) are declared BEFORE /{problem_id} so they aren't swallowed by
the path parameter.

All responses strip test cases — the candidate must never see them.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.problem import ProblemSummary, PublicProblem
from app.services.problem_bank import (
    ProblemBankError,
    bank_stats,
    get_problem,
    list_problems,
    random_problem,
)


router = APIRouter(prefix="/problems", tags=["problems"])


# -----------------------------------------------------------------------------
# List (picker UI)
# -----------------------------------------------------------------------------

@router.get("", response_model=list[ProblemSummary])
def get_all_problems(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    difficulty: Optional[str] = Query(default=None, description="easy | medium | hard"),
) -> list[ProblemSummary]:
    """Lightweight list for the picker. Never includes test cases."""
    problems = list_problems()
    if category is not None:
        problems = [p for p in problems if p.category == category]
    if difficulty is not None:
        problems = [p for p in problems if p.difficulty == difficulty]

    return [
        ProblemSummary(
            id=p.id,
            title=p.title,
            category=p.category,
            difficulty=p.difficulty,
        )
        for p in problems
    ]


# -----------------------------------------------------------------------------
# Stats (debug / startup sanity)
# -----------------------------------------------------------------------------

@router.get("/stats")
def get_stats() -> dict:
    try:
        return bank_stats()
    except ProblemBankError as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------------------------------------------------------
# Random (default problem on page load, "New Problem" button)
# -----------------------------------------------------------------------------

@router.get("/random", response_model=PublicProblem)
def get_random_problem(
    category: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    exclude: Optional[str] = Query(
        default=None,
        description="Comma-separated ids to avoid (e.g. the current problem).",
    ),
) -> PublicProblem:
    exclude_ids = [x.strip() for x in exclude.split(",")] if exclude else None
    try:
        problem = random_problem(
            category=category,
            difficulty=difficulty,
            exclude_ids=exclude_ids,
        )
    except ProblemBankError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return PublicProblem.from_problem(problem)


# -----------------------------------------------------------------------------
# By id (loading a specific problem)
# -----------------------------------------------------------------------------

@router.get("/{problem_id}", response_model=PublicProblem)
def get_problem_by_id(problem_id: str) -> PublicProblem:
    try:
        problem = get_problem(problem_id)
    except ProblemBankError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return PublicProblem.from_problem(problem)