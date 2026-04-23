export interface RunResponse {
  stdout: string;
  stderr: string;
  runtime_ms: number;
  output: string;
}
export type ChatRole = "candidate" | "interviewer" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type Difficulty = "easy" | "medium" | "hard";


export interface FunctionParam {
  name: string;
  type: string
}
export interface FunctionSignature {
  name: string;
  params: FunctionParam[];
  returns: string;
}
 
export interface Example {
  input: string;
  output: string;
  explanation?: string | null;
}
 
export interface PublicProblem {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  description: string;
  examples: Example[];
  constraints: string[];
  function_signature: FunctionSignature;
  starter_code: string;
}
 
export interface ProblemSummary {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
}

export interface TestCaseResult {
  case_index: number;
  passed: boolean;
  input: unknown[];
  expected: unknown;
  got: unknown;
  error: string | null;
}
 
export interface RunTestsResponse {
  problem_id: string;
  total: number;
  passed: number;
  results: TestCaseResult[];
  stdout_tail: string | null;
  stderr_tail: string | null;
  compile_error: string | null;
  runtime_ms: number;
  timed_out: boolean;
}

export type EvalVerdict = "strong" | "solid" | "needs_work" | "not_ready";
 
export interface Evaluation {
  verdict: EvalVerdict;
  correctness: number;     // 1-5
  code_quality: number;    // 1-5
  communication: number;   // 1-5
  problem_solving: number; // 1-5
  strengths: string[];
  weaknesses: string[];
  summary: string;
}
 
export interface SubmitResponse {
  problem_id: string;
  test_results: RunTestsResponse;
  evaluation: Evaluation | null;
  evaluation_error: string | null;
}
 