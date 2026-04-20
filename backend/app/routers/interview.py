"""Interview conversation endpoints."""

from fastapi import APIRouter, HTTPException

from app.schemas.interview import InterviewTurnRequest, InterviewTurnResponse
from app.services.interviewer import interviewer

router = APIRouter(prefix="/interview", tags=["interview"])


@router.post("/turn", response_model=InterviewTurnResponse)
async def take_turn(request: InterviewTurnRequest) -> InterviewTurnResponse:
    """Given the full chat history, return the interviewer's next message."""
    try:
        message = await interviewer.next_turn(request.history)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return InterviewTurnResponse(message=message)