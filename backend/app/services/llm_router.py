"""LLM router with multi-provider fallback.

Walks the configured provider list in order, returning the first successful
response. Tracks per-provider cool-down so a flaky provider stops being tried
for a minute, but isn't permanently dead.

The order is: Groq → Cerebras → OpenRouter → Gemini.
Each provider is only added to the chain if its API key is configured.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Optional

from app.config import settings

from .llm_providers import (
    CerebrasProvider,
    ChatMessage,
    GeminiProvider,
    GroqProvider,
    OpenRouterProvider,
    Provider,
    ProviderError,
    RateLimitError,
)

log = logging.getLogger(__name__)


@dataclass
class RouterResult:
    text: str
    provider: str
    model: str


class LLMRouter:
    """Tries each provider in order. Raises if all fail."""

    def __init__(self, providers: list[Provider]):
        if not providers:
            raise ValueError(
                "LLMRouter needs at least one provider — set at least one of "
                "GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY."
            )
        self.providers = providers

    def complete(
        self,
        messages: list[ChatMessage],
        *,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        response_format: Optional[dict[str, Any]] = None,
    ) -> RouterResult:
        last_error: Optional[Exception] = None

        for provider in self.providers:
            if not provider.is_available():
                continue
            try:
                text = provider.complete(
                    messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format=response_format,
                )
                log.info(
                    "llm_router: %s (%s) served the request",
                    provider.name,
                    provider.model,
                )
                return RouterResult(text=text, provider=provider.name, model=provider.model)
            except RateLimitError as e:
                log.warning("llm_router: %s rate-limited — %s", provider.name, e)
                last_error = e
                continue
            except ProviderError as e:
                log.warning("llm_router: %s failed — %s", provider.name, e)
                last_error = e
                continue
            except Exception as e:  # noqa: BLE001
                log.exception("llm_router: %s raised unexpected error", provider.name)
                last_error = e
                continue

        raise RuntimeError(
            f"all LLM providers exhausted; last error: {last_error!r}"
        )

    def status(self) -> list[dict[str, Any]]:
        return [p.status() for p in self.providers]


# ---------------------------------------------------------------------------
# Module-level singleton (lazy)
# ---------------------------------------------------------------------------

_router: Optional[LLMRouter] = None


def _build_router() -> LLMRouter:
    providers: list[Provider] = []

    if settings.GROQ_API_KEY:
        providers.append(GroqProvider(api_key=settings.GROQ_API_KEY, model=settings.GROQ_MODEL))
    if settings.CEREBRAS_API_KEY:
        providers.append(
            CerebrasProvider(api_key=settings.CEREBRAS_API_KEY, model=settings.CEREBRAS_MODEL)
        )
    if settings.OPENROUTER_API_KEY:
        providers.append(
            OpenRouterProvider(api_key=settings.OPENROUTER_API_KEY, model=settings.OPENROUTER_MODEL)
        )
    if settings.GEMINI_API_KEY:
        providers.append(
            GeminiProvider(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)
        )

    return LLMRouter(providers)


def get_router() -> LLMRouter:
    global _router
    if _router is None:
        _router = _build_router()
    return _router
