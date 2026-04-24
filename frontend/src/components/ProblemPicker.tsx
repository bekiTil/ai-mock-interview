// frontend/src/components/ProblemPicker.tsx
//
// v1.1 — two fixes on top of v1:
//
//   1. Uses the existing `listProblems()` API (returns ProblemSummary[]),
//      not the non-existent `fetchProblems()`. The list endpoint is
//      lightweight (id, title, category, difficulty) — that's all the
//      picker needs.
//
//   2. Passes a ProblemSummary (not a full PublicProblem) to onPick.
//      The parent is responsible for calling fetchProblemById() to
//      hydrate the full problem (with examples + starter_code + etc.)
//      before setting it as the active problem. That's what caused
//      the `Cannot read properties of undefined (reading 'map')` crash
//      — the picker was handing back a half-populated object that
//      `formatExamples` then tried to map over.
//
// Props changed: `onPick` now receives a `ProblemSummary`.

import { useEffect, useMemo, useRef, useState } from "react";

import { listProblems } from "../api/problems";
import type { ProblemSummary } from "../types";

interface ProblemPickerProps {
  isOpen: boolean;
  currentProblemId?: string;
  onClose: () => void;
  onPick: (problem: ProblemSummary) => void;
}

function ProblemPicker({
  isOpen,
  currentProblemId,
  onClose,
  onPick,
}: ProblemPickerProps) {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");

  const searchRef = useRef<HTMLInputElement | null>(null);

  // ---- Fetch problems on open ----
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const list = await listProblems();
        if (!cancelled) setProblems(list);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // ---- ESC closes, focus search on open ----
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => searchRef.current?.focus(), 40);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  // ---- Derived data ----
  const categories = useMemo(() => {
    const set = new Set<string>();
    problems.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [problems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q)) return false;
      const pcat = p.category ?? "Other";
      if (category !== "all" && pcat !== category) return false;
      const pdiff = String(p.difficulty).toLowerCase();
      if (difficulty !== "all" && pdiff !== difficulty) return false;
      return true;
    });
  }, [problems, query, category, difficulty]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProblemSummary[]>();
    filtered.forEach((p) => {
      const key = p.category ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // ---- Actions ----
  function pickRandom() {
    if (filtered.length === 0) return;
    const choice = filtered[Math.floor(Math.random() * filtered.length)];
    onPick(choice);
    onClose();
  }

  function handlePick(p: ProblemSummary) {
    onPick(p);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div
        className="picker-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
      >
        <div className="picker-header">
          <div>
            <h2 id="picker-title" className="picker-title">Pick a problem</h2>
            <p className="picker-sub">
              {loading
                ? "Loading…"
                : `${filtered.length} of ${problems.length} problems`}
            </p>
          </div>
          <button
            className="picker-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="picker-filters">
          <div className="picker-search">
            <SearchIcon />
            <input
              ref={searchRef}
              className="picker-search-input"
              type="text"
              placeholder="Search problems…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="picker-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                type="button"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          <select
            className="picker-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="picker-select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <button
            className="picker-random"
            onClick={pickRandom}
            disabled={filtered.length === 0 || loading}
            type="button"
          >
            <ShuffleIcon />
            <span>Random</span>
          </button>
        </div>

        <div className="picker-body">
          {loading && (
            <div className="picker-state">Loading problems…</div>
          )}
          {error && !loading && (
            <div className="picker-state picker-state-error">
              Couldn't load problems: {error}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="picker-state">
              No problems match your filters.
            </div>
          )}

          {!loading && !error && grouped.map(([cat, list]) => (
            <div key={cat} className="picker-group">
              <div className="picker-group-header">
                <span className="picker-group-name">{cat}</span>
                <span className="picker-group-count">{list.length}</span>
              </div>
              <ul className="picker-items">
                {list.map((p) => {
                  const isCurrent = p.id === currentProblemId;
                  const diffClass = String(p.difficulty).toLowerCase();
                  const diffLabel =
                    diffClass.charAt(0).toUpperCase() + diffClass.slice(1);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`picker-item ${isCurrent ? "current" : ""}`}
                        onClick={() => handlePick(p)}
                      >
                        <span className="picker-item-left">
                          <span className="picker-item-title">{p.title}</span>
                          {isCurrent && (
                            <span className="picker-item-current-tag">current</span>
                          )}
                        </span>
                        <span className={`diff-chip diff-${diffClass}`}>
                          {diffLabel}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="picker-footer">
          <span className="picker-footer-hint">
            <kbd>Esc</kbd> to close · <kbd>↑↓</kbd> to scroll
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- icons ---------- */

function SearchIcon() {
  return (
    <svg
      className="picker-search-icon"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M11 3L13 5L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 7L13 9L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 5H4L8 9H13M1 9H4L5 8M8 5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default ProblemPicker;