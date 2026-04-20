"""Pydantic models for the code execution endpoint."""

from pydantic import BaseModel, Field


class RunRequest(BaseModel):
    code: str = Field(..., description="Python source code to execute")
    stdin: str | None = Field(default=None, description="Optional stdin")


class RunResponse(BaseModel):
    stdout: str
    stderr: str
    runtime_ms: int