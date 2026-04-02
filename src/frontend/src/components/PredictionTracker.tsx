import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Brain, Flame, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import type {
  PredictionRecord,
  PredictionStats,
} from "../hooks/usePredictionTracker";

interface PredictionTrackerProps {
  predictions: PredictionRecord[];
  stats: PredictionStats;
  onClear: () => void;
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  } as any);
}

function StatCard({
  label,
  value,
  sub,
  colorClass,
}: {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
}) {
  return (
    <div className="card-glass p-3 rounded-lg flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-xl font-bold font-mono ${colorClass ?? "text-foreground"}`}
      >
        {value}
      </span>
      {sub && <span className="text-[9px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

const SKELETON_ITEMS = ["a", "b", "c", "d"];

export default function PredictionTracker({
  predictions,
  stats,
  onClear,
}: PredictionTrackerProps) {
  const recent = predictions.slice(0, 10);
  const isUnderperforming = stats.total > 0 && stats.hitRate < 50;
  const isCalibrated = stats.hitRate >= 70;

  const streakOnFire = stats.currentStreak >= 3;

  return (
    <motion.div
      className="card-glass overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-ocid="prediction_tracker.panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Prophet AI Track Record
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Skin in the game — predictions scored against real outcomes
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-negative hover:bg-negative/10"
          onClick={onClear}
          data-ocid="prediction_tracker.delete_button"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear History
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Performance alert */}
        {stats.total > 0 && (
          <motion.div
            key={isUnderperforming ? "bad" : isCalibrated ? "good" : "neutral"}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium ${
              isUnderperforming
                ? "bg-negative/10 text-negative border border-negative/20"
                : isCalibrated
                  ? "bg-positive/10 text-positive border border-positive/20"
                  : "bg-accent text-muted-foreground border border-border"
            }`}
            data-ocid="prediction_tracker.panel"
          >
            {isUnderperforming ? (
              <TrendingDown className="w-3 h-3 shrink-0" />
            ) : (
              <TrendingUp className="w-3 h-3 shrink-0" />
            )}
            {isUnderperforming
              ? "System is underperforming — confidence scores penalized"
              : isCalibrated
                ? "High accuracy — system is calibrated"
                : "Accuracy within expected range — gathering more data"}
          </motion.div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard
            label="Hit Rate"
            value={stats.total > 0 ? `${Math.round(stats.hitRate)}%` : "—"}
            sub={`${stats.hits}W · ${stats.misses}L`}
            colorClass={
              stats.total === 0
                ? "text-muted-foreground"
                : stats.hitRate >= 70
                  ? "text-positive"
                  : stats.hitRate < 50
                    ? "text-negative"
                    : "text-foreground"
            }
          />
          <StatCard
            label="Total"
            value={stats.total}
            sub={`${predictions.filter((p) => p.outcome === "pending").length} pending`}
          />
          <StatCard
            label="Streak"
            value={
              streakOnFire
                ? `${stats.currentStreak} 🔥`
                : stats.currentStreak > 0
                  ? `${stats.currentStreak}×`
                  : "—"
            }
            sub={`best: ${stats.longestStreak}`}
            colorClass={streakOnFire ? "text-amber-400" : undefined}
          />
          <StatCard
            label="Avg Conf · Hits"
            value={
              stats.avgConfidenceHits > 0 ? `${stats.avgConfidenceHits}%` : "—"
            }
            sub={
              stats.avgConfidenceMisses > 0
                ? `miss avg: ${stats.avgConfidenceMisses}%`
                : undefined
            }
            colorClass={
              stats.avgConfidenceHits > 0 ? "text-positive" : undefined
            }
          />
        </div>

        {/* History table or empty state */}
        {recent.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 text-center gap-2"
            data-ocid="prediction_tracker.empty_state"
          >
            <Brain className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              No predictions recorded yet — check back after the first 24h
              prediction loads
            </p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[9px] uppercase tracking-widest text-muted-foreground h-8 px-3">
                    Time
                  </TableHead>
                  <TableHead className="text-[9px] uppercase tracking-widest text-muted-foreground h-8 px-3">
                    Dir
                  </TableHead>
                  <TableHead className="text-[9px] uppercase tracking-widest text-muted-foreground h-8 px-3">
                    Conf
                  </TableHead>
                  <TableHead className="text-[9px] uppercase tracking-widest text-muted-foreground h-8 px-3">
                    Target
                  </TableHead>
                  <TableHead className="text-[9px] uppercase tracking-widest text-muted-foreground h-8 px-3">
                    Actual
                  </TableHead>
                  <TableHead className="text-[9px] uppercase tracking-widest text-muted-foreground h-8 px-3 text-right">
                    Result
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r, idx) => (
                  <TableRow
                    key={r.id}
                    className="border-border hover:bg-accent/30 transition-colors"
                    data-ocid={`prediction_tracker.item.${idx + 1}`}
                  >
                    <TableCell className="text-[10px] font-mono text-muted-foreground px-3 py-2">
                      {formatTime(r.timestamp)}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          r.direction === "bullish"
                            ? "text-positive"
                            : r.direction === "bearish"
                              ? "text-negative"
                              : "text-muted-foreground"
                        }`}
                      >
                        {r.direction === "bullish"
                          ? "▲"
                          : r.direction === "bearish"
                            ? "▼"
                            : "—"}{" "}
                        {r.direction.slice(0, 4).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px] font-mono text-foreground px-3 py-2">
                      {r.confidence}%
                    </TableCell>
                    <TableCell className="text-[10px] font-mono text-foreground px-3 py-2">
                      ${formatPrice(r.predictedPrice)}
                    </TableCell>
                    <TableCell className="text-[10px] font-mono px-3 py-2">
                      {r.actualPriceAtResolution !== undefined ? (
                        <span className="text-foreground">
                          ${formatPrice(r.actualPriceAtResolution)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      {r.outcome === "pending" ? (
                        <span className="text-[9px] font-mono text-muted-foreground tracking-widest">
                          PENDING
                        </span>
                      ) : r.outcome === "hit" ? (
                        <Badge
                          className="text-[9px] px-1.5 py-0 h-4 bg-positive/15 text-positive border-positive/20 font-bold hover:bg-positive/15"
                          data-ocid={`prediction_tracker.item.${idx + 1}`}
                        >
                          HIT ✓
                        </Badge>
                      ) : (
                        <Badge
                          className="text-[9px] px-1.5 py-0 h-4 bg-negative/15 text-negative border-negative/20 font-bold hover:bg-negative/15"
                          data-ocid={`prediction_tracker.item.${idx + 1}`}
                        >
                          MISS ✗
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function PredictionTrackerSkeleton() {
  return (
    <div
      className="card-glass p-4 space-y-3"
      data-ocid="prediction_tracker.loading_state"
    >
      <Skeleton className="h-5 w-48" />
      <div className="grid grid-cols-4 gap-2">
        {SKELETON_ITEMS.map((k) => (
          <Skeleton key={k} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-32" />
    </div>
  );
}

export function PredictionTrackerCollapsed({
  onExpand,
  stats,
}: {
  onExpand: () => void;
  stats: PredictionStats;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full card-glass px-4 py-2.5 flex items-center justify-between hover:bg-accent/30 transition-colors"
      data-ocid="prediction_tracker.open_modal_button"
    >
      <div className="flex items-center gap-2">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-muted-foreground">
          View Track Record
        </span>
        {stats.total > 0 && (
          <>
            <span className="text-[10px] text-muted-foreground/50">·</span>
            <span
              className={`text-[10px] font-mono font-bold ${
                stats.hitRate >= 70
                  ? "text-positive"
                  : stats.hitRate < 50 && stats.total > 2
                    ? "text-negative"
                    : "text-muted-foreground"
              }`}
            >
              {Math.round(stats.hitRate)}% hit rate
            </span>
            {stats.currentStreak >= 3 && (
              <Flame className="w-3 h-3 text-amber-400" />
            )}
          </>
        )}
      </div>
      <span className="text-[9px] text-muted-foreground">▾ Expand</span>
    </button>
  );
}
