# Crypto Top Market — Daily Analysis

Static dashboard showing daily-refreshed market data for BTC, ETH, BNB, SOL, PENGU. Vite + React + TypeScript, deployed to GitHub Pages.

## Data flow

- `scripts/update-data.mjs` pulls market data from CoinGecko and headlines from Google News RSS, computes RSI / moving averages / volatility / sentiment, and writes `public/data/snapshot.json`.
- At runtime, `src/App.tsx` fetches `${BASE_URL}data/snapshot.json` (the `BASE_URL` makes it work both at `/` locally and at `/<repo>/` on Pages).
- `.github/workflows/daily-update.yml` runs `fetch-data → build → deploy-pages` daily at 06:15 UTC.

## Layout

```
src/
  App.tsx              # top-level UI; theme toggle + snapshot loader
  components/          # TokenCard, RankingTable, NewsList, Commentary
  index.css            # design tokens via :root and [data-theme="bright"]
public/data/snapshot.json   # generated, served as a static asset
scripts/
  update-data.mjs      # daily refresh script
  test-pr.mjs          # Playwright harness for PR test plans (currently #1)
.github/workflows/
  daily-update.yml     # cron + Pages deploy
  ci.yml               # PR gate: build + test:pr
```

## Commands

| | |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | `tsc -b && vite build` (type-check + bundle) |
| `npm run preview` | Serve `dist/` (default :4173 — pass `--port N --strictPort` if collision) |
| `npm run fetch-data` | Refresh `public/data/snapshot.json` locally |
| `npm run test:pr` | Playwright check of the bright-theme PR plan; expects a server already running on :5173, or pass a URL: `node scripts/test-pr.mjs http://localhost:N/` |

## Workflow rules

- **Direct push to `main` is blocked by the agent harness**, regardless of explicit user authorization. Always feature branch + `gh pr create`.
- **Do not author commits with the repo owner's identity**, even with their permission — the harness treats it as impersonation and denies the commit. Use a Claude identity per-commit via env vars (do **not** modify `git config`):
  ```sh
  GIT_AUTHOR_NAME=Claude GIT_AUTHOR_EMAIL=noreply@anthropic.com \
    GIT_COMMITTER_NAME=Claude GIT_COMMITTER_EMAIL=noreply@anthropic.com \
    git commit -m "..."
  ```
- Squash-merge with `--delete-branch` is the convention.
- The base path for Pages is set via the `BASE_PATH` env var read by `vite.config.ts`. Local builds without it serve from `/`.
