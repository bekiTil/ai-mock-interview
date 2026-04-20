import type { ReactNode } from 'react';

interface ProblemStatementProps {
  title: string;
  description: ReactNode;
  example: string;
}

export default function ProblemStatement({
  title,
  description,
  example,
}: ProblemStatementProps) {
  return (
    <div className="problem-statement">
      <h2>{title}</h2>
      {description}
      <h3>Example</h3>
      <pre>{example}</pre>
    </div>
  );
}