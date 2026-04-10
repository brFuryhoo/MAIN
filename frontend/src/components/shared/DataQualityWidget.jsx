/**
 * DataQualityWidget.jsx — Aureos.tech
 * =====================================
 * Compact embeddable widget showing live data quality status from the
 * Data Confidence Engine. Can be embedded anywhere in the dashboard.
 *
 * Props:
 *   compact  {boolean}  If true, renders a single-line summary bar.
 *                       If false (default), renders the full provider grid.
 *
 * Polls:
 *   GET /api/data-confidence/quality-report  every 60s
 *   GET /api/data-confidence/provider-status every 30s
 *
 * Full version:
 *   - Header: "DATA CONFIDENCE ENGINE" + overall score badge
 *   - Provider grid: status card per provider
 *   - Low confidence warnings
 *   - "Last validated: Xs ago" footer
 *
 * Compact version (one line):
 *   - Shield icon + "Data Quality: 91% · 5 providers online"
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  CheckCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge";

// ─── Brand tokens ─────────────────────────────────────────────────────────────

const GOLD = "#D4AF37";
const BG_CARD = "#0A0A0A";
const BG_INNER = "#0D0D0D";
const BORDER = "#1a1a1a";
const MUTED = "#555";

// ─── Provider display config ──────────────────────────────────────────────────

const PROVIDER_DISPLAY = {
  coingecko: { label: "CoinGecko", short: "CG" },
  twelvedata: { label: "TwelveData", short: "TD" },
  polygon: { label: "Polygon.io", short: "PG" },
  alphavantage: { label: "AlphaVantage", short: "AV" },
  yfinance_public: { label: "YFinance", short: "YF" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status) {
  if (status === "online") return "#00E676";
  if (status === "degraded") return "#F59E0B";
  return "#EF4444";
}

function statusIcon(status) {
  if (status === "online") return CheckCircle;
  if (status === "degraded") return AlertTriangle;
  return XCircle;
}

function latencyColor(ms) {
  if (!ms) return MUTED;
  if (ms < 400) return "#00E676";
  if (ms < 800) return "#F59E0B";
  return "#EF4444";
}

// Skeleton shimmer block
function Skeleton({ width = "100%", height = 14, style = {} }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.55, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      style={{
        width,
        height,
        backgroundColor: "#1a1a1a",
        borderRadius: "4px",
        ...style,
      }}
    />
  );
}

// ─── Provider status card ─────────────────────────────────────────────────────

function ProviderCard({ provider }) {
  const display = PROVIDER_DISPLAY[provider.provider] || { label: provider.provider, short: "??" };
  const status = provider.status || "offline";
  const color = statusColor(status);
  const LatencyIcon = Wifi;

  return (
    <div
      style={{
        padding: "10px 12px",
        backgroundColor: BG_INNER,
        border: `1px solid ${BORDER}`,
        borderRadius: "7px",
        borderLeft: `3px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        flex: 1,
        minWidth: "120px",
      }}
    >
      {/* Provider name + status dot */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <motion.div
          animate={
            status === "online"
              ? { opacity: [1, 0.3, 1] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "#ddd",
            fontFamily: "monospace",
            letterSpacing: "0.04em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {display.label}
        </span>
      </div>

      {/* Status badge */}
      <span
        style={{
          fontSize: "8px",
          fontWeight: 700,
          color: color,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "monospace",
        }}
      >
        {status}
      </span>

      {/* Latency */}
      {provider.latency_ms != null && (
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <LatencyIcon size={9} style={{ color: latencyColor(provider.latency_ms) }} />
          <span
            style={{
              fontSize: "9px",
              color: latencyColor(provider.latency_ms),
              fontFamily: "monospace",
            }}
          >
            {provider.latency_ms}ms
          </span>
        </div>
      )}

      {/* Success rate */}
      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
        <Activity size={9} style={{ color: MUTED }} />
        <span style={{ fontSize: "9px", color: MUTED, fontFamily: "monospace" }}>
          {provider.success_rate ?? 100}%
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton for full widget ─────────────────────────────────────────────────

function FullWidgetSkeleton() {
  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <Skeleton width={160} height={16} />
        <Skeleton width={60} height={22} />
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={110} height={80} style={{ borderRadius: "7px" }} />
        ))}
      </div>
      <Skeleton width="100%" height={36} style={{ borderRadius: "6px" }} />
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export default function DataQualityWidget({ compact = false }) {
  const [qualityData, setQualityData] = useState(null);
  const [providerData, setProviderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastValidatedAt, setLastValidatedAt] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const timerRef = useRef(null);
  const pollingRef = useRef(null);

  // ── Fetch quality report ─────────────────────────────────────────────────
  const fetchQuality = useCallback(async () => {
    try {
      const res = await fetch("/api/data-confidence/quality-report");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setQualityData(data);
      setLastValidatedAt(Date.now());
      setSecondsAgo(0);
    } catch (err) {
      // Use stale data if available, otherwise show a minimal fallback
      if (!qualityData) {
        setQualityData({
          overall_confidence: 0,
          total_datapoints_today: 0,
          outliers_detected_today: 0,
          low_confidence_assets: [],
          recommendations: [],
        });
      }
      console.warn("[DataQualityWidget] quality-report unavailable:", err.message);
    }
  }, [qualityData]);

  // ── Fetch provider status ────────────────────────────────────────────────
  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/data-confidence/provider-status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProviderData(data.providers || []);
    } catch (err) {
      if (!providerData) {
        setProviderData(
          Object.keys(PROVIDER_DISPLAY).map((name) => ({
            provider: name,
            status: "offline",
            latency_ms: null,
            success_rate: 0,
          }))
        );
      }
      console.warn("[DataQualityWidget] provider-status unavailable:", err.message);
    }
  }, [providerData]);

  // ── Mount / polling setup ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await Promise.all([fetchQuality(), fetchProviders()]);
      if (mounted) setLoading(false);
    };
    init();

    // Poll quality every 60s, providers every 30s
    const qualityInterval = setInterval(fetchQuality, 60000);
    const providerInterval = setInterval(fetchProviders, 30000);

    return () => {
      mounted = false;
      clearInterval(qualityInterval);
      clearInterval(providerInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Seconds-ago counter ──────────────────────────────────────────────────
  useEffect(() => {
    if (!lastValidatedAt) return;
    timerRef.current = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastValidatedAt) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [lastValidatedAt]);

  // ── Derived values ───────────────────────────────────────────────────────
  const overallScore = qualityData?.overall_confidence ?? 0;
  const onlineProviders = (providerData || []).filter((p) => p.status === "online").length;
  const totalProviders = (providerData || []).length || Object.keys(PROVIDER_DISPLAY).length;
  const lowConfAssets = qualityData?.low_confidence_assets || [];

  // ══════════════════════════════════════════════════════════════════════════
  // COMPACT VERSION
  // ══════════════════════════════════════════════════════════════════════════

  if (compact) {
    if (loading) {
      return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Skeleton width={120} height={14} />
        </div>
      );
    }

    const compactColor = overallScore > 85 ? "#00E676" : overallScore >= 70 ? "#3B82F6" : overallScore >= 55 ? "#F59E0B" : "#EF4444";

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "3px 8px",
          backgroundColor: "rgba(0,0,0,0.3)",
          border: `1px solid #1a1a1a`,
          borderRadius: "5px",
          cursor: "default",
        }}
        title={`Data Confidence Engine — Overall: ${overallScore}%, ${onlineProviders}/${totalProviders} providers online`}
      >
        <ShieldCheck size={11} style={{ color: compactColor, flexShrink: 0 }} />
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "#aaa",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
          }}
        >
          Data Quality:{" "}
          <span style={{ color: compactColor, fontWeight: 800 }}>
            {Math.round(overallScore)}%
          </span>
          {" · "}
          <span style={{ color: onlineProviders === totalProviders ? "#00E676" : "#F59E0B" }}>
            {onlineProviders}/{totalProviders} providers online
          </span>
        </span>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FULL VERSION
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div
      style={{
        backgroundColor: BG_CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${BORDER}`,
          backgroundColor: "#080808",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={14} style={{ color: GOLD }} />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: GOLD,
              letterSpacing: "0.14em",
              fontFamily: "monospace",
              textTransform: "uppercase",
            }}
          >
            Data Confidence Engine
          </span>
        </div>

        {/* Overall score badge */}
        {loading ? (
          <Skeleton width={60} height={24} />
        ) : (
          <ConfidenceBadge
            score={overallScore}
            size="md"
            showTooltip={false}
          />
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FullWidgetSkeleton />
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ padding: "14px 16px" }}>

              {/* Overall confidence bar */}
              <div style={{ marginBottom: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "5px",
                  }}
                >
                  <span style={{ fontSize: "9px", color: MUTED, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "monospace" }}>
                    OVERALL CONFIDENCE
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#e0e0e0", fontFamily: "monospace" }}>
                    {Math.round(overallScore)}%
                  </span>
                </div>
                <div style={{ height: "4px", backgroundColor: "#1a1a1a", borderRadius: "2px", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overallScore}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
                      height: "100%",
                      backgroundColor:
                        overallScore > 85 ? "#00E676" : overallScore >= 70 ? "#3B82F6" : overallScore >= 55 ? "#F59E0B" : "#EF4444",
                      borderRadius: "2px",
                    }}
                  />
                </div>
              </div>

              {/* Provider grid */}
              <div style={{ marginBottom: "12px" }}>
                <span
                  style={{
                    fontSize: "9px",
                    color: MUTED,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    fontFamily: "monospace",
                    display: "block",
                    marginBottom: "7px",
                  }}
                >
                  PROVIDERS ({onlineProviders}/{totalProviders} online)
                </span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {(providerData || []).map((p) => (
                    <ProviderCard key={p.provider} provider={p} />
                  ))}
                </div>
              </div>

              {/* Low confidence warnings */}
              {lowConfAssets.length > 0 && (
                <div style={{ marginBottom: "10px" }}>
                  <span
                    style={{
                      fontSize: "9px",
                      color: "#F59E0B",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      fontFamily: "monospace",
                      display: "block",
                      marginBottom: "5px",
                    }}
                  >
                    LOW CONFIDENCE WARNINGS
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    {lowConfAssets.slice(0, 3).map((asset, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 8px",
                          backgroundColor: "rgba(245,158,11,0.06)",
                          border: "1px solid rgba(245,158,11,0.15)",
                          borderRadius: "5px",
                        }}
                      >
                        <AlertTriangle size={9} style={{ color: "#F59E0B", flexShrink: 0 }} />
                        <span style={{ fontSize: "9px", fontWeight: 700, color: "#F59E0B", fontFamily: "monospace", minWidth: "50px" }}>
                          {asset.symbol}
                        </span>
                        <span style={{ fontSize: "9px", color: "#777", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {asset.issue || "Confidence below threshold"}
                        </span>
                        <ConfidenceBadge score={asset.confidence} size="sm" showTooltip={false} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats strip */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom: "10px",
                  padding: "8px 10px",
                  backgroundColor: "#080808",
                  borderRadius: "6px",
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#e0e0e0", fontFamily: "monospace" }}>
                    {qualityData?.total_datapoints_today ?? 0}
                  </div>
                  <div style={{ fontSize: "8px", color: MUTED, fontWeight: 600, letterSpacing: "0.08em" }}>datapoints/day</div>
                </div>
                <div style={{ width: "1px", backgroundColor: BORDER }} />
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: qualityData?.outliers_detected_today > 0 ? "#F59E0B" : "#e0e0e0", fontFamily: "monospace" }}>
                    {qualityData?.outliers_detected_today ?? 0}
                  </div>
                  <div style={{ fontSize: "8px", color: MUTED, fontWeight: 600, letterSpacing: "0.08em" }}>outliers today</div>
                </div>
                <div style={{ width: "1px", backgroundColor: BORDER }} />
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: onlineProviders === totalProviders ? "#00E676" : "#F59E0B", fontFamily: "monospace" }}>
                    {onlineProviders}/{totalProviders}
                  </div>
                  <div style={{ fontSize: "8px", color: MUTED, fontWeight: 600, letterSpacing: "0.08em" }}>providers up</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "8px 16px",
                borderTop: `1px solid ${BORDER}`,
                backgroundColor: "#080808",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={10} style={{ color: MUTED }} />
                <span style={{ fontSize: "9px", color: MUTED, fontFamily: "monospace" }}>
                  Last validated: {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
                </span>
              </div>
              <span style={{ fontSize: "9px", color: "#333", fontFamily: "monospace" }}>
                Aureos DCE v1
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
