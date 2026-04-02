export interface Candle {
  time: number; // unix timestamp seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export type CandlePattern =
  | "Doji"
  | "Hammer"
  | "Shooting Star"
  | "Bullish Engulfing"
  | "Bearish Engulfing"
  | "None";

/** RSI 14-period */
export function calculateRSI(candles: Candle[], period = 14): number[] {
  if (candles.length < period + 1) return [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  const rsiValues: number[] = [];
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues.push(100 - 100 / (1 + rs));
  }

  return rsiValues;
}

/** Bollinger Bands 20-period SMA ±2 std devs */
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  multiplier = 2,
): BollingerBands[] {
  if (candles.length < period) return [];
  const result: BollingerBands[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const closes = slice.map((c) => c.close);
    const sma = closes.reduce((a, b) => a + b, 0) / period;
    const variance = closes.reduce((s, c) => s + (c - sma) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    result.push({
      upper: sma + multiplier * std,
      middle: sma,
      lower: sma - multiplier * std,
    });
  }

  return result;
}

/** Detect candlestick pattern on last 2 candles */
export function detectPattern(candles: Candle[]): CandlePattern {
  if (candles.length < 2) return "None";
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];

  const currBody = Math.abs(curr.close - curr.open);
  const currRange = curr.high - curr.low;
  const currUpperWick = curr.high - Math.max(curr.open, curr.close);
  const currLowerWick = Math.min(curr.open, curr.close) - curr.low;
  const prevBody = Math.abs(prev.close - prev.open);

  // Doji: body < 0.1% of price
  if (currBody / curr.close < 0.001 && currRange > 0) return "Doji";

  // Hammer: lower wick > 2x body, small upper wick, body in upper third
  if (
    currLowerWick > 2 * currBody &&
    currUpperWick < currBody &&
    currBody > 0
  ) {
    return "Hammer";
  }

  // Shooting Star: upper wick > 2x body, small lower wick
  if (
    currUpperWick > 2 * currBody &&
    currLowerWick < currBody &&
    currBody > 0
  ) {
    return "Shooting Star";
  }

  // Bullish Engulfing: prev red, curr green, curr body engulfs prev
  if (
    prev.close < prev.open &&
    curr.close > curr.open &&
    curr.open < prev.close &&
    curr.close > prev.open
  ) {
    return "Bullish Engulfing";
  }

  // Bearish Engulfing: prev green, curr red, curr body engulfs prev
  if (
    prev.close > prev.open &&
    curr.close < curr.open &&
    curr.open > prev.close &&
    curr.close < prev.open &&
    prevBody > 0
  ) {
    return "Bearish Engulfing";
  }

  return "None";
}

export function isBullishPattern(p: CandlePattern): boolean {
  return p === "Hammer" || p === "Bullish Engulfing" || p === "Doji";
}

export function isBearishPattern(p: CandlePattern): boolean {
  return p === "Shooting Star" || p === "Bearish Engulfing" || p === "Doji";
}

export type BBPosition =
  | "Above Upper Band"
  | "Near Upper Band"
  | "Middle"
  | "Near Lower Band"
  | "Below Lower Band";

export function getBBPosition(price: number, bb: BollingerBands): BBPosition {
  const range = bb.upper - bb.lower;
  if (range === 0) return "Middle";
  if (price > bb.upper) return "Above Upper Band";
  if (price > bb.middle + range * 0.3) return "Near Upper Band";
  if (price < bb.lower) return "Below Lower Band";
  if (price < bb.middle - range * 0.3) return "Near Lower Band";
  return "Middle";
}

export type CombinedSignal =
  | "STRONG BUY"
  | "BUY"
  | "NEUTRAL"
  | "SELL"
  | "STRONG SELL";

export function getCombinedSignal(
  rsi: number,
  bbPos: BBPosition,
  pattern: CandlePattern,
): CombinedSignal {
  let score = 0;
  if (rsi < 30) score += 2;
  else if (rsi < 40) score += 1;
  else if (rsi > 70) score -= 2;
  else if (rsi > 60) score -= 1;

  if (bbPos === "Below Lower Band" || bbPos === "Near Lower Band") score += 1;
  else if (bbPos === "Above Upper Band" || bbPos === "Near Upper Band")
    score -= 1;

  if (isBullishPattern(pattern)) score += 1;
  else if (isBearishPattern(pattern)) score -= 1;

  if (score >= 3) return "STRONG BUY";
  if (score >= 1) return "BUY";
  if (score <= -3) return "STRONG SELL";
  if (score <= -1) return "SELL";
  return "NEUTRAL";
}
