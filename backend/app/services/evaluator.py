# backend/app/services/evaluator.py
#
# Day 5 Part 4 — Gemini-backed interview evaluator.
#
# Mirrors the class+singleton pattern of your existing Interviewer service.
# Uses google-genai's response_schema feature to force Pydantic-shaped JSON
# instead of us parsing free-form text.

import json
import os
from typing import Any

from google import genai
from google.genai import types

from app.schemas.interview import ChatMessage
from app.schemas.problem import Problem
from app.schemas.submission import Evaluation
from app.schemas.tests import RunTestsResponse


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

Be specific. Quote the candidate's actual code or words when citing strengths or weaknesses. Do not be falsely kind — the candidate wants feedback they can act on. Do not be cruel either — this is calibrated, professional feedback."""


# ---------------------------------------------------------------------------
# Evaluator
# ---------------------------------------------------------------------------

class Evaluator:
    def __init__(self, model: str = "gemini-2.5-flash-lite") -> None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        self.client = genai.Client(api_key=api_key)
        self.model = model

    async def evaluate(
        self,
        problem: Problem,
        code: str,
        history: list[ChatMessage],
        test_results: RunTestsResponse,
    ) -> Evaluation:
        user_prompt = self._build_prompt(problem, code, history, test_results)

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=EVAL_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=Evaluation,
                temperature=0.3,
                max_output_tokens=1000,
            ),
        )

        # google-genai returns a parsed Pydantic instance when response_schema
        # is a model. Fall back to manual JSON parse if for some reason it
        # comes back as a dict or text.
        parsed: Any = getattr(response, "parsed", None)
        if isinstance(parsed, Evaluation):
            return parsed
        if isinstance(parsed, dict):
            return Evaluation(**parsed)

        text = response.text or ""
        if not text.strip():
            raise RuntimeError("evaluator returned empty response")
        return Evaluation(**json.loads(text))

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
            f"Produce your structured evaluation now."
        )

   
    _HIDDEN_OPENER_PREFIX = "Hi, I'm ready to start the interview"

    @classmethod
    def _format_transcript(cls, history: list[ChatMessage]) -> tuple[str, int]:
        """Returns (rendered_transcript, real_candidate_message_count)."""
        real_msgs = [
            m for m in history
            if not (
                m.role == "candidate"
                and m.content.startswith(cls._HIDDEN_OPENER_PREFIX)
            )
        ]
        candidate_count = sum(1 for m in real_msgs if m.role == "candidate")

        if not real_msgs:
            return "(no conversation — candidate did not send any messages)", 0

        lines = []
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


# Module-level singleton, mirroring your code_executor / interviewer pattern.
evaluator = Evaluator()