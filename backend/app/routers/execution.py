"""Code execution endpoints."""

from fastapi import APIRouter
from fastapi import HTTPException

from app.schemas.execution import RunRequest, RunResponse
from app.services.code_executor import code_executor
from app.schemas.tests import RunTestsRequest, RunTestsResponse
from app.services import test_runner
from app.services.problem_bank import ProblemBankError

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