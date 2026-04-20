"""Service for the AI interviewer powered by Gemini."""

from google import genai
from google.genai import types

from app.config import settings
from app.schemas.interview import ChatMessage
from app.services.prompts import INTERVIEWER_SYSTEM_PROMPT

MODEL_NAME = "gemini-2.5-flash"


class Interviewer:
    """Generates the next interviewer turn given a chat history."""

    def __init__(self) -> None:
        self._client: genai.Client | None = None

    def _client_or_error(self) -> genai.Client:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def next_turn(self, history: list[ChatMessage]) -> str:
        client = self._client_or_error()

        # Convert our ChatMessage list into Gemini's content format.
        # Gemini uses "user" and "model" roles; we map them from our own.
        contents = []
        for msg in history:
            if msg.role == "candidate":
                gemini_role = "user"
            elif msg.role == "interviewer":
                gemini_role = "model"
            else:
                # Skip system messages — we pass the system prompt separately.
                continue
            contents.append(
                types.Content(
                    role=gemini_role,
                    parts=[types.Part(text=msg.content)],
                )
            )

        response = await client.aio.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=INTERVIEWER_SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=300,
            ),
        )
        return response.text or ""


interviewer = Interviewer()