import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Zap, BarChart2, Wallet,
  ArrowUpRight, ArrowDownRight, RefreshCw, Activity,
  Bot, Target, Globe, Shield, AlertTriangle,
  ChevronRight, Flame, Eye, Brain, Radar,
  Clock, Newspaper, MessageSquare, Volume2, VolumeX,
  Play, Pause, Radio, X, Trophy, ChevronUp, ChevronDown, Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

/* ──────────────────────────────────────────────────────────────
   DASHBOARD — COMMAND CENTER
   ────────────────────────────────────────────────────────────── */

const DashboardPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [pulse, setPulse] = useState([]);
  const [geoRisk, setGeoRisk] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [events, setEvents] = useState([]);
  const [portfolio, setPortfolio] = useState({ positions: [], total_value: 0, total_pnl: 0 });
  const [globalOverview, setGlobalOverview] = useState(null);
  const [fearGreed, setFearGreed] = useState(null);
  const [voiceBriefing, setVoiceBriefing] = useState({ loading: false, ready: false, playing: false, dismissed: false, progress: 0 });
  const [aureosScore, setAureosScore] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const voiceAudioRef = useRef(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchAll(); }, []);

  // Auto-load daily voice briefing on mount
  useEffect(() => {
    const today = new Date().toDateString();
    const lastBriefing = localStorage.getItem('aureos_last_voice_briefing');
    if (lastBriefing === today) return; // Already played today
    loadVoiceBriefing();
  }, []);

  const loadVoiceBriefing = async () => {
    setVoiceBriefing(v => ({ ...v, loading: true }));
    try {
      const resp = await axios.get(`${API}/voice/daily-briefing-audio`, { responseType: 'blob', timeout: 90000 });
      const audioUrl = URL.createObjectURL(new Blob([resp.data], { type: 'audio/mpeg' }));
      if (voiceAudioRef.current) {
        voiceAudioRef.current.src = audioUrl;
        voiceAudioRef.current.onended = () => setVoiceBriefing(v => ({ ...v, playing: false }));
        voiceAudioRef.current.ontimeupdate = () => {
          if (voiceAudioRef.current?.duration) {
            setVoiceBriefing(v => ({ ...v, progress: (voiceAudioRef.current.currentTime / voiceAudioRef.current.duration) * 100 }));
          }
        };
      }
      setVoiceBriefing(v => ({ ...v, loading: false, ready: true }));
      localStorage.setItem('aureos_last_voice_briefing', new Date().toDateString());
    } catch {
      setVoiceBriefing(v => ({ ...v, loading: false }));
    }
  };

  const toggleVoiceBriefing = () => {
    if (!voiceAudioRef.current) return;
    if (voiceBriefing.playing) {
      voiceAudioRef.current.pause();
      setVoiceBriefing(v => ({ ...v, playing: false }));
    } else {
      voiceAudioRef.current.play();
      setVoiceBriefing(v => ({ ...v, playing: true }));
    }
  };

  const dismissVoiceBriefing = () => {
    if (voiceAudioRef.current) voiceAudioRef.current.pause();
    setVoiceBriefing(v => ({ ...v, dismissed: true, playing: false }));
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pulseRes, riskRes, highlightsRes, eventsRes, portfolioRes, globalRes, fgRes, scoreRes, tokenRes] = await Promise.all([
        axios.get(`${API}/intelligence/market-pulse`).catch(() => ({ data: { indicators: [] } })),
        axios.get(`${API}/intelligence/geopolitical-risk`).catch(() => ({ data: null })),
        axios.get(`${API}/intelligence/performance-highlights`).catch(() => ({ data: { highlights: [] } })),
        axios.get(`${API}/intelligence/events-feed`).catch(() => ({ data: { events: [] } })),
        axios.get(`${API}/portfolio`, { headers }).catch(() => ({ data: { positions: [], total_value: 0, total_pnl: 0 } })),
        axios.get(`${API}/intelligence/global-overview`).catch(() => ({ data: null })),
        axios.get(`${API}/quantica/fear-greed`).catch(() => ({ data: null })),
        axios.get(`${API}/score/my-score`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API}/tokens/balance`, { headers }).catch(() => ({ data: null })),
      ]);
      setPulse(pulseRes.data.indicators || []);
      setGeoRisk(riskRes.data);
      setHighlights(highlightsRes.data.highlights || []);
      setEvents(eventsRes.data.events || []);
      setPortfolio(portfolioRes.data);
      setGlobalOverview(globalRes.data);
      setFearGreed(fgRes.data);
      setAureosScore(scoreRes.data);
      setTokenBalance(tokenRes.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const res = await axios.get(`${API}/intelligence/daily-briefing`, { timeout: 60000 });
      setBriefing(res.data);
    } catch { toast.error('Failed to load briefing'); }
    setBriefingLoading(false);
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const fmt = (v, d = 2) => {
    if (v == null) return '$0.00';
    return v < 1 && v > -1
      ? `$${v.toFixed(4)}`
      : `$${v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;
  };
  const fmtLarge = (v) => {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return fmt(v);
  };
  const fmtPct = (v) => `${v >= 0 ? '+' : ''}${v?.toFixed(2) ?? '0.00'}%`;

  // Portfolio donut data
  const assetTypes = {};
  portfolio.positions?.forEach(p => {
    const t = p.asset_type || 'other';
    assetTypes[t] = (assetTypes[t] || 0) + (p.current_value || p.quantity * p.avg_price);
  });
  const donutData = Object.entries(assetTypes).map(([name, value]) => ({ name, value: Math.round(value) }));
  const DONUT_COLORS = ['#CFAE46', '#00B4FF', '#00E676', '#FF9800', '#9C27B0', '#FF5252'];

  if (loading) {
    return (
      <AureosLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <RefreshCw className="animate-spin text-aureos-gold mx-auto mb-4" size={40} />
            <p className="text-[#888]">Initializing JARVIS Intelligence Core...</p>
          </div>
        </div>
      </AureosLayout>
    );
  }

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="dashboard-page">

        {/* Hidden audio element for voice briefing */}
        <audio ref={voiceAudioRef} className="hidden" />

        {/* ── DAILY VOICE BRIEFING BANNER ── */}
        <AnimatePresence>
          {!voiceBriefing.dismissed && (voiceBriefing.loading || voiceBriefing.ready) && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(0,180,255,0.08), rgba(207,174,70,0.05))' }}
              data-testid="voice-briefing-banner"
            >
              <div className="px-5 py-3 flex items-center gap-4 border border-[#00B4FF]/20 rounded-xl relative">
                {/* Animated waveform icon */}
                <div className="w-10 h-10 rounded-full bg-[#00B4FF]/15 flex items-center justify-center flex-shrink-0">
                  {voiceBriefing.loading ? (
                    <RefreshCw size={18} className="text-[#00B4FF] animate-spin" />
                  ) : voiceBriefing.playing ? (
                    <Volume2 size={18} className="text-[#00B4FF] animate-pulse" />
                  ) : (
                    <Radio size={18} className="text-[#00B4FF]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#00B4FF] flex items-center gap-2">
                    JARVIS Daily Voice Briefing
                    <span className="text-[9px] bg-[#00B4FF]/15 text-[#00B4FF] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                      {voiceBriefing.loading ? 'Generating...' : voiceBriefing.playing ? 'Live' : 'Ready'}
                    </span>
                  </p>
                  <p className="text-[11px] text-[#888] mt-0.5">
                    {voiceBriefing.loading
                      ? 'JARVIS is preparing your personalized morning market briefing...'
                      : 'Your 60-second market intelligence briefing is ready'}
                  </p>
                  {/* Progress bar */}
                  {voiceBriefing.ready && (
                    <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#00B4FF]"
                        style={{ width: `${voiceBriefing.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {voiceBriefing.ready && (
                    <Button onClick={toggleVoiceBriefing} size="sm"
                      className="bg-[#00B4FF]/20 hover:bg-[#00B4FF]/30 text-[#00B4FF] border border-[#00B4FF]/30 px-4"
                      data-testid="voice-briefing-play-btn"
                    >
                      {voiceBriefing.playing ? <Pause size={14} className="mr-1.5" /> : <Play size={14} className="mr-1.5" />}
                      {voiceBriefing.playing ? 'Pause' : 'Play'}
                    </Button>
                  )}
                  <button onClick={dismissVoiceBriefing} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" data-testid="voice-briefing-dismiss-btn">
                    <X size={14} className="text-[#666]" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SENTIMENT BANNER ── */}
        {briefing?.sentiment && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl px-5 py-3 flex items-center justify-center gap-3 font-semibold text-sm tracking-wider uppercase"
            style={{
              background: `linear-gradient(90deg, ${briefing.sentiment_color}15, transparent, ${briefing.sentiment_color}15)`,
              border: `1px solid ${briefing.sentiment_color}30`,
              color: briefing.sentiment_color
            }}
            data-testid="sentiment-banner"
          >
            <Shield size={16} />
            JARVIS Global Sentiment: {briefing.sentiment}
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: briefing.sentiment_color }} />
          </motion.div>
        )}

        {/* ── GREETING + DATE ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl font-bold font-['Poppins']"
            >
              {greeting}, <span className="text-gradient-gold">{user?.full_name?.split(' ')[0]}</span>
            </motion.h1>
            <p className="text-[#666] mt-1 flex items-center gap-2">
              <Clock size={14} /> {dateStr}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* Aureos Score Badge */}
            {aureosScore && (
              <div className="rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer hover:border-[#CFAE46]/30 transition-all"
                style={{ background: (aureosScore.tier?.color || '#CFAE46') + '12', border: `1px solid ${(aureosScore.tier?.color || '#CFAE46')}25` }}
                onClick={() => navigate('/leaderboard')} data-testid="dashboard-aureos-score">
                <div className="relative">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <circle cx="20" cy="20" r="16" fill="none" stroke={aureosScore.tier?.color || '#CFAE46'} strokeWidth="3"
                      strokeDasharray={`${(aureosScore.score / 1000) * 100.5} 100.5`} strokeLinecap="round" />
                  </svg>
                  <Trophy size={12} className="absolute inset-0 m-auto" style={{ color: aureosScore.tier?.color || '#CFAE46' }} />
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-[#888]">Aureos Score</p>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-sm font-bold" style={{ color: aureosScore.tier?.color || '#CFAE46' }}>{aureosScore.score}</span>
                    {aureosScore.delta !== 0 && (
                      <span className={`text-[9px] font-mono ${aureosScore.delta > 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                        {aureosScore.delta > 0 ? '+' : ''}{aureosScore.delta}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Aureos Token Badge */}
            {tokenBalance && (
              <div className="rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer hover:border-aureos-gold/30 transition-all"
                style={{ background: '#CFAE4612', border: '1px solid #CFAE4625' }}
                onClick={() => navigate('/aureos-tokens')} data-testid="dashboard-token-balance">
                <Coins size={16} className="text-aureos-gold" />
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-[#888]">Tokens</p>
                  <p className="font-mono text-sm font-bold text-aureos-gold">{(tokenBalance.balance || 0).toLocaleString()} AT</p>
                </div>
              </div>
            )}
            {/* Fear & Greed Badge */}
            {fearGreed && (
              <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: fearGreed.color + '12', border: `1px solid ${fearGreed.color}25` }} data-testid="dashboard-fear-greed">
                <span className="font-mono text-lg font-bold" style={{ color: fearGreed.color }}>{fearGreed.composite_score}</span>
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-[#888]">Fear & Greed</p>
                  <p className="text-[10px] font-bold" style={{ color: fearGreed.color }}>{fearGreed.label}</p>
                </div>
              </div>
            )}
            <Button onClick={loadBriefing} disabled={briefingLoading} className="aureos-btn-gold" data-testid="load-briefing-btn">
              {briefingLoading ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Brain size={16} className="mr-2" />}
              {briefingLoading ? 'Analyzing...' : 'Daily Intelligence'}
            </Button>
            <Button onClick={() => navigate('/analysis')} className="aureos-btn-blue" data-testid="start-analysis-btn">
              <Zap size={16} className="mr-2" /> New Analysis
            </Button>
          </div>
        </div>

        {/* ── GLOBAL MARKET OVERVIEW BAR ── */}
        {globalOverview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aureos-glass px-5 py-3 flex items-center gap-6 overflow-x-auto text-[11px]" data-testid="global-overview-bar">
            <span className="text-[9px] text-[#888] uppercase tracking-wider font-semibold whitespace-nowrap">Global Markets</span>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-[#666]">Equities:</span>
              <span className="font-mono font-bold text-aureos-gold">${(globalOverview.global_equity_market_cap / 1e12).toFixed(0)}T</span>
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-[#666]">Crypto:</span>
              <span className="font-mono font-bold text-[#00B4FF]">
                {globalOverview.crypto_market_cap > 0 ? `$${(globalOverview.crypto_market_cap / 1e12).toFixed(2)}T` : '$2.9T'}
              </span>
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-[#666]">Gold:</span>
              <span className="font-mono font-bold text-[#CFAE46]">${(globalOverview.gold_market_cap / 1e12).toFixed(0)}T</span>
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-[#666]">FX Daily:</span>
              <span className="font-mono font-bold text-[#00E676]">${(globalOverview.global_forex_daily_volume / 1e12).toFixed(1)}T</span>
            </div>
            {globalOverview.btc_dominance > 0 && (
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-[#666]">BTC Dom:</span>
                <span className="font-mono font-bold text-[#FF9800]">{globalOverview.btc_dominance.toFixed(1)}%</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── TOP ROW: PORTFOLIO + MARKET PULSE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Portfolio Overview */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-5">
            <div className="aureos-card p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
                  <Wallet size={14} className="text-aureos-gold" /> My Portfolio
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/portfolio')} className="text-aureos-gold hover:bg-[#CFAE46]/10 text-xs" data-testid="view-portfolio-btn">
                  View All <ChevronRight size={14} />
                </Button>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <p className="text-3xl font-bold font-mono tracking-tight" data-testid="portfolio-value">
                    {fmtLarge(portfolio.total_value || 100000)}
                  </p>
                  <p className={`text-sm font-semibold mt-1 flex items-center gap-1 ${(portfolio.total_pnl || 0) >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                    {(portfolio.total_pnl || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {fmt(Math.abs(portfolio.total_pnl || 5200))} ({fmtPct(portfolio.total_pnl_percent || 5.2)})
                  </p>

                  {/* Asset breakdown */}
                  <div className="mt-4 space-y-2">
                    {donutData.length > 0 ? donutData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="text-[#888] capitalize">{d.name}</span>
                        <span className="ml-auto font-mono font-semibold">{fmtLarge(d.value)}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-[#666]">Add positions to track your portfolio</p>
                    )}
                  </div>
                </div>

                {/* Donut Chart */}
                {donutData.length > 0 && (
                  <div className="w-28 h-28 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                          {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmtLarge(v)} contentStyle={{ background: '#161718', border: '1px solid rgba(207,174,70,0.2)', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Market Pulse */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-7">
            <div className="aureos-card p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
                  <Activity size={14} className="text-aureos-gold" /> Market Pulse
                </h2>
                <button onClick={fetchAll} className="text-[#666] hover:text-aureos-gold transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {pulse.slice(0, 10).map((p, i) => (
                  <motion.div key={p.symbol} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#CFAE46]/20 transition-all group cursor-default"
                    data-testid={`pulse-${p.symbol.replace(/[^a-zA-Z0-9]/g, '')}`}
                  >
                    <p className="text-[10px] text-[#666] uppercase tracking-wider truncate">{p.symbol}</p>
                    <p className="text-sm font-mono font-bold mt-0.5 group-hover:text-aureos-gold transition-colors">
                      {p.value >= 1000 ? p.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : p.value.toFixed(p.value < 10 ? 4 : 2)}
                    </p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${p.change >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                      {fmtPct(p.change)}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── DAILY INTELLIGENCE BRIEFING ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="aureos-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
                <Newspaper size={14} className="text-aureos-gold" /> Intelligence of the Day
              </h2>
              {briefing && (
                <span className="text-[10px] text-[#666]">Generated {new Date(briefing.generated_at).toLocaleTimeString()}</span>
              )}
            </div>
            {briefing ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-[#ccc] leading-relaxed whitespace-pre-wrap text-sm" data-testid="daily-briefing-text">
                  {briefing.briefing}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="mx-auto mb-3 text-[#444]" size={36} />
                <p className="text-[#666] text-sm">Click <strong className="text-aureos-gold">Daily Intelligence</strong> to generate your AI briefing</p>
                <p className="text-[10px] text-[#555] mt-1">Powered by JARVIS AI Quantica · GPT-5.2</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── MIDDLE ROW: OSINT MONITOR + EVENTS FEED ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* OSINT Geopolitical Risk Monitor */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-7">
            <div className="aureos-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
                  <Globe size={14} className="text-aureos-gold" /> OSINT Geopolitical Risk Monitor
                </h2>
                {geoRisk && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#888] uppercase">Global Risk</span>
                    <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded-lg ${
                      geoRisk.global_risk_score > 60 ? 'bg-[#FF5252]/15 text-[#FF5252]' :
                      geoRisk.global_risk_score > 40 ? 'bg-[#FF9800]/15 text-[#FF9800]' :
                      'bg-[#00E676]/15 text-[#00E676]'
                    }`} data-testid="global-risk-score">
                      {geoRisk.global_risk_score}
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {geoRisk?.regions?.map((r) => (
                  <motion.div key={r.id} whileHover={{ scale: 1.02 }}
                    className="p-3 rounded-xl border transition-all cursor-default"
                    style={{
                      borderColor: riskColor(r.risk_score) + '30',
                      background: riskColor(r.risk_score) + '08',
                    }}
                    data-testid={`risk-region-${r.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#888]">{r.name.split('/')[0].trim()}</span>
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: riskColor(r.risk_score) }} />
                    </div>
                    <p className="font-mono text-xl font-bold" style={{ color: riskColor(r.risk_score) }}>{r.risk_score}</p>
                    <p className="text-[10px] text-[#666] uppercase mt-1">{r.risk_level}</p>
                    <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${r.risk_score}%`, background: riskColor(r.risk_score) }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Events Feed */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-5">
            <div className="aureos-card p-6 h-full max-h-[420px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={14} className="text-aureos-gold" /> Live Events Feed
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/intelligence')} className="text-aureos-gold hover:bg-[#CFAE46]/10 text-xs">
                  Full Map <ChevronRight size={14} />
                </Button>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {events.slice(0, 8).map((ev, i) => (
                  <motion.div key={ev.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
                    data-testid={`event-${ev.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        <SeverityDot severity={ev.severity} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-tight">{ev.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-[#888]">{ev.category}</span>
                          <span className="text-[9px] text-[#555]">{ev.timestamp}</span>
                        </div>
                        {ev.impact && <p className="text-[10px] text-[#00E676] mt-1">{ev.impact}</p>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── PERFORMANCE HIGHLIGHTS ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="aureos-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
                <Flame size={14} className="text-aureos-gold" /> Performance Highlights
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/portfolio')} className="text-aureos-gold hover:bg-[#CFAE46]/10 text-xs">
                My Portfolio <ChevronRight size={14} />
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="performance-highlights-table">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-[10px] text-[#666] uppercase tracking-wider py-2 pr-4">Asset</th>
                    <th className="text-left text-[10px] text-[#666] uppercase tracking-wider py-2 pr-4">Sector</th>
                    <th className="text-right text-[10px] text-[#666] uppercase tracking-wider py-2">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {highlights.map((h, i) => (
                    <motion.tr key={h.asset} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.03 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold" style={{
                            background: h.performance > 100 ? '#CFAE46' + '20' : h.performance > 50 ? '#00E676' + '15' : '#00B4FF' + '15',
                            color: h.performance > 100 ? '#CFAE46' : h.performance > 50 ? '#00E676' : '#00B4FF'
                          }}>
                            {sectorIcon(h.sector)}
                          </div>
                          <span className="font-mono font-semibold">{h.asset}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-[10px] uppercase tracking-wider text-[#666] px-2 py-0.5 rounded bg-white/5">
                          {h.sector.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="font-mono font-bold text-[#00E676]">+{h.performance.toFixed(2)}%</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* ── QUICK ACTIONS ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="aureos-glass p-5">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'New Analysis', icon: Zap, path: '/analysis', color: '#CFAE46' },
                { label: 'AI Copilot', icon: Bot, path: '/copilot', color: '#00B4FF' },
                { label: 'Intel Map', icon: Globe, path: '/intelligence', color: '#FF9800' },
                { label: 'Scanner', icon: Radar, path: '/scanner', color: '#9C27B0' },
                { label: 'Aureos Score', icon: Trophy, path: '/leaderboard', color: '#CFAE46' },
                { label: 'Watchlist', icon: Eye, path: '/watchlist', color: '#FF5252' },
              ].map((a) => {
                const Icon = a.icon;
                return (
                  <Button key={a.label} onClick={() => navigate(a.path)}
                    className="h-auto py-4 flex flex-col items-center gap-2 bg-white/[0.03] hover:bg-white/[0.08] border border-transparent hover:border-white/10 transition-all"
                    data-testid={`quick-action-${a.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Icon size={20} style={{ color: a.color }} />
                    <span className="text-xs">{a.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </motion.div>

        <JarvisCopilot />
      </div>
    </AureosLayout>
  );
};

/* ── HELPERS ── */
const riskColor = (score) =>
  score > 80 ? '#FF5252' : score > 60 ? '#FF9800' : score > 40 ? '#CFAE46' : '#00E676';

const SeverityDot = ({ severity }) => {
  const color = severity === 'critical' ? '#FF5252' : severity === 'high' ? '#FF9800' : severity === 'medium' ? '#CFAE46' : '#888';
  return <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />;
};

const sectorIcon = (sector) => {
  if (sector.includes('crypto')) return 'C';
  if (sector.includes('br')) return 'BR';
  if (sector.includes('eu')) return 'EU';
  return 'US';
};

export default DashboardPage;
