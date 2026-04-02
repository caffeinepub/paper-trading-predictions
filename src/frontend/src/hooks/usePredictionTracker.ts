import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "sros_prediction_tracker_v1";
const MAX_PREDICTIONS = 20;

export type PredictionOutcome = "pending" | "hit" | "miss";

export interface PredictionRecord {
  id: string;
  timestamp: number; // ms since epoch
  predictedPrice: number;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number; // 0-100
  trendStrength: number; // 0-100
  actualPriceAtPrediction: number;
  outcome: PredictionOutcome;
  resolvedAt?: number;
  actualPriceAtResolution?: number;
}

export interface PredictionStats {
  total: number;
  hits: number;
  misses: number;
  hitRate: number; // 0-100
  currentStreak: number;
  longestStreak: number;
  avgConfidenceHits: number;
  avgConfidenceMisses: number;
}

export interface PredictionTrackerResult {
  predictions: PredictionRecord[];
  stats: PredictionStats;
  addPrediction: (data: {
    predictedPrice: number;
    direction: "bullish" | "bearish" | "neutral";
    confidence: number;
    trendStrength: number;
    currentPrice: number;
  }) => void;
  clearHistory: () => void;
}

function loadFromStorage(): PredictionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(records: PredictionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage quota exceeded — ignore
  }
}

function computeStats(records: PredictionRecord[]): PredictionStats {
  const resolved = records.filter((r) => r.outcome !== "pending");
  const hits = resolved.filter((r) => r.outcome === "hit");
  const misses = resolved.filter((r) => r.outcome === "miss");

  // Current streak — walk backwards from most recent resolved
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let streakType: PredictionOutcome | null = null;

  for (let i = resolved.length - 1; i >= 0; i--) {
    const r = resolved[i];
    if (i === resolved.length - 1) {
      streakType = r.outcome;
      currentStreak = 1;
    } else if (r.outcome === streakType) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Longest hit streak
  for (const r of resolved) {
    if (r.outcome === "hit") {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  const avgConfidenceHits =
    hits.length > 0
      ? hits.reduce((acc, r) => acc + r.confidence, 0) / hits.length
      : 0;

  const avgConfidenceMisses =
    misses.length > 0
      ? misses.reduce((acc, r) => acc + r.confidence, 0) / misses.length
      : 0;

  return {
    total: records.length,
    hits: hits.length,
    misses: misses.length,
    hitRate: resolved.length > 0 ? (hits.length / resolved.length) * 100 : 0,
    currentStreak,
    longestStreak,
    avgConfidenceHits: Math.round(avgConfidenceHits),
    avgConfidenceMisses: Math.round(avgConfidenceMisses),
  };
}

function scoreRecord(
  record: PredictionRecord,
  currentPrice: number,
): PredictionOutcome {
  if (record.direction === "neutral") return "miss";
  if (record.direction === "bullish") {
    return currentPrice > record.actualPriceAtPrediction ? "hit" : "miss";
  }
  return currentPrice < record.actualPriceAtPrediction ? "hit" : "miss";
}

export function usePredictionTracker(
  currentPrice: number | null,
): PredictionTrackerResult {
  const [predictions, setPredictions] = useState<PredictionRecord[]>(() =>
    loadFromStorage(),
  );
  const lastPriceRef = useRef(currentPrice);

  // Keep price ref up to date
  useEffect(() => {
    lastPriceRef.current = currentPrice;
  }, [currentPrice]);

  // Score pending predictions when price updates
  useEffect(() => {
    if (currentPrice === null) return;

    setPredictions((prev) => {
      let changed = false;
      const now = Date.now();
      // Resolve after 5 min for fast demo feedback, or after 24h real horizon
      const FAST_RESOLVE_MS = 5 * 60 * 1000;
      const FULL_RESOLVE_MS = 24 * 60 * 60 * 1000;

      const updated = prev.map((r) => {
        if (r.outcome !== "pending") return r;
        const age = now - r.timestamp;
        if (age < FAST_RESOLVE_MS) return r;

        // Resolve if older than 5 min (demo) or 24h (real)
        if (age >= FAST_RESOLVE_MS || age >= FULL_RESOLVE_MS) {
          const outcome = scoreRecord(r, currentPrice);
          changed = true;
          return {
            ...r,
            outcome,
            resolvedAt: now,
            actualPriceAtResolution: currentPrice,
          };
        }
        return r;
      });

      if (!changed) return prev;
      saveToStorage(updated);
      return updated;
    });
  }, [currentPrice]);

  const addPrediction = useCallback(
    (data: {
      predictedPrice: number;
      direction: "bullish" | "bearish" | "neutral";
      confidence: number;
      trendStrength: number;
      currentPrice: number;
    }) => {
      const record: PredictionRecord = {
        id: `pred_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        predictedPrice: data.predictedPrice,
        direction: data.direction,
        confidence: data.confidence,
        trendStrength: data.trendStrength,
        actualPriceAtPrediction: data.currentPrice,
        outcome: "pending",
      };

      setPredictions((prev) => {
        const withNew = [record, ...prev].slice(0, MAX_PREDICTIONS);
        saveToStorage(withNew);
        return withNew;
      });
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setPredictions([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const stats = computeStats(predictions);

  return { predictions, stats, addPrediction, clearHistory };
}
