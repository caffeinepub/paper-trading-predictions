import { Trash2 } from "lucide-react";
import type { Trade, TradingStats } from "../hooks/useTradingEngine";

interface Props {
  trades: Trade[];
  stats: TradingStats;
  onClear: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
}

export default function TradeHistory({ trades, stats, onClear }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Stats row */}
      <div
        className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-border"
        data-ocid="trade.panel"
      >
        {[
          { label: "Trades", value: stats.totalTrades },
          {
            label: "Win Rate",
            value: `${stats.winRate.toFixed(1)}%`,
            color: stats.winRate >= 50 ? "text-positive" : "text-negative",
          },
          {
            label: "Total P&L",
            value: `${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(2)}`,
            color: stats.totalPnl >= 0 ? "text-positive" : "text-negative",
          },
          {
            label: "Best",
            value: `+$${stats.bestTrade.toFixed(2)}`,
            color: "text-positive",
          },
          {
            label: "Worst",
            value: `$${stats.worstTrade.toFixed(2)}`,
            color: "text-negative",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p
              className={`text-sm font-bold font-mono mt-0.5 ${color ?? "text-foreground"}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {trades.length === 0 ? (
          <div
            className="flex items-center justify-center h-32 text-muted-foreground text-sm"
            data-ocid="trade.empty_state"
          >
            No completed trades yet
          </div>
        ) : (
          <table className="w-full text-xs" data-ocid="trade.table">
            <thead>
              <tr className="border-b border-border sticky top-0 bg-card">
                {[
                  "#",
                  "Time",
                  "Pair",
                  "Dir",
                  "Entry",
                  "Exit",
                  "P&L ($)",
                  "P&L (%)",
                  "Dur",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, idx) => (
                <tr
                  key={t.id}
                  className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                  data-ocid={`trade.row.${idx + 1}` as any}
                >
                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatTime(t.entryTime)}
                  </td>
                  <td className="px-3 py-2 font-medium">{t.pair}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.direction === "LONG"
                          ? "bg-positive/15 text-positive"
                          : "bg-negative/15 text-negative"
                      }`}
                    >
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono">
                    $
                    {t.entryPrice.toLocaleString("en-US", {
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td className="px-3 py-2 font-mono">
                    $
                    {t.exitPrice.toLocaleString("en-US", {
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td
                    className={`px-3 py-2 font-mono font-bold ${t.pnl >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {t.pnl >= 0 ? "+" : ""}
                    {t.pnl.toFixed(2)}
                  </td>
                  <td
                    className={`px-3 py-2 font-mono ${t.pnlPct >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {t.pnlPct >= 0 ? "+" : ""}
                    {t.pnlPct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDuration(t.duration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {trades.length > 0 && (
        <div className="px-4 py-2 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-negative transition-colors"
            data-ocid="trade.delete_button"
          >
            <Trash2 className="w-3 h-3" /> Clear History
          </button>
        </div>
      )}
    </div>
  );
}
