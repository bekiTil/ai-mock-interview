from typing import Literal
from pydantic import BaseModel, Field

from app.schemas.interview import ChatMessage  # ← adjust path if yours differs
from app.schemas.tests import RunTestsResponse


class SubmitRequest(BaseModel):
    problem_id: str
    code: str
    history: list[ChatMessage] = Field(default_factory=list)


# 4-point verdict — mirrors real hiring signal language.
#   strong       → would advance to next round
#   solid        → meets bar for junior
#   needs_work   → below bar but showed promise
#   not_ready    → significant gaps
Verdict = Literal["strong", "solid", "needs_work", "not_ready"]


class Evaluation(BaseModel):
    """Structured interview evaluation. Mirrors a real hiring packet."""

    verdict: Verdict

    correctness: int = Field(
        ge=1, le=5,
        description="Does the code work? 1=broken, 3=works with bugs, 5=optimal and correct.",
    )
    code_quality: int = Field(
        ge=1, le=5,
        description="Readability, naming, idiomaticness. 1=incoherent, 3=smells, 5=idiomatic.",
    )
    communication: int = Field(
        ge=1, le=5,
        description="Did they explain thinking, ask clarifying questions, walk edge cases? 1=silent, 5=proactive.",
    )
    problem_solving: int = Field(
        ge=1, le=5,
        description="Planning before coding, considering alternatives, handling edge cases. 1=floundered, 5=structured.",
    )

    strengths: list[str] = Field(
        description="2-4 specific things the candidate did well. Cite concrete moments.",
    )
    weaknesses: list[str] = Field(
        description="2-4 specific things to improve. Cite concrete moments.",
    )
    summary: str = Field(
        description="1-3 sentence overall verdict paragraph.",
    )


class SubmitResponse(BaseModel):
    problem_id: str
    test_results: RunTestsResponse
    evaluation: Evaluation | None = None
    evaluation_error: str | None = None