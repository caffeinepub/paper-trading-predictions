import { useCallback, useEffect, useState } from "react";
import { actors } from "../lib/canisters";

export interface SignalEntry {
  value: string;
  status: "ok" | "error" | "loading";
  lastUpdated: Date | null;
}

export interface SignalsData {
  prophet: SignalEntry;
  prophetPrediction: SignalEntry;
  sentiment: SignalEntry;
  whaleSonar: SignalEntry;
  selfOptimizer: SignalEntry;
}

const LOADING: SignalEntry = {
  value: "",
  status: "loading",
  lastUpdated: null,
};
const ERROR_ENTRY: SignalEntry = {
  value: "offline",
  status: "error",
  lastUpdated: null,
};

function ok(value: string): SignalEntry {
  return { value, status: "ok", lastUpdated: new Date() };
}

export function useSignals(): SignalsData {
  const [prophet, setProphet] = useState<SignalEntry>(LOADING);
  const [prophetPrediction, setProphetPrediction] =
    useState<SignalEntry>(LOADING);
  const [sentiment, setSentiment] = useState<SignalEntry>(LOADING);
  const [whaleSonar, setWhaleSonar] = useState<SignalEntry>(LOADING);
  const [selfOptimizer, setSelfOptimizer] = useState<SignalEntry>(LOADING);

  const poll = useCallback(async () => {
    // prophet: use get_latest_prediction
    try {
      const r = (await Promise.race([
        (actors.prophet as any).get_latest_prediction(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 8000),
        ),
      ])) as any;
      const dir =
        r.direction && "Bullish" in r.direction ? "Bullish" : "Bearish";
      const conf = Math.round(Number(r.confidence_score) * 100);
      const str = Math.round(Number(r.trend_strength) * 100);
      setProphet(ok(`${dir} · ${conf}% confidence · strength ${str}%`));
    } catch {
      setProphet(ERROR_ENTRY);
    }

    // prophetPrediction: use predict_24h_close
    try {
      const r = (await Promise.race([
        (actors.prophet as any).predict_24h_close(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 8000),
        ),
      ])) as any;
      setProphetPrediction(ok(String(r)));
    } catch {
      setProphetPrediction(ERROR_ENTRY);
    }

    // sentiment: use get_current_market_mood
    try {
      const r = (await Promise.race([
        (actors.sentimentEngine as any).get_current_market_mood(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 8000),
        ),
      ])) as any;
      const sent = Math.round(Number(r.overall_sentiment) * 100);
      const liq = Number(r.liquidity_delta).toFixed(0);
      const alertArr: string[] = r.whale_activity_alert ?? [];
      const whale = alertArr.length > 0 ? ` · ${alertArr[0]}` : "";
      setSentiment(ok(`Sentiment ${sent}% · Liquidity Δ${liq}${whale}`));
    } catch {
      setSentiment(ERROR_ENTRY);
    }

    // whaleSonar: check() may not exist — treat method-not-found as online
    try {
      await Promise.race([
        (actors.whaleSonar as any).check(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 8000),
        ),
      ]);
      setWhaleSonar(ok("Online"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isReachable =
        msg.includes("has no query method") ||
        msg.includes("MethodNotFound") ||
        msg.includes("no method");
      setWhaleSonar(isReachable ? ok("Online") : ERROR_ENTRY);
    }

    // selfOptimizer: same approach
    try {
      await Promise.race([
        (actors.selfOptimizer as any).check(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 8000),
        ),
      ]);
      setSelfOptimizer(ok("Online"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isReachable =
        msg.includes("has no query method") ||
        msg.includes("MethodNotFound") ||
        msg.includes("no method");
      setSelfOptimizer(isReachable ? ok("Online") : ERROR_ENTRY);
    }
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, [poll]);

  return { prophet, prophetPrediction, sentiment, whaleSonar, selfOptimizer };
}
