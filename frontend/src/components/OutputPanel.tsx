import type { RunTestsResponse, TestCaseResult } from "../types";

interface OutputPanelProps {
  results: RunTestsResponse | null;
  isRunning: boolean;
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

function OutputPanel({
  results,
  isRunning,
  error,
  paramNames,
}: OutputPanelProps) {
  if (isRunning) {
    return (
      <div className="output-panel">
        <div className="output-header">Output</div>
        <div className="output-body output-status">Running tests…</div>
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
          Click <strong>Run</strong> to grade your solution against the test cases.
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