"""Pydantic models for the interview endpoint."""

from typing import Literal, Optional

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["interviewer", "candidate", "system"]
    content: str


class InterviewTurnRequest(BaseModel):
    history: list[ChatMessage]
    code: Optional[str] = None
    problem_title: Optional[str] = None
    problem_description: Optional[str] = None


class InterviewTurnResponse(BaseModel):
    message: str