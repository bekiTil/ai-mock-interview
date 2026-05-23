"""Interviewer service — multi-provider LLM + semantic cache.

Routes each chat turn through the multi-provider router (Groq → Cerebras →
OpenRouter → Gemini), checking a SQLite/fastembed cache first for FAQ-style
queries that repeat across users.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from app.schemas.interview import ChatMessage
from app.services.llm_cache import get_cache, should_cache
from app.services.llm_providers import ChatMessage as LLMMessage
from app.services.llm_router import RouterResult, get_router
from app.services.prompts import INTERVIEWER_SYSTEM_PROMPT

log = logging.getLogger(__name__)


# Real candidate-side opener used as the initial trigger in InterviewApp.
# We don't want to use this as a cache key because it's identical for every
# user and would shadow the real first question.
_HIDDEN_OPENER_PREFIX = "Hi, I'm ready to start the interview"


def _slugify(s: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-") or "_unknown"


def _build_messages(
    history: list[ChatMessage],
    code: Optional[str],
    problem_title: Optional[str],
    problem_description: Optional[str],
) -> list[LLMMessage]:
    """Convert our domain ChatMessage list into OpenAI-style ChatMessage
    objects, with system prompt + problem + editor context injected up front."""
    msgs: list[LLMMessage] = [
        LLMMessage(role="system", content=INTERVIEWER_SYSTEM_PROMPT),
    ]

    if problem_title and problem_description:
        msgs.append(LLMMessage(
            role="user",
            content=(
                "[PROBLEM — this is the problem the candidate is currently "
                "solving. Use it to stay on topic. Do not recite it back.]\n\n"
                f"Title: {problem_title}\n\n"
                f"Description:\n{problem_description}"
            ),
        ))
        msgs.append(LLMMessage(
            role="assistant",
            content="Understood. I have the problem in mind.",
        ))

    if code and code.strip():
        msgs.append(LLMMessage(
            role="user",
            content=(
                "[EDITOR STATE — this is what the candidate currently has "
                "in their editor. Do not quote it back to them; just use "
                "it to inform your next response.]\n\n"
                f"```python\n{code}\n```"
            ),
        ))
        msgs.append(LLMMessage(
            role="assistant",
            content="Understood, I can see the editor.",
        ))

    for msg in history:
        if msg.role == "candidate":
            msgs.append(LLMMessage(role="user", content=msg.content))
        elif msg.role == "interviewer":
            msgs.append(LLMMessage(role="assistant", content=msg.content))
        # system role messages get skipped (unusual in this app)

    return msgs


def _last_candidate_message(history: list[ChatMessage]) -> Optional[str]:
    """Return the latest candidate text, skipping the synthetic opener."""
    for msg in reversed(history):
        if msg.role != "candidate":
            continue
        if msg.content.startswith(_HIDDEN_OPENER_PREFIX):
            continue
        return msg.content
    return None


def _has_real_code(code: Optional[str]) -> bool:
    """True if the candidate has written something beyond starter scaffolding."""
    if not code:
        return False
    stripped = code.strip()
    if not stripped:
        return False
    # Crude but effective: starter code typically has just `pass` or `# TODO`.
    if stripped.lower() in {"pass", "# todo", "todo"}:
        return False
    # Also bypass cache if the editor is non-trivial — let the LLM see it fresh.
    return len(stripped) > 30


class Interviewer:
    """Stateless: every call goes through the shared router + cache."""

    async def next_turn(
        self,
        history: list[ChatMessage],
        code: Optional[str] = None,
        problem_title: Optional[str] = None,
        problem_description: Optional[str] = None,
    ) -> str:
        problem_id = _slugify(problem_title or "")
        last_q = _last_candidate_message(history)
        has_code = _has_real_code(code)

        # ----- Cache check -----
        cache = get_cache()
        cache_eligible = (
            cache is not None
            and last_q is not None
            and should_cache(last_q, has_user_code=has_code)
        )

        if cache_eligible:
            assert cache is not None and last_q is not None
            try:
                cached = cache.get(problem_id, last_q)
            except Exception as e:  # noqa: BLE001
                log.warning("interviewer: cache get failed (%s); falling through", e)
                cached = None
            if cached:
                log.info("interviewer: cache served the turn (problem=%s)", problem_id)
                return cached

        # ----- LLM call via router -----
        messages = _build_messages(history, code, problem_title, problem_description)
        router = get_router()

        # Router is sync; wrap in to_thread so we don't block the event loop.
        result: RouterResult = await asyncio.to_thread(
            router.complete,
            messages,
            temperature=0.7,
            max_tokens=300,
        )

        # ----- Cache the answer for the next user with the same question -----
        if cache_eligible:
            assert cache is not None and last_q is not None
            try:
                cache.put(problem_id, last_q, result.text)
            except Exception as e:  # noqa: BLE001
                log.warning("interviewer: cache put failed (%s); ignoring", e)

        return result.text


interviewer = Interviewer()
