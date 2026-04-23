import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  isRunning: boolean;
  language?: string;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function CodeEditor({
  code,
  onChange,
  onRun,
  isRunning,
  language = 'python',
  onSubmit,
  isSubmitting,
}: CodeEditorProps) {
  return (
    <>
      <div className="editor-toolbar">
        <span className="language-label">{language}</span>
        <div className="editor-actions">
          <button
            className="run-button"
            onClick={onRun}
            disabled={isRunning || isSubmitting}
          >
            {isRunning ? "Running..." : "Run"}
          </button>
          <button
            className="submit-button"
            onClick={onSubmit}
            disabled={isRunning || isSubmitting}
          >
            {isSubmitting ? "Evaluating..." : "Submit"}
          </button>
        </div>
      </div>
      <div className="editor-container">
        <Editor
          height="100%"
          defaultLanguage={language}
          value={code}
          onChange={(value) => onChange(value || '')}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </>
  );
}