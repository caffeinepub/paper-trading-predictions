import { Clock, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { TradeResult } from "../backend";
import type { AutoScalpState } from "../hooks/useAutoScalp";

interface Props {
  scalp: AutoScalpState;
  currentPrice: number | null;
  openTrade: TradeResult | null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatCountdown(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${pad(m)}:${pad(sec)}`;
}

export default function AutoScalpPanel({
  scalp,
  currentPrice,
  openTrade,
}: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!openTrade) {
      setElapsed(0);
      return;
    }
    const update = () =>
      setElapsed(
        Math.floor(
          Date.now() / 1000 - Number(openTrade.timestamp) / 1_000_000_000,
        ),
      );
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [openTrade]);

  const unrealizedPnl =
    openTrade && currentPrice && openTrade.exitPrice === undefined
      ? openTrade.direction === "long"
        ? ((currentPrice - openTrade.entryPrice) / openTrade.entryPrice) *
          10 *
          openTrade.size
        : ((openTrade.entryPrice - currentPrice) / openTrade.entryPrice) *
          10 *
          openTrade.size
      : null;

  return (
    <div
      className="card-glass flex flex-col overflow-hidden"
      data-ocid="scalp.panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Auto Scalp</h2>
          <span className="text-[10px] text-muted-foreground">
            10× Leverage · 5min
          </span>
        </div>
        {/* Big toggle */}
        <button
          type="button"
          onClick={() => scalp.setEnabled(!scalp.isEnabled)}
          data-ocid="scalp.toggle"
          className={`relative h-7 w-14 rounded-full transition-colors duration-300 focus:outline-none ${
            scalp.isEnabled ? "bg-positive" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 flex items-center justify-center ${
              scalp.isEnabled ? "translate-x-7" : "translate-x-0"
            }`}
          >
            <Zap
              className={`w-3 h-3 transition-colors ${
                scalp.isEnabled ? "text-positive" : "text-muted-foreground"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* Controls row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Leverage (fixed) */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Leverage
            </p>
            <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
              <span className="text-sm font-bold font-mono text-primary">
                10×
              </span>
            </div>
          </div>

          {/* Position size */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Size (USDT)
            </p>
            <input
              type="number"
              min={10}
              max={10000}
              step={10}
              value={scalp.positionSize}
              onChange={(e) => scalp.setPositionSize(Number(e.target.value))}
              data-ocid="scalp.input"
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground text-center focus:outline-none focus:border-primary"
            />
          </div>

          {/* Direction bias */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Bias
            </p>
            <select
              value={scalp.directionBias}
              onChange={(e) => scalp.setDirectionBias(e.target.value as any)}
              data-ocid="scalp.select"
              className="w-full bg-muted/40 border border-border rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="auto">Auto</option>
              <option value="long">Long ↑</option>
              <option value="short">Short ↓</option>
            </select>
          </div>
        </div>

        {/* Countdown */}
        <div
          className={`rounded-xl p-4 text-center transition-all ${
            scalp.isEnabled
              ? "bg-primary/10 border border-primary/20"
              : "bg-muted/20 border border-border"
          }`}
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            {scalp.isEnabled ? "Next Scalp In" : "Scalp Paused"}
          </p>
          <p
            className={`text-3xl font-bold font-mono tabular-nums ${
              scalp.isEnabled
                ? scalp.countdown < 30
                  ? "text-negative animate-pulse"
                  : "text-primary"
                : "text-muted-foreground"
            }`}
          >
            {formatCountdown(scalp.countdown)}
          </p>
        </div>

        {/* Open trade info */}
        {openTrade && openTrade.exitPrice === undefined ? (
          <div
            className="rounded-xl bg-muted/20 border border-border p-3 space-y-2"
            data-ocid="scalp.card"
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
                  openTrade.direction === "long"
                    ? "bg-positive/15 text-positive"
                    : "bg-negative/15 text-negative"
                }`}
              >
                {openTrade.direction === "long" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {openTrade.direction.toUpperCase()}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {elapsed}s open
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Entry</span>
              <span className="font-mono text-right">
                ${openTrade.entryPrice.toFixed(2)}
              </span>
              <span className="text-muted-foreground">Current</span>
              <span className="font-mono text-right">
                ${currentPrice?.toFixed(2) ?? "–"}
              </span>
              <span className="text-muted-foreground">Size</span>
              <span className="font-mono text-right">
                ${openTrade.size.toFixed(0)}
              </span>
              {unrealizedPnl !== null && (
                <>
                  <span className="text-muted-foreground">Unreal. P&amp;L</span>
                  <span
                    className={`font-mono font-bold text-right ${
                      unrealizedPnl >= 0 ? "text-positive" : "text-negative"
                    }`}
                  >
                    {unrealizedPnl >= 0 ? "+" : ""}
                    {unrealizedPnl.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl bg-muted/10 border border-border/50 p-3 text-center"
            data-ocid="scalp.empty_state"
          >
            <p className="text-xs text-muted-foreground">
              No open backend trade
            </p>
          </div>
        )}

        {/* Last result */}
        {scalp.lastResult && (
          <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2 leading-snug">
            {scalp.lastResult}
          </p>
        )}
      </div>
    </div>
  );
}
