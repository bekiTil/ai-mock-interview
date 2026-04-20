"""Service for executing user-submitted code.

Today: a stub that echoes back the code length.
Day 2: real execution via Judge0.
"""

from app.schemas.execution import RunRequest, RunResponse


class CodeExecutor:
    """Executes Python source code in a sandboxed environment."""

    def run(self, request: RunRequest) -> RunResponse:
        # TODO(Day 2): swap this stub for a real Judge0 API call.
        return RunResponse(
            stdout=(
                f"[stub] Received {len(request.code)} characters of Python code.\n"
                "Real execution will be wired up on Day 2."
            ),
            stderr="",
            runtime_ms=0,
        )


# Module-level singleton — routers import this instance.
code_executor = CodeExecutor()