import { useEffect, useState } from 'react';
import { Snapshot } from './types';
import { TokenCard } from './components/TokenCard';
import { RankingTable } from './components/RankingTable';
import { NewsList } from './components/NewsList';
import { Commentary } from './components/Commentary';

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; snapshot: Snapshot };

export function App() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}data/snapshot.json?t=${Date.now()}`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<Snapshot>; })
      .then(snapshot => setState({ status: 'ready', snapshot }))
      .catch(e => setState({ status: 'error', error: e.message }));
  }, []);

  return (
    <div className="page">
      <header className="page__head">
        <h1>Crypto Top Market — Daily Analysis</h1>
        <p className="muted">BTC · ETH · BNB · SOL · PENGU — refreshed once a day.</p>
      </header>
      {state.status === 'loading' && <p>Loading snapshot…</p>}
      {state.status === 'error' && (
        <div className="card error">
          <strong>Could not load snapshot.</strong>
          <p className="muted">{state.error}</p>
          <p className="muted small">Run <code>npm run fetch-data</code> to seed <code>public/data/snapshot.json</code>.</p>
        </div>
      )}
      {state.status === 'ready' && (
        <>
          <Commentary text={state.snapshot.commentary} generatedAt={state.snapshot.generatedAt} />
          <section className="grid">
            {state.snapshot.tokens.map(t => <TokenCard key={t.symbol} token={t} />)}
          </section>
          <RankingTable tokens={state.snapshot.tokens} />
          <NewsList tokens={state.snapshot.tokens} />
          <footer className="page__foot muted small">
            Sources: {state.snapshot.sources.join(', ')}. Not financial advice.
          </footer>
        </>
      )}
    </div>
  );
}
