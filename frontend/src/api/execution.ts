import { apiPost } from './client';
import type { RunResponse } from '../types';

interface RunRequest {
  code: string;
  stdin?: string;
}

export async function runCode(
  code: string,
  stdin?: string
): Promise<RunResponse> {
  return apiPost<RunRequest, RunResponse>('/run', { code, stdin });
}