"""Groq provider — Llama 3.3 70B Versatile, ~720x Gemini's free tier."""

from __future__ import annotations

from typing import Any, Optional

from ._openai_compat import openai_compat_complete
from .base import ChatMessage, Provider


class GroqProvider(Provider):
    name = "groq"

    BASE_URL = "https://api.groq.com/openai/v1"

    def __init__(self, api_key: str, model: str):
        super().__init__(model=model)
        self.api_key = api_key

    def _complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float,
        max_tokens: Optional[int],
        response_format: Optional[dict[str, Any]],
    ) -> str:
        return openai_compat_complete(
            base_url=self.BASE_URL,
            api_key=self.api_key,
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
        )
