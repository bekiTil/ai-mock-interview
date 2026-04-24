// frontend/src/components/CodeEditor.tsx

import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  isRunning: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function CodeEditor({
  code,
  onChange,
  onRun,
  isRunning,
  onSubmit,
  isSubmitting,
}: CodeEditorProps) {
  const busy = isRunning || isSubmitting;

  return (
    <section className="code-editor">
      <div className="code-editor-toolbar">
        <div className="code-editor-tab">
          <FileIcon />
          <span className="code-editor-filename">solution.py</span>
          <span className="code-editor-lang">Python 3</span>
        </div>

        <div className="code-editor-actions">
          <button
            className="editor-btn editor-btn-run"
            onClick={onRun}
            disabled={busy}
            type="button"
          >
            {isRunning ? <Spinner /> : <PlayIcon />}
            <span>{isRunning ? "Running" : "Run"}</span>
          </button>

          <button
            className="editor-btn editor-btn-submit"
            onClick={onSubmit}
            disabled={busy}
            type="button"
          >
            {isSubmitting ? <Spinner /> : <CheckIcon />}
            <span>{isSubmitting ? "Evaluating" : "Submit"}</span>
          </button>
        </div>
      </div>

      <div className="code-editor-body">
        <Editor
          height="100%"
          language="python"
          theme="vs-dark"
          value={code}
          onChange={(v) => onChange(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily:
              "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
            fontLigatures: true,
            lineNumbersMinChars: 3,
            scrollBeyondLastLine: false,
            padding: { top: 14, bottom: 14 },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "line",
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
          }}
        />
      </div>
    </section>
  );
}

/* ---------- icons ---------- */

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 2h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 2v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 2v8l7-4-7-4z" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6.5L5 9L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="editor-spinner"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
    >
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <path
        d="M10.5 6a4.5 4.5 0 00-4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default CodeEditor;