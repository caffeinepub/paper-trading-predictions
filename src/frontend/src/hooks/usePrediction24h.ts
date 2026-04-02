import { useCallback, useEffect, useRef, useState } from "react";
import { actors } from "../lib/canisters";

export interface Prediction24hData {
  predictedPrice: number | null;
  rawText: string;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  trendStrength: number;
  source: "live" | "error" | "synthesized";
  lastUpdated: Date | null;
  isLoading: boolean;
  secondsUntilRefresh: number;
}

const POLL_INTERVAL = 60;

function parsePriceText(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function usePrediction24h(
  currentPrice?: number | null,
): Prediction24hData {
  const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
  const [rawText, setRawText] = useState("");
  const [direction, setDirection] = useState<"bullish" | "bearish" | "neutral">(
    "neutral",
  );
  const [confidence, setConfidence] = useState(0);
  const [trendStrength, setTrendStrength] = useState(0);
  const [source, setSource] = useState<"live" | "error" | "synthesized">(
    "live",
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(POLL_INTERVAL);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPriceRef = useRef<number | null | undefined>(currentPrice);

  // Keep ref in sync so poll() closure always has latest price
  useEffect(() => {
    currentPriceRef.current = currentPrice;
  }, [currentPrice]);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setSecondsUntilRefresh(POLL_INTERVAL);
    countdownRef.current = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) return POLL_INTERVAL;
        return prev - 1;
      });
    }, 1000);
  }, []);

  const poll = useCallback(async () => {
    setIsLoading(true);

    let priceOk = false;
    let metaOk = false;

    let dirSnapshot: "bullish" | "bearish" = "bullish";
    let confidenceScore = 0;
    let trendStrengthScore = 0;

    const [priceResult, metaResult] = await Promise.allSettled([
      Promise.race([
        (actors.prophet as any).predict_24h_close() as Promise<string>,
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 8000),
        ),
      ]),
      Promise.race([
        (actors.prophet as any).get_latest_prediction() as Promise<{
          direction: { Bullish?: null; Bearish?: null };
          confidence_score: number;
          trend_strength: number;
          timestamp: bigint;
        }>,
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 8000),
        ),
      ]),
    ]);

    if (metaResult.status === "fulfilled") {
      const r = metaResult.value;
      dirSnapshot =
        r.direction && "Bullish" in r.direction ? "bullish" : "bearish";
      confidenceScore = Number(r.confidence_score);
      trendStrengthScore = Number(r.trend_strength);
      setDirection(dirSnapshot);
      setConfidence(Math.round(confidenceScore * 100));
      setTrendStrength(Math.round(trendStrengthScore * 100));
      metaOk = true;
    }

    if (priceResult.status === "fulfilled") {
      const raw = String(priceResult.value);
      const price = parsePriceText(raw);
      setRawText(raw);

      if (price !== null) {
        setPredictedPrice(price);
        priceOk = true;
      } else if (metaOk) {
        // Synthesize price from direction + confidence + trend strength
        const latestPrice = currentPriceRef.current;
        if (latestPrice && latestPrice > 0) {
          const directionSign = dirSnapshot === "bullish" ? 1 : -1;
          const magnitude = confidenceScore * trendStrengthScore * 0.04;
          const synthesizedPrice =
            latestPrice * (1 + directionSign * magnitude);
          setPredictedPrice(synthesizedPrice);
          setSource("synthesized");
          setLastUpdated(new Date());
          setIsLoading(false);
          startCountdown();
          return;
        }
      }
    } else if (metaOk) {
      // predict_24h_close failed entirely — synthesize from meta
      const latestPrice = currentPriceRef.current;
      if (latestPrice && latestPrice > 0) {
        const directionSign = dirSnapshot === "bullish" ? 1 : -1;
        const magnitude = confidenceScore * trendStrengthScore * 0.04;
        const synthesizedPrice = latestPrice * (1 + directionSign * magnitude);
        setPredictedPrice(synthesizedPrice);
        setSource("synthesized");
        setLastUpdated(new Date());
        setIsLoading(false);
        startCountdown();
        return;
      }
    }

    if (priceOk || metaOk) {
      setSource("live");
      setLastUpdated(new Date());
    } else {
      setSource("error");
    }

    setIsLoading(false);
    startCountdown();
  }, [startCountdown]);

  useEffect(() => {
    poll();
    const pollTimer = setInterval(poll, POLL_INTERVAL * 1000);
    return () => {
      clearInterval(pollTimer);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [poll]);

  return {
    predictedPrice,
    rawText,
    direction,
    confidence,
    trendStrength,
    source,
    lastUpdated,
    isLoading,
    secondsUntilRefresh,
  };
}
