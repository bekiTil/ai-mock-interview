"""Pydantic models for the interview endpoint."""

from typing import Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["interviewer", "candidate", "system"]
    content: str


class InterviewTurnRequest(BaseModel):
    history: list[ChatMessage]


class InterviewTurnResponse(BaseModel):
    message: str