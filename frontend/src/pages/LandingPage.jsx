/**
 * Aureos.tech — LandingPage.jsx
 * Premium fintech-AI landing page with animated hero, live ticker,
 * Jarvis Narrative section, features, social proof, pricing, and footer.
 *
 * Stack: React, Tailwind CSS, Framer Motion, Lucide icons
 * Brand: gold #D4AF37, dark bg #050505/#0A0A0A, muted #888
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Play,
  TrendingUp,
  TrendingDown,
  Brain,
  Zap,
  Globe,
  Bell,
  BarChart3,
  Radar,
  ArrowRight,
  Star,
  CheckCircle,
  Twitter,
  Linkedin,
  ChevronDown,
  Cpu,
  Shield,
} from "lucide-react";

/* ─── Brand constants ─────────────────────────────────────────────── */
const GOLD = "#D4AF37";
const BG_DARK = "#050505";
const BG_CARD = "#0A0A0A";
const BORDER = "#1a1a1a";
const MUTED = "#888";

/* ─── Mock ticker data (fallback) ───────────────────────────────────── */
const MOCK_TICKER_ITEMS = [
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
];

/* ─── Live counter hook ──────────────────────────────────────────── */
function useLiveCounter(base, incrementInterval = 4000) {
  const [count, setCount] = useState(base);
  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1);
    }, incrementInterval);
    return () => clearInterval(timer);
  }, [incrementInterval]);
  return count;
}

/* ─── Animated counter hook ─────────────────────────────────────── */
function useCountUp(target, duration = 2000, isActive = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setValue(Math.floor(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, isActive]);
  return value;
}

/* ─── Stats counter card ─────────────────────────────────────────── */
function StatCard({ value, suffix, label, isActive }) {
  const count = useCountUp(value, 2200, isActive);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-4xl font-black tracking-tight" style={{ color: GOLD }}>
        {count.toLocaleString()}
        {suffix}
      </span>
      <span className="text-xs uppercase tracking-widest" style={{ color: MUTED }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Hero background: animated gold grid + particles + radial glow ─ */
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(212,175,55,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Animated radial glow behind hero text — gold, very low opacity */}
      <div
        className="absolute"
        style={{
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "600px",
          background: `radial-gradient(ellipse at center, rgba(212,175,55,0.04) 0%, rgba(212,175,55,0.02) 35%, transparent 70%)`,
          animation: "hero-glow-pulse 6s ease-in-out infinite",
        }}
      />
      {/* Secondary softer glow */}
      <div
        className="absolute"
        style={{
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "700px",
          height: "500px",
          background: `radial-gradient(ellipse at center, rgba(212,175,55,0.03) 0%, transparent 65%)`,
        }}
      />
      {/* Floating particles */}
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1 + "px",
            height: Math.random() * 3 + 1 + "px",
            background: GOLD,
            opacity: Math.random() * 0.5 + 0.1,
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            animation: `float-particle ${Math.random() * 6 + 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48"
        style={{ background: `linear-gradient(to bottom, transparent, ${BG_DARK})` }}
      />
    </div>
  );
}

/* ─── Inline ticker bar (live or mock) ──────────────────────────── */
function HeroTicker({ items }) {
  const doubled = [...items, ...items]; // duplicate for seamless loop
  return (
    <div
      className="w-full overflow-hidden border-y"
      style={{ borderColor: BORDER, background: "rgba(10,10,10,0.95)" }}
    >
      <div
        className="flex items-center gap-8 whitespace-nowrap"
        style={{ animation: "ticker-scroll 40s linear infinite" }}
      >
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-2.5 px-4 shrink-0">
            <span className="text-xs font-bold tracking-wider text-white">{item.symbol}</span>
            <span className="text-xs font-mono text-white">${item.price}</span>
            <span
              className="text-xs font-semibold flex items-center gap-0.5"
              style={{ color: item.positive ? "#22c55e" : "#ef4444" }}
            >
              {item.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {item.positive ? "+" : ""}
              {item.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Prediction card (animated confidence bar on scroll) ───────── */
function PredictionCard({ signal, symbol, confidence, reasoning, delay = 0 }) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, margin: "-40px" });

  const isMonitor = signal === "WATCH";
  const isBuy = signal === "BUY";
  const signalColor = isMonitor ? "#F59E0B" : isBuy ? "#22c55e" : "#ef4444";

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="rounded-xl p-5 border flex flex-col gap-3"
      style={{ background: "#0D0D0D", borderColor: isMonitor ? "#F59E0B33" : BORDER }}
    >
      <div className="flex items-center justify-between">
        <span className="font-black text-white text-lg">{symbol}</span>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: `${signalColor}22`, color: signalColor, border: `1px solid ${signalColor}44` }}
        >
          {signal}
        </span>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span style={{ color: MUTED }}>Confidence</span>
          <span className="font-bold text-white">{confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${signalColor}, ${signalColor}88)` }}
            initial={{ width: 0 }}
            animate={isInView ? { width: `${confidence}%` } : { width: 0 }}
            transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
          />
        </div>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
        {reasoning}
      </p>
    </motion.div>
  );
}

/* ─── Feature card ───────────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, description, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, borderColor: `${GOLD}44` }}
      className="p-6 rounded-2xl border transition-colors duration-300 group"
      style={{ background: BG_CARD, borderColor: BORDER }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${GOLD}15` }}
      >
        <Icon size={20} style={{ color: GOLD }} />
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
        {description}
      </p>
    </motion.div>
  );
}

/* ─── Testimonial card ───────────────────────────────────────────── */
function TestimonialCard({ name, role, quote, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="p-6 rounded-2xl border"
      style={{ background: BG_CARD, borderColor: BORDER }}
    >
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={14} fill={GOLD} style={{ color: GOLD }} />
        ))}
      </div>
      <p className="text-sm leading-relaxed mb-5 text-white/80">"{quote}"</p>
      <div>
        <div className="font-bold text-white text-sm">{name}</div>
        <div className="text-xs mt-0.5" style={{ color: MUTED }}>
          {name} — {role}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Pricing card ───────────────────────────────────────────────── */
function PricingCard({ tier, price, period, features, highlight = false, badge, delay = 0, onCTA, ctaLabel = "Get Started" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative rounded-2xl border p-7 flex flex-col"
      style={{
        background: highlight ? `linear-gradient(135deg, #0f0f0f, #111)` : BG_CARD,
        borderColor: highlight ? `${GOLD}66` : BORDER,
        boxShadow: highlight ? `0 0 40px ${GOLD}15` : "none",
      }}
    >
      {badge && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full"
          style={{ background: GOLD, color: "#050505" }}
        >
          {badge}
        </div>
      )}
      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: GOLD }}>
          {tier}
        </div>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-black text-white">
            {price === 0 ? "Free" : `$${price}`}
          </span>
          {price > 0 && (
            <span className="text-sm mb-1.5" style={{ color: MUTED }}>
              /{period}
            </span>
          )}
        </div>
      </div>
      <ul className="flex-1 space-y-3 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <CheckCircle size={15} className="mt-0.5 shrink-0" style={{ color: GOLD }} />
            <span style={{ color: "rgba(255,255,255,0.75)" }}>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onCTA}
        className="w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
        style={
          highlight
            ? { background: GOLD, color: "#050505" }
            : { background: "transparent", border: `1px solid ${BORDER}`, color: "white" }
        }
        onMouseEnter={(e) => {
          if (!highlight) e.currentTarget.style.borderColor = `${GOLD}66`;
        }}
        onMouseLeave={(e) => {
          if (!highlight) e.currentTarget.style.borderColor = BORDER;
        }}
      >
        {ctaLabel}
      </button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function LandingPage({ user }) {
  const navigate = useNavigate();
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [tickerItems, setTickerItems] = useState(MOCK_TICKER_ITEMS);

  // Live trader count — increments +1 every 4 seconds from 50,247
  const liveTraderCount = useLiveCounter(50247, 4000);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  // Live ticker fetch + poll
  const fetchTicker = useCallback(async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/live/ticker`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setTickerItems(data);
      }
    } catch {
      // silently keep mock data
    }
  }, []);

  useEffect(() => {
    fetchTicker();
    const interval = setInterval(fetchTicker, 30000);
    return () => clearInterval(interval);
  }, [fetchTicker]);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => setContactSubmitted(false), 4000);
    setContactForm({ name: "", email: "", message: "" });
  };

  const NARRATIVE_TEXT = `JARVIS Global Fusion is monitoring 25 assets across 6 market categories. Today's dominant theme: geopolitical tension in the Asia-Pacific is creating divergence between tech semiconductors and safe-haven assets.

Escalating tensions in the Taiwan Strait are forcing institutional capital to seek defensive repositioning. Semiconductor supply chain exposure is prompting significant outflows from tech-heavy indices, with risk-off sentiment accelerating rotation into commodities and safe-haven currencies.

Federal Reserve officials have signaled a data-dependent pause, but tightening financial conditions in Asia-Pacific markets are generating asymmetric pressure on export-driven economies. The confluence of geopolitical friction and monetary divergence is creating rare cross-asset dislocations.

Bitcoin is displaying decoupling behavior from equities, with on-chain metrics indicating accumulation by long-term holders. Gold's inverse relationship with the USD is strengthening as central bank demand exceeds five-year averages — a structural shift, not a cyclical rotation.`;

  return (
    <div className="min-h-screen" style={{ background: BG_DARK, color: "white", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Global CSS ─────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.3); opacity: 0.7; }
        }
        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.95); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(212,175,55,0.3); }
          50% { box-shadow: 0 0 24px rgba(212,175,55,0.7); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hero-glow-pulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateX(-50%) scale(1.08); }
        }
        @keyframes green-dot-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #22c55e; }
          50% { opacity: 0.5; box-shadow: 0 0 10px #22c55e; }
        }

        .gold-gradient-text {
          background: linear-gradient(135deg, #D4AF37, #F5D878, #D4AF37);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .live-badge {
          animation: pulse-live 2s ease-in-out infinite;
        }
        .btn-gold {
          background: linear-gradient(135deg, #D4AF37, #C9A227);
          color: #050505;
          font-weight: 700;
          transition: all 0.2s;
        }
        .btn-gold:hover {
          background: linear-gradient(135deg, #F5D878, #D4AF37);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(212,175,55,0.35);
        }
        .btn-ghost {
          border: 1px solid rgba(212,175,55,0.4);
          color: white;
          background: transparent;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-ghost:hover {
          border-color: rgba(212,175,55,0.8);
          background: rgba(212,175,55,0.08);
          transform: translateY(-1px);
        }
        .narrative-clamp { 
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .section-divider {
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, #1a1a1a 30%, #1a1a1a 70%, transparent);
        }
        .green-dot-anim {
          animation: green-dot-pulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4"
        style={{ background: "rgba(5,5,5,0.85)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-3">
          {/* Logo */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Aureos logo">
            <polygon points="14,2 26,9 26,21 14,28 2,21 2,9" stroke={GOLD} strokeWidth="1.5" fill="none" />
            <polygon points="14,7 21,11 21,19 14,23 7,19 7,11" stroke={GOLD} strokeWidth="0.8" fill={`${GOLD}15`} />
            <circle cx="14" cy="15" r="2.5" fill={GOLD} />
          </svg>
          <span className="font-black text-lg tracking-tight" style={{ color: GOLD }}>
            AUREOS
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${GOLD}20`, color: GOLD, letterSpacing: "0.1em" }}>
            AI
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: MUTED }}>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#narrative" className="hover:text-white transition-colors">JARVIS</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#contact" className="hover:text-white transition-colors">Contact</a>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="hidden sm:block text-sm px-4 py-2 rounded-lg transition-colors"
            style={{ color: MUTED }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
            onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/register")}
            className="btn-gold text-sm px-5 py-2 rounded-lg"
          >
            Start Free Trial
          </button>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* HERO SECTION                                               */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col justify-center items-center text-center pt-24 pb-0"
        style={{ background: BG_DARK }}
      >
        <HeroBackground />

        <div className="relative z-10 max-w-5xl mx-auto px-6">
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-semibold tracking-widest uppercase"
            style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}33`, color: GOLD }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full live-badge"
              style={{ background: "#22c55e" }}
            />
            GPT-5.2 POWERED — NOW LIVE
          </motion.div>

          {/* JARVIS IS LIVE status bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full mb-8 text-xs font-semibold"
            style={{
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            <span
              className="green-dot-anim w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: "#22c55e" }}
            />
            <span className="font-bold tracking-widest text-[#22c55e] uppercase text-[10px]">JARVIS ONLINE</span>
            <span style={{ color: "#555" }}>·</span>
            <span style={{ color: MUTED }}>Monitoring 25 global assets</span>
            <span style={{ color: "#555" }}>·</span>
            <span style={{ color: MUTED }}>47 events captured</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tight leading-none mb-6"
          >
            JARVIS{" "}
            <span className="gold-gradient-text">Sees</span>
            <br />
            What Markets Don't
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "#aaa" }}
          >
            Institutional-grade AI intelligence. Real-time geopolitical analysis.
            GPT-5.2 predictions for ASX, NASDAQ, Forex &amp; Crypto.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <button
              onClick={() => navigate("/register")}
              className="btn-gold text-base px-8 py-4 rounded-xl flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="btn-ghost text-base px-8 py-4 rounded-xl flex items-center gap-2"
            >
              <Play size={16} fill="currentColor" />
              Watch JARVIS Live
            </button>
          </motion.div>

          {/* Stat counters */}
          <motion.div
            ref={statsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto mb-16"
          >
            <StatCard value={50000} suffix="K+" label="Active Traders" isActive={statsInView} />
            <StatCard value={21} suffix="B+" label="Analyzed Daily ($)" isActive={statsInView} />
            <StatCard value={89} suffix="%" label="Signal Accuracy" isActive={statsInView} />
            <StatCard value={49} suffix="★" label="Platform Rating" isActive={statsInView} />
          </motion.div>
        </div>

        {/* Ticker bar */}
        <div className="relative z-10 w-full">
          <HeroTicker items={tickerItems} />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* JARVIS NARRATIVE SECTION                                   */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section id="narrative" className="py-24 px-6 lg:px-12" style={{ background: "#070707" }}>
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              Artificial Intelligence
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4">
              JARVIS Narrates{" "}
              <span className="gold-gradient-text">the World</span>
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: MUTED }}>
              Real-time geopolitical intelligence translated directly into actionable trade signals.
            </p>
          </motion.div>

          {/* Live narrative card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border p-8 mb-8"
            style={{ background: BG_CARD, borderColor: BORDER }}
          >
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="live-badge flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "#22c55e22", border: "1px solid #22c55e44", color: "#22c55e" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                  LIVE
                </div>
                <span className="text-xs" style={{ color: MUTED }}>
                  Updated 3 min ago
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Brain size={16} style={{ color: GOLD }} />
                <span className="text-xs font-semibold" style={{ color: GOLD }}>
                  JARVIS GLOBAL FUSION ENGINE
                </span>
              </div>
            </div>

            {/* Headline */}
            <h3
              className="text-xl lg:text-2xl font-black mb-5 uppercase tracking-wide"
              style={{ color: GOLD }}
            >
              GEOPOLITICAL TENSIONS RESHAPE CAPITAL FLOWS
            </h3>

            {/* Narrative text */}
            <div className="mb-4">
              <p
                className={`text-sm leading-relaxed whitespace-pre-line ${!narrativeExpanded ? "narrative-clamp" : ""}`}
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                {NARRATIVE_TEXT}
              </p>
              <button
                onClick={() => setNarrativeExpanded((v) => !v)}
                className="text-xs mt-2 font-semibold transition-colors"
                style={{ color: GOLD }}
              >
                {narrativeExpanded ? "Show less ↑" : "Read more ↓"}
              </button>
            </div>

            {/* Geopolitical event tags */}
            <div className="flex flex-wrap gap-2 mb-8 pt-4 border-t" style={{ borderColor: BORDER }}>
              {["Taiwan Strait", "Fed Policy", "BTC Decoupling", "Gold Demand", "USD Pressure", "Semiconductor Supply"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{ background: "#1a1a1a", color: MUTED, border: `1px solid ${BORDER}` }}
                  >
                    {tag}
                  </span>
                )
              )}
            </div>

            {/* Prediction cards grid — 4 cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <PredictionCard
                signal="BUY"
                symbol="BTC/USD"
                confidence={78}
                reasoning="On-chain accumulation by long-term holders + geopolitical safe-haven demand driving institutional inflows above 30-day average."
                delay={0}
              />
              <PredictionCard
                signal="BUY"
                symbol="GOLD"
                confidence={82}
                reasoning="Central bank demand at 5-year peak. USD weakness + Taiwan risk premium expanding. Structural bid, not cyclical rotation."
                delay={0.1}
              />
              <PredictionCard
                signal="SELL"
                symbol="EUR/USD"
                confidence={71}
                reasoning="ECB divergence from Fed stance widening. EUR risk premium elevated on Eastern European energy dependency concerns."
                delay={0.2}
              />
              <PredictionCard
                signal="WATCH"
                symbol="NVDA"
                confidence={68}
                reasoning="Semiconductor demand robust but Taiwan strait risk creates headline volatility."
                delay={0.3}
              />
            </div>

            {/* Section CTA */}
            <div className="mt-8 text-center">
              <button
                onClick={() => navigate("/register")}
                className="btn-gold px-8 py-3.5 rounded-xl flex items-center gap-2 mx-auto text-sm"
              >
                Activate JARVIS Intelligence
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ─────────────────────────────────────────────────────────── */}
      {/* FEATURES SECTION                                          */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 lg:px-12" style={{ background: BG_DARK }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              Platform Capabilities
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4">
              Everything You Need to{" "}
              <span className="gold-gradient-text">Trade Smarter</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Brain}
              title="AI Copilot (GPT-5.2)"
              description="Probability-scored trade signals with full reasoning chains. Understand why every signal fires, not just what to trade."
              delay={0}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Live Market Intelligence"
              description="Real-time data across ASX, NASDAQ, Forex & Crypto. Consolidated in one terminal with custom filtering and alerts."
              delay={0.05}
            />
            <FeatureCard
              icon={Globe}
              title="Jarvis Global Fusion Engine"
              description="AI narrates global events and translates them into market predictions. Geopolitics → trade signals in seconds."
              delay={0.1}
            />
            <FeatureCard
              icon={Bell}
              title="Price Alerts"
              description="Instant notifications when your targets are hit. Email, push, and SMS delivery with context-aware signal summaries."
              delay={0.15}
            />
            <FeatureCard
              icon={BarChart3}
              title="Portfolio Analytics"
              description="Full P&L tracking, drawdown analysis, and Monte Carlo simulations. Know your risk before you take it."
              delay={0.2}
            />
            <FeatureCard
              icon={Radar}
              title="Geopolitical Radar"
              description="Live tracking of 25+ global macro events. JARVIS scores each event's market impact before it moves prices."
              delay={0.25}
            />
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SOCIAL PROOF SECTION                                      */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12" style={{ background: "#070707" }}>
        <div className="max-w-6xl mx-auto">
          {/* Live trader counter above testimonials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              Social Proof
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              Trusted by{" "}
              <span className="gold-gradient-text">Real Traders</span>
            </h2>
            {/* Live counter */}
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-4"
              style={{ background: `${GOLD}0D`, border: `1px solid ${GOLD}22` }}
            >
              <span
                className="w-2 h-2 rounded-full green-dot-anim flex-shrink-0"
                style={{ background: "#22c55e" }}
              />
              <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
                Join{" "}
                <span className="font-black" style={{ color: GOLD }}>
                  {liveTraderCount.toLocaleString()}
                </span>{" "}
                traders already using JARVIS
              </span>
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-5">
            <TestimonialCard
              name="Alex M."
              role="Independent Trader, Sydney"
              quote="JARVIS caught the Taiwan escalation before Bloomberg even ran the headline. I was positioned 40 minutes early. Game-changing."
              delay={0}
            />
            <TestimonialCard
              name="Sarah K."
              role="Prop Trader, London"
              quote="The geopolitical narrative engine is like having a Bloomberg terminal and a geopolitical analyst rolled into one. Worth every cent."
              delay={0.1}
            />
            <TestimonialCard
              name="David C."
              role="Retail Investor, Melbourne"
              quote="Finally an AI that explains WHY it's suggesting a trade, not just what. The confidence scoring makes it easy to size positions correctly."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ─────────────────────────────────────────────────────────── */}
      {/* PRICING SECTION                                           */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 lg:px-12" style={{ background: BG_DARK }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              Pricing
            </div>
            <h2 className="text-4xl lg:text-5xl font-black mb-4">
              Simple,{" "}
              <span className="gold-gradient-text">Transparent</span>
              {" "}Pricing
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: MUTED }}>
              Start free. Upgrade when you're ready. No hidden fees, no lock-ins.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <PricingCard
              tier="Free"
              price={0}
              period="mo"
              features={[
                "5 AI analyses / day",
                "10 watchlist items",
                "Basic market data",
                "JARVIS intro mode",
              ]}
              ctaLabel="Get Started Free"
              delay={0}
              onCTA={() => navigate("/register")}
            />
            <PricingCard
              tier="Essential"
              price={39}
              period="mo"
              features={[
                "50 AI analyses / day",
                "20 watchlist items",
                "Real-time ASX & Forex data",
                "Price alerts (10/day)",
                "Email support",
              ]}
              delay={0.05}
              onCTA={() => navigate("/register")}
            />
            <PricingCard
              tier="Pro"
              price={99}
              period="mo"
              badge="Most Popular"
              highlight={true}
              features={[
                "Unlimited AI analyses",
                "Unlimited watchlist",
                "All markets incl. Crypto",
                "Jarvis Narrative Engine",
                "Risk Analytics suite",
                "Priority support",
              ]}
              ctaLabel="Start Pro Trial"
              delay={0.1}
              onCTA={() => navigate("/register")}
            />
            <PricingCard
              tier="Elite"
              price={239}
              period="mo"
              features={[
                "Everything in Pro",
                "Geopolitical Radar",
                "API access (500 req/day)",
                "Portfolio backtesting",
                "Monte Carlo simulation",
                "Dedicated account manager",
                "White-glove onboarding",
              ]}
              ctaLabel="Go Elite"
              delay={0.15}
              onCTA={() => navigate("/register")}
            />
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ─────────────────────────────────────────────────────────── */}
      {/* CTA BAND (before footer)                                  */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section
        className="py-16 px-6 lg:px-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #080808 0%, #0a0a0a 100%)",
          borderTop: `1px solid ${GOLD}33`,
        }}
      >
        {/* Subtle gold glow on top border */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${GOLD}60 30%, ${GOLD}90 50%, ${GOLD}60 70%, transparent 100%)`,
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-20 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at top, ${GOLD}12 0%, transparent 70%)`,
          }}
        />
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row items-center justify-between gap-8"
          >
            {/* Left copy */}
            <div className="text-center lg:text-left max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>
                Ready to Trade Smarter?
              </p>
              <h2 className="text-2xl lg:text-3xl font-black leading-tight text-white">
                Ready to let JARVIS trade the world's noise into signals?
              </h2>
            </div>

            {/* Right CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
              <button
                onClick={() => navigate("/register")}
                className="btn-gold px-7 py-3.5 rounded-xl text-sm flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate("/global-fusion")}
                className="btn-ghost px-7 py-3.5 rounded-xl text-sm flex items-center gap-2"
              >
                See Global Fusion Live
                <ArrowRight size={15} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* CONTACT SECTION                                           */}
      {/* ─────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 px-6 lg:px-12" style={{ background: "#070707" }}>
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: GOLD }}>
              Get in Touch
            </div>
            <h2 className="text-4xl font-black">Talk to{" "}<span className="gold-gradient-text">Our Team</span></h2>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={handleContactSubmit}
            className="space-y-4 p-8 rounded-2xl border"
            style={{ background: BG_CARD, borderColor: BORDER }}
          >
            <input
              type="text"
              placeholder="Your Name"
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
              required
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-yellow-600 transition-colors"
              style={{ background: "#0D0D0D", border: `1px solid ${BORDER}` }}
            />
            <input
              type="email"
              placeholder="Email Address"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              required
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-yellow-600 transition-colors"
              style={{ background: "#0D0D0D", border: `1px solid ${BORDER}` }}
            />
            <textarea
              placeholder="Your message..."
              value={contactForm.message}
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              required
              rows={5}
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none focus:border-yellow-600 transition-colors"
              style={{ background: "#0D0D0D", border: `1px solid ${BORDER}` }}
            />
            <button type="submit" className="btn-gold w-full py-3.5 rounded-xl text-sm">
              {contactSubmitted ? "Message Sent ✓" : "Send Message"}
            </button>
          </motion.form>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* FOOTER                                                    */}
      {/* ─────────────────────────────────────────────────────────── */}
      <footer
        className="py-12 px-6 lg:px-12 border-t"
        style={{ background: BG_DARK, borderColor: BORDER }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                  <polygon points="14,2 26,9 26,21 14,28 2,21 2,9" stroke={GOLD} strokeWidth="1.5" fill="none" />
                  <polygon points="14,7 21,11 21,19 14,23 7,19 7,11" stroke={GOLD} strokeWidth="0.8" fill={`${GOLD}15`} />
                  <circle cx="14" cy="15" r="2.5" fill={GOLD} />
                </svg>
                <span className="font-black tracking-tight" style={{ color: GOLD }}>AUREOS AI</span>
              </div>
              <p className="text-sm max-w-xs leading-relaxed" style={{ color: MUTED }}>
                Institutional-grade AI intelligence for retail and professional traders. 
                Powered by GPT-5.2 and proprietary geopolitical data feeds.
              </p>
            </div>
            {/* Product */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MUTED }}>
                Product
              </h4>
              <ul className="space-y-2.5 text-sm">
                {["Features", "Pricing", "JARVIS", "API Docs"].map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-white transition-colors" style={{ color: "#555" }}>
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Company */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MUTED }}>
                Company
              </h4>
              <ul className="space-y-2.5 text-sm">
                {["About", "Blog", "Careers", "Contact"].map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-white transition-colors" style={{ color: "#555" }}>
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t" style={{ borderColor: BORDER }}>
            <p className="text-xs" style={{ color: "#444" }}>
              © {new Date().getFullYear()} Aureos Technologies Pty Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs" style={{ color: "#444" }}>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Disclaimer</a>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" aria-label="Twitter/X" className="hover:opacity-80 transition-opacity">
                <Twitter size={16} style={{ color: "#555" }} />
              </a>
              <a href="#" aria-label="LinkedIn" className="hover:opacity-80 transition-opacity">
                <Linkedin size={16} style={{ color: "#555" }} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
