import { TokenSnapshot } from '../types';
import { fmtUsd, fmtPct, fmtNumber } from '../lib/format';
import { Sparkline } from './Sparkline';

interface Props { token: TokenSnapshot; }

function rsiVerdict(rsi: number | null): { label: string; tone: 'pos' | 'neg' | 'neu' } {
  if (rsi == null) return { label: '—', tone: 'neu' };
  if (rsi >= 70) return { label: 'Overbought', tone: 'neg' };
  if (rsi <= 30) return { label: 'Oversold', tone: 'pos' };
  return { label: 'Neutral', tone: 'neu' };
}

function trendVerdict(t: TokenSnapshot): { label: string; tone: 'pos' | 'neg' | 'neu' } {
  const { ma7, ma30 } = t.indicators;
  if (ma7 == null || ma30 == null) return { label: '—', tone: 'neu' };
  if (ma7 > ma30 * 1.005) return { label: 'Uptrend (MA7 > MA30)', tone: 'pos' };
  if (ma7 < ma30 * 0.995) return { label: 'Downtrend (MA7 < MA30)', tone: 'neg' };
  return { label: 'Sideways', tone: 'neu' };
}

export function TokenCard({ token }: Props) {
  const { market, indicators } = token;
  const change24 = market.priceChange24h;
  const change7 = market.priceChange7d;
  const rsi = rsiVerdict(indicators.rsi14);
  const trend = trendVerdict(token);
  return (
    <article className="card token-card">
      <header className="token-card__head">
        <div>
          <h3>{token.symbol} <span className="muted">{token.name}</span></h3>
          <div className="token-card__price">{fmtUsd(market.price)}</div>
        </div>
        <Sparkline values={token.sparkline} />
      </header>
      <div className="token-card__row">
        <span className={`pct ${change24 != null && change24 >= 0 ? 'pos' : 'neg'}`}>24h {fmtPct(change24)}</span>
        <span className={`pct ${change7 != null && change7 >= 0 ? 'pos' : 'neg'}`}>7d {fmtPct(change7)}</span>
      </div>
      <dl className="token-card__metrics">
        <div><dt>Market cap</dt><dd>{fmtUsd(market.marketCap, { compact: true })}</dd></div>
        <div><dt>Volume 24h</dt><dd>{fmtUsd(market.volume24h, { compact: true })}</dd></div>
        <div><dt>Rank</dt><dd>{market.marketCapRank ?? '—'}</dd></div>
        <div><dt>From ATH</dt><dd>{fmtPct(market.athChangePct)}</dd></div>
      </dl>
      <div className="token-card__indicators">
        <div>
          <span className="muted">RSI(14)</span>
          <strong>{fmtNumber(indicators.rsi14, 1)}</strong>
          <span className={`tag tag-${rsi.tone}`}>{rsi.label}</span>
        </div>
        <div>
          <span className="muted">MA7 / MA30</span>
          <strong>{fmtUsd(indicators.ma7)} / {fmtUsd(indicators.ma30)}</strong>
          <span className={`tag tag-${trend.tone}`}>{trend.label}</span>
        </div>
        <div>
          <span className="muted">Vol (30d, ann.)</span>
          <strong>{indicators.volatility30d != null ? `${(indicators.volatility30d * 100).toFixed(1)}%` : '—'}</strong>
        </div>
      </div>
    </article>
  );
}
