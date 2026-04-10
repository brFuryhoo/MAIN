import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  TrendingUp,
  Bitcoin,
  BarChart2,
  Layers,
  DollarSign,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

// ─── Category configuration ──────────────────────────────────────────────────
const CATEGORY_TKEYS = {
  "ALL": "fusion.filter_all",
  "geopolitical": "fusion.filter_geo",
  "macro": "fusion.filter_macro",
  "crypto": "fusion.filter_crypto",
  "equity": "fusion.filter_equity",
  "commodity": "fusion.filter_commodity",
  "forex": "fusion.filter_forex",
};

const CATEGORIES = [
  { key: "ALL" },
  { key: "geopolitical" },
  { key: "macro" },
  { key: "crypto" },
  { key: "equity" },
  { key: "commodity" },
  { key: "forex" },
];

const CATEGORY_ICON = {
  geopolitical: Globe,
  macro: TrendingUp,
  crypto: Bitcoin,
  equity: BarChart2,
  commodity: Layers,
  forex: DollarSign,
};

const IMPACT_CONFIG = {
  HIGH: { color: "#FF4444", bg: "rgba(255,68,68,0.12)", labelKey: "fusion.impact_high" },
  MEDIUM: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", labelKey: "fusion.impact_medium" },
  LOW: { color: "#00E676", bg: "rgba(0,230,118,0.12)", labelKey: "fusion.impact_low" },
};

const SOURCE_COLORS = {
  Reuters: "#ff8c00",
  Bloomberg: "#5b9bd5",
  BBC: "#bb1919",
  CoinDesk: "#f7931a",
  Reddit: "#ff4500",
  FT: "#fcd23c",
  CNBC: "#004c97",
  AP: "#c8102e",
};

function timeAgo(isoString) {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function SentimentArrow({ sentiment }) {
  if (sentiment === "bullish")
    return (
      <div className="flex items-center gap-0.5" style={{ color: "#00E676" }}>
        <ArrowUp size={12} />
        <span style={{ fontSize: "9px", fontWeight: 700 }}>BULL</span>
      </div>
    );
  if (sentiment === "bearish")
    return (
      <div className="flex items-center gap-0.5" style={{ color: "#FF4444" }}>
        <ArrowDown size={12} />
        <span style={{ fontSize: "9px", fontWeight: 700 }}>BEAR</span>
      </div>
    );
  return (
    <div className="flex items-center gap-0.5" style={{ color: "#888" }}>
      <Minus size={12} />
      <span style={{ fontSize: "9px", fontWeight: 700 }}>NEUT</span>
    </div>
  );
}

function EventCard({ event, onClick, compact, isNew }) {
  const { t } = useLanguage();
  const impact = IMPACT_CONFIG[event.impact_level] || IMPACT_CONFIG.LOW;
  const CategoryIcon = CATEGORY_ICON[event.category] || Zap;
  const sourceColor = SOURCE_COLORS[event.source] || "#888";
  const borderColor = impact.color;

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -24, scale: 0.97 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onClick={() => onClick && onClick(event)}
      style={{
        borderLeft: `3px solid ${borderColor}`,
        backgroundColor: "#0d0d0d",
        border: `1px solid #1a1a1a`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: "6px",
        padding: compact ? "8px 10px" : "10px 12px",
        cursor: "pointer",
        marginBottom: "6px",
        transition: "background-color 0.15s",
        position: "relative",
        overflow: "hidden",
      }}
      whileHover={{
        backgroundColor: "#111",
        boxShadow: `0 0 12px ${borderColor}22`,
      }}
    >
      {/* Subtle glow strip on left */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          backgroundColor: borderColor,
          boxShadow: `0 0 8px ${borderColor}`,
        }}
      />

      {/* Top row: impact + category icon + sentiment + time */}
      <div className="flex items-center gap-2 mb-1.5">
        {/* Impact badge */}
        <span
          style={{
            fontSize: "8px",
            fontWeight: 700,
            color: impact.color,
            backgroundColor: impact.bg,
            padding: "1px 5px",
            borderRadius: "3px",
            letterSpacing: "0.08em",
            border: `1px solid ${impact.color}44`,
            fontFamily: "monospace",
          }}
        >
          {t(impact.labelKey)}
        </span>

        {/* Category icon */}
        <div style={{ color: "#666" }}>
          <CategoryIcon size={11} />
        </div>

        {/* Category label */}
        <span
          style={{
            fontSize: "8px",
            color: "#555",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: "monospace",
          }}
        >
          {event.category}
        </span>

        <div className="flex-1" />

        {/* Sentiment */}
        <SentimentArrow sentiment={event.sentiment} />

        {/* Time */}
        <span style={{ fontSize: "9px", color: "#555", fontFamily: "monospace" }}>
          {timeAgo(event.published_at)}
        </span>
      </div>

      {/* Event title */}
      <p
        style={{
          fontSize: compact ? "11px" : "12px",
          color: "#e0e0e0",
          lineHeight: 1.4,
          marginBottom: "8px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          fontWeight: 500,
        }}
      >
        {event.title}
      </p>

      {/* Bottom row: source + affected assets */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Source badge */}
        <span
          style={{
            fontSize: "8px",
            fontWeight: 700,
            color: sourceColor,
            backgroundColor: `${sourceColor}15`,
            padding: "1px 5px",
            borderRadius: "3px",
            border: `1px solid ${sourceColor}30`,
            letterSpacing: "0.05em",
          }}
        >
          {event.source}
        </span>

        {/* Asset badges */}
        <div className="flex items-center gap-1 flex-wrap">
          {(event.affected_assets || []).slice(0, 4).map((asset) => (
            <span
              key={asset}
              style={{
                fontSize: "8px",
                color: "#D4AF37",
                backgroundColor: "rgba(212,175,55,0.08)",
                padding: "1px 4px",
                borderRadius: "3px",
                border: "1px solid rgba(212,175,55,0.2)",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              {asset}
            </span>
          ))}
          {(event.affected_assets || []).length > 4 && (
            <span style={{ fontSize: "8px", color: "#555" }}>
              +{event.affected_assets.length - 4}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          style={{
            height: "80px",
            borderRadius: "6px",
            backgroundColor: "#111",
            borderLeft: "3px solid #1a1a1a",
            border: "1px solid #1a1a1a",
            borderLeft: "3px solid #333",
          }}
        />
      ))}
    </div>
  );
}

export default function WorldDataFeed({ events = [], onEventClick, compact = false, loading = false }) {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [newEventIds, setNewEventIds] = useState(new Set());
  const prevEventsRef = useRef([]);

  // Detect new events
  useEffect(() => {
    const prevIds = new Set(prevEventsRef.current.map((e) => e.id));
    const freshIds = events
      .filter((e) => !prevIds.has(e.id))
      .map((e) => e.id);
    if (freshIds.length > 0) {
      setNewEventIds(new Set(freshIds));
      const timer = setTimeout(() => setNewEventIds(new Set()), 2000);
      prevEventsRef.current = events;
      return () => clearTimeout(timer);
    }
    prevEventsRef.current = events;
  }, [events]);

  // Filter logic
  const filteredEvents = useMemo(() => {
    if (activeFilter === "ALL") return events;
    return events.filter(
      (e) => e.category?.toLowerCase() === activeFilter.toLowerCase()
    );
  }, [events, activeFilter]);

  // Count per category
  const counts = useMemo(() => {
    const c = {};
    events.forEach((e) => {
      c[e.category] = (c[e.category] || 0) + 1;
    });
    return c;
  }, [events]);

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Filter tabs */}
      <div
        className="flex flex-wrap gap-1 mb-3 pb-3"
        style={{ borderBottom: "1px solid #1a1a1a" }}
      >
        {CATEGORIES.map((cat) => {
          const count =
            cat.key === "ALL"
              ? events.length
              : counts[cat.key] || 0;
          const isActive = activeFilter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(cat.key)}
              style={{
                fontSize: "9px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "4px",
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "all 0.15s",
                border: isActive
                  ? "1px solid #D4AF37"
                  : "1px solid #222",
                backgroundColor: isActive
                  ? "rgba(212,175,55,0.12)"
                  : "#0a0a0a",
                color: isActive ? "#D4AF37" : "#666",
                boxShadow: isActive
                  ? "0 0 8px rgba(212,175,55,0.2)"
                  : "none",
              }}
            >
              {t(CATEGORY_TKEYS[cat.key] || cat.key)}
              {count > 0 && (
                <span
                  style={{
                    marginLeft: "4px",
                    color: isActive ? "#D4AF37" : "#444",
                    fontWeight: 400,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feed list */}
      <div
        className="flex-1 overflow-y-auto pr-1"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#2a2a2a #0a0a0a",
          maxHeight: "calc(100vh - 340px)",
          minHeight: "300px",
        }}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : filteredEvents.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
            style={{ color: "#444" }}
          >
            <Globe size={32} style={{ marginBottom: "12px", opacity: 0.4 }} />
            <p style={{ fontSize: "12px" }}>{t('fusion.no_events')}</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={onEventClick}
                compact={compact}
                isNew={newEventIds.has(event.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
