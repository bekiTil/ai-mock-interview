"""Code execution endpoints."""

from fastapi import APIRouter

from app.schemas.execution import RunRequest, RunResponse
from app.services.code_executor import code_executor

router = APIRouter(tags=["execution"])


@router.post("/run", response_model=RunResponse)
async def run_code(request: RunRequest) -> RunResponse:
    """Execute user-submitted Python code and return stdout/stderr."""
    return await code_executor.run(request)