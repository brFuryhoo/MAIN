import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion } from 'framer-motion';
import {
  Radar, TrendingUp, TrendingDown, Activity, BarChart2,
  ArrowUpRight, ArrowDownRight, RefreshCw, Volume2,
  Flame, Zap, Eye, MessageSquare, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const MarketRadarPage = () => {
  const [data, setData] = useState(null);
  const [fearGreed, setFearGreed] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [signals, setSignals] = useState([]);
  const [correlation, setCorrelation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('radar');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [radarRes, fgRes, anomRes, sigRes, corrRes] = await Promise.all([
        axios.get(`${API}/quantica/market-radar`).catch(() => ({ data: null })),
        axios.get(`${API}/quantica/fear-greed`).catch(() => ({ data: null })),
        axios.get(`${API}/quantica/anomalies`).catch(() => ({ data: { anomalies: [] } })),
        axios.get(`${API}/quantica/trading-signals`).catch(() => ({ data: { signals: [] } })),
        axios.get(`${API}/quantica/correlation-matrix`).catch(() => ({ data: null })),
      ]);
      setData(radarRes.data);
      setFearGreed(fgRes.data);
      setAnomalies(anomRes.data?.anomalies || []);
      setSignals(sigRes.data?.signals || []);
      setCorrelation(corrRes.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const TABS = [
    { id: 'radar', label: 'Market Radar', icon: Radar },
    { id: 'signals', label: 'AI Signals', icon: Zap },
    { id: 'anomalies', label: 'Anomaly Detector', icon: AlertTriangle },
    { id: 'correlation', label: 'Correlation Matrix', icon: BarChart2 },
  ];

  if (loading) {
    return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><Radar className="animate-spin text-aureos-gold" size={48} /></div></AureosLayout>;
  }

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="market-radar-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins']"><span className="text-gradient-gold">AI Quantica Engine</span></h1>
            <p className="text-[#666] mt-1">Live market radar, AI signals, anomaly detection & correlation analysis</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Fear & Greed Badge */}
            {fearGreed && (
              <div className="rounded-xl px-4 py-2 flex items-center gap-2" style={{ background: fearGreed.color + '15', border: `1px solid ${fearGreed.color}30` }} data-testid="fear-greed-badge">
                <span className="font-mono text-lg font-bold" style={{ color: fearGreed.color }}>{fearGreed.composite_score}</span>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#888]">Fear & Greed</p>
                  <p className="text-xs font-bold" style={{ color: fearGreed.color }}>{fearGreed.label}</p>
                </div>
              </div>
            )}
            <Button onClick={fetchAll} className="aureos-btn-gold" data-testid="refresh-radar-btn">
              <RefreshCw size={16} className="mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === t.id ? 'bg-aureos-gold/20 text-aureos-gold border border-aureos-gold/30' : 'bg-white/[0.03] text-[#888] border border-white/5 hover:bg-white/[0.06]'
                }`} data-testid={`tab-${t.id}`}>
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ═══ TAB: MARKET RADAR ═══ */}
        {activeTab === 'radar' && data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Biggest Gainers */}
              <div className="aureos-card p-6">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#00E676]" /> Biggest Gainers
                </h2>
                <div className="space-y-2">
                  {data.biggest_gainers?.map((g, i) => (
                    <motion.div key={g.symbol} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#00E676]/[0.03] border border-[#00E676]/10 hover:border-[#00E676]/20 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-[#00E676]/15 flex items-center justify-center text-[10px] font-bold text-[#00E676]">{i+1}</span>
                        <div>
                          <p className="font-mono font-bold text-sm">{g.symbol}</p>
                          <p className="text-[9px] text-[#666] uppercase">{g.sector.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-[#00E676]">+{g.change.toFixed(1)}%</p>
                        <p className="text-[9px] text-[#888]">Vol: {g.volume_ratio.toFixed(1)}x</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Biggest Losers */}
              <div className="aureos-card p-6">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingDown size={14} className="text-[#FF5252]" /> Biggest Losers
                </h2>
                <div className="space-y-2">
                  {data.biggest_losers?.map((l, i) => (
                    <motion.div key={l.symbol} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#FF5252]/[0.03] border border-[#FF5252]/10 hover:border-[#FF5252]/20 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-[#FF5252]/15 flex items-center justify-center text-[10px] font-bold text-[#FF5252]">{i+1}</span>
                        <div>
                          <p className="font-mono font-bold text-sm">{l.symbol}</p>
                          <p className="text-[9px] text-[#666] uppercase">{l.sector.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-[#FF5252]">{l.change.toFixed(1)}%</p>
                        <p className="text-[9px] text-[#888]">Vol: {l.volume_ratio.toFixed(1)}x</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Unusual Volume + Trending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="aureos-card p-6">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-aureos-gold" /> Unusual Volume
                </h2>
                <div className="space-y-2">
                  {data.unusual_volume?.map((v, i) => (
                    <div key={v.symbol} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm">{v.symbol}</span>
                        <span className="text-aureos-gold font-mono font-bold">{v.volume_ratio}x</span>
                      </div>
                      <p className="text-[10px] text-[#888] mt-1">{v.signal}</p>
                      <p className="text-[9px] text-[#555]">Avg: {v.avg_volume} → Current: {v.current_volume}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="aureos-card p-6">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Flame size={14} className="text-aureos-gold" /> Trending (Social)
                </h2>
                <div className="space-y-2">
                  {data.trending?.map((t, i) => (
                    <div key={t.symbol} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-sm">{t.symbol}</p>
                        <p className="text-[9px] text-[#888]">{(t.mentions/1000).toFixed(1)}K mentions</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${t.sentiment > 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                          {t.sentiment > 0 ? '+' : ''}{t.sentiment.toFixed(2)}
                        </p>
                        <p className={`text-[9px] ${t.trend === 'rising' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>{t.trend}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: AI SIGNALS ═══ */}
        {activeTab === 'signals' && (
          <div className="aureos-card p-6">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={14} className="text-aureos-gold" /> AI Trading Signals — JARVIS Quantica
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="signals-table">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-[#666] uppercase">
                    <th className="text-left pb-3">Asset</th>
                    <th className="text-left pb-3">Signal</th>
                    <th className="text-right pb-3">Confidence</th>
                    <th className="text-right pb-3">Entry</th>
                    <th className="text-right pb-3">Stop Loss</th>
                    <th className="text-right pb-3">Target</th>
                    <th className="text-right pb-3">R/R</th>
                    <th className="text-left pb-3">Key Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s, i) => (
                    <motion.tr key={s.symbol} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{s.symbol}</span>
                          <span className="text-[8px] text-[#666] uppercase px-1 py-0.5 bg-white/5 rounded">{s.timeframe}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <SignalBadge signal={s.signal} />
                      </td>
                      <td className="py-3 text-right">
                        <span className={`font-mono font-bold ${s.confidence >= 80 ? 'text-[#00E676]' : s.confidence >= 65 ? 'text-aureos-gold' : 'text-[#888]'}`}>
                          {s.confidence}%
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-xs">${s.entry.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-xs text-[#FF5252]">${s.stop_loss.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-xs text-[#00E676]">${s.target.toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <span className={`font-mono font-bold ${s.risk_reward >= 2 ? 'text-[#00E676]' : 'text-[#888]'}`}>{s.risk_reward}:1</span>
                      </td>
                      <td className="py-3 text-xs text-[#888] max-w-[200px] truncate">{s.reasons[0]}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TAB: ANOMALY DETECTOR ═══ */}
        {activeTab === 'anomalies' && (
          <div className="space-y-3">
            {anomalies.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="aureos-card p-5" data-testid={`anomaly-${a.id}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    a.severity === 'critical' ? 'bg-[#FF5252]/15' : a.severity === 'high' ? 'bg-[#FF9800]/15' : 'bg-aureos-gold/15'
                  }`}>
                    <AnomalyIcon type={a.type} severity={a.severity} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{a.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xs text-aureos-gold">{a.asset}</span>
                          <SeverityBadge severity={a.severity} />
                          <span className="text-[9px] text-[#555]">{a.detected_at}</span>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-aureos-gold">{a.confidence}%</span>
                    </div>
                    <p className="text-xs text-[#888] mt-2 leading-relaxed">{a.detail}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ═══ TAB: CORRELATION MATRIX ═══ */}
        {activeTab === 'correlation' && correlation && (
          <div className="aureos-card p-6 overflow-x-auto">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart2 size={14} className="text-aureos-gold" /> Asset Correlation Matrix
            </h2>
            <table className="w-full" data-testid="correlation-matrix">
              <thead>
                <tr>
                  <th className="p-2 text-[10px] text-[#888]"></th>
                  {correlation.assets.map(a => (
                    <th key={a} className="p-2 text-[10px] text-[#888] font-mono">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlation.assets.map(row => (
                  <tr key={row}>
                    <td className="p-2 text-[10px] text-[#888] font-mono font-bold">{row}</td>
                    {correlation.assets.map(col => {
                      const val = correlation.matrix[row]?.[col] || 0;
                      return (
                        <td key={col} className="p-1">
                          <div className="w-full h-8 rounded flex items-center justify-center text-[10px] font-mono font-bold"
                            style={{
                              background: corrColor(val) + '25',
                              color: corrColor(val),
                              border: `1px solid ${corrColor(val)}20`
                            }}>
                            {val.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-[#888]">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#FF5252]/25" /> Negative</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#888]/25" /> Neutral</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#00E676]/25" /> Positive</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-aureos-gold/25" /> High</span>
            </div>
          </div>
        )}

        <JarvisCopilot />
      </div>
    </AureosLayout>
  );
};

/* ── HELPERS ── */
const SignalBadge = ({ signal }) => {
  const colors = {
    'STRONG BUY': { bg: '#00E676', text: '#00E676' },
    'BUY': { bg: '#8BC34A', text: '#8BC34A' },
    'HOLD': { bg: '#FF9800', text: '#FF9800' },
    'SELL': { bg: '#FF5252', text: '#FF5252' },
    'STRONG SELL': { bg: '#B71C1C', text: '#B71C1C' },
  };
  const c = colors[signal] || colors['HOLD'];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase" style={{ background: c.bg + '15', color: c.text }}>
      {signal}
    </span>
  );
};

const SeverityBadge = ({ severity }) => {
  const c = severity === 'critical' ? '#FF5252' : severity === 'high' ? '#FF9800' : '#CFAE46';
  return <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: c + '15', color: c }}>{severity}</span>;
};

const AnomalyIcon = ({ type, severity }) => {
  const c = severity === 'critical' ? '#FF5252' : severity === 'high' ? '#FF9800' : '#CFAE46';
  if (type === 'whale_activity') return <Eye size={18} style={{ color: c }} />;
  if (type === 'volume_spike') return <Activity size={18} style={{ color: c }} />;
  if (type === 'options_unusual') return <Zap size={18} style={{ color: c }} />;
  return <AlertTriangle size={18} style={{ color: c }} />;
};

const corrColor = (v) => {
  if (v >= 0.8) return '#CFAE46';
  if (v >= 0.5) return '#00E676';
  if (v >= 0) return '#888';
  return '#FF5252';
};

export default MarketRadarPage;
