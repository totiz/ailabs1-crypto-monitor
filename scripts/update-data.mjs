// Daily data refresh: pulls market + history from CoinGecko and news from Google News RSS,
// computes RSI/MA/volatility/sentiment, and writes public/data/snapshot.json.
// Run: `npm run fetch-data`

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'data', 'snapshot.json');

const TOKENS = [
  { symbol: 'BTC',   id: 'bitcoin',        name: 'Bitcoin',        binance: 'BTCUSDT',   query: 'bitcoin price' },
  { symbol: 'ETH',   id: 'ethereum',       name: 'Ethereum',       binance: 'ETHUSDT',   query: 'ethereum price' },
  { symbol: 'BNB',   id: 'binancecoin',    name: 'BNB',            binance: 'BNBUSDT',   query: 'BNB binance coin' },
  { symbol: 'SOL',   id: 'solana',         name: 'Solana',         binance: 'SOLUSDT',   query: 'solana SOL crypto' },
  { symbol: 'PENGU', id: 'pudgy-penguins', name: 'Pudgy Penguins', binance: 'PENGUUSDT', query: 'pudgy penguins PENGU token' },
];

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'crypto-dashboard/0.1 (+github.com)' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function fetchWithRetry(url, attempts = 6) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await fetchJson(url); }
    catch (e) {
      last = e;
      // Longer backoff specifically because CoinGecko's free tier
      // returns 429 aggressively when a per-minute window is exhausted.
      const delay = 4000 * Math.pow(2, i);
      console.warn(`fetch failed (${e.message}); retry in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw last;
}

function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rsi(values, period = 14) {
  if (values.length <= period) return null;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - 100 / (1 + rs);
}

function annualizedVolatility(values, period = 30) {
  if (values.length <= period) return null;
  const slice = values.slice(-period - 1);
  const rets = [];
  for (let i = 1; i < slice.length; i++) rets.push(Math.log(slice[i] / slice[i - 1]));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * Math.sqrt(365);
}

// CoinGecko market_chart returns [[ms, price], ...]; collapse to one close per UTC day.
function toDailyCloses(prices) {
  const byDate = new Map();
  for (const [ts, p] of prices) {
    const d = new Date(ts).toISOString().slice(0, 10);
    byDate.set(d, p);
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, p]) => p);
}

const POS = ['surge','rally','bullish','soar','breakout','gain','rise','adopt','approve','partnership','record','launch','success','upgrade','etf','inflow'];
const NEG = ['crash','plunge','bearish','decline','drop','fall','hack','exploit','ban','sue','lawsuit','loss','reject','outflow','liquidation','scam'];

function sentimentScore(text) {
  const lower = ` ${text.toLowerCase()} `;
  let s = 0;
  for (const w of POS) if (lower.includes(` ${w}`)) s += 1;
  for (const w of NEG) if (lower.includes(` ${w}`)) s -= 1;
  return s;
}

function commentary(tokens) {
  const withChange = tokens.filter(t => t.market.priceChange24h != null);
  const ranked = [...withChange].sort((a, b) => b.market.priceChange24h - a.market.priceChange24h);
  const top = ranked[0], bottom = ranked[ranked.length - 1];
  const overbought = tokens.filter(t => (t.indicators.rsi14 ?? 0) >= 70).map(t => t.symbol);
  const oversold = tokens.filter(t => t.indicators.rsi14 != null && t.indicators.rsi14 <= 30).map(t => t.symbol);
  const lines = [];
  if (top) {
    const dir = top.market.priceChange24h >= 0 ? 'up' : 'down';
    lines.push(`${top.symbol} led the group over the last 24h, ${dir} ${Math.abs(top.market.priceChange24h).toFixed(2)}%.`);
  }
  if (bottom && bottom !== top) {
    const dir = bottom.market.priceChange24h >= 0 ? 'up' : 'down';
    lines.push(`${bottom.symbol} lagged, ${dir} ${Math.abs(bottom.market.priceChange24h).toFixed(2)}%.`);
  }
  if (overbought.length) lines.push(`Overbought (RSI14 ≥ 70): ${overbought.join(', ')}.`);
  if (oversold.length) lines.push(`Oversold (RSI14 ≤ 30): ${oversold.join(', ')}.`);
  const sents = tokens.map(t => t.news.sentiment).filter(s => Number.isFinite(s));
  const avgSent = sents.length ? sents.reduce((a, b) => a + b, 0) / sents.length : 0;
  if (avgSent > 0.5) lines.push('Cross-token news skew is mildly positive.');
  else if (avgSent < -0.5) lines.push('Cross-token news skew is mildly negative.');
  else lines.push('Cross-token news skew is roughly neutral.');
  return lines.join(' ');
}

async function fetchMarkets(ids) {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(',')}&price_change_percentage=24h,7d`;
  return fetchWithRetry(url);
}

// Primary: Binance klines (much higher rate-limit headroom than CoinGecko free tier).
// Fallback: CoinGecko market_chart, used only if Binance fails.
async function fetchHistoryBinance(symbol) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=180`;
  const klines = await fetchJson(url);
  // Binance returns [openTime, open, high, low, close, volume, ...]; we want close.
  return klines.map(k => Number(k[4])).filter(Number.isFinite);
}

async function fetchHistoryCoinGecko(id) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=180`;
  const json = await fetchWithRetry(url);
  return toDailyCloses(json.prices ?? []);
}

async function fetchHistory(token) {
  try {
    const closes = await fetchHistoryBinance(token.binance);
    if (closes.length >= 30) return closes;
    throw new Error(`only ${closes.length} closes from Binance`);
  } catch (e) {
    console.warn(`Binance history failed for ${token.symbol} (${e.message}); falling back to CoinGecko`);
    return fetchHistoryCoinGecko(token.id);
  }
}

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function parseRssItems(xml, max) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) && items.length < max) {
    const block = m[1];
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '';
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
    const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? '';
    const description = block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';
    items.push({
      title: decodeEntities(title).trim(),
      link: decodeEntities(link).trim(),
      pubDate: decodeEntities(pubDate).trim(),
      source: decodeEntities(source).trim(),
      description: decodeEntities(description).replace(/<[^>]+>/g, '').trim(),
    });
  }
  return items;
}

async function fetchNews(query) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const xml = await fetchText(url);
    const raw = parseRssItems(xml, 5);
    return raw.map(it => ({
      title: it.title,
      url: it.link,
      source: it.source || 'Google News',
      publishedAt: it.pubDate ? new Date(it.pubDate).toISOString() : new Date().toISOString(),
      sentimentScore: sentimentScore(`${it.title} ${it.description}`),
    }));
  } catch (e) {
    console.warn(`news fetch failed for "${query}":`, e.message);
    return [];
  }
}

async function main() {
  const ids = TOKENS.map(t => t.id);
  const markets = await fetchMarkets(ids);
  const marketsById = new Map(markets.map(m => [m.id, m]));

  const tokens = [];
  for (const t of TOKENS) {
    const m = marketsById.get(t.id);
    let history = [];
    let indicators = { ma7: null, ma30: null, rsi14: null, volatility30d: null };
    let sparkline = [];
    try {
      history = await fetchHistory(t);
      indicators = {
        ma7: sma(history, 7),
        ma30: sma(history, 30),
        rsi14: rsi(history, 14),
        volatility30d: annualizedVolatility(history, 30),
      };
      sparkline = history.slice(-30);
    } catch (e) {
      console.warn(`history fetch failed for ${t.id}:`, e.message);
    }
    const news = await fetchNews(t.query);
    const avgSent = news.length ? news.reduce((s, n) => s + n.sentimentScore, 0) / news.length : 0;
    tokens.push({
      symbol: t.symbol,
      id: t.id,
      name: t.name,
      market: {
        price: m?.current_price ?? null,
        marketCap: m?.market_cap ?? null,
        marketCapRank: m?.market_cap_rank ?? null,
        volume24h: m?.total_volume ?? null,
        priceChange24h: m?.price_change_percentage_24h_in_currency ?? m?.price_change_percentage_24h ?? null,
        priceChange7d: m?.price_change_percentage_7d_in_currency ?? null,
        ath: m?.ath ?? null,
        athChangePct: m?.ath_change_percentage ?? null,
      },
      indicators,
      sparkline,
      news: { items: news, sentiment: avgSent },
    });
    await new Promise(r => setTimeout(r, 300)); // gentle pacing across providers
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    tokens,
    commentary: commentary(tokens),
    sources: ['CoinGecko', 'CryptoCompare'],
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(snapshot, null, 2));
  console.log(`Wrote ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
