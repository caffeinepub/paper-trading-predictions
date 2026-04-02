import { useCallback, useEffect, useRef, useState } from "react";
import type { Candle } from "../lib/indicators";
import {
  calculateBollingerBands,
  calculateRSI,
  detectPattern,
  getBBPosition,
  isBearishPattern,
  isBullishPattern,
} from "../lib/indicators";

const LEVERAGE = 10;
const STARTING_BALANCE = 10000;
const POSITION_SIZE_PCT = 0.1;
const STOP_LOSS_PCT = 0.03;
const LS_KEY = "sros_trade_history";

export interface Trade {
  id: string;
  pair: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  pnl: number;
  pnlPct: number;
  entryTime: number;
  exitTime: number;
  duration: number; // seconds
}

export interface OpenPosition {
  pair: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  currentPrice: number;
  positionSize: number;
  leverage: number;
  entryTime: number;
  pnl: number;
  pnlPct: number;
}

export interface TradingStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  bestTrade: number;
  worstTrade: number;
  balance: number;
}

export interface TradingEngine {
  openPosition: OpenPosition | null;
  tradeHistory: Trade[];
  stats: TradingStats;
  clearHistory: () => void;
}

function loadHistory(): Trade[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(trades: Trade[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(trades.slice(0, 50)));
  } catch {}
}

function calcStats(trades: Trade[], currentBalance: number): TradingStats {
  const wins = trades.filter((t) => t.pnl > 0).length;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const pnls = trades.map((t) => t.pnl);
  return {
    totalTrades: trades.length,
    wins,
    losses: trades.length - wins,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    totalPnl,
    bestTrade: pnls.length ? Math.max(...pnls) : 0,
    worstTrade: pnls.length ? Math.min(...pnls) : 0,
    balance: currentBalance,
  };
}

export function useTradingEngine(
  candles: Candle[],
  symbol = "BTCUSDT",
): TradingEngine {
  const [openPosition, setOpenPosition] = useState<OpenPosition | null>(null);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>(loadHistory);
  const balanceRef = useRef(
    STARTING_BALANCE + loadHistory().reduce((s, t) => s + t.pnl, 0),
  );
  const openRef = useRef<OpenPosition | null>(null);

  const clearHistory = useCallback(() => {
    setTradeHistory([]);
    saveHistory([]);
    balanceRef.current = STARTING_BALANCE;
  }, []);

  useEffect(() => {
    if (candles.length < 30) return;

    const rsiArr = calculateRSI(candles);
    const bbArr = calculateBollingerBands(candles);
    if (!rsiArr.length || !bbArr.length) return;

    const rsi = rsiArr[rsiArr.length - 1];
    const bb = bbArr[bbArr.length - 1];
    const pattern = detectPattern(candles);
    const bbPos = getBBPosition(candles[candles.length - 1].close, bb);
    const currentPrice = candles[candles.length - 1].close;
    const now = Date.now() / 1000;

    // Update open position PnL
    if (openRef.current) {
      const pos = openRef.current;
      const pnlRaw =
        pos.direction === "LONG"
          ? ((currentPrice - pos.entryPrice) / pos.entryPrice) *
            LEVERAGE *
            pos.positionSize
          : ((pos.entryPrice - currentPrice) / pos.entryPrice) *
            LEVERAGE *
            pos.positionSize;
      const pnlPct =
        pos.direction === "LONG"
          ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * LEVERAGE * 100
          : ((pos.entryPrice - currentPrice) / pos.entryPrice) * LEVERAGE * 100;

      const updated: OpenPosition = {
        ...pos,
        currentPrice,
        pnl: pnlRaw,
        pnlPct,
      };
      openRef.current = updated;
      setOpenPosition({ ...updated });

      // Exit logic
      const pnlPctRaw = (pnlRaw / pos.positionSize) * 100;
      const shouldExitLong =
        pos.direction === "LONG" &&
        (rsi > 55 ||
          bbPos === "Above Upper Band" ||
          pnlPctRaw < -STOP_LOSS_PCT * 100);
      const shouldExitShort =
        pos.direction === "SHORT" &&
        (rsi < 45 ||
          bbPos === "Below Lower Band" ||
          pnlPctRaw < -STOP_LOSS_PCT * 100);

      if (shouldExitLong || shouldExitShort) {
        const trade: Trade = {
          id: crypto.randomUUID(),
          pair: symbol,
          direction: pos.direction,
          entryPrice: pos.entryPrice,
          exitPrice: currentPrice,
          positionSize: pos.positionSize,
          pnl: pnlRaw,
          pnlPct,
          entryTime: pos.entryTime,
          exitTime: now,
          duration: Math.round(now - pos.entryTime),
        };
        balanceRef.current += pnlRaw;
        openRef.current = null;
        setOpenPosition(null);
        setTradeHistory((prev) => {
          const updated = [trade, ...prev].slice(0, 50);
          saveHistory(updated);
          return updated;
        });
        return;
      }
      return;
    }

    // Entry logic
    const posSize = balanceRef.current * POSITION_SIZE_PCT;
    const enterLong =
      (rsi < 35 &&
        (bbPos === "Near Lower Band" || bbPos === "Below Lower Band") &&
        isBullishPattern(pattern)) ||
      rsi < 30;
    const enterShort =
      (rsi > 65 &&
        (bbPos === "Near Upper Band" || bbPos === "Above Upper Band") &&
        isBearishPattern(pattern)) ||
      rsi > 70;

    if (enterLong && !openRef.current) {
      const pos: OpenPosition = {
        pair: symbol,
        direction: "LONG",
        entryPrice: currentPrice,
        currentPrice,
        positionSize: posSize,
        leverage: LEVERAGE,
        entryTime: now,
        pnl: 0,
        pnlPct: 0,
      };
      openRef.current = pos;
      setOpenPosition({ ...pos });
    } else if (enterShort && !openRef.current) {
      const pos: OpenPosition = {
        pair: symbol,
        direction: "SHORT",
        entryPrice: currentPrice,
        currentPrice,
        positionSize: posSize,
        leverage: LEVERAGE,
        entryTime: now,
        pnl: 0,
        pnlPct: 0,
      };
      openRef.current = pos;
      setOpenPosition({ ...pos });
    }
  }, [candles, symbol]);

  const stats = calcStats(tradeHistory, balanceRef.current);

  return { openPosition, tradeHistory, stats, clearHistory };
}
