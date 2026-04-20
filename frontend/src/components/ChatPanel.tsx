import type { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
}

function labelFor(role: ChatMessage['role']): string {
  if (role === 'interviewer') return 'Interviewer:';
  if (role === 'candidate') return 'You:';
  return '';
}

export default function ChatPanel({ messages }: ChatPanelProps) {
  return (
    <div className="chat-messages">
      {messages.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          <strong>{labelFor(msg.role)}</strong> {msg.content}
        </div>
      ))}
    </div>
  );
}