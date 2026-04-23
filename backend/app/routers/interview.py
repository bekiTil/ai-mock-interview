"""Interview conversation endpoints."""

from fastapi import APIRouter, HTTPException

from app.schemas.interview import InterviewTurnRequest, InterviewTurnResponse
from app.services.interviewer import interviewer

router = APIRouter(prefix="/interview", tags=["interview"])


@router.post("/turn", response_model=InterviewTurnResponse)
async def take_turn(request: InterviewTurnRequest) -> InterviewTurnResponse:
    if not request.history or request.history[-1].role != "candidate":
        raise HTTPException(
            status_code=400,
            detail="history must end with a candidate message",
        )
    try:
        message = await interviewer.next_turn(
            history=request.history,
            code=request.code,
            problem_title=request.problem_title,
            problem_description=request.problem_description,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return InterviewTurnResponse(message=message)