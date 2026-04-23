
from __future__ import annotations

import json
from typing import Any

from app.schemas.execution import RunRequest
from app.schemas.problem import Problem
from app.schemas.tests import RunTestsResponse, TestCaseResult
from app.services import problem_bank
from app.services.code_executor import code_executor


# ---------------------------------------------------------------------------
# Harness
# ---------------------------------------------------------------------------

# Prefix on every grader-emitted line. Candidate prints never include this,
# so we can cleanly separate "program output" from "test results."
RESULT_MARKER = "###TEST_RESULT###"

STDOUT_TAIL_LIMIT = 2000
STDERR_TAIL_LIMIT = 2000


def build_harness(candidate_code: str, problem: Problem) -> str:
    """
    Return a full Python program = candidate code + appended test runner.

    We embed the test payload as a JSON string and let the harness call
    json.loads() on it at runtime. That avoids the quoting minefield of
    interpolating arbitrary Python literals into a template — repr() on the
    JSON string gives us a safely-quoted Python string literal for free.
    """
    tests_payload = [
        {"input": tc.input, "expected": tc.expected}
        for tc in problem.test_cases
    ]
    tests_json = json.dumps(tests_payload)
    fn_name = problem.function_signature.name

    tests_literal = repr(tests_json)
    fn_literal = repr(fn_name)
    marker_literal = repr(RESULT_MARKER)

    harness_tail = (
        "\n\n# === TEST HARNESS (appended by backend) ===\n"
        "import json as __hjson\n"
        "import sys as __hsys\n"
        "import traceback as __htb\n"
        f"__HTESTS_RAW = {tests_literal}\n"
        f"__HFN = {fn_literal}\n"
        f"__HMARK = {marker_literal}\n"
        "def __hrun():\n"
        "    try:\n"
        "        tests = __hjson.loads(__HTESTS_RAW)\n"
        "    except Exception as e:\n"
        "        __hsys.stdout.write(__HMARK + __hjson.dumps({'error': 'harness_parse', 'msg': str(e)}) + '\\n')\n"
        "        return\n"
        "    fn = globals().get(__HFN)\n"
        "    if not callable(fn):\n"
        "        __hsys.stdout.write(__HMARK + __hjson.dumps({'error': 'function_not_found', 'expected_name': __HFN}) + '\\n')\n"
        "        return\n"
        "    for i, case in enumerate(tests):\n"
        "        res = {'case': i}\n"
        "        try:\n"
        "            res['got'] = fn(*case['input'])\n"
        "            res['ok'] = True\n"
        "        except Exception as e:\n"
        "            res['ok'] = False\n"
        "            res['error_type'] = type(e).__name__\n"
        "            res['error_msg'] = str(e)\n"
        "        try:\n"
        "            line = __hjson.dumps(res)\n"
        "        except (TypeError, ValueError):\n"
        "            res['got'] = repr(res.get('got'))\n"
        "            line = __hjson.dumps(res, default=str)\n"
        "        __hsys.stdout.write(__HMARK + line + '\\n')\n"
        "\n"
        "__hrun()\n"
    )
    return candidate_code.rstrip() + "\n" + harness_tail


# ---------------------------------------------------------------------------
# Comparison modes
# ---------------------------------------------------------------------------

def _normalize(value: Any) -> Any:
    """Round-trip through JSON so tuples become lists, dict keys are strings,
    etc. Makes `[1, 2]` and `(1, 2)` compare equal, which matches the mental
    model of every LeetCode grader."""
    try:
        return json.loads(json.dumps(value, sort_keys=True, default=str))
    except (TypeError, ValueError):
        return value


def _bag_equal(a: list, b: list) -> bool:
    """Multiset equality that tolerates unhashable / non-sortable items."""
    if len(a) != len(b):
        return False
    remaining = list(b)
    for x in a:
        try:
            remaining.remove(x)
        except ValueError:
            return False
    return True


def compare(got: Any, expected: Any, mode: str) -> bool:
    g = _normalize(got)
    e = _normalize(expected)

    if mode == "exact":
        return g == e

    if mode == "unordered_pair":
        return (
            isinstance(g, list)
            and isinstance(e, list)
            and len(g) == 2 == len(e)
            and sorted(g) == sorted(e)
        )

    if mode == "unordered_list":
        if not (isinstance(g, list) and isinstance(e, list)):
            return False
        try:
            return sorted(g) == sorted(e)
        except TypeError:
            return _bag_equal(g, e)

    if mode == "set_of_unordered_tuples":
        if not (isinstance(g, list) and isinstance(e, list)):
            return False
        try:
            g_set = frozenset(tuple(sorted(x)) for x in g)
            e_set = frozenset(tuple(sorted(x)) for x in e)
            return g_set == e_set
        except TypeError:
            return False

    if mode == "anagram_groups":
        if not (isinstance(g, list) and isinstance(e, list)):
            return False
        try:
            g_set = frozenset(frozenset(group) for group in g)
            e_set = frozenset(frozenset(group) for group in e)
            return g_set == e_set
        except TypeError:
            return False

    # Unknown mode: fail closed.
    return False


# ---------------------------------------------------------------------------
# Output parsing
# ---------------------------------------------------------------------------

def _split_stdout(stdout: str) -> tuple[list[dict], str]:
    """Return (harness_dicts, candidate_stdout)."""
    harness: list[dict] = []
    other: list[str] = []
    for line in stdout.splitlines():
        if line.startswith(RESULT_MARKER):
            payload = line[len(RESULT_MARKER):]
            try:
                harness.append(json.loads(payload))
            except json.JSONDecodeError:
                other.append(line)  # malformed — treat as noise
        else:
            other.append(line)
    return harness, "\n".join(other)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def run_tests(problem_id: str, candidate_code: str) -> RunTestsResponse:
    problem = problem_bank.get_problem(problem_id)

    script = build_harness(candidate_code, problem)
    exec_result = await code_executor.run(RunRequest(code=script))

    stdout = exec_result.stdout or ""
    stderr = exec_result.stderr or ""
    runtime_ms = exec_result.runtime_ms or 0

    harness_dicts, candidate_stdout = _split_stdout(stdout)
    by_case = {d.get("case"): d for d in harness_dicts if "case" in d}

    # Detect compile/import-time failures. If the harness emitted nothing
    # AND stderr has content, the candidate's code didn't even parse. Your
    # CodeExecutor folds Judge0's compile_output + stderr + message into
    # one stderr string, so this check covers SyntaxError, NameError, etc.
    compile_error: str | None = None
    if not by_case and stderr.strip():
        compile_error = stderr[-STDERR_TAIL_LIMIT:]

    # Infer a "timed out" hint from Judge0's combined stderr message. This
    # is best-effort — the CodeExecutor doesn't surface status codes today.
    timed_out = "Time limit exceeded" in stderr or "TLE" in stderr

    results: list[TestCaseResult] = []
    for idx, tc in enumerate(problem.test_cases):
        raw = by_case.get(idx)

        if raw is None:
            reason = (
                "Program failed before this test case ran (see compile error)."
                if compile_error
                else "Test case did not run (the program may have crashed)."
            )
            results.append(TestCaseResult(
                case_index=idx,
                passed=False,
                input=tc.input,
                expected=tc.expected,
                got=None,
                error=reason,
            ))
            continue

        if not raw.get("ok"):
            error_type = raw.get("error_type", "Error")
            error_msg = raw.get("error_msg", "")
            results.append(TestCaseResult(
                case_index=idx,
                passed=False,
                input=tc.input,
                expected=tc.expected,
                got=None,
                error=f"{error_type}: {error_msg}",
            ))
            continue

        got = raw.get("got")
        ok = compare(got, tc.expected, problem.comparison)
        results.append(TestCaseResult(
            case_index=idx,
            passed=ok,
            input=tc.input,
            expected=tc.expected,
            got=got,
            error=None if ok else "Output does not match expected.",
        ))

    passed = sum(1 for r in results if r.passed)

    return RunTestsResponse(
        problem_id=problem_id,
        total=len(results),
        passed=passed,
        results=results,
        stdout_tail=(candidate_stdout[-STDOUT_TAIL_LIMIT:] if candidate_stdout else None),
        stderr_tail=(stderr[-STDERR_TAIL_LIMIT:] if stderr and not compile_error else None),
        compile_error=compile_error,
        runtime_ms=runtime_ms,
        timed_out=timed_out,
    )