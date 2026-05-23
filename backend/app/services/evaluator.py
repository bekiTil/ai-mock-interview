"""Evaluator service — uses the multi-provider router for the final scorecard.

The scorecard is unique per session (depends on the full transcript + code)
so we DON'T cache it. Just route through the provider chain in JSON mode.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

from app.schemas.interview import ChatMessage
from app.schemas.problem import Problem
from app.schemas.submission import Evaluation
from app.schemas.tests import RunTestsResponse
from app.services.llm_providers import ChatMessage as LLMMessage
from app.services.llm_router import RouterResult, get_router

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# System prompt — the rubric is the product
# ---------------------------------------------------------------------------

EVAL_SYSTEM_PROMPT = """You are a staff-level engineer at a tech company who has just finished a 45-minute technical interview with a junior-engineer candidate. Your job now is to write a calibrated evaluation for the hiring packet.

You will see:
  • The problem that was posed
  • The candidate's final code
  • The automated test results for that code
  • The full transcript of the conversation

Score the candidate on four axes (1-5 scale). 3 = meets bar for a junior hire.

  correctness
    5: all tests pass; optimal time/space complexity
    4: all tests pass; suboptimal but reasonable complexity
    3: most tests pass; approach is right with minor bugs
    2: some tests pass; partial understanding
    1: mostly broken or did not solve

  code_quality
    5: idiomatic, clean, well-named, no dead code
    4: readable, reasonable choices, minor style issues
    3: works but has code smells — unclear names, redundant logic
    2: hard to follow, poor naming
    1: unreadable or incoherent

  communication
    IMPORTANT — count the candidate's messages in the transcript before scoring.
    The transcript section below lists how many real messages the candidate sent.
    Apply these floors MECHANICALLY — do not round up out of charity.
      0 candidate messages  → communication MUST be 1 (silent — no communication to evaluate)
      1 candidate message   → communication MUST be at most 2
      2 candidate messages  → communication MUST be at most 3
    Above that floor, use judgement:
      5: proactively explains thinking, asks sharp clarifying questions, walks edge cases verbally
      4: responsive and clear when asked; some spontaneous explanation
      3: answers when prompted but minimal initiative
      2: terse or vague; few questions asked
      1: silent — the candidate did not communicate at all
    When communication is 1 or 2, the `summary` and `weaknesses` MUST explicitly
    note that the candidate did not talk through their approach. Do not paper
    over silence.

  problem_solving
    5: clear plan before coding; considers alternatives; identifies trade-offs; handles edge cases deliberately
    4: reasonable plan; handles most edge cases; considers complexity
    3: gets to a working approach but misses some edge cases
    2: jumps into code; surprised by edge cases
    1: struggled to form any coherent approach

Verdict:
  strong       — would advance to next round; mostly 4s and 5s
  solid        — meets bar for junior; mostly 3s and 4s
  needs_work   — below bar but showed promise; mostly 2s and 3s
  not_ready    — significant gaps; mostly 1s and 2s

OUTPUT FORMAT
You MUST respond with a single JSON object matching exactly this shape:
{
  "verdict": "strong" | "solid" | "needs_work" | "not_ready",
  "correctness": 1-5 integer,
  "code_quality": 1-5 integer,
  "communication": 1-5 integer,
  "problem_solving": 1-5 integer,
  "strengths": ["string", ...],
  "weaknesses": ["string", ...],
  "summary": "string"
}
No prose before or after the JSON. No markdown fences. Just the JSON.

Be specific. Quote the candidate's actual code or words when citing strengths or weaknesses. Do not be falsely kind — the candidate wants feedback they can act on. Do not be cruel either — this is calibrated, professional feedback."""


_HIDDEN_OPENER_PREFIX = "Hi, I'm ready to start the interview"


# ---------------------------------------------------------------------------
# JSON repair: small open-weight models sometimes wrap output in ```json fences
# or include preamble text. Strip both before parsing.
# ---------------------------------------------------------------------------


_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)
_JSON_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)


def _extract_json(text: str) -> str:
    """Pull the JSON object out of `text` even if wrapped in fences or prose."""
    text = text.strip()
    # Try fenced block first.
    m = _FENCE_RE.search(text)
    if m:
        return m.group(1).strip()
    # Fall back to "first { ... last }" heuristic.
    m = _JSON_OBJECT_RE.search(text)
    if m:
        return m.group(0).strip()
    return text


class Evaluator:
    """Single-shot scorecard generator. No caching (always unique)."""

    async def evaluate(
        self,
        problem: Problem,
        code: str,
        history: list[ChatMessage],
        test_results: RunTestsResponse,
    ) -> Evaluation:
        user_prompt = self._build_prompt(problem, code, history, test_results)

        messages = [
            LLMMessage(role="system", content=EVAL_SYSTEM_PROMPT),
            LLMMessage(role="user", content=user_prompt),
        ]

        router = get_router()

        # Sync router → wrap in to_thread.
        import asyncio
        result: RouterResult = await asyncio.to_thread(
            router.complete,
            messages,
            temperature=0.3,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )

        return self._parse_evaluation(result.text)

    # ---------- output parsing ----------

    @staticmethod
    def _parse_evaluation(text: str) -> Evaluation:
        cleaned = _extract_json(text)
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            log.error("evaluator: JSON parse failed. Raw text:\n%s", text)
            raise RuntimeError(f"evaluator returned malformed JSON: {e}") from e

        try:
            return Evaluation(**data)
        except Exception as e:  # noqa: BLE001
            log.error("evaluator: Pydantic validation failed for: %s", data)
            raise RuntimeError(f"evaluator returned unexpected shape: {e}") from e

    # ---------- prompt construction ----------

    def _build_prompt(
        self,
        problem: Problem,
        code: str,
        history: list[ChatMessage],
        test_results: RunTestsResponse,
    ) -> str:
        transcript, candidate_msg_count = self._format_transcript(history)
        test_summary = self._format_test_summary(test_results)

        return (
            f"PROBLEM: {problem.title}\n\n"
            f"{problem.description}\n\n"
            f"---\n\n"
            f"CANDIDATE'S FINAL CODE:\n\n```python\n{code}\n```\n\n"
            f"---\n\n"
            f"AUTOMATED TEST RESULTS:\n\n{test_summary}\n\n"
            f"---\n\n"
            f"CONVERSATION TRANSCRIPT "
            f"(candidate sent {candidate_msg_count} message"
            f"{'' if candidate_msg_count == 1 else 's'}):\n\n{transcript}\n\n"
            f"---\n\n"
            f"Produce your structured evaluation now as a single JSON object."
        )

    @classmethod
    def _format_transcript(cls, history: list[ChatMessage]) -> tuple[str, int]:
        real_msgs = [
            m for m in history
            if not (
                m.role == "candidate"
                and m.content.startswith(_HIDDEN_OPENER_PREFIX)
            )
        ]
        candidate_count = sum(1 for m in real_msgs if m.role == "candidate")

        if not real_msgs:
            return "(no conversation — candidate did not send any messages)", 0

        lines: list[str] = []
        for msg in real_msgs:
            role = "Interviewer" if msg.role == "interviewer" else "Candidate"
            lines.append(f"{role}: {msg.content}")
        return "\n\n".join(lines), candidate_count

    @staticmethod
    def _format_test_summary(tr: RunTestsResponse) -> str:
        parts = [
            f"Tests: {tr.passed} / {tr.total} passed.",
            f"Runtime: {tr.runtime_ms} ms.",
        ]
        if tr.compile_error:
            parts.append(f"Compile error:\n{tr.compile_error[:500]}")
        if tr.timed_out:
            parts.append("Note: execution timed out.")

        failed = [r for r in tr.results if not r.passed][:3]
        if failed:
            parts.append("Failed cases (up to 3):")
            for r in failed:
                line = f"  • Case {r.case_index + 1}: expected {r.expected!r}, got {r.got!r}"
                if r.error:
                    line += f"  ({r.error})"
                parts.append(line)

        return "\n".join(parts)


evaluator = Evaluator()
