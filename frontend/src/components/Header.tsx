// frontend/src/components/Header.tsx
//
// v1 redesign — polished app header.
// Props unchanged from your current Header so this is a drop-in replacement.

import { Link } from "react-router-dom";

interface HeaderProps {
  problemTitle: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  onSwitchProblem: () => void;
}

function Header({ problemTitle, difficulty, onSwitchProblem }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <Link to="/" className="app-brand" aria-label="Back to landing">
          <LogoMark />
          <span>mock-with-ai</span>
        </Link>

        <span className="app-header-sep" aria-hidden="true">/</span>

        <div className="app-problem-title">
          <span className="app-problem-label">Problem</span>
          <span className="app-problem-name">{problemTitle}</span>
          {difficulty && <DifficultyChip level={difficulty} />}
        </div>
      </div>

      <div className="app-header-right">
        <button
          className="app-switch-button"
          onClick={onSwitchProblem}
          type="button"
        >
          <ShuffleIcon />
          <span>New problem</span>
        </button>
      </div>
    </header>
  );
}

function DifficultyChip({ level }: { level: "Easy" | "Medium" | "Hard" }) {
  const cls =
    level === "Easy"
      ? "diff-chip diff-easy"
      : level === "Medium"
      ? "diff-chip diff-medium"
      : "diff-chip diff-hard";
  return <span className={cls}>{level}</span>;
}

function LogoMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="2" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 7.5L10 11L14 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12L10 15.5L14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M11 3L13 5L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 7L13 9L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 5H4L8 9H13M1 9H4L5 8M8 5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default Header;