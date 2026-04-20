export interface RunResponse {
  stdout: string;
  stderr: string;
  runtime_ms: number;
}

export interface ChatMessage {
  role: 'interviewer' | 'candidate' | 'system';
  content: string;
}