import { TokenSnapshot } from '../types';
import { fmtRelativeTime } from '../lib/format';

interface Props { tokens: TokenSnapshot[]; }

export function NewsList({ tokens }: Props) {
  return (
    <div className="card">
      <h2>Latest News by Token</h2>
      <div className="news-grid">
        {tokens.map(t => (
          <section key={t.symbol} className="news-col">
            <h3>{t.symbol}</h3>
            {t.news.items.length === 0 ? (
              <p className="muted">No recent items.</p>
            ) : (
              <ul>
                {t.news.items.map(n => {
                  const tone = n.sentimentScore > 0 ? 'pos' : n.sentimentScore < 0 ? 'neg' : 'neu';
                  return (
                    <li key={n.url}>
                      <a href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a>
                      <div className="news-meta">
                        <span className="muted">{n.source} · {fmtRelativeTime(n.publishedAt)}</span>
                        <span className={`tag tag-${tone}`}>{n.sentimentScore > 0 ? '+' : ''}{n.sentimentScore}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
