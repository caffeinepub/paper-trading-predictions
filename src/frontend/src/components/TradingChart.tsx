import { useCallback, useEffect, useRef, useState } from "react";
import type { TimeInterval } from "../hooks/useBinanceData";
import {
  type Candle,
  calculateBollingerBands,
  calculateRSI,
} from "../lib/indicators";

interface Props {
  candles: Candle[];
  interval: TimeInterval;
  setInterval: (i: TimeInterval) => void;
  symbol: string;
  setSymbol: (s: string) => void;
  isLoading: boolean;
}

const INTERVALS: TimeInterval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];

// Color constants (literal values — CSS vars not available in canvas)
const BG = "#0b0f1a";
const GRID = "rgba(255,255,255,0.05)";
const TEXT_COLOR = "#64748b";
const UP_BODY = "#10b981";
const DOWN_BODY = "#ef4444";
const UP_WICK = "#10b981";
const DOWN_WICK = "#ef4444";
const BB_COLOR = "rgba(6,182,212,0.7)";
const BB_FILL = "rgba(6,182,212,0.04)";
const RSI_COLOR = "#a855f7";
const RSI_OB = "rgba(239,68,68,0.4)";
const RSI_OS = "rgba(16,185,129,0.4)";
const RSI_BG = "rgba(6,10,24,0.8)";

const PRICE_AX_W = 70;
const TIME_AX_H = 22;
const RSI_H_RATIO = 0.22;
const CHART_PAD_TOP = 12;
const CHART_PAD_BOT = 4;

function drawChart(canvas: HTMLCanvasElement, candles: Candle[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx || candles.length < 2) return;

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const chartAreaH = H * (1 - RSI_H_RATIO) - TIME_AX_H;
  const rsiAreaTop = chartAreaH + TIME_AX_H;
  const rsiAreaH = H - rsiAreaTop;
  const drawW = W - PRICE_AX_W;

  const visible = candles.slice(-200);
  const n = visible.length;
  if (n === 0) return;

  const candleW = drawW / n;
  const bodyW = Math.max(1, candleW * 0.55);

  // Price range (padded)
  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = Number.NEGATIVE_INFINITY;
  for (const c of visible) {
    if (c.low < priceMin) priceMin = c.low;
    if (c.high > priceMax) priceMax = c.high;
  }
  const priceRange = priceMax - priceMin || 1;
  const padY = priceRange * 0.05;
  priceMin -= padY;
  priceMax += padY;

  const py = (p: number) =>
    CHART_PAD_TOP +
    (1 - (p - priceMin) / (priceMax - priceMin)) *
      (chartAreaH - CHART_PAD_TOP - CHART_PAD_BOT);

  const cx = (i: number) => i * candleW + candleW / 2;

  // Grid lines for chart
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 0.5 * dpr;
  const priceSteps = 6;
  for (let i = 0; i <= priceSteps; i++) {
    const y = (chartAreaH / priceSteps) * i;
    ctx.beginPath();
    ctx.moveTo(0, y * dpr);
    ctx.lineTo(drawW * dpr, y * dpr);
    ctx.stroke();

    // Price labels
    const p = priceMax - (priceMax - priceMin) * (i / priceSteps);
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `${10 * dpr}px monospace`;
    ctx.textAlign = "right";
    ctx.fillText(
      p.toLocaleString("en-US", { maximumFractionDigits: 0 }),
      (W - 4) * dpr,
      (y + 4) * dpr,
    );
  }

  // Bollinger Bands
  const bbArr = calculateBollingerBands(visible);
  const bbOffset = n - bbArr.length;
  if (bbArr.length > 1) {
    // Fill between bands
    ctx.beginPath();
    ctx.moveTo(cx(bbOffset) * dpr, py(bbArr[0].upper) * dpr);
    for (let i = 0; i < bbArr.length; i++) {
      ctx.lineTo(cx(i + bbOffset) * dpr, py(bbArr[i].upper) * dpr);
    }
    for (let i = bbArr.length - 1; i >= 0; i--) {
      ctx.lineTo(cx(i + bbOffset) * dpr, py(bbArr[i].lower) * dpr);
    }
    ctx.closePath();
    ctx.fillStyle = BB_FILL;
    ctx.fill();

    // Upper, mid, lower lines
    for (const lineKey of ["upper", "middle", "lower"] as const) {
      ctx.beginPath();
      ctx.strokeStyle = BB_COLOR;
      ctx.lineWidth = (lineKey === "middle" ? 1.5 : 1) * dpr;
      ctx.setLineDash(lineKey === "middle" ? [] : [3 * dpr, 3 * dpr]);
      for (let i = 0; i < bbArr.length; i++) {
        const x = cx(i + bbOffset) * dpr;
        const y = py(bbArr[i][lineKey]) * dpr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Candlesticks
  for (let i = 0; i < n; i++) {
    const c = visible[i];
    const isUp = c.close >= c.open;
    const color = isUp ? UP_BODY : DOWN_BODY;
    const wickColor = isUp ? UP_WICK : DOWN_WICK;
    const x = cx(i);

    // Wick
    ctx.strokeStyle = wickColor;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(x * dpr, py(c.high) * dpr);
    ctx.lineTo(x * dpr, py(c.low) * dpr);
    ctx.stroke();

    // Body
    const bodyTop = py(Math.max(c.open, c.close));
    const bodyBot = py(Math.min(c.open, c.close));
    const bodyH = Math.max(1, bodyBot - bodyTop);
    ctx.fillStyle = color;
    ctx.fillRect(
      (x - bodyW / 2) * dpr,
      bodyTop * dpr,
      bodyW * dpr,
      bodyH * dpr,
    );
  }

  // Time axis labels (every ~20 candles)
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `${9 * dpr}px monospace`;
  ctx.textAlign = "center";
  const labelEvery = Math.max(1, Math.floor(n / 8));
  for (let i = 0; i < n; i += labelEvery) {
    const c = visible[i];
    const d = new Date(c.time * 1000);
    const label = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    const x = cx(i);
    ctx.fillText(label, x * dpr, (chartAreaH + TIME_AX_H - 4) * dpr);
  }

  // Current price line
  const lastClose = visible[n - 1].close;
  const priceY = py(lastClose);
  ctx.setLineDash([4 * dpr, 4 * dpr]);
  ctx.strokeStyle = "rgba(6,182,212,0.6)";
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(0, priceY * dpr);
  ctx.lineTo(drawW * dpr, priceY * dpr);
  ctx.stroke();
  ctx.setLineDash([]);

  // Current price label
  ctx.fillStyle = "#06b6d4";
  ctx.font = `bold ${10 * dpr}px monospace`;
  ctx.textAlign = "right";
  ctx.fillText(
    lastClose.toLocaleString("en-US", { maximumFractionDigits: 1 }),
    (W - 4) * dpr,
    (priceY + 4) * dpr,
  );

  // RSI separator
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(0, rsiAreaTop * dpr);
  ctx.lineTo(W * dpr, rsiAreaTop * dpr);
  ctx.stroke();

  // RSI background
  ctx.fillStyle = RSI_BG;
  ctx.fillRect(0, rsiAreaTop * dpr, drawW * dpr, rsiAreaH * dpr);

  // RSI label
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `${9 * dpr}px monospace`;
  ctx.textAlign = "left";
  ctx.fillText("RSI(14)", 4 * dpr, (rsiAreaTop + 12) * dpr);

  // RSI horizontal reference lines (70/30)
  const rsiY = (v: number) => rsiAreaTop + (1 - v / 100) * (rsiAreaH - 4);

  ctx.setLineDash([2 * dpr, 4 * dpr]);
  for (const [level, color] of [
    [70, RSI_OB],
    [30, RSI_OS],
    [50, GRID],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, rsiY(level) * dpr);
    ctx.lineTo(drawW * dpr, rsiY(level) * dpr);
    ctx.stroke();
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `${8 * dpr}px monospace`;
    ctx.textAlign = "right";
    ctx.fillText(String(level), (W - 4) * dpr, (rsiY(level) + 3) * dpr);
  }
  ctx.setLineDash([]);

  // RSI line
  const rsiArr = calculateRSI(visible);
  if (rsiArr.length > 1) {
    const rsiOff = n - rsiArr.length;
    ctx.beginPath();
    ctx.strokeStyle = RSI_COLOR;
    ctx.lineWidth = 1.5 * dpr;
    for (let i = 0; i < rsiArr.length; i++) {
      const x = cx(i + rsiOff) * dpr;
      const y = rsiY(rsiArr[i]) * dpr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current RSI value label
    const curRsi = rsiArr[rsiArr.length - 1];
    ctx.fillStyle = RSI_COLOR;
    ctx.font = `bold ${10 * dpr}px monospace`;
    ctx.textAlign = "right";
    ctx.fillText(curRsi.toFixed(1), (W - 4) * dpr, (rsiY(curRsi) + 4) * dpr);
  }
}

export default function TradingChart({
  candles,
  interval,
  setInterval,
  symbol,
  setSymbol,
  isLoading,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 480 });

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Draw whenever candles or dims change
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    drawChart(canvas, candles);
  }, [candles, dims]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-shrink-0">
        <select
          className="bg-muted text-foreground text-xs px-2 py-1 rounded border border-border focus:outline-none"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          data-ocid="chart.select"
        >
          {SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="flex gap-1 ml-auto" data-ocid="chart.tab">
          {INTERVALS.map((i) => (
            <button
              type="button"
              key={i}
              onClick={() => setInterval(i)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                interval === i
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 min-h-0">
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10 bg-background/60"
            data-ocid="chart.loading_state"
          >
            <span className="text-muted-foreground text-sm animate-pulse">
              Loading chart data…
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ width: dims.w, height: dims.h, display: "block" }}
        />
      </div>
    </div>
  );
}
