import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Clock, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

export interface Prediction24hProps {
  predictedPrice: number | null;
  currentPrice: number | null;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  trendStrength: number;
  source: "live" | "error" | "synthesized";
  lastUpdated: Date | null;
  isLoading: boolean;
  secondsUntilRefresh: number;
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatTime(d: Date | null): string {
  if (!d) return "never";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Prediction24h({
  predictedPrice,
  currentPrice,
  direction,
  confidence,
  trendStrength,
  source,
  lastUpdated,
  isLoading,
  secondsUntilRefresh,
}: Prediction24hProps) {
  const isBullish = direction === "bullish";
  const isBearish = direction === "bearish";
  const priceColorClass = isBullish
    ? "text-positive"
    : isBearish
      ? "text-negative"
      : "text-foreground";

  const delta =
    predictedPrice !== null && currentPrice !== null
      ? predictedPrice - currentPrice
      : null;
  const deltaPct =
    delta !== null && currentPrice !== null && currentPrice > 0
      ? (delta / currentPrice) * 100
      : null;
  const deltaPositive = delta !== null && delta >= 0;

  return (
    <div className="card-glass px-4 py-3" data-ocid="prediction24h.card">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            24H Price Prediction
          </span>
          <span className="text-[9px] text-muted-foreground font-mono opacity-60">
            vnpsy-…xnq-cai
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary"
              data-ocid="prediction24h.loading_state"
            >
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              POLLING
            </span>
          ) : source === "live" ? (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-positive/10 text-positive"
              data-ocid="prediction24h.success_state"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-positive inline-block" />
              LIVE
            </span>
          ) : source === "synthesized" ? (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"
              data-ocid="prediction24h.success_state"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              EST
            </span>
          ) : (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-negative/10 text-negative"
              data-ocid="prediction24h.error_state"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-negative inline-block" />
              ERROR
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      {isLoading && predictedPrice === null ? (
        <div
          className="flex items-center gap-6"
          data-ocid="prediction24h.loading_state"
        >
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-32 ml-auto" />
        </div>
      ) : source === "error" && predictedPrice === null ? (
        <div
          className="flex items-center gap-2 text-muted-foreground py-1"
          data-ocid="prediction24h.error_state"
        >
          <span className="text-xs">
            Prediction unavailable — canister offline
          </span>
        </div>
      ) : (
        <motion.div
          className="flex flex-wrap items-center gap-x-6 gap-y-2"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Predicted price */}
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-3xl font-bold font-mono tracking-tight ${priceColorClass}`}
              data-ocid="prediction24h.panel"
            >
              {predictedPrice !== null
                ? `$${formatPrice(predictedPrice)}`
                : "—"}
            </span>
            {source === "synthesized" && (
              <span className="text-[9px] font-mono text-amber-400/70 uppercase tracking-widest">
                AI-estimated
              </span>
            )}
            {delta !== null && deltaPct !== null && (
              <span
                className={`text-[11px] font-mono font-medium ${
                  deltaPositive ? "text-positive" : "text-negative"
                }`}
              >
                {deltaPositive ? "+" : ""}
                {delta >= 0 ? "+" : ""}${formatPrice(Math.abs(delta))} ·{" "}
                {deltaPositive ? "+" : ""}
                {deltaPct.toFixed(2)}%
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border hidden sm:block" />

          {/* Direction badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${
              isBullish
                ? "bg-positive/15 text-positive border border-positive/20"
                : isBearish
                  ? "bg-negative/15 text-negative border border-negative/20"
                  : "bg-accent text-muted-foreground border border-border"
            }`}
            data-ocid="prediction24h.panel"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBullish
                  ? "bg-positive"
                  : isBearish
                    ? "bg-negative"
                    : "bg-muted-foreground"
              }`}
            />
            {direction.toUpperCase()}
          </div>

          {/* Confidence */}
          <div className="flex flex-col gap-0.5 min-w-[80px]">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Confidence
            </span>
            <span className="text-sm font-mono font-semibold text-foreground">
              {confidence}%
            </span>
          </div>

          {/* Trend strength bar */}
          <div className="flex flex-col gap-1 min-w-[100px]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Trend Strength
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">
                {trendStrength}%
              </span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden w-full">
              <motion.div
                className={`h-full rounded-full ${
                  isBullish
                    ? "bg-positive"
                    : isBearish
                      ? "bg-negative"
                      : "bg-primary"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${trendStrength}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Countdown + last updated */}
          <div className="ml-auto flex items-center gap-1.5 text-[9px] text-muted-foreground font-mono">
            <Clock className="w-3 h-3" />
            <span>Refreshes in {secondsUntilRefresh}s</span>
            <span className="opacity-40">·</span>
            <span>Updated {formatTime(lastUpdated)}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
