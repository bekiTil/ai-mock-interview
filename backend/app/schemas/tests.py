
from typing import Any, Optional

from pydantic import BaseModel, Field


class RunTestsRequest(BaseModel):
    problem_id: str
    code: str


class TestCaseResult(BaseModel):
    case_index: int
    passed: bool
    input: list[Any]          # what was passed to the candidate's function
    expected: Any
    got: Any = None           # None if the candidate's fn raised, or didn't run
    error: Optional[str] = None  # short human-friendly diagnosis


class RunTestsResponse(BaseModel):
    problem_id: str
    total: int
    passed: int
    results: list[TestCaseResult]

    # The candidate's own prints (anything that wasn't a harness result line).
    # Truncated from the tail so the payload stays small.
    stdout_tail: Optional[str] = None

    # Stderr from Judge0 that wasn't classified as a compile error.
    stderr_tail: Optional[str] = None

    # Populated when no harness results came through AND stderr has content.
    # This is how we surface SyntaxError / NameError at import time.
    compile_error: Optional[str] = None

    runtime_ms: int = 0
    timed_out: bool = False