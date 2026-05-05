interface Props {
  values: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ values, width = 160, height = 40 }: Props) {
  if (!values.length) return <svg width={width} height={height} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const up = values[values.length - 1] >= values[0];
  const stroke = up ? '#16a34a' : '#dc2626';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline fill="none" stroke={stroke} strokeWidth="1.6" points={points} />
    </svg>
  );
}
