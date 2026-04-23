import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent } from "react";
import type { ChatMessage } from "../types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isSending: boolean;
}

// Render a message's content, turning `backtick` spans into <code>.
// This is deliberately simple — we're not parsing full markdown,
// just the one thing that matters for interview conversations.
function renderContent(content: string) {
  const parts = content.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={i} className="chat-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function ChatPanel({ messages, onSend, isSending }: ChatPanelProps) {
  const [draft, setDraft] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the bottom on new messages or thinking state.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // Auto-focus the input the moment it becomes enabled.
  // (It starts disabled during the initial greeting.)
  useEffect(() => {
    if (!isSending && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSending]);

  // Timestamps: we generate one when the component sees each new
  // message, not when the message was created. For a session that
  // lives only in memory, this is close enough and avoids changing
  // the ChatMessage schema.
  const messageTimes = useRef<Map<number, string>>(new Map());
  messages.forEach((_, idx) => {
    if (!messageTimes.current.has(idx)) {
      messageTimes.current.set(idx, formatTime(new Date()));
    }
  });

  function handleSendClick() {
    if (!draft.trim() || isSending) return;
    onSend(draft);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  }

  // The very first render has zero messages AND isSending=true
  // because the greeting is in flight. We show a distinct
  // "connecting" state so the panel isn't just an empty void.
  const isInitialGreeting = messages.length === 0 && isSending;

  return (
    <div className="chat-panel">
      <div className="chat-messages" ref={scrollRef}>
        {isInitialGreeting && (
          <div className="chat-connecting">
            <div className="chat-role">Interviewer</div>
            <div className="chat-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {!isInitialGreeting && messages.length === 0 && (
          <div className="chat-empty">Waiting for interviewer…</div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message chat-${msg.role}`}>
            <div className="chat-meta">
              <span className="chat-role">
                {msg.role === "interviewer" ? "Interviewer" : "You"}
              </span>
              <span className="chat-time">
                {messageTimes.current.get(idx) ?? ""}
              </span>
            </div>
            <div className="chat-content">{renderContent(msg.content)}</div>
          </div>
        ))}

        {isSending && !isInitialGreeting && (
          <div className="chat-message chat-interviewer chat-thinking">
            <div className="chat-meta">
              <span className="chat-role">Interviewer</span>
            </div>
            <div className="chat-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isSending
              ? "Waiting for interviewer…"
              : "Ask a question or talk through your approach…"
          }
          disabled={isSending}
          rows={2}
        />
        <button
          className="chat-send"
          onClick={handleSendClick}
          disabled={!draft.trim() || isSending}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatPanel;