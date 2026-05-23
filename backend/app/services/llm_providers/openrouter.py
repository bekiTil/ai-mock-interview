"""OpenRouter provider — aggregator with free :free model tier."""

from __future__ import annotations

from typing import Any, Optional

from ._openai_compat import openai_compat_complete
from .base import ChatMessage, Provider


class OpenRouterProvider(Provider):
    name = "openrouter"

    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(self, api_key: str, model: str, app_name: str = "mock-with-ai"):
        super().__init__(model=model)
        self.api_key = api_key
        self.app_name = app_name

    def _complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float,
        max_tokens: Optional[int],
        response_format: Optional[dict[str, Any]],
    ) -> str:
        # OpenRouter optionally tracks app names for analytics/leaderboards.
        headers = {
            "HTTP-Referer": "https://mock-tech-with-ai.vercel.app",
            "X-Title": self.app_name,
        }
        return openai_compat_complete(
            base_url=self.BASE_URL,
            api_key=self.api_key,
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
            default_headers=headers,
        )
