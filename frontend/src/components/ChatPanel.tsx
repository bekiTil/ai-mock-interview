// frontend/src/components/ChatPanel.tsx
//
// v1 redesign — proper chat UI.
//   - Message bubbles with role-differentiated styling
//   - Animated typing indicator while awaiting response
//   - Autoscroll on new message / typing state change
//   - Empty state explaining what to do
//   - Auto-resizing textarea (up to 140px)
//   - Enter sends, Shift+Enter inserts newline
//
// Props unchanged — drop-in replacement.

import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from "react";
import type { ChatMessage } from "../types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isSending: boolean;
}

function ChatPanel({ messages, onSend, isSending }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Autoscroll to bottom on new messages or when the typing indicator toggles.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isSending]);

  // Auto-resize textarea as user types (bounded).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isEmpty = messages.length === 0 && !isSending;

  return (
    <section className="chat-panel">
      <div className="chat-header">
        <span className="chat-header-label">
          <span className="chat-header-dot" />
          Interview
        </span>
        <span className="chat-header-hint">Enter to send · Shift+Enter for newline</span>
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {isEmpty && <ChatEmpty />}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}

        {isSending && <TypingIndicator />}
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or talk through your approach…"
          rows={1}
        />
        <button
          type="submit"
          className="chat-send"
          disabled={!draft.trim() || isSending}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </form>
    </section>
  );
}

/* ---------- subcomponents ---------- */

function MessageBubble({ message }: { message: ChatMessage }) {
  const isInterviewer = message.role === "interviewer";
  return (
    <div className={`chat-msg ${isInterviewer ? "chat-msg-interviewer" : "chat-msg-candidate"}`}>
      <div className="chat-msg-header">
        <span className="chat-msg-avatar" aria-hidden>
          {isInterviewer ? "AI" : "YOU"}
        </span>
        <span className="chat-msg-role">
          {isInterviewer ? "Interviewer" : "You"}
        </span>
      </div>
      <div className="chat-msg-body">{message.content}</div>
    </div>
  );
}

function ChatEmpty() {
  return (
    <div className="chat-empty">
      <div className="chat-empty-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
          <path
            d="M6 8A2 2 0 018 6h16a2 2 0 012 2v12a2 2 0 01-2 2H13l-5 4v-4H8a2 2 0 01-2-2V8z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="chat-empty-title">Your interviewer will appear here</p>
      <p className="chat-empty-sub">
        Talk through your approach, ask clarifying questions, and walk through
        edge cases before coding. Silent submits score 1/5 on communication.
      </p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-msg chat-msg-interviewer chat-msg-typing">
      <div className="chat-msg-header">
        <span className="chat-msg-avatar" aria-hidden>AI</span>
        <span className="chat-msg-role">Interviewer</span>
      </div>
      <div className="chat-typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 8L14 2L9.5 14L7.5 9L2 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default ChatPanel;