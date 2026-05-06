---
name: verify-pr
description: Run the project's automated PR test plan against a built copy of the app. Use when the user asks to "test a PR", "verify the test plan", "run the e2e tests", or check that a UI change works in a real browser. Drives Playwright via scripts/test-pr.mjs.
---

# verify-pr

Runs `scripts/test-pr.mjs` (Playwright + Chromium) against a Vite preview server and reports pass/fail per check.

## When to use

- User asks to verify a PR's test plan, run the browser tests, or confirm a UI change works.
- The script today only knows PR #1's bright-theme plan, but it's the project's only browser harness — use it for any PR that touches the theme toggle, page header, or `.card` styling.

## Steps

1. **Build first** — `npm run build`. This runs `tsc -b` so type errors fail before we spend time in the browser.
2. **Pick a free port.** Default is `4173`, but a sibling Vite project on this machine sometimes holds it; pick `4273` or similar if you see "Port 4173 is in use".
3. **Start preview in background:**
   ```sh
   npx vite preview --port <PORT> --strictPort &
   SERVER_PID=$!
   trap "kill $SERVER_PID 2>/dev/null || true" EXIT
   ```
   `--strictPort` is important — without it Vite silently binds to the next port and the test ends up loading whatever else is on `<PORT>`, which produces baffling failures (e.g. "toggle button not found").
4. **Wait for it:** poll `curl -fsS http://localhost:<PORT>/` for ~30s.
5. **Run the harness:** `node scripts/test-pr.mjs http://localhost:<PORT>/`. Exit code 0 means all 13 checks pass.

## Notes

- The script asserts exact hex colors (`#7c3aed`, `#93c5fd`, etc.). Any design tweak that changes those will fail tests — that's by design; either update the assertions or revert.
- Requires `public/data/snapshot.json` to exist; without it the page renders the error card. The bright-theme assertions will still pass (the error card is also a `.card`) but you're not actually testing what you think — re-run `npm run fetch-data` first if the file is missing.
- For interactive use against `npm run dev` instead of `vite preview`, just run `npm run test:pr` (no URL arg).
