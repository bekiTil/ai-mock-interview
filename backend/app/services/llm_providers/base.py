"""Provider interface — every backend (Groq, Cerebras, OpenRouter, Gemini)
implements this. Each one wraps an OpenAI-compatible HTTP client.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class ChatMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


class ProviderError(Exception):
    """Generic provider failure — connection drop, 5xx, parse error, etc."""


class RateLimitError(ProviderError):
    """The provider returned 429 or equivalent — back off and try the next one."""


class Provider(ABC):
    """A single LLM provider backend.

    Subclasses just need to set `name`, `model`, and implement `_complete`.
    Cool-down state and the public `complete()` wrapper live here.
    """

    name: str = "abstract"

    def __init__(self, model: str):
        self.model = model
        self._cooldown_until: float = 0.0
        self._last_error: Optional[str] = None

    # ----- public API -----

    def is_available(self) -> bool:
        return time.monotonic() >= self._cooldown_until

    def cooldown_remaining(self) -> float:
        return max(0.0, self._cooldown_until - time.monotonic())

    def complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        response_format: Optional[dict[str, Any]] = None,
    ) -> str:
        """Returns assistant text. Raises RateLimitError or ProviderError."""
        try:
            text = self._complete(
                messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format=response_format,
            )
        except RateLimitError as e:
            self._cooldown_until = time.monotonic() + 60.0
            self._last_error = str(e)
            raise
        except ProviderError as e:
            # Shorter cool-down for transient errors.
            self._cooldown_until = time.monotonic() + 20.0
            self._last_error = str(e)
            raise
        text = (text or "").strip()
        if not text:
            self._cooldown_until = time.monotonic() + 10.0
            raise ProviderError(f"{self.name} returned empty content")
        self._last_error = None
        return text

    def status(self) -> dict[str, Any]:
        """For the /health/providers endpoint."""
        return {
            "name": self.name,
            "model": self.model,
            "available": self.is_available(),
            "cooldown_remaining_s": round(self.cooldown_remaining(), 1),
            "last_error": self._last_error,
        }

    # ----- subclass hook -----

    @abstractmethod
    def _complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float,
        max_tokens: Optional[int],
        response_format: Optional[dict[str, Any]],
    ) -> str:
        ...
