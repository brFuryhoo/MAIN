import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Globe2,
  Zap,
  TrendingUp,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  Shield,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Network,
} from "lucide-react";
import WorldDataFeed from "@/components/fusion/WorldDataFeed";
import CorrelationHeatmap from "@/components/fusion/CorrelationHeatmap";
import AureosLayout from "@/components/layout/DashboardLayout";

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_FUSION = {
  market_temperature: "HOT",
  macro_regime: "RISK-OFF",
  regime_description:
    "Elevated geopolitical risk and Fed hawkishness driving capital flight from risk assets. Historical precedent: Mar 2022 pattern.",
  executive_summary:
    "JARVIS detectou tensão crescente nos mercados globais com confluência de três fatores macro críticos. O fluxo para ativos de segurança está acelerando enquanto o capital institucional se posiciona defensivamente ante incerteza geopolítica e sinais hawkish persistentes do Fed. Janela de oportunidade se abre em ouro e proteções cambiais.",
  events: [
    {
      id: 1,
      title:
        "Fed sinalizou manutenção de juros acima do esperado por mais tempo",
      source: "Reuters",
      category: "macro",
      impact_level: "HIGH",
      sentiment: "bearish",
      affected_assets: ["BTC", "SPY", "EUR/USD"],
      published_at: new Date(Date.now() - 3 * 60000).toISOString(),
    },
    {
      id: 2,
      title:
        "Bitcoin ultrapassa resistência crítica de $87,000 com volume institucional massivo",
      source: "CoinDesk",
      category: "crypto",
      impact_level: "HIGH",
      sentiment: "bullish",
      affected_assets: ["BTC", "ETH", "COIN"],
      published_at: new Date(Date.now() - 7 * 60000).toISOString(),
    },
    {
      id: 3,
      title:
        "Conflito no Oriente Médio intensifica pressão sobre rotas de suprimento de petróleo",
      source: "BBC",
      category: "geopolitical",
      impact_level: "HIGH",
      sentiment: "bearish",
      affected_assets: ["XOM", "CVX", "GOLD", "USD"],
      published_at: new Date(Date.now() - 12 * 60000).toISOString(),
    },
    {
      id: 4,
      title: "NVIDIA reporta guidance acima das estimativas para Q2 com margem recorde",
      source: "Bloomberg",
      category: "equity",
      impact_level: "MEDIUM",
      sentiment: "bullish",
      affected_assets: ["NVDA", "AMD", "TSM"],
      published_at: new Date(Date.now() - 25 * 60000).toISOString(),
    },
    {
      id: 5,
      title:
        "China anuncia pacote de estímulo fiscal de $300 bilhões focado em infraestrutura",
      source: "Reuters",
      category: "macro",
      impact_level: "HIGH",
      sentiment: "bullish",
      affected_assets: ["FXI", "BABA", "COPPER"],
      published_at: new Date(Date.now() - 31 * 60000).toISOString(),
    },
    {
      id: 6,
      title:
        "Iene japonês cai para mínima de 12 meses ante o dólar com BOJ passivo",
      source: "Reuters",
      category: "forex",
      impact_level: "MEDIUM",
      sentiment: "bearish",
      affected_assets: ["USD/JPY", "Toyota", "Sony"],
      published_at: new Date(Date.now() - 44 * 60000).toISOString(),
    },
    {
      id: 7,
      title:
        "Ouro atinge recorde histórico acima de $3.200 impulsionado por fuga global para segurança",
      source: "BBC",
      category: "commodity",
      impact_level: "HIGH",
      sentiment: "bullish",
      affected_assets: ["GOLD", "GLD", "NEM"],
      published_at: new Date(Date.now() - 58 * 60000).toISOString(),
    },
    {
      id: 8,
      title:
        "Dados de emprego nos EUA abaixo do esperado aumentam pressão sobre Fed",
      source: "Bloomberg",
      category: "macro",
      impact_level: "MEDIUM",
      sentiment: "neutral",
      affected_assets: ["SPY", "TLT", "USD"],
      published_at: new Date(Date.now() - 72 * 60000).toISOString(),
    },
    {
      id: 9,
      title:
        "Ethereum ultrapassa $2.800 com crescimento acelerado de atividade DeFi",
      source: "CoinDesk",
      category: "crypto",
      impact_level: "MEDIUM",
      sentiment: "bullish",
      affected_assets: ["ETH", "UNI", "AAVE"],
      published_at: new Date(Date.now() - 88 * 60000).toISOString(),
    },
  ],
  cross_asset_signals: [
    {
      signal_type: "SAFE_HAVEN_FLOW",
      description:
        "Capital migrating from equities to gold and bonds as geopolitical risk spikes. Gold/SPY ratio at 14-month high.",
      confidence: 82,
      trade_ideas: [
        { asset: "GOLD", direction: "BUY" },
        { asset: "SPY", direction: "SELL" },
        { asset: "TLT", direction: "BUY" },
      ],
    },
    {
      signal_type: "RISK-OFF",
      description:
        "Bitcoin decoupling from tech stocks — institutional de-risking detected across crypto and growth equities simultaneously.",
      confidence: 71,
      trade_ideas: [
        { asset: "BTC", direction: "HOLD" },
        { asset: "NVDA", direction: "SELL" },
      ],
    },
    {
      signal_type: "MOMENTUM_SHIFT",
      description:
        "USD strengthening as Fed hawkishness persists — EM currencies and EUR under significant pressure.",
      confidence: 68,
      trade_ideas: [
        { asset: "EUR/USD", direction: "SELL" },
        { asset: "USD/JPY", direction: "BUY" },
      ],
    },
    {
      signal_type: "CORRELATION_BREAK",
      description:
        "Crypto-equity correlation breaking down — divergence from 6-month average detected in BTC/NVDA pair.",
      confidence: 59,
      trade_ideas: [
        { asset: "BTC", direction: "BUY" },
        { asset: "TSLA", direction: "SELL" },
      ],
    },
  ],
  asset_impact: {
    BTC: {
      impact_score: 72,
      bias: "bullish",
      risk_level: "MEDIUM",
      key_drivers: ["Institutional accumulation above $85k", "Safe-haven narrative gaining traction"],
    },
    GOLD: {
      impact_score: 88,
      bias: "bullish",
      risk_level: "LOW",
      key_drivers: ["Geopolitical flight to safety", "Fed uncertainty fueling demand"],
    },
    NVDA: {
      impact_score: 61,
      bias: "bullish",
      risk_level: "MEDIUM",
      key_drivers: ["Strong Q2 guidance beat", "AI infrastructure demand unabated"],
    },
    XOM: {
      impact_score: 75,
      bias: "bullish",
      risk_level: "MEDIUM",
      key_drivers: ["Oil supply disruption risk premium", "Middle East tension"],
    },
    "EUR/USD": {
      impact_score: 55,
      bias: "bearish",
      risk_level: "MEDIUM",
      key_drivers: ["USD strength cycle intact", "ECB dovish pivot expectations"],
    },
    ETH: {
      impact_score: 64,
      bias: "bullish",
      risk_level: "MEDIUM",
      key_drivers: ["BTC correlation carrying", "DeFi TVL growth"],
    },
    SPY: {
      impact_score: 48,
      bias: "bearish",
      risk_level: "HIGH",
      key_drivers: ["Risk-off macro sentiment", "Rate fears resurfacing"],
    },
    TSLA: {
      impact_score: 42,
      bias: "bearish",
      risk_level: "HIGH",
      key_drivers: ["EV demand slowdown signals", "China competition intensifying"],
    },
    "USD/JPY": {
      impact_score: 70,
      bias: "bullish",
      risk_level: "MEDIUM",
      key_drivers: ["BOJ intervention risks", "Fed-BOJ policy divergence"],
    },
    SOL: {
      impact_score: 58,
      bias: "bullish",
      risk_level: "HIGH",
      key_drivers: ["Crypto market momentum", "Ecosystem activity expansion"],
    },
  },
  correlation_matrix: {
    assets: ["BTC", "ETH", "SOL", "GOLD", "SPY", "NVDA", "XOM", "EUR/USD", "USD/JPY", "TSLA"],
    values: [
      [1.0, 0.87, 0.81, -0.12, 0.43, 0.38, -0.21, 0.15, -0.18, 0.52],
      [0.87, 1.0, 0.84, -0.08, 0.46, 0.41, -0.18, 0.12, -0.15, 0.49],
      [0.81, 0.84, 1.0, -0.15, 0.38, 0.35, -0.25, 0.08, -0.12, 0.44],
      [-0.12, -0.08, -0.15, 1.0, -0.35, -0.22, 0.41, -0.28, 0.31, -0.19],
      [0.43, 0.46, 0.38, -0.35, 1.0, 0.72, -0.15, 0.31, -0.28, 0.68],
      [0.38, 0.41, 0.35, -0.22, 0.72, 1.0, -0.18, 0.25, -0.22, 0.61],
      [-0.21, -0.18, -0.25, 0.41, -0.15, -0.18, 1.0, -0.12, 0.18, -0.14],
      [0.15, 0.12, 0.08, -0.28, 0.31, 0.25, -0.12, 1.0, -0.72, 0.28],
      [-0.18, -0.15, -0.12, 0.31, -0.28, -0.22, 0.18, -0.72, 1.0, -0.25],
      [0.52, 0.49, 0.44, -0.19, 0.68, 0.61, -0.14, 0.28, -0.25, 1.0],
    ],
  },
  // Divergent pairs: [i, j] indices
  divergences: [
    [0, 4], // BTC-SPY diverging
    [7, 8], // EUR/USD - USD/JPY (always high inverse, but highlight)
    [3, 6], // GOLD-XOM
  ],
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function PulsingDot({ color = "#FF4444", size = 8 }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <motion.span
        animate={{ scale: [1, 2.2, 1], opacity: [1, 0, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: 0.6,
        }}
      />
      <span
        style={{
          position: "relative",
          display: "block",
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
    </span>
  );
}

function TemperatureBadge({ temp }) {
  const config = {
    HOT: {
      label: "HOT",
      color: "#FF4444",
      bg: "rgba(255,68,68,0.12)",
      glow: "rgba(255,68,68,0.4)",
      icon: "🔥",
    },
    WARM: {
      label: "WARM",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.12)",
      glow: "rgba(245,158,11,0.3)",
      icon: "⚡",
    },
    COOL: {
      label: "COOL",
      color: "#3B82F6",
      bg: "rgba(59,130,246,0.12)",
      glow: "rgba(59,130,246,0.3)",
      icon: "❄",
    },
  };
  const c = config[temp] || config.WARM;
  return (
    <motion.div
      animate={{ boxShadow: [`0 0 8px ${c.glow}`, `0 0 20px ${c.glow}`, `0 0 8px ${c.glow}`] }}
      transition={{ duration: 2, repeat: Infinity }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        borderRadius: "6px",
        backgroundColor: c.bg,
        border: `1px solid ${c.color}44`,
        color: c.color,
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        fontFamily: "monospace",
      }}
    >
      <span>{c.icon}</span>
      MARKET: {c.label}
    </motion.div>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        flex: 1,
        minWidth: 0,
        padding: "14px 16px",
        backgroundColor: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: "8px",
        borderTop: `2px solid ${accent || "#D4AF37"}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={12} style={{ color: accent || "#D4AF37" }} />}
        <span style={{ fontSize: "9px", color: "#555", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.02em", fontFamily: "monospace" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>
          {sub}
        </div>
      )}
    </motion.div>
  );
}

// Typewriter hook
function useTypewriter(text, speed = 28, trigger = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!trigger || !text) return;
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, trigger]);
  return { displayed, done };
}

const SIGNAL_CONFIG = {
  SAFE_HAVEN_FLOW: { color: "#3B82F6", bg: "rgba(59,130,246,0.1)", icon: Shield },
  "RISK-OFF": { color: "#FF4444", bg: "rgba(255,68,68,0.1)", icon: AlertTriangle },
  MOMENTUM_SHIFT: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", icon: TrendingUp },
  CORRELATION_BREAK: { color: "#A855F7", bg: "rgba(168,85,247,0.1)", icon: Activity },
};

function SignalCard({ signal, index }) {
  const cfg = SIGNAL_CONFIG[signal.signal_type] || SIGNAL_CONFIG["RISK-OFF"];
  const SigIcon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      style={{
        backgroundColor: "#0a0a0a",
        border: `1px solid #1a1a1a`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: "8px",
        padding: "12px 14px",
        marginBottom: "8px",
      }}
    >
      {/* Signal type badge */}
      <div className="flex items-center gap-2 mb-2">
        <SigIcon size={12} style={{ color: cfg.color }} />
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: cfg.color,
            backgroundColor: cfg.bg,
            padding: "2px 7px",
            borderRadius: "4px",
            letterSpacing: "0.1em",
            fontFamily: "monospace",
            border: `1px solid ${cfg.color}30`,
          }}
        >
          {signal.signal_type}
        </span>
        <div className="flex-1" />
        <span style={{ fontSize: "10px", color: "#555", fontFamily: "monospace" }}>
          {signal.confidence}% conf.
        </span>
      </div>

      {/* Description */}
      <p style={{ fontSize: "12px", color: "#ccc", lineHeight: 1.5, marginBottom: "8px" }}>
        {signal.description}
      </p>

      {/* Confidence bar */}
      <div style={{ marginBottom: "10px" }}>
        <div
          style={{
            height: "3px",
            backgroundColor: "#1a1a1a",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${signal.confidence}%` }}
            transition={{ duration: 0.8, delay: index * 0.1 + 0.3, ease: "easeOut" }}
            style={{
              height: "100%",
              backgroundColor: "#D4AF37",
              borderRadius: "2px",
              boxShadow: "0 0 8px rgba(212,175,55,0.5)",
            }}
          />
        </div>
      </div>

      {/* Trade ideas */}
      <div className="flex flex-wrap gap-1.5">
        {signal.trade_ideas.map((idea, i) => {
          const isBuy = idea.direction === "BUY";
          const isHold = idea.direction === "HOLD";
          return (
            <span
              key={i}
              style={{
                fontSize: "9px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "4px",
                letterSpacing: "0.08em",
                fontFamily: "monospace",
                color: isBuy ? "#00E676" : isHold ? "#F59E0B" : "#FF4444",
                backgroundColor: isBuy
                  ? "rgba(0,230,118,0.1)"
                  : isHold
                  ? "rgba(245,158,11,0.1)"
                  : "rgba(255,68,68,0.1)",
                border: `1px solid ${
                  isBuy ? "rgba(0,230,118,0.25)" : isHold ? "rgba(245,158,11,0.25)" : "rgba(255,68,68,0.25)"
                }`,
              }}
            >
              {idea.direction} {idea.asset}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}

function AssetImpactRow({ symbol, data, index }) {
  const [expanded, setExpanded] = useState(false);
  const bias = data.bias?.toLowerCase();
  const isBull = bias === "bullish";
  const isBear = bias === "bearish";
  const barColor = isBull ? "#00E676" : isBear ? "#FF4444" : "#888";
  const riskColors = { LOW: "#00E676", MEDIUM: "#F59E0B", HIGH: "#FF4444" };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 10px",
          backgroundColor: "#0a0a0a",
          border: "1px solid #1a1a1a",
          borderRadius: expanded ? "6px 6px 0 0" : "6px",
          marginBottom: expanded ? 0 : "4px",
          cursor: "pointer",
          transition: "background-color 0.15s",
        }}
        className="hover:bg-[#111]"
      >
        <div className="flex items-center gap-2 mb-1.5">
          {/* Symbol */}
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#D4AF37",
              fontFamily: "monospace",
              minWidth: "70px",
            }}
          >
            {symbol}
          </span>

          {/* Bias badge */}
          <span
            style={{
              fontSize: "8px",
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: "3px",
              letterSpacing: "0.08em",
              color: barColor,
              backgroundColor: `${barColor}18`,
              border: `1px solid ${barColor}30`,
              fontFamily: "monospace",
            }}
          >
            {data.bias?.toUpperCase()}
          </span>

          <div className="flex-1" />

          {/* Risk dot */}
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: riskColors[data.risk_level] || "#888",
              boxShadow: `0 0 4px ${riskColors[data.risk_level] || "#888"}`,
            }}
          />

          {/* Score */}
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#888",
              fontFamily: "monospace",
              minWidth: "28px",
              textAlign: "right",
            }}
          >
            {data.impact_score}
          </span>

          {/* Expand toggle */}
          {expanded ? (
            <ChevronUp size={12} style={{ color: "#555" }} />
          ) : (
            <ChevronDown size={12} style={{ color: "#555" }} />
          )}
        </div>

        {/* Impact bar */}
        <div
          style={{
            height: "3px",
            backgroundColor: "#1a1a1a",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.impact_score}%` }}
            transition={{ duration: 0.6, delay: index * 0.04 + 0.2, ease: "easeOut" }}
            style={{
              height: "100%",
              backgroundColor: barColor,
              borderRadius: "2px",
              boxShadow: `0 0 6px ${barColor}60`,
            }}
          />
        </div>
      </div>

      {/* Expanded key drivers */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              overflow: "hidden",
              backgroundColor: "#080808",
              border: "1px solid #1a1a1a",
              borderTop: "none",
              borderRadius: "0 0 6px 6px",
              marginBottom: "4px",
            }}
          >
            <div style={{ padding: "8px 10px" }}>
              <p style={{ fontSize: "9px", color: "#555", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "5px" }}>
                KEY DRIVERS
              </p>
              {(data.key_drivers || []).map((driver, i) => (
                <div key={i} className="flex items-start gap-2" style={{ marginBottom: "3px" }}>
                  <span style={{ color: "#D4AF37", fontSize: "10px", marginTop: "1px" }}>›</span>
                  <span style={{ fontSize: "10px", color: "#aaa", lineHeight: 1.4 }}>{driver}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MacroRegimeBadge({ regime, description }) {
  const config = {
    "RISK-OFF": { color: "#FF4444", glow: "rgba(255,68,68,0.3)", icon: AlertTriangle },
    "RISK-ON": { color: "#00E676", glow: "rgba(0,230,118,0.3)", icon: TrendingUp },
    NEUTRAL: { color: "#F59E0B", glow: "rgba(245,158,11,0.3)", icon: Activity },
    STAGFLATION: { color: "#A855F7", glow: "rgba(168,85,247,0.3)", icon: AlertTriangle },
    GOLDILOCKS: { color: "#00E676", glow: "rgba(0,230,118,0.3)", icon: CheckCircle },
  };
  const c = config[regime] || config["NEUTRAL"];
  const RegimeIcon = c.icon;

  return (
    <motion.div
      animate={{
        boxShadow: [`0 0 20px ${c.glow}`, `0 0 40px ${c.glow}`, `0 0 20px ${c.glow}`],
      }}
      transition={{ duration: 3, repeat: Infinity }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        backgroundColor: "#0a0a0a",
        border: `1px solid ${c.color}33`,
        borderRadius: "12px",
        textAlign: "center",
      }}
    >
      <div style={{ color: c.color, marginBottom: "8px" }}>
        <RegimeIcon size={28} />
      </div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "#555",
          letterSpacing: "0.15em",
          fontFamily: "monospace",
          marginBottom: "4px",
        }}
      >
        MACRO REGIME
      </div>
      <motion.div
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          fontSize: "28px",
          fontWeight: 900,
          color: c.color,
          letterSpacing: "0.05em",
          fontFamily: "monospace",
          marginBottom: "10px",
          textShadow: `0 0 20px ${c.color}`,
        }}
      >
        {regime}
      </motion.div>
      {description && (
        <p style={{ fontSize: "11px", color: "#777", lineHeight: 1.5, maxWidth: "280px" }}>
          {description}
        </p>
      )}
    </motion.div>
  );
}

function SkeletonBlock({ height = 80, width = "100%" }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.55, 0.3] }}
      transition={{ duration: 1.6, repeat: Infinity }}
      style={{
        height,
        width,
        borderRadius: "6px",
        backgroundColor: "#111",
        border: "1px solid #1a1a1a",
        marginBottom: "8px",
      }}
    />
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function GlobalFusionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { displayed: summaryText, done: summaryDone } = useTypewriter(
    data?.executive_summary || "",
    22,
    !!data
  );

  // ── Fetch full report
  const fetchReport = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/global-fusion/report");
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      setData(json);
    } catch {
      // Fall back to mock
      setData(MOCK_FUSION);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(Date.now());
      setSecondsAgo(0);
    }
  }, []);

  // ── Fetch pulse (lightweight)
  const fetchPulse = useCallback(async () => {
    try {
      const res = await fetch("/api/global-fusion/pulse");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData((prev) => ({ ...prev, ...json }));
      setLastUpdated(Date.now());
      setSecondsAgo(0);
    } catch {
      // Silently ignore pulse failures
    }
  }, []);

  // Mount: load full report, then schedule pulse every 60s
  useEffect(() => {
    fetchReport();
    const pulseInterval = setInterval(fetchPulse, 60000);
    return () => clearInterval(pulseInterval);
  }, [fetchReport, fetchPulse]);

  // Seconds-ago counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const fusionData = data || MOCK_FUSION;

  return (
    <AureosLayout>
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "transparent",
        color: "#e0e0e0",
        fontFamily: "'Inter', system-ui, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid #1a1a1a",
          backgroundColor: "#080808",
          padding: "14px 24px",
          position: "sticky",
          top: 0,
          zIndex: 40,
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Network size={16} style={{ color: "#D4AF37" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: "#D4AF37",
                    letterSpacing: "0.12em",
                    fontFamily: "monospace",
                    margin: 0,
                  }}
                >
                  JARVIS GLOBAL FUSION
                </h1>
                {/* LIVE indicator */}
                <div className="flex items-center gap-1.5">
                  <PulsingDot color="#FF4444" size={7} />
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#FF4444",
                      letterSpacing: "0.15em",
                      fontFamily: "monospace",
                    }}
                  >
                    LIVE
                  </motion.span>
                </div>
              </div>
              <p
                style={{
                  fontSize: "10px",
                  color: "#555",
                  margin: 0,
                  letterSpacing: "0.04em",
                }}
              >
                Cruzamento de Dados Mundiais — Notícias × Preços × Geopolítica → Sinais
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            <TemperatureBadge temp={fusionData.market_temperature} />

            <div
              style={{
                fontSize: "10px",
                color: "#555",
                fontFamily: "monospace",
              }}
            >
              Updated: {secondsAgo}s ago
            </div>

            <button
              onClick={fetchReport}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                backgroundColor: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: "6px",
                color: "#D4AF37",
                fontSize: "11px",
                fontWeight: 600,
                cursor: refreshing ? "not-allowed" : "pointer",
                opacity: refreshing ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              <motion.div
                animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  refreshing
                    ? { duration: 0.8, repeat: Infinity, ease: "linear" }
                    : {}
                }
              >
                <RefreshCw size={12} />
              </motion.div>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: "1800px", margin: "0 auto" }}>
        {/* ── STATS STRIP ──────────────────────────────────────────────── */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <StatCard
            label="Events Captured"
            value={fusionData.events?.length || 0}
            sub="Last 24 hours"
            icon={Activity}
            accent="#D4AF37"
          />
          <StatCard
            label="Assets Under Analysis"
            value={Object.keys(fusionData.asset_impact || {}).length}
            sub="Multi-class coverage"
            icon={BarChart2}
            accent="#00E676"
          />
          <StatCard
            label="Active Signals"
            value={fusionData.cross_asset_signals?.length || 0}
            sub="High confidence only"
            icon={Zap}
            accent="#F59E0B"
          />
          <StatCard
            label="Macro Regime"
            value={fusionData.macro_regime}
            sub="Global risk classification"
            icon={TrendingUp}
            accent="#FF4444"
          />
        </div>

        {/* ── MAIN 3-COLUMN GRID ────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "35% 1fr 25%",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {/* ─── LEFT: World Data Feed ──────────────────────────────────── */}
          <div
            style={{
              backgroundColor: "#0a0a0a",
              border: "1px solid #1a1a1a",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <PulsingDot color="#00E676" size={7} />
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#D4AF37",
                  letterSpacing: "0.15em",
                  fontFamily: "monospace",
                  margin: 0,
                }}
              >
                WORLD DATA FEED
              </h2>
              <div className="flex-1" />
              <span style={{ fontSize: "9px", color: "#444", fontFamily: "monospace" }}>
                {fusionData.events?.length || 0} events
              </span>
            </div>

            <WorldDataFeed
              events={fusionData.events || []}
              onEventClick={setSelectedEvent}
              loading={loading}
            />
          </div>

          {/* ─── CENTER: Analysis ──────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* JARVIS Executive Summary */}
            <div
              style={{
                backgroundColor: "#0a0a0a",
                border: "1px solid #1a1a1a",
                borderLeft: "3px solid #D4AF37",
                borderRadius: "10px",
                padding: "18px 20px",
                boxShadow: "0 0 24px rgba(212,175,55,0.05)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(212,175,55,0.1)",
                    border: "1px solid rgba(212,175,55,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Zap size={14} style={{ color: "#D4AF37" }} />
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.15em", fontFamily: "monospace" }}>
                    JARVIS EXECUTIVE SUMMARY
                  </div>
                  <div style={{ fontSize: "9px", color: "#444" }}>AI-synthesized market intelligence</div>
                </div>
                <div className="flex-1" />
                {!summaryDone && (
                  <motion.div
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{
                      width: "2px",
                      height: "14px",
                      backgroundColor: "#D4AF37",
                      borderRadius: "1px",
                    }}
                  />
                )}
              </div>

              {loading ? (
                <>
                  <SkeletonBlock height={16} />
                  <SkeletonBlock height={16} width="80%" />
                  <SkeletonBlock height={16} width="60%" />
                </>
              ) : (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#ccc",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {summaryText}
                  {!summaryDone && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      style={{ color: "#D4AF37" }}
                    >
                      |
                    </motion.span>
                  )}
                </p>
              )}
            </div>

            {/* Cross-Asset Signals */}
            <div
              style={{
                backgroundColor: "#0a0a0a",
                border: "1px solid #1a1a1a",
                borderRadius: "10px",
                padding: "16px 18px",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Target size={12} style={{ color: "#D4AF37" }} />
                <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.15em", fontFamily: "monospace", margin: 0 }}>
                  CROSS-ASSET SIGNALS
                </h2>
                <div
                  style={{
                    marginLeft: "8px",
                    padding: "1px 6px",
                    backgroundColor: "rgba(212,175,55,0.1)",
                    border: "1px solid rgba(212,175,55,0.2)",
                    borderRadius: "3px",
                    fontSize: "9px",
                    color: "#D4AF37",
                    fontFamily: "monospace",
                  }}
                >
                  {fusionData.cross_asset_signals?.length || 0} ACTIVE
                </div>
              </div>

              {loading
                ? [1, 2, 3].map((i) => <SkeletonBlock key={i} height={100} />)
                : (fusionData.cross_asset_signals || []).map((sig, i) => (
                    <SignalCard key={i} signal={sig} index={i} />
                  ))}
            </div>

            {/* Macro Regime Indicator */}
            {loading ? (
              <SkeletonBlock height={160} />
            ) : (
              <MacroRegimeBadge
                regime={fusionData.macro_regime}
                description={fusionData.regime_description}
              />
            )}
          </div>

          {/* ─── RIGHT: Asset Impact Map ────────────────────────────────── */}
          <div
            style={{
              backgroundColor: "#0a0a0a",
              border: "1px solid #1a1a1a",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Globe2 size={12} style={{ color: "#D4AF37" }} />
              <h2
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#D4AF37",
                  letterSpacing: "0.15em",
                  fontFamily: "monospace",
                  margin: 0,
                }}
              >
                ASSET IMPACT MAP
              </h2>
              <div className="flex-1" />
              {/* Legend dots */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#00E676" }} />
                  <span style={{ fontSize: "8px", color: "#444" }}>BULL</span>
                </div>
                <div className="flex items-center gap-1">
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#FF4444" }} />
                  <span style={{ fontSize: "8px", color: "#444" }}>BEAR</span>
                </div>
              </div>
            </div>

            {/* Risk level legend */}
            <div className="flex items-center gap-3 mb-3">
              <span style={{ fontSize: "9px", color: "#444" }}>Risk:</span>
              {["LOW", "MEDIUM", "HIGH"].map((r) => (
                <div key={r} className="flex items-center gap-1">
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: r === "LOW" ? "#00E676" : r === "MEDIUM" ? "#F59E0B" : "#FF4444",
                    }}
                  />
                  <span style={{ fontSize: "8px", color: "#444" }}>{r}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                maxHeight: "calc(100vh - 300px)",
                overflowY: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: "#2a2a2a #0a0a0a",
              }}
            >
              {loading
                ? [1, 2, 3, 4, 5].map((i) => <SkeletonBlock key={i} height={56} />)
                : Object.entries(fusionData.asset_impact || {}).map(
                    ([symbol, assetData], i) => (
                      <AssetImpactRow
                        key={symbol}
                        symbol={symbol}
                        data={assetData}
                        index={i}
                      />
                    )
                  )}
            </div>
          </div>
        </div>

        {/* ── CORRELATION HEATMAP ─────────────────────────────────────────── */}
        <div
          style={{
            marginTop: "20px",
            backgroundColor: "#0a0a0a",
            border: "1px solid #1a1a1a",
            borderRadius: "10px",
            padding: "20px 24px",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Activity size={14} style={{ color: "#D4AF37" }} />
            <h2
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#D4AF37",
                letterSpacing: "0.15em",
                fontFamily: "monospace",
                margin: 0,
              }}
            >
              CORRELAÇÃO CROSS-ASSET EM TEMPO REAL
            </h2>
            <div
              style={{
                padding: "2px 8px",
                backgroundColor: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.15)",
                borderRadius: "4px",
                fontSize: "9px",
                color: "#666",
                fontFamily: "monospace",
              }}
            >
              {fusionData.correlation_matrix?.assets?.length || 0}×
              {fusionData.correlation_matrix?.assets?.length || 0} MATRIX
            </div>
            <div className="flex-1" />
            <span style={{ fontSize: "10px", color: "#444", fontFamily: "monospace" }}>
              Live rolling 30-day correlation
            </span>
          </div>

          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(10, 1fr)",
                gap: "2px",
              }}
            >
              {[...Array(100)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: (i % 10) * 0.05,
                  }}
                  style={{
                    height: "36px",
                    borderRadius: "3px",
                    backgroundColor: "#111",
                  }}
                />
              ))}
            </div>
          ) : (
            <CorrelationHeatmap
              matrix={fusionData.correlation_matrix}
              divergences={fusionData.divergences}
            />
          )}
        </div>

        {/* Footer spacer */}
        <div style={{ height: "40px" }} />
      </div>

      {/* ── SELECTED EVENT MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEvent(null)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#0d0d0d",
                border: "1px solid #2a2a2a",
                borderRadius: "12px",
                padding: "24px",
                maxWidth: "520px",
                width: "100%",
                boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 24px rgba(212,175,55,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "#555",
                  letterSpacing: "0.15em",
                  fontFamily: "monospace",
                  marginBottom: "10px",
                }}
              >
                EVENT DETAIL
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", marginBottom: "12px", lineHeight: 1.4 }}>
                {selectedEvent.title}
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <span style={{ fontSize: "10px", color: "#D4AF37", backgroundColor: "rgba(212,175,55,0.1)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(212,175,55,0.2)" }}>
                  {selectedEvent.source}
                </span>
                <span style={{ fontSize: "10px", color: "#888", backgroundColor: "#111", padding: "2px 8px", borderRadius: "4px", border: "1px solid #222" }}>
                  {selectedEvent.category}
                </span>
                <span style={{ fontSize: "10px", color: selectedEvent.sentiment === "bullish" ? "#00E676" : selectedEvent.sentiment === "bearish" ? "#FF4444" : "#888", backgroundColor: "#111", padding: "2px 8px", borderRadius: "4px", border: "1px solid #222" }}>
                  {selectedEvent.sentiment}
                </span>
              </div>
              <div>
                <p style={{ fontSize: "10px", color: "#555", marginBottom: "6px", fontWeight: 700, letterSpacing: "0.1em" }}>
                  AFFECTED ASSETS
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedEvent.affected_assets || []).map((a) => (
                    <span key={a} style={{ fontSize: "11px", color: "#D4AF37", backgroundColor: "rgba(212,175,55,0.08)", padding: "3px 8px", borderRadius: "4px", border: "1px solid rgba(212,175,55,0.2)", fontFamily: "monospace", fontWeight: 600 }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  marginTop: "20px",
                  padding: "8px 16px",
                  backgroundColor: "rgba(212,175,55,0.1)",
                  border: "1px solid rgba(212,175,55,0.25)",
                  borderRadius: "6px",
                  color: "#D4AF37",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}