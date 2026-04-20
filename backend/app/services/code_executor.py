"""Service for executing user-submitted Python code via Judge0."""

import httpx

from app.config import settings
from app.schemas.execution import RunRequest, RunResponse

# Judge0 language ID for Python 3.
# See: https://ce.judge0.com/languages/
PYTHON_LANGUAGE_ID = 71

# Time each submission may take (in seconds) before we give up.
REQUEST_TIMEOUT = 30.0


class CodeExecutor:
    """Executes Python source code via the Judge0 hosted API."""

    async def run(self, request: RunRequest) -> RunResponse:
        if not settings.JUDGE0_API_KEY:
            return RunResponse(
                stdout="",
                stderr="JUDGE0_API_KEY is not set in backend/.env",
                runtime_ms=0,
            )

        url = f"https://{settings.JUDGE0_API_HOST}/submissions"
        headers = {
            "x-rapidapi-key": settings.JUDGE0_API_KEY,
            "x-rapidapi-host": settings.JUDGE0_API_HOST,
            "Content-Type": "application/json",
        }
        params = {"base64_encoded": "false", "wait": "true"}
        payload = {
            "source_code": request.code,
            "language_id": PYTHON_LANGUAGE_ID,
            "stdin": request.stdin or "",
        }

        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                response = await client.post(
                    url, headers=headers, params=params, json=payload
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as e:
            return RunResponse(
                stdout="",
                stderr=f"Judge0 HTTP error: {e.response.status_code} {e.response.text}",
                runtime_ms=0,
            )
        except httpx.RequestError as e:
            return RunResponse(
                stdout="",
                stderr=f"Judge0 request failed: {e}",
                runtime_ms=0,
            )

        # Judge0 returns a mix of fields. Combine them into our shape.
        stdout = data.get("stdout") or ""
        stderr = data.get("stderr") or ""
        compile_output = data.get("compile_output") or ""
        message = data.get("message") or ""

        # If compilation failed or there's a runtime message, surface it.
        combined_stderr_parts = [p for p in (stderr, compile_output, message) if p]
        combined_stderr = "\n".join(combined_stderr_parts)

        # Judge0 returns time as a string like "0.012" (seconds). Convert to ms.
        time_str = data.get("time")
        try:
            runtime_ms = int(float(time_str) * 1000) if time_str else 0
        except (ValueError, TypeError):
            runtime_ms = 0

        return RunResponse(
            stdout=stdout,
            stderr=combined_stderr,
            runtime_ms=runtime_ms,
        )


code_executor = CodeExecutor()