import { useState, useEffect, useRef } from "react";

import Header from "./components/Header";
import ProblemStatement from "./components/ProblemStatement";
import ChatPanel from "./components/ChatPanel";
import CodeEditor from "./components/CodeEditor";
import OutputPanel from "./components/OutputPanel";
import ProblemPicker from "./components/ProblemPicker";

import { runTests } from "./api/execution";
import { sendTurn } from "./api/interview";
import { fetchRandomProblem } from "./api/problems";

import type {
  ChatMessage,
  PublicProblem,
  RunTestsResponse,
} from "./types";
import "./App.css";

const OPENING_CANDIDATE_MESSAGE: ChatMessage = {
  role: "candidate",
  content:
    "Hi, I'm ready to start the interview. Please introduce yourself and walk me through how you'd like to proceed.",
};

function formatExamples(problem: PublicProblem): string {
  return problem.examples
    .map((ex, i) => {
      const lines = [
        `Example ${i + 1}:`,
        `Input:  ${ex.input}`,
        `Output: ${ex.output}`,
      ];
      if (ex.explanation) lines.push(`Explanation: ${ex.explanation}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

function App() {
  const [problem, setProblem] = useState<PublicProblem | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);

  const [code, setCode] = useState<string>("");

  // NEW — structured grading state replaces the old `output` string.
  const [testResults, setTestResults] = useState<RunTestsResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);

  const fetchedRef = useRef<boolean>(false);
  const greetedForIdRef = useRef<string | null>(null);

  // --- Fetch a random problem once on mount ---
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const p = await fetchRandomProblem();
        setProblem(p);
        setCode(p.starter_code);
      } catch (err) {
        setMessages([
          {
            role: "interviewer",
            content: `[error loading problem] ${
              err instanceof Error ? err.message : String(err)
            }`,
          },
        ]);
      }
    })();
  }, []);

  // --- Fire the greeting once per problem id ---
  useEffect(() => {
    if (!problem) return;
    if (greetedForIdRef.current === problem.id) return;
    greetedForIdRef.current = problem.id;

    // Clear surfaces that belong to the previous problem.
    setMessages([]);
    setTestResults(null);
    setRunError(null);

    (async () => {
      setIsSending(true);
      try {
        const reply = await sendTurn(
          [OPENING_CANDIDATE_MESSAGE],
          undefined,
          { title: problem.title, description: problem.description },
        );
        setMessages([{ role: "interviewer", content: reply }]);
      } catch (err) {
        setMessages([
          {
            role: "interviewer",
            content: `[error starting session] ${
              err instanceof Error ? err.message : String(err)
            }`,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    })();
  }, [problem?.id]);

  // --- Run (now a graded test run) ---
  async function handleRun() {
    if (!problem) return;
    setIsRunning(true);
    setTestResults(null);
    setRunError(null);
    try {
      const results = await runTests(problem.id, code);
      setTestResults(results);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending || !problem) return;

    const candidateMsg: ChatMessage = { role: "candidate", content: trimmed };
    const visibleHistory = [...messages, candidateMsg];
    const backendHistory = [OPENING_CANDIDATE_MESSAGE, ...visibleHistory];

    setMessages(visibleHistory);
    setIsSending(true);

    try {
      const reply = await sendTurn(backendHistory, code, {
        title: problem.title,
        description: problem.description,
      });
      setMessages((prev) => [...prev, { role: "interviewer", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "interviewer",
          content: `[error] ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handlePickProblem(p: PublicProblem) {
    setProblem(p);
    setCode(p.starter_code);
  }

  return (
    <div className="app">
      <Header
        problemTitle={problem?.title ?? "Loading..."}
        onSwitchProblem={() => setIsPickerOpen(true)}
      />
      <div className="main">
        <div className="left-panel">
          <ProblemStatement
            title={problem?.title ?? "Loading..."}
            description={
              problem?.description ?? "Fetching a random problem from the bank…"
            }
            example={problem ? formatExamples(problem) : ""}
          />
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            isSending={isSending}
          />
        </div>
        <div className="code-panel">
          <CodeEditor
            code={code}
            onChange={setCode}
            onRun={handleRun}
            isRunning={isRunning}
          />
          <OutputPanel
            results={testResults}
            isRunning={isRunning}
            error={runError}
            paramNames={problem?.function_signature.params.map((p) => p.name) ?? []}
          />
        </div>
      </div>

      <ProblemPicker
        isOpen={isPickerOpen}
        currentProblemId={problem?.id}
        onClose={() => setIsPickerOpen(false)}
        onPick={handlePickProblem}
      />
    </div>
  );
}

export default App;