"""
Pydantic schemas for the problem bank.

Place this at: backend/app/schemas/problem.py

The bank JSON (bank_clean.json) was produced by verifying 410 test cases
against reference solutions. Every remaining test case is known-good.
"""

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Primitives
# -----------------------------------------------------------------------------

Difficulty = Literal["easy", "medium", "hard"]

# Categories present in the cleaned bank. Keep this a closed set so the loader
# can fail loudly if a new category sneaks in.
ProblemCategory = Literal[
    "Arrays & Hashing",
    "Two Pointers",
    "Sliding Window",
    "Stack",
    "Binary Search",
    "1D DP",
]

# Comparison modes actually used by the cleaned bank. If you add more problems
# later, extend this union AND add the corresponding comparator to the test
# runner.
ComparisonMode = Literal[
    "exact",                      # deep equality after JSON round-trip
    "unordered_pair",             # [a, b] == [b, a]
    "unordered_list",             # order-agnostic list equality
    "set_of_unordered_tuples",    # e.g. 3Sum triplets
    "anagram_groups",             # group-anagrams: partition-equivalence
]


# -----------------------------------------------------------------------------
# Function signature
# -----------------------------------------------------------------------------

class FunctionParam(BaseModel):
    name: str
    type: str  # free-form type hint, informational only


class FunctionSignature(BaseModel):
    name: str
    params: list[FunctionParam]
    returns: str


# -----------------------------------------------------------------------------
# Examples shown to the candidate
# -----------------------------------------------------------------------------

class Example(BaseModel):
    input: str
    output: str
    explanation: Optional[str] = None


# -----------------------------------------------------------------------------
# Test cases (used by the grader, NOT shown to the candidate)
# -----------------------------------------------------------------------------

class TestCase(BaseModel):
    # Positional arguments, in the order defined by `Problem.arg_names` /
    # `function_signature.params`.
    input: list[Any]
    expected: Any
    description: Optional[str] = None


# -----------------------------------------------------------------------------
# Problem
# -----------------------------------------------------------------------------

class Problem(BaseModel):
    id: str                          # slug, e.g. "two-sum"
    title: str                       # e.g. "Two Sum"
    category: ProblemCategory
    difficulty: Difficulty

    description: str                 # markdown-ish; safe to render as text
    examples: list[Example]
    constraints: list[str]

    function_signature: FunctionSignature
    starter_code: str                # what we drop into Monaco on load

    test_cases: list[TestCase]       # verified good — use all for grading
    comparison: ComparisonMode = "exact"

    # Redundant with function_signature.params but convenient for the runner.
    arg_names: list[str]


# -----------------------------------------------------------------------------
# Bank wrapper (matches bank_clean.json top-level)
# -----------------------------------------------------------------------------

class ProblemBank(BaseModel):
    name: str
    version: str
    source: Optional[str] = None
    problems: list[Problem]


# -----------------------------------------------------------------------------
# API response shapes
# -----------------------------------------------------------------------------

class ProblemSummary(BaseModel):
    """Lightweight summary for the picker UI — no test cases, no full desc."""
    id: str
    title: str
    category: ProblemCategory
    difficulty: Difficulty


class PublicProblem(BaseModel):
    """What the candidate actually sees — test cases stripped."""
    id: str
    title: str
    category: ProblemCategory
    difficulty: Difficulty
    description: str
    examples: list[Example]
    constraints: list[str]
    function_signature: FunctionSignature
    starter_code: str

    @classmethod
    def from_problem(cls, p: Problem) -> "PublicProblem":
        return cls(
            id=p.id,
            title=p.title,
            category=p.category,
            difficulty=p.difficulty,
            description=p.description,
            examples=p.examples,
            constraints=p.constraints,
            function_signature=p.function_signature,
            starter_code=p.starter_code,
        )
