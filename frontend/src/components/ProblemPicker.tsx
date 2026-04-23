
import { useEffect, useMemo, useState } from "react";

import {
  fetchProblemById,
  fetchRandomProblem,
  listProblems,
} from "../api/problems";
import type { Difficulty, ProblemSummary, PublicProblem } from "../types";

interface Props {
  isOpen: boolean;
  currentProblemId?: string;
  onClose: () => void;
  onPick: (problem: PublicProblem) => void;
}

// Known categories from the cleaned bank. Kept static so the dropdown is
// stable even before the summaries come back.
const CATEGORIES = [
  "Arrays & Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "1D DP",
];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

// Sentinel used for the Random button's loading state so we don't have to
// nullable-check a string against a separate boolean.
const RANDOM_LOADING = "__random__";

export default function ProblemPicker({
  isOpen,
  currentProblemId,
  onClose,
  onPick,
}: Props) {
  const [summaries, setSummaries] = useState<ProblemSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [diffFilter, setDiffFilter] = useState("");

  // --- Load the summary list the first time the modal opens --------------
  useEffect(() => {
    if (!isOpen) return;
    if (summaries.length > 0) return;

    let cancelled = false;
    setIsLoadingList(true);
    setError(null);

    listProblems()
      .then((list) => {
        if (!cancelled) setSummaries(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, summaries.length]);

  // --- Close on Escape ---------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // --- Filter + group ----------------------------------------------------
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return summaries.filter((p) => {
      if (catFilter && p.category !== catFilter) return false;
      if (diffFilter && p.difficulty !== diffFilter) return false;
      if (needle && !p.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [summaries, search, catFilter, diffFilter]);

  const grouped = useMemo(() => {
    const byCat = new Map<string, ProblemSummary[]>();
    for (const p of filtered) {
      const arr = byCat.get(p.category) ?? [];
      arr.push(p);
      byCat.set(p.category, arr);
    }
    return Array.from(byCat.entries());
  }, [filtered]);

  // --- Handlers ----------------------------------------------------------
  async function handlePickId(id: string) {
    if (id === currentProblemId) {
      onClose();
      return;
    }
    setSelectingId(id);
    setError(null);
    try {
      const full = await fetchProblemById(id);
      onPick(full);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSelectingId(null);
    }
  }

  async function handleRandom() {
    setSelectingId(RANDOM_LOADING);
    setError(null);
    try {
      const random = await fetchRandomProblem({
        category: catFilter || undefined,
        difficulty: diffFilter || undefined,
        exclude: currentProblemId ? [currentProblemId] : undefined,
      });
      onPick(random);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSelectingId(null);
    }
  }

  if (!isOpen) return null;

  const isBusy = selectingId !== null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content picker-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pick a problem"
      >
        <div className="modal-header">
          <h2>Pick a problem</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="picker-filters">
          <input
            type="text"
            className="picker-search"
            placeholder="Search problems…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="picker-select"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={diffFilter}
            onChange={(e) => setDiffFilter(e.target.value)}
            className="picker-select"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button
            className="picker-random"
            onClick={handleRandom}
            disabled={isBusy}
          >
            {selectingId === RANDOM_LOADING ? "Loading…" : "Random"}
          </button>
        </div>

        {error && <p className="picker-error">Error: {error}</p>}

        <div className="picker-list">
          {isLoadingList ? (
            <p className="picker-loading">Loading problems…</p>
          ) : filtered.length === 0 ? (
            <p className="picker-empty">No problems match your filters.</p>
          ) : (
            grouped.map(([cat, items]) => (
              <div key={cat} className="picker-group">
                <h3 className="picker-group-title">{cat}</h3>
                {items.map((p) => {
                  const isCurrent = p.id === currentProblemId;
                  const isLoading = selectingId === p.id;
                  return (
                    <button
                      key={p.id}
                      className={
                        "picker-item" +
                        (isCurrent ? " picker-item-current" : "")
                      }
                      onClick={() => handlePickId(p.id)}
                      disabled={isBusy}
                    >
                      <span className="picker-item-title">
                        {p.title}
                        {isCurrent && " (current)"}
                      </span>
                      <span
                        className={`difficulty-badge difficulty-${p.difficulty}`}
                      >
                        {p.difficulty}
                      </span>
                      {isLoading && (
                        <span className="picker-item-spinner">…</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
