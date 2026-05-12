// frontend/src/pages/InterviewApp.tsx

import { useState, useEffect, useRef } from "react";

import Header from "../components/Header";
import ProblemStatement from "../components/ProblemStatement";
import ChatPanel from "../components/ChatPanel";
import VoicePanel from "../components/VoicePanel";
import CodeEditor from "../components/CodeEditor";
import OutputPanel from "../components/OutputPanel";
import ProblemPicker from "../components/ProblemPicker";

import { runTests, submitSolution } from "../api/execution";
import { sendTurn } from "../api/interview";
import { fetchRandomProblem, fetchProblemById } from "../api/problems";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import type {
  ChatMessage,
  Evaluation,
  InterviewMode,
  PublicProblem,
  RunTestsResponse,
  ProblemSummary,
} from "../types";

const OPENING_CANDIDATE_MESSAGE: ChatMessage = {
  role: "candidate",
  content:
    "Hi, I'm ready to start the interview. Please introduce yourself and walk me through how you'd like to proceed.",
};

function formatExamples(problem: PublicProblem): string {
  return (problem.examples ?? [])
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

// Detect Web Speech API support once on mount.
function detectVoiceSupport(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window &&
    !!(("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window));
}

function InterviewApp() {
  const [problem, setProblem] = useState<PublicProblem | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);

  const [code, setCode] = useState<string>("");

  // Run / Submit output state.
  const [testResults, setTestResults] = useState<RunTestsResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Submit-only state (the scorecard).
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);

  // v2: interview mode (text vs voice). Defaults to text.
  const [mode, setMode] = useState<InterviewMode>("text");
  const isVoiceSupported = detectVoiceSupport();

  // TTS — used only when mode === "voice".
  const { isSpeaking, speak, cancel: cancelSpeech } = useSpeechSynthesis();

  const fetchedRef = useRef<boolean>(false);
  const greetedForIdRef = useRef<string | null>(null);
  const lastSpokenIndexRef = useRef<number>(-1);

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

    setMessages([]);
    setTestResults(null);
    setRunError(null);
    setEvaluation(null);
    setEvaluationError(null);
    lastSpokenIndexRef.current = -1;

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

  // --- Auto-speak new interviewer messages when in voice mode ---
  useEffect(() => {
    if (mode !== "voice") return;
    if (messages.length === 0) return;
    const lastIndex = messages.length - 1;
    if (lastIndex <= lastSpokenIndexRef.current) return;
    const last = messages[lastIndex];
    if (last.role !== "interviewer") return;
    // Skip error placeholders so we don't speak "[error] ...".
    if (last.content.startsWith("[error")) return;
    lastSpokenIndexRef.current = lastIndex;
    speak(last.content);
  }, [messages, mode, speak]);

  // --- When switching mode, cancel any in-flight TTS so it doesn't bleed across ---
  useEffect(() => {
    if (mode === "text") {
      cancelSpeech();
    }
  }, [mode, cancelSpeech]);

  function handleChangeMode(next: InterviewMode) {
    setMode(next);
    // If switching to voice mid-session, treat the latest interviewer message
    // as already-said (so we don't suddenly read out backlog).
    if (next === "voice") {
      lastSpokenIndexRef.current = messages.length - 1;
    }
  }

  async function handleRun() {
    if (!problem) return;
    setIsRunning(true);
    setTestResults(null);
    setRunError(null);
    setEvaluation(null);
    setEvaluationError(null);
    try {
      const results = await runTests(problem.id, code);
      setTestResults(results);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmit() {
    if (!problem) return;
    setIsSubmitting(true);
    setTestResults(null);
    setRunError(null);
    setEvaluation(null);
    setEvaluationError(null);
    try {
      const backendHistory = [OPENING_CANDIDATE_MESSAGE, ...messages];
      const response = await submitSolution(problem.id, code, backendHistory);
      setTestResults(response.test_results);
      setEvaluation(response.evaluation);
      setEvaluationError(response.evaluation_error);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
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

  async function handlePickProblem(summary: ProblemSummary) {
    try {
      const full = await fetchProblemById(summary.id);
      setProblem(full);
      setCode(full.starter_code);
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
  }

  return (
    <div className="app">
      <Header
        problemTitle={problem?.title ?? "Loading..."}
        onSwitchProblem={() => setIsPickerOpen(true)}
        mode={mode}
        onChangeMode={handleChangeMode}
        isVoiceSupported={isVoiceSupported}
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
          {mode === "voice" ? (
            <VoicePanel
              messages={messages}
              onSend={handleSend}
              isSending={isSending}
              isSpeaking={isSpeaking}
              onCancelSpeech={cancelSpeech}
            />
          ) : (
            <ChatPanel
              messages={messages}
              onSend={handleSend}
              isSending={isSending}
            />
          )}
        </div>
        <div className="code-panel">
          <CodeEditor
            code={code}
            onChange={setCode}
            onRun={handleRun}
            onSubmit={handleSubmit}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
          />
          <OutputPanel
            results={testResults}
            evaluation={evaluation}
            evaluationError={evaluationError}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            error={runError}
            paramNames={problem?.function_signature.params.map((p) => p.name)}
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

export default InterviewApp;
