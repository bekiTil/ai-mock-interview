import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  isRunning: boolean;
  language?: string;
}

export default function CodeEditor({
  code,
  onChange,
  onRun,
  isRunning,
  language = 'python',
}: CodeEditorProps) {
  return (
    <>
      <div className="editor-toolbar">
        <span className="language-label">{language}</span>
        <button className="run-button" onClick={onRun} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run'}
        </button>
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