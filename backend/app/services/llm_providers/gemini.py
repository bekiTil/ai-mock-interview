"""Gemini provider via Google's OpenAI-compatibility endpoint.

Last-resort fallback in the router chain. Same Provider interface so the
router doesn't care which backend is serving the request.
"""

from __future__ import annotations

from typing import Any, Optional

from ._openai_compat import openai_compat_complete
from .base import ChatMessage, Provider


class GeminiProvider(Provider):
    name = "gemini"

    # Google exposes an OpenAI-compatible chat endpoint at this base URL.
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

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
