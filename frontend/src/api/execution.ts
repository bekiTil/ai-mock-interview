import { apiPost } from './client';
import type { RunResponse, RunTestsResponse } from '../types';

interface RunRequest {
  code: string;
  stdin?: string;
}

interface RunTestsRequest {
  problem_id: string;
  code: string;
}

export async function runCode(
  code: string,
  stdin?: string
): Promise<RunResponse> {
  return apiPost<RunRequest, RunResponse>('/run', { code, stdin });
}

export async function runTests(
  problemId: string,
  code: string,
): Promise<RunTestsResponse> {
  return apiPost<RunTestsRequest, RunTestsResponse>("/run-tests", {
    problem_id: problemId,
    code,
  });
}