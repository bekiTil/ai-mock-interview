import { apiGet } from "./client";
import type { ProblemSummary, PublicProblem } from "../types";
 
interface RandomOpts {
  category?: string;
  difficulty?: string;
  exclude?: string[];
}
 
interface ListOpts {
  category?: string;
  difficulty?: string;
}

function buildQuery(parts: Record<string, string | undefined>): string {
  const entries = Object.entries(parts).filter(
    ([, v]) => v !== undefined && v !== ""
  ) as [string, string][];
  if (entries.length === 0) return "";
  const qs = new URLSearchParams(entries).toString();
  return `?${qs}`;
}
 
export function fetchRandomProblem(opts: RandomOpts = {}): Promise<PublicProblem> {
  const qs = buildQuery({
    category: opts.category,
    difficulty: opts.difficulty,
    exclude: opts.exclude?.length ? opts.exclude.join(",") : undefined,
  });
  return apiGet<PublicProblem>(`/problems/random${qs}`);
}
 
export function fetchProblemById(id: string): Promise<PublicProblem> {
  return apiGet<PublicProblem>(`/problems/${encodeURIComponent(id)}`);
}
 
export function listProblems(opts: ListOpts = {}): Promise<ProblemSummary[]> {
  const qs = buildQuery({
    category: opts.category,
    difficulty: opts.difficulty,
  });
  return apiGet<ProblemSummary[]>(`/problems${qs}`);
}

export async function fetchProblems(): Promise<PublicProblem[]> {
     return apiGet<PublicProblem[]>("/problems");
   }
 
export interface BankStats {
  total: number;
  by_category: Record<string, number>;
  by_difficulty: Record<string, number>;
  version: string;
}
 
export function fetchBankStats(): Promise<BankStats> {
  return apiGet<BankStats>("/problems/stats");
}