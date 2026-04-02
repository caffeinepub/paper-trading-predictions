import { TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
];

interface MarketItem {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
}

async function fetchTicker(symbol: string): Promise<MarketItem | null> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
    );
    const d = await res.json();
    return {
      symbol,
      price: Number.parseFloat(d.lastPrice),
      change: Number.parseFloat(d.priceChange),
      changePct: Number.parseFloat(d.priceChangePercent),
      volume: Number.parseFloat(d.volume),
    };
  } catch {
    return null;
  }
}

const SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5", "r6"];
const SKELETON_COLS = ["c1", "c2", "c3", "c4"];

export default function MarketOverview() {
  const [items, setItems] = useState<MarketItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const results = await Promise.all(SYMBOLS.map(fetchTicker));
      setItems(results.filter(Boolean) as MarketItem[]);
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs" data-ocid="market.table">
          <thead>
            <tr className="border-b border-border sticky top-0 bg-card">
              {["Symbol", "Price", "24h Change", "Volume"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0
              ? SKELETON_ROWS.map((rowId) => (
                  <tr key={rowId} className="border-b border-border/50">
                    {SKELETON_COLS.map((colId) => (
                      <td key={colId} className="px-4 py-2">
                        <div className="h-3 bg-secondary rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : items.map((item, idx) => (
                  <tr
                    key={item.symbol}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                    data-ocid={`market.row.${idx + 1}` as any}
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {item.symbol.replace("USDT", "")}/USDT
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      $
                      {item.price.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      className={`px-4 py-2.5 font-mono ${
                        item.changePct >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {item.changePct >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {item.changePct >= 0 ? "+" : ""}
                        {item.changePct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">
                      {(item.volume / 1e6).toFixed(2)}M
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
