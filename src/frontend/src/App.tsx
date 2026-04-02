import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Activity,
  BarChart2,
  Bell,
  Layers,
  RefreshCw,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ActiveTradePanel from "./components/ActiveTradePanel";
import AutoScalpPanel from "./components/AutoScalpPanel";
import BackendTradeLog from "./components/BackendTradeLog";
import CanisterStatus from "./components/CanisterStatus";
import MarketOverview from "./components/MarketOverview";
import Prediction24h from "./components/Prediction24h";
import PredictionTracker, {
  PredictionTrackerCollapsed,
} from "./components/PredictionTracker";
import SignalGrid from "./components/SignalGrid";
import SignalPanel from "./components/SignalPanel";
import SystemHealthBar from "./components/SystemHealthBar";
import TradingChart from "./components/TradingChart";
import { useAutoScalp } from "./hooks/useAutoScalp";
import { useBackendTrades } from "./hooks/useBackendTrades";
import { useBinanceData } from "./hooks/useBinanceData";
import { useCanisters } from "./hooks/useCanisters";
import { usePrediction24h } from "./hooks/usePrediction24h";
import { usePredictionTracker } from "./hooks/usePredictionTracker";
import { useSignals } from "./hooks/useSignals";
import { useSystemHealth } from "./hooks/useSystemHealth";
import { useTradingEngine } from "./hooks/useTradingEngine";

function DashCard({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card-glass flex flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const binance = useBinanceData();
  const canisters = useCanisters();
  const engine = useTradingEngine(binance.candles, binance.symbol);
  const signals = useSignals();
  const systemHealth = useSystemHealth();
  const backendTrades = useBackendTrades();

  const price = binance.ticker
    ? Number.parseFloat(binance.ticker.lastPrice)
    : null;
  const changePct = binance.ticker
    ? Number.parseFloat(binance.ticker.priceChangePercent)
    : null;

  // Pass current price so hook can synthesize price targets
  const prediction24h = usePrediction24h(price);

  const tracker = usePredictionTracker(price);

  // Track prediction additions — fire once per lastUpdated change
  const lastRecordedRef = useRef<Date | null>(null);
  const addPredictionRef = useRef(tracker.addPrediction);
  addPredictionRef.current = tracker.addPrediction;

  useEffect(() => {
    const lastUpdated = prediction24h.lastUpdated;
    if (!lastUpdated) return;
    if (lastRecordedRef.current?.getTime() === lastUpdated.getTime()) return;
    if (prediction24h.source === "error") return;
    if (prediction24h.predictedPrice === null || price === null) return;

    lastRecordedRef.current = lastUpdated;
    addPredictionRef.current({
      predictedPrice: prediction24h.predictedPrice,
      direction: prediction24h.direction,
      confidence: prediction24h.confidence,
      trendStrength: prediction24h.trendStrength,
      currentPrice: price,
    });
  }, [
    prediction24h.lastUpdated,
    prediction24h.source,
    prediction24h.predictedPrice,
    prediction24h.direction,
    prediction24h.confidence,
    prediction24h.trendStrength,
    price,
  ]);

  const autoScalp = useAutoScalp(
    price,
    signals.prophetPrediction.value || signals.prophet.value,
  );

  // Active sidebar tab
  const [activeTab, setActiveTab] = useState<string>("Chart");

  // Track record expanded state for Chart tab
  const [chartTrackerOpen, setChartTrackerOpen] = useState(false);

  // Settings state
  const [settingsAutoScalp, setSettingsAutoScalp] = useState(true);
  const [settingsPositionSize, setSettingsPositionSize] = useState([100]);

  // Clock
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(
      () => setClock(new Date().toLocaleTimeString()),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  // Find the open backend trade
  const openBackendTrade = backendTrades.openTrades[0] ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header
        className="h-14 bg-card border-b border-border flex items-center px-4 gap-3 sticky top-0 z-50"
        data-ocid="nav.panel"
      >
        {/* Brand */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground font-mono">
            PAPER TRADING PREDICTIONS
          </span>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {["Dashboard", "Signals", "Analytics"].map((n) => (
            <button
              type="button"
              key={n}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                n === "Dashboard"
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              data-ocid={`nav.${n.toLowerCase()}.link` as any}
            >
              {n}
            </button>
          ))}
        </nav>

        {/* Status indicators */}
        <div className="ml-auto flex items-center gap-3">
          {/* Seal status */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                systemHealth.sealVerified === null
                  ? "bg-yellow-400 pulse-yellow"
                  : systemHealth.sealVerified
                    ? "bg-positive"
                    : "bg-negative"
              }`}
            />
            <span className="text-muted-foreground">
              Seal{" "}
              {systemHealth.sealVerified === null
                ? "…"
                : systemHealth.sealVerified
                  ? "✓"
                  : "✗"}
            </span>
          </div>

          {/* Mesh health */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                systemHealth.meshHealth === null
                  ? "bg-yellow-400 pulse-yellow"
                  : !systemHealth.meshHealth.toLowerCase().includes("error")
                    ? "bg-positive"
                    : "bg-negative"
              }`}
            />
            <span className="text-muted-foreground">Mesh</span>
          </div>

          {/* BTC price */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">BTC</span>
            {price !== null ? (
              <>
                <span className="text-sm font-bold font-mono text-foreground">
                  ${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
                <span
                  className={`text-xs font-mono ${
                    (changePct ?? 0) >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {(changePct ?? 0) >= 0 ? "+" : ""}
                  {(changePct ?? 0).toFixed(2)}%
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground animate-pulse">
                Loading…
              </span>
            )}
          </div>

          {/* Clock */}
          <span className="hidden lg:block text-xs font-mono text-muted-foreground">
            {clock}
          </span>

          <button
            type="button"
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="nav.secondary_button"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── Sidebar ── */}
        <aside
          className="w-14 bg-card border-r border-border flex flex-col items-center py-4 gap-3 sticky top-14 h-[calc(100vh-3.5rem)]"
          data-ocid="nav.panel"
        >
          {[
            { icon: BarChart2, label: "Chart" },
            { icon: Activity, label: "Signals" },
            { icon: TrendingUp, label: "Trades" },
            { icon: Layers, label: "Markets" },
            { icon: RefreshCw, label: "Engine" },
            { icon: Settings, label: "Settings" },
          ].map(({ icon: Icon, label }) => (
            <button
              type="button"
              key={label}
              title={label}
              onClick={() => setActiveTab(label)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                activeTab === label
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              data-ocid={`sidebar.${label.toLowerCase()}.link` as any}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-[1600px] mx-auto space-y-4">
            {/* ── Always-visible System Health Bar ── */}
            <SystemHealthBar health={systemHealth} />

            {/* ── Chart Tab ── */}
            {activeTab === "Chart" && (
              <>
                {/* 0. 24H Prediction banner */}
                <Prediction24h
                  predictedPrice={prediction24h.predictedPrice}
                  currentPrice={price}
                  direction={prediction24h.direction}
                  confidence={prediction24h.confidence}
                  trendStrength={prediction24h.trendStrength}
                  source={prediction24h.source}
                  lastUpdated={prediction24h.lastUpdated}
                  isLoading={prediction24h.isLoading}
                  secondsUntilRefresh={prediction24h.secondsUntilRefresh}
                />

                {/* Track record — collapsed by default in Chart tab */}
                {chartTrackerOpen ? (
                  <PredictionTracker
                    predictions={tracker.predictions}
                    stats={tracker.stats}
                    onClear={tracker.clearHistory}
                  />
                ) : (
                  <PredictionTrackerCollapsed
                    stats={tracker.stats}
                    onExpand={() => setChartTrackerOpen(true)}
                  />
                )}

                {/* 1. Chart + Signal Analysis */}
                <div
                  className="grid grid-cols-[1fr_300px] gap-4"
                  style={{ minHeight: 500 }}
                >
                  <DashCard>
                    <CardHeader
                      title={`${binance.symbol} — ${binance.interval}`}
                      subtitle="Candlestick · Bollinger Bands · RSI · Live Binance"
                    />
                    <div className="flex-1 min-h-0">
                      <TradingChart
                        candles={binance.candles}
                        interval={binance.interval}
                        setInterval={binance.setInterval}
                        symbol={binance.symbol}
                        setSymbol={binance.setSymbol}
                        isLoading={binance.isLoading}
                      />
                    </div>
                  </DashCard>

                  <DashCard>
                    <CardHeader
                      title="Signal Analysis"
                      subtitle="RSI · BB · Pattern · AI"
                    />
                    <div className="flex-1 min-h-0 overflow-auto">
                      <SignalPanel
                        candles={binance.candles}
                        liquidity={canisters.liquidity}
                        whaleAlert={canisters.whaleAlert}
                        prophet={canisters.prophet}
                      />
                    </div>
                  </DashCard>
                </div>

                {/* 2. Live Signal Grid */}
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Live Canister Signals
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      · Polled every 30s
                    </span>
                  </div>
                  <SignalGrid signals={signals} />
                </div>
              </>
            )}

            {/* ── Signals Tab ── */}
            {activeTab === "Signals" && (
              <>
                {/* 0. 24H Prediction banner */}
                <Prediction24h
                  predictedPrice={prediction24h.predictedPrice}
                  currentPrice={price}
                  direction={prediction24h.direction}
                  confidence={prediction24h.confidence}
                  trendStrength={prediction24h.trendStrength}
                  source={prediction24h.source}
                  lastUpdated={prediction24h.lastUpdated}
                  isLoading={prediction24h.isLoading}
                  secondsUntilRefresh={prediction24h.secondsUntilRefresh}
                />

                {/* Prophet AI Track Record */}
                <PredictionTracker
                  predictions={tracker.predictions}
                  stats={tracker.stats}
                  onClear={tracker.clearHistory}
                />

                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Live Canister Signals
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    · Polled every 30s
                  </span>
                </div>
                <SignalGrid signals={signals} />

                <DashCard>
                  <CardHeader
                    title="Signal Analysis"
                    subtitle="RSI · BB · Pattern · AI · Full Detail"
                  />
                  <div className="min-h-0 overflow-auto">
                    <SignalPanel
                      candles={binance.candles}
                      liquidity={canisters.liquidity}
                      whaleAlert={canisters.whaleAlert}
                      prophet={canisters.prophet}
                    />
                  </div>
                </DashCard>
              </>
            )}

            {/* ── Trades Tab ── */}
            {activeTab === "Trades" && (
              <>
                {/* Auto-Scalp + Active Engine Position */}
                <div className="grid grid-cols-[1fr_300px] gap-4">
                  <AutoScalpPanel
                    scalp={autoScalp}
                    currentPrice={price}
                    openTrade={openBackendTrade}
                  />
                  <DashCard>
                    <CardHeader
                      title="Engine Position"
                      subtitle="RSI/BB auto-managed · 10× Lev"
                    />
                    <div className="flex-1 min-h-0 overflow-auto">
                      <ActiveTradePanel position={engine.openPosition} />
                    </div>
                  </DashCard>
                </div>

                {/* Backend Trade Log */}
                <BackendTradeLog
                  trades={backendTrades.trades}
                  stats={backendTrades.stats}
                  isLoading={backendTrades.isLoading}
                  onRefresh={backendTrades.refresh}
                />
              </>
            )}

            {/* ── Markets Tab ── */}
            {activeTab === "Markets" && (
              <div className="grid grid-cols-[1fr_420px] gap-4">
                <DashCard>
                  <CardHeader
                    title="Market Overview"
                    subtitle="Live 24h stats from Binance"
                  />
                  <div className="flex-1 min-h-0 overflow-auto">
                    <MarketOverview />
                  </div>
                </DashCard>

                <DashCard>
                  <CardHeader
                    title="Canister Network"
                    subtitle={`ICP Mainnet · ${canisters.canisters.filter((c) => c.status === "online").length}/${canisters.canisters.length} online`}
                  />
                  <div className="flex-1 min-h-0 overflow-auto">
                    <CanisterStatus
                      canisters={canisters.canisters}
                      onRefreshAll={canisters.refreshAll}
                      onRefreshOne={canisters.refreshOne}
                    />
                  </div>
                </DashCard>
              </div>
            )}

            {/* ── Engine Tab ── */}
            {activeTab === "Engine" && (
              <>
                <div className="grid grid-cols-[1fr_300px] gap-4">
                  <AutoScalpPanel
                    scalp={autoScalp}
                    currentPrice={price}
                    openTrade={openBackendTrade}
                  />
                  <DashCard>
                    <CardHeader
                      title="Engine Position"
                      subtitle="RSI/BB auto-managed · 10× Lev"
                    />
                    <div className="flex-1 min-h-0 overflow-auto">
                      <ActiveTradePanel position={engine.openPosition} />
                    </div>
                  </DashCard>
                </div>

                <BackendTradeLog
                  trades={backendTrades.trades}
                  stats={backendTrades.stats}
                  isLoading={backendTrades.isLoading}
                  onRefresh={backendTrades.refresh}
                />
              </>
            )}

            {/* ── Settings Tab ── */}
            {activeTab === "Settings" && (
              <DashCard>
                <CardHeader
                  title="Settings"
                  subtitle="Engine configuration & controls"
                />
                <div className="p-6 space-y-8">
                  {/* Auto Scalp Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold text-foreground">
                        Auto Scalp
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Automatically enter and exit 5-min scalp trades at 10×
                        leverage
                      </p>
                    </div>
                    <Switch
                      checked={settingsAutoScalp}
                      onCheckedChange={setSettingsAutoScalp}
                      data-ocid="settings.auto_scalp.switch"
                    />
                  </div>

                  <div className="border-t border-border" />

                  {/* Position Size Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-foreground">
                        Position Size
                      </Label>
                      <span className="text-sm font-mono text-primary">
                        ${settingsPositionSize[0]}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Paper trade notional size per scalp entry
                    </p>
                    <Slider
                      min={10}
                      max={1000}
                      step={10}
                      value={settingsPositionSize}
                      onValueChange={setSettingsPositionSize}
                      className="w-full"
                      data-ocid="settings.position_size.input"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>$10</span>
                      <span>$1,000</span>
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Status summary */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">
                      Engine Status
                    </Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {[
                        { label: "Leverage", value: "10×" },
                        { label: "Interval", value: "5 min" },
                        {
                          label: "Signal Source",
                          value: "Prophet + Sentiment",
                        },
                        {
                          label: "Mode",
                          value: settingsAutoScalp ? "Auto" : "Manual",
                        },
                      ].map(({ label, value }) => (
                        <div key={label} className="card-glass p-3 rounded-lg">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                            {label}
                          </p>
                          <p className="text-sm font-mono text-foreground mt-1">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DashCard>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-6 pb-4 text-center">
            <p className="text-[10px] text-muted-foreground">
              © {new Date().getFullYear()} Paper Trading Predictions · No Real
              Funds ·{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Built with ❤ using caffeine.ai
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
