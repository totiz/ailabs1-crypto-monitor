// Automated test of PR #1 test plan (bright theme toggle).
// Run: node scripts/test-pr.mjs [url]
// Default URL: http://localhost:5173/

import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:5173/';

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}${detail ? ` — ${detail}` : ''}`);
}

function rgbToHex(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return rgb;
  return '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('');
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Baseline: default theme
  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme || '');
  record('starts in default (dark) theme', initialTheme !== 'bright',
    `data-theme="${initialTheme}"`);

  const toggle = page.locator('button.theme-toggle');
  await toggle.waitFor();

  const initialLabel = (await toggle.textContent())?.trim() || '';
  record('toggle button shows ☀️ Bright in default mode', initialLabel.includes('Bright'),
    `label="${initialLabel}"`);

  // ── Test 1: click ☀️ Bright switches theme + applies gradient bg + accent ──
  await toggle.click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'bright');

  const bgImage = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundImage);
  record('1. bright theme applies gradient background',
    bgImage.includes('linear-gradient'),
    `background-image="${bgImage.slice(0, 80)}…"`);

  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  record('1. accent color switches to purple #7c3aed',
    accent.toLowerCase() === '#7c3aed',
    `--accent="${accent}"`);

  const labelAfterBright = (await toggle.textContent())?.trim() || '';
  record('1. toggle now shows 🌙 Dark', labelAfterBright.includes('Dark'),
    `label="${labelAfterBright}"`);

  // ── Test 4: cards have shadow + colored border in bright mode ──
  await page.waitForSelector('.card', { timeout: 5000 }).catch(() => {});
  const card = page.locator('.card').first();
  const cardCount = await page.locator('.card').count();
  if (cardCount > 0) {
    const cardStyles = await card.evaluate(el => {
      const cs = getComputedStyle(el);
      return { boxShadow: cs.boxShadow, borderColor: cs.borderColor };
    });
    record('4. cards have non-empty box-shadow in bright mode',
      cardStyles.boxShadow && cardStyles.boxShadow !== 'none',
      `box-shadow="${cardStyles.boxShadow}"`);
    const borderHex = rgbToHex(cardStyles.borderColor).toLowerCase();
    record('4. card border-color is light blue #93c5fd',
      borderHex === '#93c5fd',
      `border-color=${cardStyles.borderColor} (${borderHex})`);
  } else {
    record('4. cards present', false, 'no .card elements found — snapshot data likely missing');
  }

  // ── Test 5: title shows gradient text in bright mode ──
  const h1 = page.locator('.page__head h1').first();
  const h1Styles = await h1.evaluate(el => {
    const cs = getComputedStyle(el);
    return {
      backgroundImage: cs.backgroundImage,
      webkitTextFillColor: cs.webkitTextFillColor,
      backgroundClip: cs.backgroundClip || cs.webkitBackgroundClip,
    };
  });
  const hasGradient = h1Styles.backgroundImage.includes('linear-gradient');
  const isTransparent = h1Styles.webkitTextFillColor.includes('rgba(0, 0, 0, 0)') ||
                        h1Styles.webkitTextFillColor === 'transparent';
  record('5. title has gradient background-image', hasGradient,
    `background-image="${h1Styles.backgroundImage.slice(0, 80)}…"`);
  record('5. title text-fill-color is transparent (gradient shows through)',
    isTransparent, `-webkit-text-fill-color="${h1Styles.webkitTextFillColor}"`);

  // ── Test 2: click 🌙 Dark returns to default ──
  await toggle.click();
  await page.waitForFunction(() => document.documentElement.dataset.theme !== 'bright');
  const themeAfterDark = await page.evaluate(() => document.documentElement.dataset.theme || '');
  const bgAfterDark = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor);
  record('2. clicking 🌙 Dark removes bright theme',
    themeAfterDark !== 'bright',
    `data-theme="${themeAfterDark}"`);
  record('2. background reverts (no gradient image)',
    !(await page.evaluate(() => getComputedStyle(document.body).backgroundImage))
      .includes('linear-gradient'),
    `bg-color="${bgAfterDark}"`);

  // ── Test 3: localStorage persists across reload ──
  // Set bright, reload, expect bright restored
  await toggle.click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'bright');
  const stored = await page.evaluate(() => localStorage.getItem('theme'));
  record('3. localStorage["theme"] = "bright" after toggle', stored === 'bright',
    `stored="${stored}"`);

  await page.reload({ waitUntil: 'networkidle' });
  const themeAfterReload = await page.evaluate(() =>
    document.documentElement.dataset.theme || '');
  record('3. theme restored to bright after reload',
    themeAfterReload === 'bright',
    `data-theme="${themeAfterReload}"`);

  // Cleanup: switch back to default for a clean state
  const toggle2 = page.locator('button.theme-toggle');
  await toggle2.click();
} catch (e) {
  console.error('Unexpected error:', e);
  record('test harness', false, e.message);
} finally {
  await browser.close();
}

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log('\nFailures:');
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
