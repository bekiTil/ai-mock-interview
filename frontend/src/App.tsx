import { useState } from 'react';
import Header from './components/Header';
import ProblemStatement from './components/ProblemStatement';
import ChatPanel from './components/ChatPanel';
import CodeEditor from './components/CodeEditor';
import OutputPanel from './components/OutputPanel';
import { runCode } from './api/execution';
import type { ChatMessage, RunResponse } from './types';
import './App.css';

const INITIAL_CODE = `def two_sum(nums, target):
    # Your solution here
    pass

print(two_sum([2, 7, 11, 15], 9))
`;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: 'interviewer',
    content:
      'Hi! Welcome. Take a minute to read the problem, then walk me through your thinking.',
  },
];

function formatOutput(data: RunResponse): string {
  const parts = [
    data.stdout && `--- stdout ---\n${data.stdout}`,
    data.stderr && `--- stderr ---\n${data.stderr}`,
    `(runtime: ${data.runtime_ms}ms)`,
  ].filter(Boolean);
  return parts.join('\n\n') || '(no output)';
}

function App() {
  const [code, setCode] = useState<string>(INITIAL_CODE);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [messages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('Running...');
    try {
      const data = await runCode(code);
      setOutput(formatOutput(data));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setOutput(`Error: ${msg}\n\nIs the backend running on port 8000?`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="app">
      <Header problemTitle="Two Sum" />

      <main className="app-main">
        <section className="chat-panel">
          <ProblemStatement
            title="Two Sum"
            description={
              <p>
                Given an array of integers <code>nums</code> and an integer{' '}
                <code>target</code>, return indices of the two numbers such that
                they add up to <code>target</code>.
              </p>
            }
            example={`Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]`}
          />
          <ChatPanel messages={messages} />
          <div className="chat-input">
            <input type="text" placeholder="Chat (coming soon)" disabled />
          </div>
        </section>

        <section className="code-panel">
          <CodeEditor
            code={code}
            onChange={setCode}
            onRun={handleRun}
            isRunning={isRunning}
          />
          <OutputPanel output={output} />
        </section>
      </main>
    </div>
  );
}

export default App;