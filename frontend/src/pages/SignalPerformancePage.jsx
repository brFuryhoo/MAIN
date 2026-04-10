/**
 * SignalPerformancePage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * "Proof it works" page — the Self-Improving Signal Engine's public dashboard.
 *
 * Sections:
 *   1. Hero stats  (4 large KPI cards)
 *   2. Win Rate chart (Recharts LineChart — daily accuracy last 30 d)
 *   3. Signal Leaderboard (top 10 patterns)
 *   4. Recent Hits feed (last 10 HITs)
 *   5. By Signal Type breakdown (BUY / SELL / HOLD)
 *   6. JARVIS Verdict (AI-generated one-liner)
 *
 * Data source: GET /api/signal-learning/performance
 * Mock fallback used when API is unavailable.
 */

import React, { useState, useEffect, useCallback } from 'react';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Award,
  Zap,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { API } from '@/App';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

// ─── MOCK DATA (realistic — used when the API hasn't populated data yet) ────

const MOCK_DATA = {
  period_days:         30,
  total_signals:       847,
  resolved_signals:    791,
  pending_signals:     56,
  overall_win_rate:    68.1,
  overall_accuracy:    74.3,
  best_performing_asset: 'BTC',
  by_signal_type: {
    BUY:  { count: 412, win_rate: 72.3 },
    SELL: { count: 289, win_rate: 64.7 },
    HOLD: { count: 90,  win_rate: 58.9 },
  },
  by_source: {
    jarvis_narrative: { count: 320, win_rate: 71.2, accuracy: 76.1 },
    predictions:      { count: 298, win_rate: 67.4, accuracy: 73.5 },
    global_fusion:    { count: 121, win_rate: 65.3, accuracy: 71.8 },
    copilot:          { count: 52,  win_rate: 61.5, accuracy: 68.2 },
  },
  top_performing_patterns: [
    { key: 'BTC_BUY_risk_on_jarvis_narrative', win_rate: 84.2, accuracy: 89.1, signals: 38, multiplier: 1.42 },
    { key: 'ETH_BUY_risk_on_predictions',       win_rate: 78.6, accuracy: 82.4, signals: 28, multiplier: 1.31 },
    { key: 'NVDA_BUY_risk_on_global_fusion',     win_rate: 76.3, accuracy: 80.7, signals: 19, multiplier: 1.27 },
    { key: 'SOL_BUY_risk_on_predictions',        win_rate: 73.9, accuracy: 78.3, signals: 23, multiplier: 1.22 },
    { key: 'GOLD_BUY_risk_off_jarvis_narrative', win_rate: 71.4, accuracy: 76.0, signals: 14, multiplier: 1.18 },
  ],
  underperforming_patterns: [
    { key: 'XRP_SELL_neutral_copilot',   win_rate: 28.6, accuracy: 34.1, signals: 7,  multiplier: 0.72 },
    { key: 'DOGE_BUY_risk_on_copilot',   win_rate: 31.2, accuracy: 38.4, signals: 9,  multiplier: 0.76 },
  ],
  recent_hits: [
    { signal_id: '1', symbol: 'BTC',  signal: 'BUY',  confidence: 87, entry_price: 67200,  target_price: 71000,  accuracy_score: 96.4, timeframe: '7d',  created_at: new Date(Date.now() - 2*3600*1000).toISOString() },
    { signal_id: '2', symbol: 'ETH',  signal: 'BUY',  confidence: 81, entry_price: 3480,   target_price: 3750,   accuracy_score: 93.1, timeframe: '1d',  created_at: new Date(Date.now() - 5*3600*1000).toISOString() },
    { signal_id: '3', symbol: 'NVDA', signal: 'BUY',  confidence: 76, entry_price: 875.50, target_price: 921.00, accuracy_score: 91.7, timeframe: '7d',  created_at: new Date(Date.now() - 8*3600*1000).toISOString() },
    { signal_id: '4', symbol: 'SOL',  signal: 'SELL', confidence: 72, entry_price: 168.20, target_price: 152.00, accuracy_score: 88.5, timeframe: '4h',  created_at: new Date(Date.now() - 12*3600*1000).toISOString() },
    { signal_id: '5', symbol: 'GOLD', signal: 'BUY',  confidence: 83, entry_price: 2310,   target_price: 2380,   accuracy_score: 87.2, timeframe: '1d',  created_at: new Date(Date.now() - 18*3600*1000).toISOString() },
    { signal_id: '6', symbol: 'AAPL', signal: 'BUY',  confidence: 69, entry_price: 194.30, target_price: 202.50, accuracy_score: 85.8, timeframe: '7d',  created_at: new Date(Date.now() - 24*3600*1000).toISOString() },
    { signal_id: '7', symbol: 'BTC',  signal: 'SELL', confidence: 74, entry_price: 64100,  target_price: 60500,  accuracy_score: 84.3, timeframe: '4h',  created_at: new Date(Date.now() - 30*3600*1000).toISOString() },
    { signal_id: '8', symbol: 'TSLA', signal: 'BUY',  confidence: 66, entry_price: 182.40, target_price: 195.00, accuracy_score: 82.9, timeframe: '7d',  created_at: new Date(Date.now() - 36*3600*1000).toISOString() },
    { signal_id: '9', symbol: 'ETH',  signal: 'SELL', confidence: 71, entry_price: 3720,   target_price: 3480,   accuracy_score: 81.4, timeframe: '1d',  created_at: new Date(Date.now() - 42*3600*1000).toISOString() },
    { signal_id: '10', symbol: 'SPY', signal: 'BUY',  confidence: 64, entry_price: 521.80, target_price: 535.00, accuracy_score: 79.8, timeframe: '1d',  created_at: new Date(Date.now() - 48*3600*1000).toISOString() },
  ],
  confidence_trend: Array.from({ length: 30 }, (_, i) => ({
    date:         new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
    avg_accuracy: Math.round(55 + 20 * Math.sin(i / 6) + i * 0.4 + Math.random() * 6),
  })),
  jarvis_verdict: 'JARVIS achieved 68.1% win rate across 847 signals — predictive edge is compounding.',
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

const GOLD   = '#CFAE46';
const GREEN  = '#00E676';
const RED    = '#FF5252';
const BLUE   = '#00B4FF';
const WHITE  = '#E8E8E8';
const GREY   = '#444';

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

const formatPrice = (val) => {
  if (!val) return '—';
  if (val >= 1000) return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${Number(val).toFixed(2)}`;
};

const parsePatternKey = (key = '') => {
  const parts = key.split('_');
  const source = parts[parts.length - 1];
  const regime = parts[parts.length - 2] + '_' + parts[parts.length - 1];
  // symbol is everything before the signal type
  const signalType = ['BUY', 'SELL', 'HOLD'].find(st => parts.includes(st)) || '';
  const symbolIdx = parts.indexOf(signalType);
  const symbol = symbolIdx > 0 ? parts.slice(0, symbolIdx).join('-') : parts[0];
  return { symbol, signalType, regime: parts.slice(-2).join('_'), source: parts[parts.length - 1] };
};

const TrendArrow = ({ trend }) => {
  if (trend === 'improving') return <ArrowUpRight size={14} style={{ color: GREEN, display: 'inline' }} />;
  if (trend === 'declining') return <ArrowDownRight size={14} style={{ color: RED, display: 'inline' }} />;
  return <Minus size={14} style={{ color: GREY, display: 'inline' }} />;
};

const WinRateBadge = ({ rate }) => {
  const color = rate >= 65 ? GREEN : rate >= 50 ? GOLD : RED;
  return (
    <span style={{ color, fontWeight: 700, fontSize: '0.95rem' }}>
      {rate.toFixed(1)}%
    </span>
  );
};

// Custom tooltip for the line chart
const CustomChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,13,13,0.95)',
      border: `1px solid ${GOLD}33`,
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: 13,
    }}>
      <div style={{ color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ color: GOLD, fontWeight: 700 }}>
        Accuracy: {payload[0]?.value !== null && payload[0]?.value !== undefined
          ? `${payload[0].value.toFixed(1)}`
          : '—'}
      </div>
    </div>
  );
};

// ─── FADE-IN ANIMATION ──────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: 'easeOut' },
};

// ─── SECTION HEADER ─────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {Icon && <Icon size={18} style={{ color: GOLD }} />}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: WHITE, margin: 0, fontFamily: 'Poppins, sans-serif' }}>
        {title}
      </h2>
    </div>
    {subtitle && <p style={{ color: '#666', fontSize: '0.82rem', marginTop: 4, marginLeft: 28 }}>{subtitle}</p>}
  </div>
);

// ─── SKELETON LOADER ────────────────────────────────────────────────────────

const Skeleton = () => (
  <AureosLayout>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aureos-card" style={{ height: 110, animation: 'pulse 2s infinite' }} />
        ))}
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="aureos-card" style={{ height: 200, marginBottom: 24, animation: 'pulse 2s infinite' }} />
      ))}
    </div>
  </AureosLayout>
);

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

const SignalPerformancePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (symbolFilter) params.symbol = symbolFilter.toUpperCase();
      params.days = daysFilter;

      const res = await axios.get(`${API}/signal-learning/performance`, { params, timeout: 12000 });
      setData(res.data);
    } catch (err) {
      // Fall back to rich mock data so the page always looks great
      console.warn('Signal learning API unavailable — using mock data:', err.message);
      setData(MOCK_DATA);
      setError('Live data unavailable — showing demonstration data');
    }
    setLoading(false);
  }, [symbolFilter, daysFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Skeleton />;
  if (!data) return <Skeleton />;

  const {
    total_signals,
    resolved_signals,
    pending_signals,
    overall_win_rate,
    overall_accuracy,
    best_performing_asset,
    by_signal_type = {},
    by_source = {},
    top_performing_patterns = [],
    underperforming_patterns = [],
    recent_hits = [],
    confidence_trend = [],
    jarvis_verdict,
  } = data;

  const winRateColor = overall_win_rate >= 65 ? GREEN : overall_win_rate >= 50 ? GOLD : RED;

  // Filter trend data to remove nulls and format for chart
  const chartData = confidence_trend
    .map(d => ({ ...d, avg_accuracy: d.avg_accuracy ?? null }))
    .slice(-30);

  // ─── RENDER ────────────────────────────────────────────────────────────

  return (
    <AureosLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px 60px' }}>

        {/* PAGE HEADER */}
        <motion.div {...fadeIn} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'Poppins, sans-serif', margin: 0 }}>
              Signal Engine{' '}
              <span className="text-gradient-gold">Performance</span>
            </h1>
            <p style={{ color: '#666', fontSize: '0.88rem', marginTop: 6 }}>
              Every signal JARVIS emits — tracked, scored, and learned from.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="aureos-input"
              style={{ width: 120, padding: '8px 14px', fontSize: 13 }}
              placeholder="Symbol…"
              value={symbolFilter}
              onChange={e => setSymbolFilter(e.target.value.toUpperCase())}
            />
            <select
              className="aureos-input"
              style={{ width: 110, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}
              value={daysFilter}
              onChange={e => setDaysFilter(Number(e.target.value))}
            >
              {[7, 14, 30, 60, 90].map(d => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
            <Button className="aureos-btn-gold" style={{ padding: '8px 18px', fontSize: 13 }} onClick={fetchData}>
              <RefreshCw size={13} style={{ marginRight: 6 }} /> Refresh
            </Button>
          </div>
        </motion.div>

        {error && (
          <div style={{ background: 'rgba(207,174,70,0.08)', border: `1px solid ${GOLD}44`, borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: 13, color: GOLD }}>
            ⚠ {error}
          </div>
        )}

        {/* ── SECTION 1: HERO STATS ─────────────────────────────────────────── */}
        <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.05 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>

          {/* Win Rate */}
          <div className="aureos-card" style={{ padding: '24px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ color: '#666', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 1 }}>Win Rate</span>
              <Target size={18} style={{ color: GOLD }} />
            </div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: winRateColor, lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>
              {overall_win_rate.toFixed(1)}%
            </div>
            <div style={{ color: '#555', fontSize: '0.78rem', marginTop: 8 }}>
              {resolved_signals.toLocaleString()} resolved signals
            </div>
            <div style={{ marginTop: 12, height: 4, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(overall_win_rate, 100)}%`, background: `linear-gradient(90deg, ${GOLD}, ${winRateColor})`, borderRadius: 4 }} />
            </div>
          </div>

          {/* Total Signals */}
          <div className="aureos-card" style={{ padding: '24px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ color: '#666', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 1 }}>Total Signals</span>
              <BarChart3 size={18} style={{ color: BLUE }} />
            </div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: BLUE, lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>
              {total_signals.toLocaleString()}
            </div>
            <div style={{ color: '#555', fontSize: '0.78rem', marginTop: 8 }}>
              {pending_signals} pending resolution
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <span style={{ background: `${GREEN}22`, color: GREEN, padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>
                {resolved_signals} resolved
              </span>
              <span style={{ background: `${GOLD}22`, color: GOLD, padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>
                {pending_signals} pending
              </span>
            </div>
          </div>

          {/* Average Accuracy */}
          <div className="aureos-card" style={{ padding: '24px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ color: '#666', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 1 }}>Avg Accuracy</span>
              <TrendingUp size={18} style={{ color: GREEN }} />
            </div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: GREEN, lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>
              {overall_accuracy.toFixed(1)}
            </div>
            <div style={{ color: '#555', fontSize: '0.78rem', marginTop: 8 }}>
              out of 100 accuracy score
            </div>
            <div style={{ marginTop: 12, height: 4, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(overall_accuracy, 100)}%`, background: `linear-gradient(90deg, #006633, ${GREEN})`, borderRadius: 4 }} />
            </div>
          </div>

          {/* Best Performing Asset */}
          <div className="aureos-card" style={{ padding: '24px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ color: '#666', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: 1 }}>Top Asset</span>
              <Award size={18} style={{ color: GOLD }} />
            </div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: GOLD, lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>
              {best_performing_asset || '—'}
            </div>
            <div style={{ color: '#555', fontSize: '0.78rem', marginTop: 8 }}>
              highest win-rate asset
            </div>
            {top_performing_patterns[0] && (
              <div style={{ marginTop: 12, fontSize: '0.74rem', color: '#555' }}>
                Best pattern: {top_performing_patterns[0].win_rate.toFixed(1)}% win rate
              </div>
            )}
          </div>

        </motion.div>

        {/* ── SECTION 2: WIN RATE TREND CHART ───────────────────────────────── */}
        <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.1 }} className="aureos-card" style={{ padding: '28px 24px', marginBottom: 28 }}>
          <SectionHeader
            icon={TrendingUp}
            title="Accuracy Trend"
            subtitle={`Daily rolling accuracy over the last ${daysFilter} days — watch the self-improvement curve`}
          />

          {chartData.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={v => v ? v.slice(5) : ''}
                    tick={{ fill: '#555', fontSize: 11 }}
                    axisLine={{ stroke: '#222' }}
                    tickLine={false}
                    interval={Math.floor(chartData.length / 6)}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#555', fontSize: 11 }}
                    axisLine={{ stroke: '#222' }}
                    tickLine={false}
                    tickCount={5}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <ReferenceLine y={60} stroke={`${GOLD}44`} strokeDasharray="6 4" label={{ value: '60%', fill: GOLD, fontSize: 10, position: 'right' }} />
                  <Line
                    type="monotone"
                    dataKey="avg_accuracy"
                    stroke={GOLD}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: GOLD, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 13 }}>
              Accumulating signal history…
            </div>
          )}
        </motion.div>

        {/* ── SECTION 3: SIGNAL LEADERBOARD ─────────────────────────────────── */}
        <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.15 }} className="aureos-card" style={{ padding: '28px 24px', marginBottom: 28 }}>
          <SectionHeader
            icon={Award}
            title="Pattern Leaderboard"
            subtitle="Top 10 signal patterns ranked by win rate — these are JARVIS's sharpest edges"
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid #1e1e1e` }}>
                  {['#', 'Pattern', 'Signal', 'Win Rate', 'Accuracy', 'Signals', 'Multiplier', 'Trend'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top_performing_patterns.length > 0 ? top_performing_patterns.slice(0, 10).map((p, idx) => {
                  const { symbol, signalType } = parsePatternKey(p.key);
                  const mult = p.multiplier || 1.0;
                  const trend = mult > 1.05 ? 'improving' : mult < 0.95 ? 'declining' : 'stable';
                  return (
                    <tr key={p.key} style={{ borderBottom: '1px solid #161616', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(207,174,70,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '11px 12px', color: '#555', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#888', background: '#111', padding: '2px 6px', borderRadius: 5 }}>
                          {p.key.length > 36 ? `${p.key.slice(0, 33)}…` : p.key}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{
                          background: signalType === 'BUY' ? `${GREEN}22` : signalType === 'SELL' ? `${RED}22` : `${GOLD}22`,
                          color: signalType === 'BUY' ? GREEN : signalType === 'SELL' ? RED : GOLD,
                          padding: '3px 9px', borderRadius: 20, fontWeight: 700, fontSize: '0.76rem',
                        }}>
                          {signalType || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }}><WinRateBadge rate={p.win_rate} /></td>
                      <td style={{ padding: '11px 12px', color: WHITE }}>{p.accuracy.toFixed(1)}</td>
                      <td style={{ padding: '11px 12px', color: '#888' }}>{p.signals}</td>
                      <td style={{ padding: '11px 12px', color: mult > 1 ? GREEN : mult < 1 ? RED : '#888', fontWeight: 600 }}>
                        ×{mult.toFixed(2)}
                      </td>
                      <td style={{ padding: '11px 12px' }}><TrendArrow trend={trend} /></td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#444', fontSize: 13 }}>
                      Accumulating pattern data — check back after {daysFilter}+ signals are resolved
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── SECTION 4: RECENT HITS FEED ───────────────────────────────────── */}
        <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.2 }}>
          <SectionHeader
            icon={CheckCircle2}
            title="Recent Hits"
            subtitle="Last 10 signals that hit their target — proof the engine is working"
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 14, marginBottom: 28 }}>
            {recent_hits.slice(0, 10).map(hit => {
              const sigColor = hit.signal === 'BUY' ? GREEN : hit.signal === 'SELL' ? RED : GOLD;
              const acc = hit.accuracy_score || 0;
              return (
                <motion.div
                  key={hit.signal_id}
                  className="aureos-card"
                  style={{ padding: '18px 20px' }}
                  whileHover={{ scale: 1.015 }}
                  transition={{ duration: 0.15 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: `${sigColor}22`, color: sigColor,
                        fontWeight: 800, padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem',
                      }}>
                        {hit.symbol}
                      </span>
                      <span style={{
                        background: `${sigColor}11`, color: sigColor,
                        padding: '3px 9px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 700,
                      }}>
                        {hit.signal}
                      </span>
                    </div>
                    <CheckCircle2 size={18} style={{ color: GREEN }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ color: '#555', fontSize: '0.72rem', marginBottom: 2 }}>Entry → Target</div>
                      <div style={{ fontSize: '0.85rem', color: WHITE }}>
                        {formatPrice(hit.entry_price)} → {formatPrice(hit.target_price)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#555', fontSize: '0.72rem', marginBottom: 2 }}>Confidence</div>
                      <div style={{ fontSize: '0.85rem', color: GOLD, fontWeight: 700 }}>{hit.confidence}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ height: 5, background: '#1a1a1a', borderRadius: 5, width: 120, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${acc}%`, background: `linear-gradient(90deg, ${GREEN}88, ${GREEN})`, borderRadius: 5 }} />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 3 }}>
                        Accuracy: <span style={{ color: GREEN, fontWeight: 700 }}>{acc.toFixed(1)}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: '#555' }}>{hit.timeframe} signal</div>
                      <div style={{ fontSize: '0.7rem', color: '#444' }}>{formatDate(hit.created_at)}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {recent_hits.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#444', padding: 40, fontSize: 13 }}>
                No hits yet — signals are being tracked and will appear as they resolve
              </div>
            )}
          </div>
        </motion.div>

        {/* ── SECTION 5: BY SIGNAL TYPE ─────────────────────────────────────── */}
        <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.25 }}>
          <SectionHeader
            icon={BarChart3}
            title="By Signal Type"
            subtitle="Win rate breakdown across BUY, SELL, and HOLD signals"
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {['BUY', 'SELL', 'HOLD'].map(st => {
              const info = by_signal_type[st] || { count: 0, win_rate: 0 };
              const color = st === 'BUY' ? GREEN : st === 'SELL' ? RED : GOLD;
              return (
                <div key={st} className="aureos-card" style={{ padding: '22px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{
                      background: `${color}22`, color,
                      padding: '4px 12px', borderRadius: 20, fontWeight: 800, fontSize: '0.85rem',
                    }}>
                      {st}
                    </span>
                    {st === 'BUY' ? <TrendingUp size={18} style={{ color }} /> :
                     st === 'SELL' ? <TrendingDown size={18} style={{ color }} /> :
                     <Minus size={18} style={{ color }} />}
                  </div>

                  <div style={{ fontSize: '2rem', fontWeight: 900, color, marginBottom: 6, fontFamily: 'Poppins, sans-serif' }}>
                    {info.win_rate.toFixed(1)}%
                  </div>
                  <div style={{ color: '#555', fontSize: '0.78rem', marginBottom: 14 }}>
                    {info.count} signals
                  </div>

                  <div style={{ height: 6, background: '#1a1a1a', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(info.win_rate, 100)}%`,
                      background: `linear-gradient(90deg, ${color}66, ${color})`,
                      borderRadius: 6,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── SECTION 6: JARVIS VERDICT ─────────────────────────────────────── */}
        {jarvis_verdict && (
          <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.3 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(207,174,70,0.06), rgba(207,174,70,0.02))',
              border: `1px solid ${GOLD}55`,
              borderRadius: 16,
              padding: '28px 32px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* decorative glow */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: `linear-gradient(90deg, transparent, ${GOLD}66, transparent)`,
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  background: `${GOLD}22`, borderRadius: 10, padding: '8px 10px',
                  border: `1px solid ${GOLD}44`, flexShrink: 0,
                }}>
                  <Zap size={20} style={{ color: GOLD }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: GOLD, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
                    JARVIS Verdict
                  </div>
                  <p style={{ fontSize: '1.05rem', color: WHITE, fontStyle: 'italic', margin: 0, lineHeight: 1.6, fontFamily: 'Poppins, sans-serif' }}>
                    "{jarvis_verdict}"
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </AureosLayout>
  );
};

export default SignalPerformancePage;
