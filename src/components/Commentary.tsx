interface Props { text: string; generatedAt: string; }

export function Commentary({ text, generatedAt }: Props) {
  const date = new Date(generatedAt);
  const dateLabel = Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'unknown';
  return (
    <div className="card commentary">
      <h2>Daily Commentary</h2>
      <p>{text}</p>
      <p className="muted small">Snapshot generated {dateLabel}</p>
    </div>
  );
}
