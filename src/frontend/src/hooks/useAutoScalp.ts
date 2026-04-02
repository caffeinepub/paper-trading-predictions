import { useCallback, useEffect, useRef, useState } from "react";
import { Direction } from "../backend";
import { actors } from "../lib/canisters";
import { useActor } from "./useActor";

const SCALP_INTERVAL = 300; // 5 minutes in seconds

export type DirectionBias = "auto" | "long" | "short";

export interface AutoScalpState {
  isEnabled: boolean;
  setEnabled: (v: boolean) => void;
  countdown: number;
  positionSize: number;
  setPositionSize: (v: number) => void;
  directionBias: DirectionBias;
  setDirectionBias: (v: DirectionBias) => void;
  lastResult: string | null;
  openTradeId: bigint | null;
}

export function useAutoScalp(
  currentPrice: number | null,
  prophetSignal: string,
): AutoScalpState {
  const { actor } = useActor();
  const [isEnabled, setEnabledState] = useState(true);
  const [countdown, setCountdown] = useState(SCALP_INTERVAL);
  const [positionSize, setPositionSize] = useState(100);
  const [directionBias, setDirectionBias] = useState<DirectionBias>("auto");
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [openTradeId, setOpenTradeId] = useState<bigint | null>(null);

  // Refs to avoid stale closures in interval callbacks
  const actorRef = useRef(actor);
  const priceRef = useRef(currentPrice);
  const prophetRef = useRef(prophetSignal);
  const posRef = useRef(positionSize);
  const biasRef = useRef(directionBias);
  const openIdRef = useRef<bigint | null>(null);
  const scalping = useRef(false);
  const countRef = useRef(SCALP_INTERVAL);

  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);
  useEffect(() => {
    priceRef.current = currentPrice;
  }, [currentPrice]);
  useEffect(() => {
    prophetRef.current = prophetSignal;
  }, [prophetSignal]);
  useEffect(() => {
    posRef.current = positionSize;
  }, [positionSize]);
  useEffect(() => {
    biasRef.current = directionBias;
  }, [directionBias]);

  const executeScalp = useCallback(async () => {
    const price = priceRef.current;
    const act = actorRef.current;
    if (!price || price <= 0 || !act) return;

    // Close any existing open trade first
    if (openIdRef.current !== null) {
      try {
        const result = await act.closeTrade(openIdRef.current, price);
        const pnl = result.pnl ?? 0;
        setLastResult(
          `✓ Closed at $${price.toFixed(2)} — P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
        );
      } catch (e) {
        setLastResult(
          `⚠ Close failed: ${e instanceof Error ? e.message.slice(0, 60) : "error"}`,
        );
      }
      openIdRef.current = null;
      setOpenTradeId(null);
    }

    // Determine direction from bias / signals
    let dir: "long" | "short";
    const bias = biasRef.current;
    if (bias === "long") {
      dir = "long";
    } else if (bias === "short") {
      dir = "short";
    } else {
      const sig = prophetRef.current.toLowerCase();
      if (sig.includes("bull") || sig.includes("up") || sig.includes("rise")) {
        dir = "long";
      } else if (
        sig.includes("bear") ||
        sig.includes("down") ||
        sig.includes("fall")
      ) {
        dir = "short";
      } else {
        dir = Math.random() > 0.5 ? "long" : "short";
      }
    }

    // Enter new trade via backend
    try {
      const direction = dir === "long" ? Direction.long_ : Direction.short_;
      const id = await act.enterTrade(direction, price, posRef.current);
      openIdRef.current = id;
      setOpenTradeId(id);
      setLastResult(
        `▶ Entered ${dir.toUpperCase()} at $${price.toFixed(2)} — size: $${posRef.current}`,
      );

      // Signal ghost_sniper canister (fire-and-forget)
      try {
        await (actors.ghostSniper as any).trigger_trade(
          dir,
          BigInt(Math.floor(price)),
        );
      } catch {
        // ghost_sniper failures are non-fatal
      }
    } catch (e) {
      setLastResult(
        `⚠ Entry failed: ${e instanceof Error ? e.message.slice(0, 60) : "error"}`,
      );
    }
  }, []);

  // Countdown timer + auto-execute scalp
  useEffect(() => {
    if (!isEnabled) return;

    countRef.current = SCALP_INTERVAL;
    setCountdown(SCALP_INTERVAL);

    const t = setInterval(() => {
      countRef.current -= 1;
      setCountdown(countRef.current);

      if (countRef.current <= 0 && !scalping.current) {
        scalping.current = true;
        countRef.current = SCALP_INTERVAL;
        setCountdown(SCALP_INTERVAL);
        executeScalp().finally(() => {
          scalping.current = false;
        });
      }
    }, 1000);

    return () => clearInterval(t);
  }, [isEnabled, executeScalp]);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    if (!v) {
      countRef.current = SCALP_INTERVAL;
      setCountdown(SCALP_INTERVAL);
    }
  }, []);

  return {
    isEnabled,
    setEnabled,
    countdown,
    positionSize,
    setPositionSize,
    directionBias,
    setDirectionBias,
    lastResult,
    openTradeId,
  };
}
