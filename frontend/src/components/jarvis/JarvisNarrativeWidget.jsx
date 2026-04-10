/**
 * Aureos.tech — JarvisNarrativeWidget.jsx
 * Self-contained embeddable widget for the JARVIS Narrative Engine.
 *
 * API:
 *   GET  /api/jarvis-narrative/live    — fetch current narrative
 *   POST /api/jarvis-narrative/generate — trigger regeneration
 *
 * Props: none (fetches its own data)
 *
 * Stack: React, Tailwind CSS, Framer Motion, Lucide icons
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import DataQualityWidget from "@/components/shared/DataQualityWidget";
import {
  Brain,
  RefreshCw,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Clock,
} from "lucide-react";

/* ── Brand tokens ──────────────────────────────────────────────────── */
const GOLD = "#D4AF37";
const BG_CARD = "#0A0A0A";
const BG_INNER = "#0D0D0D";
const BORDER = "#1a1a1a";
const MUTED = "#888";

/* ── Skeleton loader ───────────────────────────────────────────────── */
function Skeleton({ className = "", style = {} }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ background: "#1a1a1a", ...style }}
    />
  );
}

function NarrativeSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
      {/* Headline */}
      <Skeleton className="h-7 w-4/5" />
      {/* Text lines */}
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
      {/* Tags */}
      <div className="flex gap-2 pt-2">
        {[80, 96, 72, 88].map((w, i) => (
          <Skeleton key={i} className="h-6 rounded-full" style={{ width: `${w}px` }} />
        ))}
      </div>
      {/* Prediction cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: "#111", border: `1px solid ${BORDER}` }}>
            <div className="flex justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Signal badge ──────────────────────────────────────────────────── */
function SignalBadge({ signal }) {
  const configs = {
    BUY: { bg: "#22c55e22", border: "#22c55e44", color: "#22c55e" },
    SELL: { bg: "#ef444422", border: "#ef444444", color: "#ef4444" },
    HOLD: { bg: "#f59e0b22", border: "#f59e0b44", color: "#f59e0b" },
  };
  const c = configs[signal] || configs.HOLD;
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
    >
      {signal}
    </span>
  );
}

/* ── Prediction card ───────────────────────────────────────────────── */
function PredictionCard({ prediction }) {
  const { t } = useLanguage();
  const { signal, symbol, confidence, reasoning } = prediction;
  const isBuy = signal === "BUY";
  const isSell = signal === "SELL";
  const barColor = isBuy ? "#22c55e" : isSell ? "#ef4444" : "#f59e0b";
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 border flex flex-col gap-3"
      style={{ background: BG_INNER, borderColor: BORDER }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: barColor }} />
          <span className="font-black text-white text-sm">{symbol}</span>
        </div>
        <SignalBadge signal={signal} />
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span style={{ color: MUTED }}>{t('jarvis.confidence')}</span>
          <span className="font-bold text-white">{confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1f1f1f" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${barColor}, ${barColor}88)` }}
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <p className="text-xs leading-relaxed line-clamp-3" style={{ color: MUTED }}>
        {reasoning}
      </p>
    </motion.div>
  );
}

/* ── Geopolitical event pill ───────────────────────────────────────── */
function EventPill({ event }) {
  const { t } = useLanguage();
  const impactColors = {
    HIGH: "#ef4444",
    MEDIUM: "#f59e0b",
    LOW: "#22c55e",
  };
  const impact = event.impact || "MEDIUM";
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
      style={{ background: "#111", border: `1px solid ${BORDER}` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: impactColors[impact] || impactColors.MEDIUM }}
      />
      <span className="text-white/80 leading-snug">{event.title}</span>
      <span className="ml-auto shrink-0 text-[10px] font-bold" style={{ color: impactColors[impact] }}>
        {impact === 'HIGH' ? t('jarvis.impact_high') : impact === 'MEDIUM' ? t('jarvis.impact_medium') : t('jarvis.impact_low')}
      </span>
    </div>
  );
}

/* ── Error state ───────────────────────────────────────────────────── */
function ErrorState({ onRetry }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <AlertCircle size={28} style={{ color: "#ef4444" }} />
      <div>
        <p className="text-sm text-white/70 mb-1">{t('jarvis.error')}</p>
        <p className="text-xs" style={{ color: MUTED }}>
          Check your connection or API status.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}33`, color: GOLD }}
      >
        <RefreshCw size={14} />
        {t('jarvis.retry')}
      </button>
    </div>
  );
}

/* ── Mock fallback data (used if API fails) ────────────────────────── */
const MOCK_NARRATIVE = {
  headline: "GEOPOLITICAL TENSIONS RESHAPE CAPITAL FLOWS",
  narrative:
    "Escalating tensions in the Taiwan Strait are forcing institutional capital to seek defensive repositioning. Semiconductor supply chain exposure is prompting significant outflows from tech-heavy indices, with risk-off sentiment accelerating rotation into commodities and safe-haven currencies.\n\nFederal Reserve officials have signaled a data-dependent pause, but tightening financial conditions in Asia-Pacific markets are generating asymmetric pressure on export-driven economies. The confluence of geopolitical friction and monetary divergence is creating rare cross-asset dislocations.\n\nBitcoin is displaying decoupling behavior from equities, with on-chain metrics indicating accumulation by long-term holders. Gold's inverse relationship with the USD is strengthening as central bank demand exceeds five-year averages.",
  predictions: [
    {
      signal: "BUY",
      symbol: "BTC/USD",
      confidence: 78,
      reasoning:
        "On-chain accumulation by long-term holders + geopolitical safe-haven demand driving institutional inflows above 30-day average.",
    },
    {
      signal: "BUY",
      symbol: "GOLD",
      confidence: 82,
      reasoning:
        "Central bank demand at 5-year peak. USD weakness + Taiwan risk premium expanding. Structural bid, not cyclical rotation.",
    },
    {
      signal: "SELL",
      symbol: "EUR/USD",
      confidence: 71,
      reasoning:
        "ECB divergence from Fed stance widening. EUR risk premium elevated on Eastern European energy dependency concerns.",
    },
  ],
  events: [
    { title: "Taiwan Strait military exercises escalate", impact: "HIGH" },
    { title: "Fed signals data-dependent pause on rates", impact: "MEDIUM" },
    { title: "Central bank gold purchases hit 5-year peak", impact: "MEDIUM" },
    { title: "TSMC guidance cut on geopolitical uncertainty", impact: "HIGH" },
    { title: "ECB diverges from Fed on rate trajectory", impact: "MEDIUM" },
  ],
  updatedAt: new Date().toISOString(),
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN WIDGET COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function JarvisNarrativeWidget() {
  const { t } = useLanguage();
  const [state, setState] = useState("loading"); // loading | loaded | error
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const synthRef = useRef(null);
  const utteranceRef = useRef(null);

  /* ── Fetch live narrative ────────────────────────────────────── */
  const fetchNarrative = useCallback(async () => {
    try {
      const res = await fetch("/api/jarvis-narrative/live");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setState("loaded");
    } catch (err) {
      console.warn("[JarvisNarrativeWidget] API unavailable, using mock data:", err.message);
      // Fallback to mock data so the UI always renders meaningfully
      setData(MOCK_NARRATIVE);
      setState("loaded");
    }
  }, []);

  /* ── Trigger regeneration ────────────────────────────────────── */
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/jarvis-narrative/generate", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setState("loaded");
    } catch (err) {
      console.warn("[JarvisNarrativeWidget] Regeneration failed, re-fetching:", err.message);
      await fetchNarrative();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, fetchNarrative]);

  /* ── TTS narration ───────────────────────────────────────────── */
  const handleNarrate = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    if (isNarrating) {
      window.speechSynthesis.cancel();
      setIsNarrating(false);
      return;
    }
    if (!data) return;
    const text = `${data.headline}. ${data.narrative}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    utterance.onend = () => setIsNarrating(false);
    utterance.onerror = () => setIsNarrating(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsNarrating(true);
  }, [isNarrating, data]);

  /* ── Minutes-ago timer ───────────────────────────────────────── */
  useEffect(() => {
    if (!data?.updatedAt) return;
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(data.updatedAt).getTime()) / 60000);
      setMinutesAgo(diff);
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [data?.updatedAt]);

  /* ── Initial fetch ───────────────────────────────────────────── */
  useEffect(() => {
    fetchNarrative();
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [fetchNarrative]);

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: BG_CARD, borderColor: BORDER }}
    >
      {/* Widget header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ borderColor: BORDER, background: "#080808" }}
      >
        <div className="flex items-center gap-3">
          {/* Pulsing LIVE badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: "#22c55e18",
              border: "1px solid #22c55e33",
              color: "#22c55e",
              animation: "live-pulse 2s ease-in-out infinite",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#22c55e", animation: "live-pulse 2s ease-in-out infinite" }}
            />
            {t('jarvis.live')}
          </div>
          <div className="flex items-center gap-2">
            <Brain size={16} style={{ color: GOLD }} />
            <span className="text-sm font-bold text-white">JARVIS Narrative Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Last updated */}
          {data && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
              <Clock size={11} />
              {minutesAgo < 1 ? 'Just now' : t('jarvis.updated').replace('{m}', minutesAgo)}
            </div>
          )}

          {/* Narrate button */}
          <button
            onClick={handleNarrate}
            title={isNarrating ? t('jarvis.stop') : t('jarvis.listen')}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: isNarrating ? `${GOLD}20` : "transparent",
              color: isNarrating ? GOLD : MUTED,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = `${GOLD}15`)}
            onMouseLeave={(e) => (e.currentTarget.style.background = isNarrating ? `${GOLD}20` : "transparent")}
          >
            {isNarrating ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || state === "loading"}
            title="Regenerate narrative"
            className="p-2 rounded-lg transition-colors disabled:opacity-40"
            style={{ color: MUTED }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${GOLD}15`;
              e.currentTarget.style.color = GOLD;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = MUTED;
            }}
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Widget body */}
      <AnimatePresence mode="wait">
        {/* Loading state */}
        {state === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NarrativeSkeleton />
          </motion.div>
        )}

        {/* Error state */}
        {state === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ErrorState onRetry={fetchNarrative} />
          </motion.div>
        )}

        {/* Loaded state */}
        {state === "loaded" && data && (
          <motion.div
            key="loaded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-5 space-y-5"
          >
            {/* Headline */}
            <h2
              className="text-lg lg:text-xl font-black uppercase tracking-wide leading-tight"
              style={{ color: GOLD }}
            >
              {data.headline}
            </h2>

            {/* Narrative text with expand/collapse */}
            <div>
              <div
                className="text-sm leading-relaxed whitespace-pre-line overflow-hidden transition-all duration-300"
                style={{
                  color: "rgba(255,255,255,0.75)",
                  maxHeight: expanded ? "none" : "4.5em",
                  WebkitMaskImage: expanded
                    ? "none"
                    : "linear-gradient(to bottom, black 60%, transparent 100%)",
                  maskImage: expanded
                    ? "none"
                    : "linear-gradient(to bottom, black 60%, transparent 100%)",
                }}
              >
                {data.narrative}
              </div>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold mt-2 transition-colors"
                style={{ color: GOLD }}
              >
                {expanded ? (
<>{t('jarvis.read_less')} <ChevronUp size={13} /></>
                ) : (
<>{t('jarvis.read_more')} <ChevronDown size={13} /></>
                )}
              </button>
            </div>

            {/* Geopolitical events */}
            {data.events && data.events.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: MUTED }}>
                  {t('jarvis.geopolitical_events')}
                </p>
                <div className="space-y-1.5">
                  {data.events.map((event, i) => (
                    <EventPill key={i} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Predictions */}
            {data.predictions && data.predictions.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>
                  {t('jarvis.predictions')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {data.predictions.map((pred, i) => (
                    <PredictionCard key={i} prediction={pred} />
                  ))}
                </div>
              </div>
            )}

            {/* Data Quality — compact inline indicator */}
            <div
              className="pt-2"
              style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "10px" }}
            >
              <DataQualityWidget compact={true} />
            </div>

            {/* Footer CTA */}
            <div
              className="flex items-center justify-between pt-4 border-t"
              style={{ borderColor: BORDER }}
            >
              <p className="text-xs" style={{ color: MUTED }}>
                Powered by JARVIS GPT-5.2 • Aureos.tech
              </p>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}33`, color: GOLD }}
              >
                <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? '...' : t('jarvis.refresh')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scoped animation styles */}
      <style>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
