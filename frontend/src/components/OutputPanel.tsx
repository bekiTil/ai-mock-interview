import type {
  RunTestsResponse,
  TestCaseResult,
  Evaluation,
} from "../types";

interface OutputPanelProps {
  results: RunTestsResponse | null;
  evaluation: Evaluation | null;
  evaluationError: string | null;
  isRunning: boolean;
  isSubmitting: boolean;
  error: string | null;
  paramNames?: string[];
}

function formatCompact(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function verdictLabel(v: Evaluation["verdict"]): string {
  switch (v) {
    case "strong":     return "Strong candidate";
    case "solid":      return "Solid candidate";
    case "needs_work": return "Needs work";
    case "not_ready":  return "Not ready";
  }
}

// -------------------- Evaluation card --------------------

function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  const axes: Array<{ label: string; value: number }> = [
    { label: "Correctness",     value: evaluation.correctness },
    { label: "Code quality",    value: evaluation.code_quality },
    { label: "Communication",   value: evaluation.communication },
    { label: "Problem solving", value: evaluation.problem_solving },
  ];

  return (
    <div className={`eval-card eval-${evaluation.verdict}`}>
      <div className="eval-header">
        <span className="eval-header-label">Evaluation</span>
        <span className="eval-verdict">{verdictLabel(evaluation.verdict)}</span>
      </div>

      <div className="eval-scores">
        {axes.map((a) => (
          <div key={a.label} className="eval-score">
            <div className="eval-score-label">{a.label}</div>
            <div className="eval-score-bar">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`eval-score-dot ${n <= a.value ? "filled" : ""}`}
                />
              ))}
            </div>
            <div className="eval-score-value">{a.value}/5</div>
          </div>
        ))}
      </div>

      {evaluation.strengths.length > 0 && (
        <div className="eval-section">
          <div className="eval-section-label">Strengths</div>
          <ul className="eval-list">
            {evaluation.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.weaknesses.length > 0 && (
        <div className="eval-section">
          <div className="eval-section-label">Areas to improve</div>
          <ul className="eval-list">
            {evaluation.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="eval-summary">{evaluation.summary}</div>
    </div>
  );
}

// -------------------- Case row --------------------

function CaseRow({
  result,
  paramNames,
}: {
  result: TestCaseResult;
  paramNames?: string[];
}) {
  const { case_index, passed, input, expected, got, error } = result;
  const args = Array.isArray(input) ? input : [input];

  return (
    <details
      className={`case-row ${passed ? "case-pass" : "case-fail"}`}
      open={!passed}
    >
      <summary>
        <span className="case-label">Case {case_index + 1}</span>
        <span className={`case-status ${passed ? "status-pass" : "status-fail"}`}>
          {passed ? "Passed" : "Failed"}
        </span>
      </summary>

      <div className="case-body">
        <div className="case-section">
          <div className="case-section-label">Input</div>
          <div className="case-value-box">
            {args.map((arg, i) => (
              <div key={i} className="case-kv-line">
                <span className="case-kv-name">
                  {paramNames?.[i] ?? `arg${i}`}
                </span>
                <span className="case-kv-eq">=</span>
                <span className="case-kv-value">{formatCompact(arg)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="case-section">
          <div className="case-section-label">Output</div>
          <div className="case-value-box">
            {got === null || got === undefined ? "—" : formatCompact(got)}
          </div>
        </div>

        <div className="case-section">
          <div className="case-section-label">Expected</div>
          <div className="case-value-box">{formatCompact(expected)}</div>
        </div>

        {error && (
          <div className="case-section">
            <div className="case-section-label">Error</div>
            <div className="case-value-box case-error-box">{error}</div>
          </div>
        )}
      </div>
    </details>
  );
}

// -------------------- Panel --------------------

function OutputPanel({
  results,
  evaluation,
  evaluationError,
  isRunning,
  isSubmitting,
  error,
  paramNames,
}: OutputPanelProps) {
  const busy = isRunning || isSubmitting;
  if (busy) {
    return (
      <div className="output-panel">
        <div className="output-header">Output</div>
        <div className="output-body output-status">
          {isSubmitting ? "Evaluating submission…" : "Running tests…"}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="output-panel">
        <div className="output-header">Output</div>
        <div className="output-body">
          <div className="output-error">
            <div className="output-error-title">Request failed</div>
            <pre className="output-error-body">{error}</pre>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="output-panel">
        <div className="output-header">Output</div>
        <div className="output-body output-status output-idle">
          Click <strong>Run</strong> to test your code, or{" "}
          <strong>Submit</strong> for a full evaluation.
        </div>
      </div>
    );
  }

  const allPassed = results.passed === results.total && results.total > 0;
  const hasCompileError = !!results.compile_error;

  return (
    <div className="output-panel">
      <div className="output-header">
        <span>Output</span>
        <span className="output-runtime">{results.runtime_ms} ms</span>
      </div>

      <div className="output-body">
        {evaluation && <EvaluationCard evaluation={evaluation} />}

        {evaluationError && (
          <div className="output-error">
            <div className="output-error-title">Evaluation error</div>
            <pre className="output-error-body">{evaluationError}</pre>
          </div>
        )}

        <div className={`output-summary ${allPassed ? "summary-pass" : "summary-fail"}`}>
          <span className="summary-score">
            Passed {results.passed} / {results.total}
          </span>
          {results.timed_out && <span className="summary-flag">Timed out</span>}
        </div>

        {hasCompileError && (
          <div className="output-error">
            <div className="output-error-title">Compile / import error</div>
            <pre className="output-error-body">{results.compile_error}</pre>
          </div>
        )}

        {results.results.length > 0 && (
          <div className="case-list">
            {results.results.map((r) => (
              <CaseRow key={r.case_index} result={r} paramNames={paramNames} />
            ))}
          </div>
        )}

        {results.stdout_tail && (
          <details className="output-extra">
            <summary>Your prints (stdout)</summary>
            <pre className="output-extra-body">{results.stdout_tail}</pre>
          </details>
        )}

        {results.stderr_tail && (
          <details className="output-extra">
            <summary>stderr</summary>
            <pre className="output-extra-body">{results.stderr_tail}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default OutputPanel;