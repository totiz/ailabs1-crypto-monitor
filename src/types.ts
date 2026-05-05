export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentimentScore: number;
}

export interface TokenSnapshot {
  symbol: string;
  id: string;
  name: string;
  market: {
    price: number | null;
    marketCap: number | null;
    marketCapRank: number | null;
    volume24h: number | null;
    priceChange24h: number | null;
    priceChange7d: number | null;
    ath: number | null;
    athChangePct: number | null;
  };
  indicators: {
    ma7: number | null;
    ma30: number | null;
    rsi14: number | null;
    volatility30d: number | null;
  };
  sparkline: number[];
  news: {
    items: NewsItem[];
    sentiment: number;
  };
}

export interface Snapshot {
  generatedAt: string;
  tokens: TokenSnapshot[];
  commentary: string;
  sources: string[];
}
