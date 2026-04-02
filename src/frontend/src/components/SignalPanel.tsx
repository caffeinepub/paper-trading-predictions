import {
  Activity,
  Droplets,
  Minus,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import type {
  LiquidityData,
  ProphetPrediction,
  WhaleAlert,
} from "../hooks/useCanisters";
import type {
  BBPosition,
  Candle,
  CandlePattern,
  CombinedSignal,
} from "../lib/indicators";
import {
  calculateBollingerBands,
  calculateRSI,
  detectPattern,
  getBBPosition,
  getCombinedSignal,
} from "../lib/indicators";

interface Props {
  candles: Candle[];
  liquidity: LiquidityData;
  whaleAlert: WhaleAlert | null;
  prophet: ProphetPrediction;
}

function RSIGauge({ value }: { value: number }) {
  const color =
    value >= 70
      ? "text-negative"
      : value <= 30
        ? "text-positive"
        : "text-foreground";
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>RSI (14)</span>
        <span className={`font-bold text-sm ${color}`}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background:
              value >= 70
                ? "oklch(0.60 0.22 25)"
                : value <= 30
                  ? "oklch(0.70 0.18 145)"
                  : "oklch(0.55 0.22 295)",
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Oversold</span>
        <span>30 · 70</span>
        <span>Overbought</span>
      </div>
    </div>
  );
}

function SignalBadge({ signal }: { signal: CombinedSignal }) {
  const cfg: Record<CombinedSignal, { color: string; bg: string }> = {
    "STRONG BUY": { color: "text-positive", bg: "bg-positive/10" },
    BUY: { color: "text-positive", bg: "bg-positive/10" },
    NEUTRAL: { color: "text-muted-foreground", bg: "bg-muted/30" },
    SELL: { color: "text-negative", bg: "bg-negative/10" },
    "STRONG SELL": { color: "text-negative", bg: "bg-negative/10" },
  };
  const { color, bg } = cfg[signal];
  return (
    <span
      className={`px-3 py-1 rounded text-xs font-bold tracking-wider ${color} ${bg}`}
    >
      {signal}
    </span>
  );
}

function PatternIcon({ pattern }: { pattern: CandlePattern }) {
  if (pattern === "Bullish Engulfing" || pattern === "Hammer")
    return <TrendingUp className="w-4 h-4 text-positive" />;
  if (pattern === "Bearish Engulfing" || pattern === "Shooting Star")
    return <TrendingDown className="w-4 h-4 text-negative" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function BBPositionBar({ pos }: { pos: BBPosition }) {
  const steps: BBPosition[] = [
    "Below Lower Band",
    "Near Lower Band",
    "Middle",
    "Near Upper Band",
    "Above Upper Band",
  ];
  const idx = steps.indexOf(pos);
  const colors = [
    "bg-positive",
    "bg-positive",
    "bg-primary",
    "bg-negative",
    "bg-negative",
  ];
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>BB Position</span>
        <span className="text-foreground text-xs">{pos}</span>
      </div>
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              i === idx ? colors[i] : "bg-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function SignalPanel({
  candles,
  liquidity,
  whaleAlert,
  prophet,
}: Props) {
  const { rsi, pattern, bbPos, signal } = useMemo(() => {
    if (candles.length < 20) {
      return {
        rsi: 50,
        pattern: "None" as CandlePattern,
        bbPos: "Middle" as BBPosition,
        signal: "NEUTRAL" as CombinedSignal,
      };
    }
    const rsiArr = calculateRSI(candles);
    const bbArr = calculateBollingerBands(candles);
    const rsiVal = rsiArr.length ? rsiArr[rsiArr.length - 1] : 50;
    const bbVal = bbArr.length ? bbArr[bbArr.length - 1] : null;
    const pat = detectPattern(candles);
    const pos = bbVal
      ? getBBPosition(candles[candles.length - 1].close, bbVal)
      : ("Middle" as BBPosition);
    const sig = getCombinedSignal(rsiVal, pos, pat);
    return { rsi: rsiVal, pattern: pat, bbPos: pos, signal: sig };
  }, [candles]);

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <RSIGauge value={rsi} />
      <BBPositionBar pos={bbPos} />

      {/* Pattern */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PatternIcon pattern={pattern} />
          <span className="text-xs text-muted-foreground">Pattern</span>
        </div>
        <span className="text-xs font-medium text-foreground">{pattern}</span>
      </div>

      {/* Combined Signal */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Signal</span>
        </div>
        <SignalBadge signal={signal} />
      </div>

      {/* Liquidity */}
      <div className="space-y-1 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-accent" />
            <span className="text-xs text-muted-foreground">Liquidity</span>
          </div>
          <span className="text-xs font-medium text-foreground">
            {liquidity.level}%
            <span
              className={`ml-1 text-[10px] ${
                liquidity.trend === "increasing"
                  ? "text-positive"
                  : liquidity.trend === "decreasing"
                    ? "text-negative"
                    : "text-muted-foreground"
              }`}
            >
              {liquidity.trend === "increasing"
                ? "▲"
                : liquidity.trend === "decreasing"
                  ? "▼"
                  : "─"}
            </span>
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-accent rounded-full transition-all duration-700"
            style={{ width: `${liquidity.level}%` }}
          />
        </div>
      </div>

      {/* Whale Alert */}
      {whaleAlert && (
        <div
          className={`rounded-lg px-3 py-2 text-xs border ${
            whaleAlert.type === "buy"
              ? "border-positive/30 bg-positive/10 text-positive"
              : "border-negative/30 bg-negative/10 text-negative"
          }`}
        >
          {whaleAlert.message}
        </div>
      )}

      {/* Prophet AI — live on-chain data */}
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet" />
            <span className="text-xs text-muted-foreground">Prophet AI</span>
            {prophet.source === "live" && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-positive/15 text-positive font-mono tracking-wide">
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold ${
                prophet.direction === "bullish"
                  ? "text-positive"
                  : prophet.direction === "bearish"
                    ? "text-negative"
                    : "text-muted-foreground"
              }`}
            >
              {prophet.direction.toUpperCase()}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {prophet.confidence}%
            </span>
          </div>
        </div>
        {/* Trend strength bar */}
        {prophet.source === "live" && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Trend Strength</span>
              <span>{prophet.trendStrength}%</span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  prophet.direction === "bullish"
                    ? "bg-positive"
                    : "bg-negative"
                }`}
                style={{ width: `${prophet.trendStrength}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
