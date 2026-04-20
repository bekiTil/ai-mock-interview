interface HeaderProps {
  problemTitle: string;
}

export default function Header({ problemTitle }: HeaderProps) {
  return (
    <header className="app-header">
      <h1>AI Mock Interview</h1>
      <span className="problem-title">{problemTitle}</span>
    </header>
  );
}