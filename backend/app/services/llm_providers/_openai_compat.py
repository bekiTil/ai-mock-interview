"""Shared OpenAI-compatible chat client used by Groq, Cerebras, OpenRouter,
and Gemini's OpenAI-compat endpoint.

Centralizes:
  - HTTP transport via the official `openai` SDK
  - Error mapping → RateLimitError / ProviderError
  - response_format passthrough for JSON mode
"""

from __future__ import annotations

from typing import Any, Optional

from openai import APIConnectionError, APIError, APIStatusError, OpenAI
from openai import RateLimitError as OpenAIRateLimitError

from .base import ChatMessage, ProviderError, RateLimitError


def openai_compat_complete(
    *,
    base_url: str,
    api_key: str,
    model: str,
    messages: list[ChatMessage],
    temperature: float,
    max_tokens: Optional[int],
    response_format: Optional[dict[str, Any]],
    default_headers: Optional[dict[str, str]] = None,
) -> str:
    """Single chat completion against an OpenAI-compatible endpoint."""
    client = OpenAI(
        base_url=base_url,
        api_key=api_key,
        timeout=60.0,
        default_headers=default_headers or {},
    )

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "temperature": temperature,
    }
    if max_tokens is not None:
        kwargs["max_tokens"] = max_tokens
    if response_format is not None:
        kwargs["response_format"] = response_format

    try:
        resp = client.chat.completions.create(**kwargs)
    except OpenAIRateLimitError as e:
        raise RateLimitError(str(e)) from e
    except APIStatusError as e:
        status = getattr(e, "status_code", None) or 500
        # Some providers return 429 as APIStatusError instead of RateLimitError.
        if status == 429:
            raise RateLimitError(f"{status}: {e}") from e
        raise ProviderError(f"HTTP {status}: {e}") from e
    except (APIConnectionError, APIError) as e:
        raise ProviderError(str(e)) from e

    if not resp.choices:
        raise ProviderError("response had no choices")
    return resp.choices[0].message.content or ""
