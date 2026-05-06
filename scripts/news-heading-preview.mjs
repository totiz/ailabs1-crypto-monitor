// Renders the live page, screenshots the "Latest News by Token" card four times:
// once as-is, then with three different heading-style variants injected.
// Output: docs/previews/news-heading/news-{baseline,v1-bold,v2-uppercase,v3-accent-bar}.png

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const URL = 'http://localhost:5173/';
const OUT = 'docs/previews/news-heading';

const variants = {
  'v1-bold': `
    .news-col h3 {
      color: var(--text);
      font-size: 16px;
      font-weight: 600;
    }
  `,
  'v2-uppercase': `
    .news-col h3 {
      color: var(--text);
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
  `,
  'v3-accent-bar': `
    .news-col h3 {
      color: var(--text);
      font-size: 16px;
      font-weight: 600;
      border-left: 3px solid var(--accent);
      padding-left: 8px;
      margin-left: -11px;
    }
  `,
};

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 1400 } });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: 'networkidle' });
// Find the news card (the one whose h2 is "Latest News by Token")
const card = page.locator('.card', { hasText: 'Latest News by Token' });
await card.waitFor();

await card.screenshot({ path: `${OUT}/news-baseline.png` });
console.log(`baseline → ${OUT}/news-baseline.png`);

for (const [name, css] of Object.entries(variants)) {
  const handle = await page.addStyleTag({ content: css });
  await card.screenshot({ path: `${OUT}/news-${name}.png` });
  console.log(`${name} → ${OUT}/news-${name}.png`);
  await handle.evaluate(el => el.remove());
}

await browser.close();
