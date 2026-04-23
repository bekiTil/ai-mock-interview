"""Code execution endpoints."""

from fastapi import APIRouter
from fastapi import HTTPException

from app.schemas.execution import RunRequest, RunResponse
from app.services.code_executor import code_executor
from app.schemas.tests import RunTestsRequest, RunTestsResponse
from app.services import test_runner
from app.services.problem_bank import ProblemBankError
from app.services.evaluator import evaluator
from app.schemas.submission import SubmitRequest, SubmitResponse
from app.services import problem_bank

router = APIRouter(tags=["execution"])


@router.post("/run", response_model=RunResponse)
async def run_code(request: RunRequest) -> RunResponse:
    """Execute user-submitted Python code and return stdout/stderr."""
    return await code_executor.run(request)

@router.post("/run-tests", response_model=RunTestsResponse)
async def run_tests(request: RunTestsRequest) -> RunTestsResponse:
    """
    Execute the candidate's code against the problem's full test suite.
 
    Returns a per-case pass/fail breakdown plus aggregate counts. The
    candidate's own stdout (anything they printed for debugging) is
    preserved in `stdout_tail`; compile errors surface in `compile_error`.
    """
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="code is empty")
 
    try:
        return await test_runner.run_tests(
            problem_id=request.problem_id,
            candidate_code=request.code,
        )
    except ProblemBankError as e:
        # Unknown problem_id — surface as 404 so the frontend can message
        # the user instead of blowing up in a red-banner way.
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/submit", response_model=SubmitResponse)
async def submit(request: SubmitRequest) -> SubmitResponse:
    """
    Run the candidate's code against the test suite, then ask the LLM
    to produce a calibrated interview evaluation.
 
    Test results always come back. If the evaluation call fails, the
    test results are preserved and the error is reported in
    `evaluation_error` — the user shouldn't lose a test run because
    Gemini had a hiccup.
    """
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="code is empty")
 
    # 1. Run the test suite (same path as /run-tests).
    try:
        test_results = await test_runner.run_tests(
            problem_id=request.problem_id,
            candidate_code=request.code,
        )
    except ProblemBankError as e:
        raise HTTPException(status_code=404, detail=str(e))
 
    # 2. Fetch the problem for the evaluator's context.
    try:
        problem = problem_bank.get_problem(request.problem_id)
    except ProblemBankError as e:
        raise HTTPException(status_code=404, detail=str(e))
 
    # 3. Evaluate.
    evaluation = None
    evaluation_error = None
    try:
        evaluation = await evaluator.evaluate(
            problem=problem,
            code=request.code,
            history=request.history,
            test_results=test_results,
        )
    except Exception as e:
        evaluation_error = f"{type(e).__name__}: {e}"
 
    return SubmitResponse(
        problem_id=request.problem_id,
        test_results=test_results,
        evaluation=evaluation,
        evaluation_error=evaluation_error,
    )
 