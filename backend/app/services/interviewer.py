from google import genai
from google.genai import types
from google.genai.errors import ClientError
from app.config import settings
from app.schemas.interview import ChatMessage
from app.services.prompts import INTERVIEWER_SYSTEM_PROMPT


class Interviewer:
    def __init__(self) -> None:
        self._client: genai.Client | None = None

    def _client_or_error(self) -> genai.Client:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def next_turn(
        self,
        history: list[ChatMessage],
        code: str | None = None,
        problem_title: str | None = None,
        problem_description: str | None = None,
    ) -> str:
        client = self._client_or_error()
        contents: list[types.Content] = []

        if problem_title and problem_description:
            problem_block = (
                "[PROBLEM — this is the problem the candidate is currently "
                "solving. Use it to stay on topic. Do not recite it back.]\n\n"
                f"Title: {problem_title}\n\n"
                f"Description:\n{problem_description}"
            )
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part(text=problem_block)],
                )
            )
            contents.append(
                types.Content(
                    role="model",
                    parts=[types.Part(text="Understood. I have the problem in mind.")],
                )
            )

        if code and code.strip():
            context_block = (
                "[EDITOR STATE — this is what the candidate currently has "
                "in their editor. Do not quote it back to them; just use "
                "it to inform your next response.]\n\n"
                f"```python\n{code}\n```"
            )
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part(text=context_block)],
                )
            )
            contents.append(
                types.Content(
                    role="model",
                    parts=[types.Part(text="Understood, I can see the editor.")],
                )
            )

        for msg in history:
            if msg.role == "candidate":
                gemini_role = "user"
            elif msg.role == "interviewer":
                gemini_role = "model"
            else:
                continue
            contents.append(
                types.Content(
                    role=gemini_role,
                    parts=[types.Part(text=msg.content)],
                )
            )

        try:
            response = await client.aio.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=INTERVIEWER_SYSTEM_PROMPT,
                    temperature=0.7,
                    max_output_tokens=300,
                ),
            )
        except ClientError as e:
            # 429 = rate limited (per-minute or per-day cap hit).
            # Surface a human message instead of a stack trace.
            if e.code == 429:
                raise RuntimeError(
                    "The interviewer is rate-limited right now "
                    "(Gemini free tier cap). Wait a moment and try again, "
                    "or switch GEMINI_MODEL in backend/.env to a different "
                    "model with more headroom."
                ) from e
            raise RuntimeError(f"Gemini API error: {e}") from e

        return response.text or ""


interviewer = Interviewer()