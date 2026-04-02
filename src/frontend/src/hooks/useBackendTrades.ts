import { useCallback, useEffect, useState } from "react";
import type { PerformanceStats, TradeResult } from "../backend";
import { useActor } from "./useActor";

export interface BackendTradesData {
  trades: TradeResult[];
  openTrades: TradeResult[];
  stats: PerformanceStats | null;
  isLoading: boolean;
  refresh: () => void;
}

export function useBackendTrades(): BackendTradesData {
  const { actor } = useActor();
  const [trades, setTrades] = useState<TradeResult[]>([]);
  const [openTrades, setOpenTrades] = useState<TradeResult[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!actor) return;
    setIsLoading(true);
    try {
      const [all, open, perf] = await Promise.all([
        actor.getAllTrades().catch(() => [] as TradeResult[]),
        actor.getOpenTrades().catch(() => [] as TradeResult[]),
        actor
          .getPerformanceStats()
          .catch(() => null as PerformanceStats | null),
      ]);
      setTrades(all);
      setOpenTrades(open);
      setStats(perf);
    } catch {
      // silently handle
    } finally {
      setIsLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [refresh]);

  return { trades, openTrades, stats, isLoading, refresh };
}
