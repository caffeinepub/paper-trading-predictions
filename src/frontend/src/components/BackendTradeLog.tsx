import { RefreshCw } from "lucide-react";
import type { PerformanceStats, TradeResult } from "../backend";

interface Props {
  trades: TradeResult[];
  stats: PerformanceStats | null;
  isLoading: boolean;
  onRefresh: () => void;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatTs(ts: bigint) {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BackendTradeLog({
  trades,
  stats,
  isLoading,
  onRefresh,
}: Props) {
  const closed = trades.filter((t) => t.exitPrice !== undefined);
  const totalPnl = stats?.totalPnl ?? 0;
  const winRate = stats
    ? (Number(stats.wins) / Math.max(1, Number(stats.totalTrades))) * 100
    : 0;

  return (
    <div
      className="card-glass flex flex-col overflow-hidden"
      data-ocid="tradelog.panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Trade Log</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            ICP Backend · Caffeine canister
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="tradelog.button"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div
        className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-border"
        data-ocid="tradelog.panel"
      >
        {[
          {
            label: "Total Trades",
            value: String(stats?.totalTrades ?? 0),
            color: "",
          },
          {
            label: "Win Rate",
            value: `${winRate.toFixed(1)}%`,
            color: winRate >= 50 ? "text-positive" : "text-negative",
          },
          {
            label: "Total P&L",
            value: `${totalPnl >= 0 ? "+" : ""}$${fmt(totalPnl)}`,
            color: totalPnl >= 0 ? "text-positive" : "text-negative",
          },
          {
            label: "Wins / Losses",
            value: `${stats?.wins ?? 0} / ${stats?.losses ?? 0}`,
            color: "",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p
              className={`text-sm font-bold font-mono mt-0.5 ${color || "text-foreground"}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto" style={{ maxHeight: 320 }}>
        {closed.length === 0 ? (
          <div
            className="flex items-center justify-center h-24 text-muted-foreground text-sm"
            data-ocid="tradelog.empty_state"
          >
            {isLoading ? "Loading trades…" : "No closed trades yet"}
          </div>
        ) : (
          <table className="w-full text-xs" data-ocid="tradelog.table">
            <thead>
              <tr className="border-b border-border sticky top-0 bg-card">
                {["#", "Time", "Dir", "Entry", "Exit", "P&L ($)", "Result"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {closed.map((t, idx) => {
                const pnl = t.pnl ?? 0;
                const win = t.isWin ?? pnl > 0;
                return (
                  <tr
                    key={String(t.id)}
                    className={`border-b border-border/40 transition-colors hover:bg-accent/30 ${
                      win ? "bg-positive/[0.03]" : "bg-negative/[0.03]"
                    }`}
                    data-ocid={`tradelog.row.${idx + 1}` as any}
                  >
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {formatTs(t.timestamp)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.direction === "long"
                            ? "bg-positive/15 text-positive"
                            : "bg-negative/15 text-negative"
                        }`}
                      >
                        {t.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      ${fmt(t.entryPrice)}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {t.exitPrice !== undefined ? `$${fmt(t.exitPrice)}` : "—"}
                    </td>
                    <td
                      className={`px-3 py-2.5 font-mono font-bold ${
                        pnl >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {fmt(pnl)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          win
                            ? "bg-positive/15 text-positive"
                            : "bg-negative/15 text-negative"
                        }`}
                      >
                        {win ? "WIN" : "LOSS"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
