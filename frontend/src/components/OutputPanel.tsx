interface OutputPanelProps {
  output: string;
}

export default function OutputPanel({ output }: OutputPanelProps) {
  return (
    <div className="output-panel">
      <div className="output-header">Output</div>
      <pre className="output-content">
        {output || 'Click Run to execute your code.'}
      </pre>
    </div>
  );
}