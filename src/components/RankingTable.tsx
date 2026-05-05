import { TokenSnapshot } from '../types';
import { fmtPct, fmtUsd } from '../lib/format';

interface Props { tokens: TokenSnapshot[]; }

export function RankingTable({ tokens }: Props) {
  const sorted = [...tokens].sort((a, b) => (b.market.priceChange24h ?? -Infinity) - (a.market.priceChange24h ?? -Infinity));
  return (
    <div className="card">
      <h2>24h Performance Ranking</h2>
      <table className="ranking">
        <thead>
          <tr><th>#</th><th>Token</th><th>Price</th><th>24h</th><th>7d</th><th>RSI(14)</th><th>News</th></tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => {
            const sent = t.news.sentiment;
            const sentLabel = sent > 0.5 ? 'positive' : sent < -0.5 ? 'negative' : 'neutral';
            const sentTone = sent > 0.5 ? 'pos' : sent < -0.5 ? 'neg' : 'neu';
            return (
              <tr key={t.symbol}>
                <td>{i + 1}</td>
                <td><strong>{t.symbol}</strong> <span className="muted">{t.name}</span></td>
                <td>{fmtUsd(t.market.price)}</td>
                <td className={t.market.priceChange24h != null && t.market.priceChange24h >= 0 ? 'pos' : 'neg'}>{fmtPct(t.market.priceChange24h)}</td>
                <td className={t.market.priceChange7d != null && t.market.priceChange7d >= 0 ? 'pos' : 'neg'}>{fmtPct(t.market.priceChange7d)}</td>
                <td>{t.indicators.rsi14 != null ? t.indicators.rsi14.toFixed(1) : '—'}</td>
                <td><span className={`tag tag-${sentTone}`}>{sentLabel}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
