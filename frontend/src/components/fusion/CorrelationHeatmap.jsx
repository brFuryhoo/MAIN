import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

// Interpolate correlation value → CSS rgb color
// -1.0 → #FF4444 (red), 0 → #1a1a1a (dark), +1.0 → #00E676 (green)
function corrToColor(value) {
  if (value >= 0) {
    // 0 → #1a1a1a, 1 → #00E676
    const r = Math.round(0x1a + (0x00 - 0x1a) * value);
    const g = Math.round(0x1a + (0xe6 - 0x1a) * value);
    const b = Math.round(0x1a + (0x76 - 0x1a) * value);
    return `rgb(${r},${g},${b})`;
  } else {
    // 0 → #1a1a1a, -1 → #FF4444
    const t = Math.abs(value);
    const r = Math.round(0x1a + (0xff - 0x1a) * t);
    const g = Math.round(0x1a + (0x44 - 0x1a) * t);
    const b = Math.round(0x1a + (0x44 - 0x1a) * t);
    return `rgb(${r},${g},${b})`;
  }
}

function corrLabel(value) {
  const abs = Math.abs(value);
  if (abs >= 0.8) return "Very strong";
  if (abs >= 0.6) return "Strong";
  if (abs >= 0.4) return "Moderate";
  if (abs >= 0.2) return "Weak";
  return "Very weak";
}

function corrDirection(value) {
  if (value === 1.0) return "perfect";
  return value > 0 ? "positive" : "inverse";
}

export default function CorrelationHeatmap({ matrix, divergences = [] }) {
  const { t } = useLanguage();
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const { assets = [], values = [] } = matrix || {};
  const n = assets.length;

  // Build a set of divergence keys for O(1) lookup
  const divergenceSet = new Set(
    (divergences || []).map((d) => `${d[0]}-${d[1]}`)
  );

  function isDivergent(i, j) {
    return (
      divergenceSet.has(`${i}-${j}`) || divergenceSet.has(`${j}-${i}`)
    );
  }

  function handleMouseEnter(e, i, j) {
    const val = values[i][j];
    setTooltip({
      rowAsset: assets[i],
      colAsset: assets[j],
      value: val,
      label: corrLabel(val),
      direction: corrDirection(val),
      divergent: isDivergent(i, j),
    });
    updateTooltipPos(e);
  }

  function updateTooltipPos(e) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 10,
    });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  if (!assets.length || !values.length) {
    return (
      <div className="flex items-center justify-center h-48 text-[#666] text-sm">
        {t('heatmap.title')} — No data
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-auto"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {/* Grid container with row labels + top labels */}
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: `64px repeat(${n}, minmax(36px, 1fr))`,
          gridTemplateRows: `56px repeat(${n}, minmax(36px, 1fr))`,
          gap: "2px",
          minWidth: `${64 + n * 38}px`,
        }}
      >
        {/* Top-left empty corner */}
        <div />

        {/* Column headers (rotated) */}
        {assets.map((asset, j) => (
          <div
            key={`col-${j}`}
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: "4px",
              height: "56px",
            }}
          >
            <span
              style={{
                display: "block",
                transform: "rotate(-45deg)",
                transformOrigin: "bottom center",
                fontSize: "9px",
                color: "#D4AF37",
                fontWeight: 600,
                whiteSpace: "nowrap",
                letterSpacing: "0.05em",
              }}
            >
              {asset}
            </span>
          </div>
        ))}

        {/* Rows */}
        {assets.map((rowAsset, i) => (
          <React.Fragment key={`row-${i}`}>
            {/* Row label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: "8px",
                fontSize: "9px",
                color: "#D4AF37",
                fontWeight: 600,
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              {rowAsset}
            </div>

            {/* Cells */}
            {assets.map((colAsset, j) => {
              const val = values[i][j];
              const isDiag = i === j;
              const diverg = isDivergent(i, j);
              const bgColor = corrToColor(val);
              const textColor = Math.abs(val) > 0.4 ? "#ffffff" : "#aaaaaa";
              const showText = true; // always show since cells are ≥36px

              return (
                <motion.div
                  key={`cell-${i}-${j}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (i * n + j) * 0.003, duration: 0.3 }}
                  onMouseEnter={(e) => handleMouseEnter(e, i, j)}
                  onMouseMove={updateTooltipPos}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    backgroundColor: bgColor,
                    border: isDiag
                      ? "2px solid #D4AF37"
                      : diverg
                      ? "2px solid #F59E0B"
                      : "1px solid #1a1a1a",
                    borderRadius: "3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "crosshair",
                    minHeight: "36px",
                    position: "relative",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    boxShadow: diverg
                      ? "0 0 8px rgba(245,158,11,0.4)"
                      : "none",
                  }}
                  whileHover={{
                    scale: 1.15,
                    zIndex: 10,
                    boxShadow: isDiag
                      ? "0 0 12px rgba(212,175,55,0.6)"
                      : "0 0 10px rgba(255,255,255,0.15)",
                  }}
                >
                  {/* Pulsing border for divergent cells */}
                  {diverg && !isDiag && (
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "3px",
                        border: "2px solid #F59E0B",
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {showText && (
                    <span
                      style={{
                        fontSize: "8px",
                        fontWeight: isDiag ? 700 : 500,
                        color: isDiag ? "#D4AF37" : textColor,
                        letterSpacing: "0",
                        userSelect: "none",
                      }}
                    >
                      {val.toFixed(2)}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Color scale legend */}
      <div className="flex items-center gap-3 mt-4 px-1">
        <span style={{ fontSize: "9px", color: "#666", fontWeight: 600 }} title={t('heatmap.legend_negative')}>
          -1.0
        </span>
        <div
          style={{
            flex: 1,
            maxWidth: "200px",
            height: "8px",
            borderRadius: "4px",
            background:
              "linear-gradient(to right, #FF4444, #1a1a1a 50%, #00E676)",
            border: "1px solid #333",
          }}
        />
        <span style={{ fontSize: "9px", color: "#666", fontWeight: 600 }} title={t('heatmap.legend_positive')}>
          +1.0
        </span>
        {divergences && divergences.length > 0 && (
          <div className="flex items-center gap-1.5 ml-4">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                border: "2px solid #F59E0B",
                backgroundColor: "rgba(245,158,11,0.1)",
              }}
            />
            <span style={{ fontSize: "9px", color: "#F59E0B", fontWeight: 600 }}>
              {t('heatmap.divergence_warning')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 ml-2">
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              border: "2px solid #D4AF37",
              backgroundColor: "rgba(212,175,55,0.1)",
            }}
          />
          <span style={{ fontSize: "9px", color: "#D4AF37", fontWeight: 600 }}>
            DIAGONAL (1.00)
          </span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltipPos.x,
            top: tooltipPos.y,
            zIndex: 50,
            pointerEvents: "none",
            backgroundColor: "#0d0d0d",
            border: `1px solid ${tooltip.divergent ? "#F59E0B" : "#D4AF37"}`,
            borderRadius: "6px",
            padding: "8px 12px",
            boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 12px ${
              tooltip.divergent
                ? "rgba(245,158,11,0.3)"
                : "rgba(212,175,55,0.2)"
            }`,
            maxWidth: "220px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#D4AF37",
              fontWeight: 700,
              marginBottom: "4px",
            }}
          >
            {t('heatmap.tooltip_pair').replace('{a}', tooltip.rowAsset).replace('{b}', tooltip.colAsset)}
          </div>
          <div
            style={{
              fontSize: "18px",
              color:
                tooltip.value > 0.1
                  ? "#00E676"
                  : tooltip.value < -0.1
                  ? "#FF4444"
                  : "#888",
              fontWeight: 700,
              marginBottom: "3px",
            }}
          >
            {tooltip.value.toFixed(3)}
          </div>
          <div style={{ fontSize: "10px", color: "#aaa" }}>
            {tooltip.label} {tooltip.direction} correlation
          </div>
          {tooltip.divergent && (
            <div
              style={{
                marginTop: "4px",
                fontSize: "9px",
                color: "#F59E0B",
                fontWeight: 600,
              }}
            >
              ⚠ {t('heatmap.divergence_warning')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
