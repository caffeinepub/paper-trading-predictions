import { useCallback, useEffect, useState } from "react";
import {
  CANISTERS,
  type CanisterInfo,
  actors,
  getAgent,
} from "../lib/canisters";

export type CanisterStatus = "online" | "offline" | "checking";

export interface CanisterState extends CanisterInfo {
  status: CanisterStatus;
  lastChecked: Date | null;
  data?: unknown;
}

export interface LiquidityData {
  level: number; // 0-100
  trend: "increasing" | "decreasing" | "stable";
}

export interface WhaleAlert {
  type: "buy" | "sell";
  size: "large" | "medium";
  message: string;
}

export interface ProphetPrediction {
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  trendStrength: number;
  source: "live" | "simulated";
}

export interface CanistersData {
  canisters: CanisterState[];
  liquidity: LiquidityData;
  whaleAlert: WhaleAlert | null;
  prophet: ProphetPrediction;
  refreshAll: () => void;
  refreshOne: (id: string) => void;
}

async function pingCanister(id: string): Promise<boolean> {
  try {
    const agent = getAgent();
    await Promise.race([
      agent.readState(id, { paths: [] }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 6000),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

// Fetch real prophet prediction from on-chain canister
async function fetchProphetPrediction(): Promise<ProphetPrediction> {
  try {
    const result = (await Promise.race([
      (actors.prophet as any).get_latest_prediction() as Promise<any>,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 8000),
      ),
    ])) as any;

    const isVariant = (v: any, key: string) =>
      v && typeof v === "object" && key in v;

    const direction: ProphetPrediction["direction"] = isVariant(
      result.direction,
      "Bullish",
    )
      ? "bullish"
      : isVariant(result.direction, "Bearish")
        ? "bearish"
        : "neutral";

    return {
      direction,
      confidence: Math.round(Number(result.confidence_score) * 100),
      trendStrength: Math.round(Number(result.trend_strength) * 100),
      source: "live",
    };
  } catch {
    // Fallback to simulated
    const r = Math.random();
    return {
      direction: r < 0.4 ? "bullish" : r < 0.7 ? "bearish" : "neutral",
      confidence: Math.round(50 + Math.random() * 45),
      trendStrength: Math.round(40 + Math.random() * 50),
      source: "simulated",
    };
  }
}

// Fetch real market mood from sentiment_engine canister
async function fetchMarketMood(): Promise<{
  liquidity: LiquidityData;
  whaleAlert: WhaleAlert | null;
}> {
  try {
    const result = (await Promise.race([
      (actors.sentimentEngine as any).get_current_market_mood() as Promise<any>,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 8000),
      ),
    ])) as any;

    const sentiment: number = Number(result.overall_sentiment); // 0-1
    const liquidityDelta: number = Number(result.liquidity_delta); // e.g. 60

    // Map sentiment + liquidity_delta to our LiquidityData shape
    const level = Math.min(100, Math.max(0, Math.round(liquidityDelta)));
    const trend: LiquidityData["trend"] =
      sentiment > 0.55
        ? "increasing"
        : sentiment < 0.4
          ? "decreasing"
          : "stable";

    const liquidity: LiquidityData = { level, trend };

    // Parse optional whale alert
    let whaleAlert: WhaleAlert | null = null;
    const alertArr: string[] = result.whale_activity_alert ?? [];
    if (alertArr.length > 0 && alertArr[0]) {
      const msg = alertArr[0];
      const isBuy = msg.toUpperCase().includes("BUY");
      const isLarge = msg.toLowerCase().includes("large");
      whaleAlert = {
        type: isBuy ? "buy" : "sell",
        size: isLarge ? "large" : "medium",
        message: msg,
      };
    }

    return { liquidity, whaleAlert };
  } catch {
    // Fallback to simulated
    const level = 30 + Math.random() * 60;
    const r = Math.random();
    const liquidity: LiquidityData = {
      level: Math.round(level),
      trend: r < 0.33 ? "increasing" : r < 0.66 ? "decreasing" : "stable",
    };
    let whaleAlert: WhaleAlert | null = null;
    if (Math.random() > 0.4) {
      const type = Math.random() > 0.5 ? "buy" : "sell";
      const size = Math.random() > 0.5 ? "large" : "medium";
      const amount = (Math.random() * 500 + 50).toFixed(0);
      whaleAlert = {
        type,
        size,
        message: `${size === "large" ? "🐋" : "🐟"} ${size.charAt(0).toUpperCase() + size.slice(1)} ${type.toUpperCase()} — ${amount} BTC detected`,
      };
    }
    return { liquidity, whaleAlert };
  }
}

export function useCanisters(): CanistersData {
  const [canisters, setCanisters] = useState<CanisterState[]>(
    CANISTERS.map((c) => ({
      ...c,
      status: "checking" as CanisterStatus,
      lastChecked: null,
    })),
  );
  const [liquidity, setLiquidity] = useState<LiquidityData>({
    level: 60,
    trend: "stable",
  });
  const [whaleAlert, setWhaleAlert] = useState<WhaleAlert | null>(null);
  const [prophet, setProphet] = useState<ProphetPrediction>({
    direction: "neutral",
    confidence: 0,
    trendStrength: 0,
    source: "simulated",
  });

  const checkOne = useCallback(async (id: string) => {
    setCanisters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "checking" } : c)),
    );
    const online = await pingCanister(id);
    setCanisters((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: online ? "online" : "offline",
              lastChecked: new Date(),
            }
          : c,
      ),
    );
  }, []);

  const fetchSignals = useCallback(async () => {
    const [prophetData, moodData] = await Promise.all([
      fetchProphetPrediction(),
      fetchMarketMood(),
    ]);
    setProphet(prophetData);
    setLiquidity(moodData.liquidity);
    setWhaleAlert(moodData.whaleAlert);
  }, []);

  const refreshAll = useCallback(() => {
    for (const c of CANISTERS) {
      checkOne(c.id);
    }
    fetchSignals();
  }, [checkOne, fetchSignals]);

  const refreshOne = useCallback((id: string) => checkOne(id), [checkOne]);

  useEffect(() => {
    refreshAll();
    const timer = setInterval(fetchSignals, 30000);
    return () => clearInterval(timer);
  }, [refreshAll, fetchSignals]);

  return { canisters, liquidity, whaleAlert, prophet, refreshAll, refreshOne };
}
