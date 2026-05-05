export function fmtUsd(n: number | null, opts?: { compact?: boolean }): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (opts?.compact) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(n);
  }
  const digits = n < 1 ? 6 : n < 100 ? 4 : 2;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(n);
}

export function fmtPct(n: number | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

export function fmtNumber(n: number | null, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

export function fmtRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
