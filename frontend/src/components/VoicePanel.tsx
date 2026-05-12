// frontend/src/components/VoicePanel.tsx
//
// Voice analogue of ChatPanel. Same prop shape so it's a drop-in replacement
// when InterviewApp's `mode` flips to "voice".
//
// Behavior:
//   - Click the mic to start listening. Live interim transcript shows in a
//     bubble. Click the mic again to stop and send.
//   - When an interviewer message arrives, it auto-speaks via the parent's
//     speechSynthesis hook (parent owns the speaking state — see
//     `isSpeaking` and `onCancelSpeech` props).
//   - Mic is disabled while the AI is sending or speaking (clicking it
//     during speech cancels speech and starts listening — interrupt support).
//
// The transcript log shows the same bubble UI as ChatPanel for continuity.

import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface VoicePanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isSending: boolean;
  isSpeaking: boolean;
  onCancelSpeech: () => void;
}

function VoicePanel({
  messages,
  onSend,
  isSending,
  isSpeaking,
  onCancelSpeech,
}: VoicePanelProps) {
  const {
    isSupported,
    isListening,
    transcript,
    interim,
    error,
    start,
    stop,
    reset,
  } = useSpeechRecognition({ lang: "en-US", continuous: true });

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Autoscroll on new messages, while listening, or while AI speaks.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isListening, isSpeaking, interim]);

  // Click-to-toggle mic. If AI is speaking, interrupt it and listen.
  function handleMicPress() {
    if (!isSupported) return;
    if (isListening) {
      stop();
      const finalText = (transcript + " " + interim).trim();
      if (finalText) {
        onSend(finalText);
      }
      reset();
      return;
    }
    if (isSpeaking) onCancelSpeech();
    if (isSending) return;
    reset();
    start();
  }

  const liveText = (transcript + (interim ? " " + interim : "")).trim();

  return (
    <section className="chat-panel voice-panel">
      <div className="chat-header">
        <span className="chat-header-label">
          <span className="chat-header-dot" />
          Voice interview
        </span>
        <span className="chat-header-hint">
          {isSupported
            ? "Click the mic to speak · click again to send"
            : "Voice mode unavailable in this browser"}
        </span>
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && !liveText && !isSending && <VoiceEmpty />}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}

        {liveText && (
          <div className="chat-msg chat-msg-candidate voice-live-bubble">
            <div className="chat-msg-header">
              <span className="chat-msg-avatar" aria-hidden>YOU</span>
              <span className="chat-msg-role">You · transcribing…</span>
            </div>
            <div className="chat-msg-body">{liveText}</div>
          </div>
        )}

        {isSending && <ThinkingBubble />}
        {isSpeaking && <SpeakingBubble />}
      </div>

      {error && <ErrorBanner error={error} />}

      <div className="voice-controls">
        <MicButton
          isListening={isListening}
          isSpeaking={isSpeaking}
          isSending={isSending}
          isSupported={isSupported}
          onPress={handleMicPress}
        />
        <div className="voice-status">
          <VoiceStatusText
            isListening={isListening}
            isSpeaking={isSpeaking}
            isSending={isSending}
            isSupported={isSupported}
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- subcomponents ---------- */

function MicButton({
  isListening,
  isSpeaking,
  isSending,
  isSupported,
  onPress,
}: {
  isListening: boolean;
  isSpeaking: boolean;
  isSending: boolean;
  isSupported: boolean;
  onPress: () => void;
}) {
  const disabled = !isSupported || isSending;

  let className = "voice-mic";
  if (isListening) className += " voice-mic-listening";
  else if (isSpeaking) className += " voice-mic-speaking";

  let label = "Start speaking";
  if (isListening) label = "Stop and send";
  else if (isSpeaking) label = "Interrupt and speak";
  else if (isSending) label = "Waiting for interviewer…";

  return (
    <button
      type="button"
      className={className}
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isListening}
    >
      {isListening ? <StopIcon /> : <MicIcon />}
    </button>
  );
}

function VoiceStatusText({
  isListening,
  isSpeaking,
  isSending,
  isSupported,
}: {
  isListening: boolean;
  isSpeaking: boolean;
  isSending: boolean;
  isSupported: boolean;
}) {
  if (!isSupported) {
    return (
      <span className="voice-status-text">
        Voice mode requires Chrome, Edge, or Safari. Switch to text mode for now.
      </span>
    );
  }
  if (isListening) {
    return (
      <span className="voice-status-text voice-status-listening">
        Listening… click the mic when you're done.
      </span>
    );
  }
  if (isSending) {
    return <span className="voice-status-text">Interviewer is thinking…</span>;
  }
  if (isSpeaking) {
    return (
      <span className="voice-status-text voice-status-speaking">
        Interviewer is speaking · click mic to interrupt.
      </span>
    );
  }
  return (
    <span className="voice-status-text">
      Click the mic and walk through your approach.
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isInterviewer = message.role === "interviewer";
  return (
    <div className={`chat-msg ${isInterviewer ? "chat-msg-interviewer" : "chat-msg-candidate"}`}>
      <div className="chat-msg-header">
        <span className="chat-msg-avatar" aria-hidden>
          {isInterviewer ? "AI" : "YOU"}
        </span>
        <span className="chat-msg-role">{isInterviewer ? "Interviewer" : "You"}</span>
      </div>
      <div className="chat-msg-body">{message.content}</div>
    </div>
  );
}

function VoiceEmpty() {
  return (
    <div className="chat-empty">
      <div className="chat-empty-icon">
        <MicIcon />
      </div>
      <p className="chat-empty-title">Voice interview</p>
      <p className="chat-empty-sub">
        Click the mic below to speak. Your interviewer will hear you, think,
        and reply out loud. Code stays editable on the right the whole time.
      </p>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="chat-msg chat-msg-interviewer chat-msg-typing">
      <div className="chat-msg-header">
        <span className="chat-msg-avatar" aria-hidden>AI</span>
        <span className="chat-msg-role">Interviewer · thinking</span>
      </div>
      <div className="chat-typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function SpeakingBubble() {
  return (
    <div className="chat-msg chat-msg-interviewer voice-speaking-bubble">
      <div className="chat-msg-header">
        <span className="chat-msg-avatar" aria-hidden>AI</span>
        <span className="chat-msg-role">Interviewer · speaking</span>
      </div>
      <div className="voice-equalizer" aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  let message = `Mic error: ${error}`;
  if (error === "not-allowed")
    message = "Mic access was blocked. Allow microphone access in your browser settings.";
  else if (error === "no-speech")
    message = "Didn't hear anything. Click the mic and try again.";
  else if (error === "not-supported")
    message = "Voice recognition isn't available in this browser.";

  return <div className="voice-error">{message}</div>;
}

/* ---------- icons ---------- */

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 11a7 7 0 0014 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

export default VoicePanel;
