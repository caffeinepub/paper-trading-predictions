import { useCallback, useEffect, useRef, useState } from "react";
import type { Candle } from "../lib/indicators";

const BINANCE_BASE = "https://api.binance.com/api/v3";

export type TimeInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface Ticker24h {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
}

export interface BinanceData {
  candles: Candle[];
  ticker: Ticker24h | null;
  isLoading: boolean;
  error: string | null;
  interval: TimeInterval;
  setInterval: (i: TimeInterval) => void;
  symbol: string;
  setSymbol: (s: string) => void;
}

function parseBinanceCandles(raw: unknown[][]): Candle[] {
  return raw.map((c) => ({
    time: Math.floor(Number(c[0]) / 1000),
    open: Number.parseFloat(c[1] as string),
    high: Number.parseFloat(c[2] as string),
    low: Number.parseFloat(c[3] as string),
    close: Number.parseFloat(c[4] as string),
    volume: Number.parseFloat(c[5] as string),
  }));
}

export function useBinanceData(): BinanceData {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [ticker, setTicker] = useState<Ticker24h | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setIntervalState] = useState<TimeInterval>("5m");
  const [symbol, setSymbolState] = useState("BTCUSDT");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (sym: string, intv: TimeInterval) => {
    try {
      const [candlesRes, tickerRes] = await Promise.all([
        fetch(
          `${BINANCE_BASE}/klines?symbol=${sym}&interval=${intv}&limit=200`,
        ),
        fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${sym}`),
      ]);

      if (!candlesRes.ok || !tickerRes.ok) throw new Error("Binance API error");

      const [rawCandles, rawTicker] = await Promise.all([
        candlesRes.json() as Promise<unknown[][]>,
        tickerRes.json() as Promise<Ticker24h>,
      ]);

      setCandles(parseBinanceCandles(rawCandles));
      setTicker(rawTicker);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch price data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchData(symbol, interval);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => fetchData(symbol, interval), 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [symbol, interval, fetchData]);

  return {
    candles,
    ticker,
    isLoading,
    error,
    interval,
    setInterval: setIntervalState,
    symbol,
    setSymbol: setSymbolState,
  };
}
