/**
 * ConfidenceBadge.jsx — Aureos.tech
 * =================================
 * Reusable badge component that displays the Data Confidence Engine score
 * for any datapoint across the Aureos platform.
 *
 * Props:
 *   score          {number}   0-100 confidence score
 *   size           {'sm'|'md'|'lg'}   Controls visual density
 *   showLabel      {boolean}  Show grade label text (default true for lg, false for sm)
 *   showTooltip    {boolean}  Show provider breakdown tooltip on hover (default true)
 *   providerBreakdown {Array} Optional array of provider breakdown objects from API
 *   className      {string}   Additional CSS classes
 *
 * Grades:
 *   A (>85)  — green  shield-check  "HIGH CONFIDENCE"
 *   B (70-85)— blue   shield        "GOOD DATA"
 *   C (55-70)— amber  alert-tri     "MODERATE"
 *   D (<55)  — red    x-circle      "LOW CONFIDENCE"
 *
 * Sizes:
 *   sm — colored dot only
 *   md — icon + numeric score
 *   lg — icon + grade letter + label + score bar
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Shield,
  AlertTriangle,
  XCircle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// ─── Grade config ─────────────────────────────────────────────────────────────

function getGradeConfig(score) {
  if (score > 85) {
    return {
      grade: "A",
      label: "HIGH CONFIDENCE",
      color: "#00E676",
      bg: "rgba(0, 230, 118, 0.12)",
      border: "rgba(0, 230, 118, 0.30)",
      glow: "rgba(0, 230, 118, 0.2)",
      icon: ShieldCheck,
      dotColor: "#00E676",
    };
  } else if (score >= 70) {
    return {
      grade: "B",
      label: "GOOD DATA",
      color: "#3B82F6",
      bg: "rgba(59, 130, 246, 0.12)",
      border: "rgba(59, 130, 246, 0.30)",
      glow: "rgba(59, 130, 246, 0.2)",
      icon: Shield,
      dotColor: "#3B82F6",
    };
  } else if (score >= 55) {
    return {
      grade: "C",
      label: "MODERATE",
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.30)",
      glow: "rgba(245, 158, 11, 0.2)",
      icon: AlertTriangle,
      dotColor: "#F59E0B",
    };
  } else {
    return {
      grade: "D",
      label: "LOW CONFIDENCE",
      color: "#EF4444",
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.30)",
      glow: "rgba(239, 68, 68, 0.2)",
      icon: XCircle,
      dotColor: "#EF4444",
    };
  }
}

// ─── Provider breakdown tooltip ───────────────────────────────────────────────

function ProviderTooltip({ breakdown, score, symbol }) {
  const cfg = getGradeConfig(score);
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        minWidth: "260px",
        backgroundColor: "#0a0a0a",
        border: `1px solid ${cfg.border}`,
        borderRadius: "8px",
        padding: "10px",
        boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px ${cfg.border}`,
        pointerEvents: "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          paddingBottom: "6px",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: "#555",
            letterSpacing: "0.12em",
            fontFamily: "monospace",
            textTransform: "uppercase",
          }}
        >
          {symbol ? `${symbol} — ` : ""}Provider Breakdown
        </span>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            color: cfg.color,
            fontFamily: "monospace",
          }}
        >
          {score}/100
        </span>
      </div>

      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 90px 60px 40px",
          gap: "4px",
          marginBottom: "4px",
        }}
      >
        {["Provider", "Price", "Delta", "Status"].map((h) => (
          <span
            key={h}
            style={{
              fontSize: "8px",
              color: "#444",
              fontWeight: 700,
              letterSpacing: "0.08em",
              fontFamily: "monospace",
              textTransform: "uppercase",
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Table rows */}
      {breakdown.map((row, i) => {
        const isOutlier = row.status === "outlier";
        const rowColor = isOutlier ? "#F59E0B" : "#00E676";
        const priceDisplay =
          row.price >= 1000
            ? `$${row.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : row.price >= 1
            ? `$${row.price.toFixed(4)}`
            : `$${row.price.toFixed(6)}`;

        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 60px 40px",
              gap: "4px",
              padding: "3px 0",
              borderBottom: i < breakdown.length - 1 ? "1px solid #111" : "none",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                color: "#ccc",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {row.provider}
            </span>
            <span
              style={{
                fontSize: "9px",
                color: "#e0e0e0",
                fontFamily: "monospace",
              }}
            >
              {priceDisplay}
            </span>
            <span
              style={{
                fontSize: "9px",
                color: isOutlier ? "#F59E0B" : "#888",
                fontFamily: "monospace",
              }}
            >
              {row.delta_pct === 0 ? "0.00%" : `${row.delta_pct > 0 ? "+" : ""}${row.delta_pct?.toFixed(2)}%`}
            </span>
            <span style={{ fontSize: "11px", textAlign: "center" }}>
              {isOutlier ? (
                <span title="Outlier">⚠</span>
              ) : (
                <span title="Verified" style={{ color: "#00E676" }}>✓</span>
              )}
            </span>
          </div>
        );
      })}

      {/* Tooltip arrow */}
      <div
        style={{
          position: "absolute",
          bottom: "-5px",
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          width: "8px",
          height: "8px",
          backgroundColor: "#0a0a0a",
          border: `1px solid ${cfg.border}`,
          borderTop: "none",
          borderLeft: "none",
        }}
      />
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConfidenceBadge({
  score = 0,
  size = "md",
  showLabel = null,     // null → auto: true for lg, false otherwise
  showTooltip = true,
  providerBreakdown = null,
  symbol = null,
  className = "",
}) {
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef(null);

  // Clamp score
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const cfg = getGradeConfig(clampedScore);
  const GradeIcon = cfg.icon;

  // Auto show-label logic
  const shouldShowLabel = showLabel !== null ? showLabel : size === "lg";

  // ── SIZE: sm — colored dot only ───────────────────────────────────────────
  if (size === "sm") {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={`Data Confidence: ${clampedScore}/100 (Grade ${cfg.grade})`}
      >
        <motion.div
          animate={{
            boxShadow: [
              `0 0 0px ${cfg.glow}`,
              `0 0 6px ${cfg.glow}`,
              `0 0 0px ${cfg.glow}`,
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: cfg.dotColor,
            flexShrink: 0,
            cursor: showTooltip ? "default" : "default",
          }}
        />
        {showTooltip && providerBreakdown && (
          <AnimatePresence>
            {hovered && (
              <ProviderTooltip
                breakdown={providerBreakdown}
                score={clampedScore}
                symbol={symbol}
              />
            )}
          </AnimatePresence>
        )}
      </div>
    );
  }

  // ── SIZE: md — icon + numeric score ──────────────────────────────────────
  if (size === "md") {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 7px",
            borderRadius: "5px",
            backgroundColor: cfg.bg,
            border: `1px solid ${cfg.border}`,
            cursor: showTooltip ? "default" : "default",
            userSelect: "none",
          }}
        >
          <GradeIcon
            size={11}
            style={{ color: cfg.color, flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: cfg.color,
              fontFamily: "monospace",
              lineHeight: 1,
            }}
          >
            {clampedScore}
          </span>
        </div>

        {showTooltip && providerBreakdown && (
          <AnimatePresence>
            {hovered && (
              <ProviderTooltip
                breakdown={providerBreakdown}
                score={clampedScore}
                symbol={symbol}
              />
            )}
          </AnimatePresence>
        )}
      </div>
    );
  }

  // ── SIZE: lg — full badge with grade + label + score bar ─────────────────
  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", display: "inline-flex", flexDirection: "column", gap: "4px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Badge pill */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 10px",
          borderRadius: "7px",
          backgroundColor: cfg.bg,
          border: `1px solid ${cfg.border}`,
          userSelect: "none",
        }}
      >
        <GradeIcon size={14} style={{ color: cfg.color, flexShrink: 0 }} />

        {/* Grade letter */}
        <span
          style={{
            fontSize: "13px",
            fontWeight: 900,
            color: cfg.color,
            fontFamily: "monospace",
            lineHeight: 1,
          }}
        >
          {cfg.grade}
        </span>

        {/* Label */}
        {shouldShowLabel && (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: cfg.color,
              letterSpacing: "0.1em",
              fontFamily: "monospace",
              opacity: 0.9,
            }}
          >
            {cfg.label}
          </span>
        )}

        {/* Numeric score */}
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: cfg.color,
            fontFamily: "monospace",
            marginLeft: "2px",
            opacity: 0.8,
          }}
        >
          {clampedScore}
        </span>
      </div>

      {/* Score bar */}
      <div
        style={{
          height: "3px",
          backgroundColor: "#1a1a1a",
          borderRadius: "2px",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedScore}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            height: "100%",
            backgroundColor: cfg.color,
            borderRadius: "2px",
            boxShadow: `0 0 6px ${cfg.glow}`,
          }}
        />
      </div>

      {/* Provider tooltip */}
      {showTooltip && providerBreakdown && (
        <AnimatePresence>
          {hovered && (
            <ProviderTooltip
              breakdown={providerBreakdown}
              score={clampedScore}
              symbol={symbol}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
