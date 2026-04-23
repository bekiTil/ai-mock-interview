import { apiPost } from "./client";
import type { ChatMessage } from "../types";

export interface ProblemContext {
  title: string;
  description: string;
}


interface InterviewTurnRequest {
  history: ChatMessage[];
  code?: string;
  problem_title?: string;
  problem_description?: string;
}

interface InterviewTurnResponse {
  message: string;
}


/**
 * Send the conversation history (and optionally the current code)
 * to the backend and get the interviewer's next message back.
 *
 * The frontend owns the conversation; the backend is stateless.
 * The `code` param gives the interviewer situational awareness of
 * what the candidate has written in the editor so far.
 */
export async function sendTurn(
  history: ChatMessage[],
  code?: string,
  problem?: ProblemContext
): Promise<string> {
  const response = await apiPost<InterviewTurnRequest, InterviewTurnResponse>(
    "/interview/turn",
    { 
      history, 
      code, 
      problem_title: problem?.title, 
      problem_description: 
      problem?.description 
    }
  );
  return response.message;
}