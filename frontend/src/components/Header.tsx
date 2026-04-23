interface HeaderProps {
  problemTitle: string;
  onSwitchProblem?: () => void;
}

export default function Header({ problemTitle, onSwitchProblem }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="header-title">{problemTitle}</h1>
      {onSwitchProblem && (
        <button className="header-button" onClick={onSwitchProblem}>
          New Problem
        </button>
      )}
    </header>
  );
}