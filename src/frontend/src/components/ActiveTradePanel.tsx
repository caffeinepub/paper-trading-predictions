import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { OpenPosition } from "../hooks/useTradingEngine";

interface Props {
  position: OpenPosition | null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function ActiveTradePanel({ position }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!position) {
      setElapsed(0);
      return;
    }
    const update = () =>
      setElapsed(Math.round(Date.now() / 1000 - position.entryTime));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [position]);

  if (!position) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 text-center"
        data-ocid="trade.empty_state"
      >
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            No Open Position
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Engine monitoring for entry signals...
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-positive animate-pulse" />
          Auto-managed
        </div>
      </div>
    );
  }

  const isLong = position.direction === "LONG";
  const pnlColor = position.pnl >= 0 ? "text-positive" : "text-negative";

  return (
    <div className="p-4 flex flex-col gap-3" data-ocid="trade.panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${
              isLong
                ? "bg-positive/15 text-positive"
                : "bg-negative/15 text-negative"
            }`}
          >
            {isLong ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {position.direction}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {position.pair}
          </span>
        </div>
        <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded">
          {position.leverage}x
        </span>
      </div>

      {/* PnL */}
      <div className="bg-secondary rounded-xl p-3 text-center">
        <p className="text-xs text-muted-foreground mb-1">Unrealized P&amp;L</p>
        <p className={`text-2xl font-bold font-mono ${pnlColor}`}>
          {position.pnl >= 0 ? "+" : ""}
          {position.pnl.toFixed(2)} USDT
        </p>
        <p className={`text-sm font-mono ${pnlColor}`}>
          {position.pnlPct >= 0 ? "+" : ""}
          {position.pnlPct.toFixed(2)}%
        </p>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {[
          {
            label: "Entry Price",
            value: `$${position.entryPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
          },
          {
            label: "Current Price",
            value: `$${position.currentPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
          },
          {
            label: "Position Size",
            value: `$${position.positionSize.toFixed(2)}`,
          },
          {
            label: "Notional",
            value: `$${(position.positionSize * position.leverage).toFixed(2)}`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono text-foreground">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatDuration(elapsed)}</span>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
          Auto-managed
        </span>
      </div>
    </div>
  );
}
