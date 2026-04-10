/**
 * Aureos.tech — LivePriceTicker.jsx
 * Horizontally scrolling live price ticker bar.
 *
 * API: GET /api/live/ticker   (polled every 30s)
 * Falls back to static mock data if API fails.
 *
 * Expected API response shape:
 * [
 *   { symbol: "BTC/USD", price: "68421.50", change: "+2.34", positive: true },
 *   ...
 * ]
 *
 * Stack: React, Tailwind CSS, Lucide icons
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ── Brand tokens ──────────────────────────────────────────────────── */
const GOLD = "#D4AF37";
const BORDER = "#1a1a1a";
const BG_TICKER = "rgba(8,8,8,0.97)";

/* ── Static fallback data ──────────────────────────────────────────── */
const MOCK_TICKERS = [
  { symbol: "BTC/USD", price: "68,421.50", change: "+2.34", positive: true },
  { symbol: "ETH/USD", price: "3,512.80", change: "+1.87", positive: true },
  { symbol: "AAPL", price: "189.43", change: "-0.62", positive: false },
  { symbol: "GOLD", price: "2,318.70", change: "+0.91", positive: true },
  { symbol: "EUR/USD", price: "1.0847", change: "-0.23", positive: false },
  { symbol: "NVDA", price: "875.20", change: "+3.41", positive: true },
  { symbol: "ASX 200", price: "7,842.30", change: "+0.54", positive: true },
  { symbol: "BNB/USD", price: "578.90", change: "+1.12", positive: true },
  { symbol: "USD/JPY", price: "154.83", change: "+0.18", positive: true },
  { symbol: "SPX 500", price: "5,234.18", change: "-0.09", positive: false },
  { symbol: "SOL/USD", price: "182.40", change: "+4.21", positive: true },
  { symbol: "GBP/USD", price: "1.2631", change: "-0.14", positive: false },
];

/* ── Utility: format price ─────────────────────────────────────────── */
function formatPrice(price) {
  if (typeof price === "number") {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  }
  return String(price);
}

/* ── Utility: format change ────────────────────────────────────────── */
function formatChange(change) {
  if (typeof change === "number") {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}`;
  }
  const str = String(change);
  return str.startsWith("+") || str.startsWith("-") ? str : `+${str}`;
}

/* ── Single ticker item ────────────────────────────────────────────── */
function TickerItem({ item }) {
  const isPositive = item.positive ?? (parseFloat(item.change) >= 0);
  const isFlat = parseFloat(item.change) === 0;
  const color = isFlat ? "#f59e0b" : isPositive ? "#22c55e" : "#ef4444";
  const Icon = isFlat ? Minus : isPositive ? TrendingUp : TrendingDown;
  const changeStr = formatChange(item.change);

  return (
    <div className="flex items-center gap-2 px-5 shrink-0 select-none">
      {/* Separator dot */}
      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#333" }} />

      {/* Symbol */}
      <span
        className="text-xs font-bold tracking-wider"
        style={{ color: "#c0c0c0", minWidth: "60px" }}
      >
        {item.symbol}
      </span>

      {/* Price */}
      <span className="text-xs font-mono font-semibold text-white">
        {formatPrice(item.price)}
      </span>

      {/* Change */}
      <span
        className="text-xs font-semibold flex items-center gap-0.5"
        style={{ color }}
      >
        <Icon size={10} strokeWidth={2.5} />
        {changeStr}%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function LivePriceTicker({ className = "", style = {} }) {
  const [tickers, setTickers] = useState(MOCK_TICKERS);
  const [isLive, setIsLive] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const intervalRef = useRef(null);
  const hasFetched = useRef(false);

  /* ── Fetch from API ──────────────────────────────────────────── */
  const fetchTickers = useCallback(async () => {
    try {
      const res = await fetch("/api/live/ticker", {
        signal: AbortSignal.timeout?.(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        setTickers(json);
        setIsLive(true);
        setLastFetched(new Date());
      }
    } catch (err) {
      // API unavailable — keep current data (mock on first load, or last live data)
      if (!hasFetched.current) {
        setTickers(MOCK_TICKERS);
        setIsLive(false);
      }
      // Don't log every poll failure — only in development
      if (process.env.NODE_ENV === "development") {
        console.warn("[LivePriceTicker] API unavailable:", err.message);
      }
    } finally {
      hasFetched.current = true;
    }
  }, []);

  /* ── Poll every 30 seconds ───────────────────────────────────── */
  useEffect(() => {
    fetchTickers();
    intervalRef.current = setInterval(fetchTickers, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchTickers]);

  // Duplicate items for seamless infinite scroll
  const displayItems = [...tickers, ...tickers];
  // Scroll duration scales with item count for consistent speed
  const scrollDuration = tickers.length * 3.5;

  return (
    <>
      {/* Ticker styles */}
      <style>{`
        @keyframes aureos-ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .aureos-ticker-track {
          display: flex;
          align-items: center;
          will-change: transform;
          animation: aureos-ticker-scroll ${scrollDuration}s linear infinite;
        }
        .aureos-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className={`w-full overflow-hidden border-y ${className}`}
        style={{
          background: BG_TICKER,
          borderColor: BORDER,
          height: "38px",
          ...style,
        }}
        aria-label="Live price ticker"
        role="marquee"
      >
        {/* Live/Mock indicator — left edge */}
        <div className="flex items-center h-full">
          <div
            className="shrink-0 flex items-center gap-1.5 px-3 h-full border-r text-xs font-bold uppercase tracking-widest"
            style={{
              borderColor: BORDER,
              color: isLive ? "#22c55e" : GOLD,
              background: "rgba(0,0,0,0.4)",
              minWidth: "52px",
            }}
          >
            {isLive ? (
              <>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "#22c55e",
                    animation: "aureos-live-dot 2s ease-in-out infinite",
                  }}
                />
                LIVE
              </>
            ) : (
              <span style={{ color: GOLD, fontSize: "9px", letterSpacing: "0.1em" }}>DEMO</span>
            )}
          </div>

          {/* Scrolling track */}
          <div className="overflow-hidden flex-1 h-full flex items-center">
            <div className="aureos-ticker-track">
              {displayItems.map((item, i) => (
                <TickerItem key={`${item.symbol}-${i}`} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live dot animation */}
      <style>{`
        @keyframes aureos-live-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </>
  );
}

/* ── Usage example (in DashboardLayout header):
 *
 *   import LivePriceTicker from "@/components/layout/LivePriceTicker";
 *
 *   // In JSX:
 *   <LivePriceTicker className="sticky top-0 z-40" />
 *
 * ── Usage in LandingPage hero (static mode):
 *   <LivePriceTicker />
 *
 * ── The component self-manages polling — no props required.
 */
