import React, { useState, useCallback, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Loader2, TrendingUp, TrendingDown, Play, Shield,
  ArrowUpRight, ArrowDownRight, Activity, Zap, AlertTriangle,
  Search, Filter, ChevronRight, MessageSquare, Send,
  Flame, Radio, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { WorldMap } from '@/components/maps/WorldMap';

/* ══════════════════════════════════════════════════════════════════
   GLOBAL INTELLIGENCE TERMINAL — PHASE 2
   ══════════════════════════════════════════════════════════════════ */

const CATEGORIES = ['all', 'geopolitics', 'macro', 'crypto', 'commodity', 'terrorism', 'climate', 'politics', 'crime'];

const CATEGORY_COLORS = {
  geopolitics: '#FF5252',
  macro: '#00B4FF',
  crypto: '#CFAE46',
  commodity: '#FF9800',
  terrorism: '#FF1744',
  climate: '#00E676',
  politics: '#9C27B0',
  crime: '#FF6E40',
};

const IntelMapPage = () => {
  const { token } = useAuth();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [geoRisk, setGeoRisk] = useState(null);
  const [events, setEvents] = useState([]);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [scenarioQ, setScenarioQ] = useState('');
  const [scenarioResult, setScenarioResult] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [intelMapData, setIntelMapData] = useState(null);
  const [intelMapLoading, setIntelMapLoading] = useState(false);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [riskRes, eventsRes] = await Promise.all([
        axios.get(`${API}/intelligence/geopolitical-risk`),
        axios.get(`${API}/intelligence/events-feed`),
      ]);
      setGeoRisk(riskRes.data);
      setEvents(eventsRes.data.events || []);
    } catch { toast.error('Failed to load intelligence data'); }
    setLoading(false);
  };

  const loadIntelMap = async () => {
    setIntelMapLoading(true);
    try {
      const res = await axios.get(`${API}/intelligence/map`, { headers, timeout: 120000 });
      setIntelMapData(res.data);
      toast.success(`Map complete! ${res.data.assets?.length || 0} assets analyzed`);
    } catch { toast.error('Failed to load intelligence map'); }
    setIntelMapLoading(false);
  };

  const submitScenario = async () => {
    if (!scenarioQ.trim()) return;
    setScenarioLoading(true);
    setScenarioResult(null);
    try {
      const res = await axios.post(`${API}/intelligence/scenario-analysis`, {
        question: scenarioQ,
        portfolio_context: []
      }, { timeout: 60000 });
      setScenarioResult(res.data);
    } catch { toast.error('Failed to run scenario analysis'); }
    setScenarioLoading(false);
  };

  const filteredEvents = activeCategory === 'all' ? events : events.filter(e => e.category === activeCategory);

  // Calculate overall sentiment
  const globalRisk = geoRisk?.global_risk_score || 50;
  const sentimentLabel = globalRisk > 70 ? 'HIGH ALERT' : globalRisk > 55 ? 'SLIGHTLY CAUTIOUS' : globalRisk > 35 ? 'NEUTRAL' : 'OPTIMISTIC';
  const sentimentColor = globalRisk > 70 ? '#FF5252' : globalRisk > 55 ? '#FF9800' : globalRisk > 35 ? '#888' : '#00E676';

  if (loading) {
    return (
      <AureosLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Globe className="animate-spin text-aureos-gold" size={48} />
        </div>
      </AureosLayout>
    );
  }

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="intel-map-page">

        {/* ── HEADER + SENTIMENT ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins'] flex items-center gap-3">
              <Globe className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Global Intelligence Terminal</span>
            </h1>
            <p className="text-[#666] mt-1">Real-time geopolitical intelligence, capital flows & scenario analysis</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sentiment Banner */}
            <div className="rounded-xl px-4 py-2 flex items-center gap-2 font-semibold text-sm tracking-wider uppercase"
              style={{ background: sentimentColor + '15', border: `1px solid ${sentimentColor}30`, color: sentimentColor }}
              data-testid="intel-sentiment-banner"
            >
              <Shield size={14} />
              {sentimentLabel}
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: sentimentColor }} />
            </div>
            <Button onClick={loadIntelMap} disabled={intelMapLoading} className="aureos-btn-gold" data-testid="load-map-btn">
              {intelMapLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Play size={16} className="mr-2" />}
              {intelMapLoading ? 'Scanning...' : 'Deep Scan'}
            </Button>
          </div>
        </div>

        {/* ── WORLD MAP + RISK PANEL ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* SVG World Map */}
          <div className="lg:col-span-8">
            <div className="aureos-card p-6 relative overflow-hidden">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Radio size={14} className="text-aureos-gold" /> Global Risk Map
              </h2>
              <div className="relative" style={{ minHeight: '380px' }}>
                <WorldMap regions={geoRisk?.regions || []} onRegionClick={setSelectedRegion} selectedRegion={selectedRegion} />
              </div>
            </div>
          </div>

          {/* Risk Detail Panel */}
          <div className="lg:col-span-4">
            <div className="aureos-card p-6 h-full flex flex-col">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="text-aureos-gold" /> Risk Detail
              </h2>

              {selectedRegion ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">{selectedRegion.name}</h3>
                    <span className="font-mono text-2xl font-bold" style={{ color: riskColor(selectedRegion.risk_score) }}>
                      {selectedRegion.risk_score}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                    <div className="h-full rounded-full transition-all" style={{ width: `${selectedRegion.risk_score}%`, background: riskColor(selectedRegion.risk_score) }} />
                  </div>
                  <p className="text-xs uppercase tracking-wider mb-3" style={{ color: riskColor(selectedRegion.risk_score) }}>{selectedRegion.risk_level}</p>

                  <div className="space-y-2 mb-4">
                    {selectedRegion.events?.map((ev, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-[#ccc]">
                        {ev}
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-[#666] uppercase tracking-wider mb-2">Impacted Assets</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedRegion.impacted_assets?.map(a => (
                      <span key={a} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#CFAE46]/10 text-aureos-gold border border-[#CFAE46]/20">
                        {a}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <Globe className="text-[#333] mb-3" size={48} />
                  <p className="text-[#666] text-sm">Click a region on the map to see risk details</p>
                </div>
              )}

              {/* Region List */}
              <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5">
                {geoRisk?.regions?.sort((a, b) => b.risk_score - a.risk_score).map(r => (
                  <button key={r.id} onClick={() => setSelectedRegion(r)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all ${
                      selectedRegion?.id === r.id ? 'bg-white/[0.06] border border-[#CFAE46]/20' : 'hover:bg-white/[0.03] border border-transparent'
                    }`} data-testid={`risk-btn-${r.id}`}
                  >
                    <span className="text-[#ccc] font-medium">{r.name.split('/')[0].trim()}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${r.risk_score}%`, background: riskColor(r.risk_score) }} />
                      </div>
                      <span className="font-mono font-bold w-6 text-right" style={{ color: riskColor(r.risk_score) }}>{r.risk_score}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── EVENTS FEED + SCENARIO ANALYSIS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Intelligence Feed */}
          <div className="lg:col-span-7">
            <div className="aureos-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
                  <Activity size={14} className="text-aureos-gold" /> Intelligence Feed
                </h2>
                <span className="text-[10px] text-[#555]">{events.length} events tracked</span>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setActiveCategory(c)}
                    className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-semibold transition-all ${
                      activeCategory === c
                        ? 'bg-aureos-gold/20 text-aureos-gold border border-aureos-gold/30'
                        : 'bg-white/[0.03] text-[#888] border border-white/5 hover:bg-white/[0.06]'
                    }`} data-testid={`filter-${c}`}
                  >
                    {c === 'all' ? 'All' : c}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredEvents.map((ev, i) => (
                  <motion.div key={ev.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                    data-testid={`intel-event-${ev.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: (CATEGORY_COLORS[ev.category] || '#888') + '15' }}>
                        <Zap size={14} style={{ color: CATEGORY_COLORS[ev.category] || '#888' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight">{ev.title}</p>
                          <SeverityBadge severity={ev.severity} />
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: (CATEGORY_COLORS[ev.category] || '#888') + '15', color: CATEGORY_COLORS[ev.category] || '#888' }}>
                            {ev.category}
                          </span>
                          <span className="text-[9px] text-[#555]">{ev.timestamp}</span>
                        </div>
                        {ev.impact && <p className="text-[11px] text-[#00E676] mt-1.5 font-mono">{ev.impact}</p>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Scenario Analysis */}
          <div className="lg:col-span-5">
            <div className="aureos-card p-6 h-full flex flex-col">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare size={14} className="text-aureos-gold" /> Scenario Analysis
              </h2>
              <p className="text-xs text-[#666] mb-4">
                Ask JARVIS "What if..." questions about geopolitical events and their market impact.
              </p>

              <div className="space-y-2 mb-4">
                {[
                  "What if oil goes to $120 per barrel?",
                  "What if the Fed cuts rates by 50bps?",
                  "What if China invades Taiwan?"
                ].map(q => (
                  <button key={q} onClick={() => setScenarioQ(q)}
                    className="w-full text-left p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-[#888] hover:bg-white/[0.06] hover:text-aureos-gold transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  value={scenarioQ}
                  onChange={e => setScenarioQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitScenario()}
                  placeholder="Ask a 'What if...' question..."
                  className="aureos-input flex-1 text-sm py-2"
                  data-testid="scenario-input"
                />
                <Button onClick={submitScenario} disabled={scenarioLoading || !scenarioQ.trim()} className="aureos-btn-gold px-4" data-testid="scenario-submit-btn">
                  {scenarioLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {scenarioLoading && (
                  <div className="text-center py-8">
                    <Loader2 className="animate-spin text-aureos-gold mx-auto mb-2" size={24} />
                    <p className="text-xs text-[#888]">JARVIS analyzing scenario...</p>
                  </div>
                )}
                {scenarioResult && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="p-3 rounded-xl bg-[#CFAE46]/5 border border-[#CFAE46]/20 mb-3">
                      <p className="text-xs text-aureos-gold font-semibold mb-1">Question:</p>
                      <p className="text-sm text-[#ccc]">{scenarioResult.question}</p>
                    </div>
                    <div className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap" data-testid="scenario-result">
                      {scenarioResult.analysis}
                    </div>
                    <p className="text-[9px] text-[#555] mt-3">Powered by {scenarioResult.model}</p>
                  </motion.div>
                )}
                {!scenarioLoading && !scenarioResult && (
                  <div className="text-center py-6">
                    <MessageSquare className="text-[#333] mx-auto mb-2" size={32} />
                    <p className="text-xs text-[#555]">Ask JARVIS a scenario question</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── DEEP SCAN RESULTS (from original intelligence map) ── */}
        {intelMapData?.status === 'complete' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="aureos-card p-6">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Eye size={14} className="text-aureos-gold" /> Deep Scan — Market Heat Map
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {intelMapData.assets?.sort((a, b) => b.momentum - a.momentum).map(asset => (
                  <div key={asset.symbol}
                    className="p-4 rounded-xl border border-white/10 hover:border-[#CFAE46]/30 transition-all"
                    style={{ background: `linear-gradient(135deg, ${momentumColor(asset.momentum)}08, transparent)` }}
                    data-testid={`deepscan-${asset.symbol}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{asset.name}</span>
                      <span className="text-[10px] text-[#888] uppercase">{asset.asset_type}</span>
                    </div>
                    <p className="font-mono text-lg font-bold" style={{ color: momentumColor(asset.momentum) }}>
                      {asset.momentum > 0 ? '+' : ''}{asset.momentum}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-[#888]">
                      <span>RSI: {asset.rsi}</span>
                      <span className="capitalize">{asset.regime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <JarvisCopilot />
      </div>
    </AureosLayout>
  );
};

/* ── HELPERS ── */
const momentumColor = (m) => m > 15 ? '#00E676' : m < -15 ? '#FF5252' : '#888';

const riskColor = (score) =>
  score > 80 ? '#FF5252' : score > 60 ? '#FF9800' : score > 40 ? '#CFAE46' : '#00E676';

const SeverityBadge = ({ severity }) => {
  const colors = {
    critical: { bg: '#FF5252', text: '#FF5252' },
    high: { bg: '#FF9800', text: '#FF9800' },
    medium: { bg: '#CFAE46', text: '#CFAE46' },
    low: { bg: '#888', text: '#888' },
  };
  const c = colors[severity] || colors.low;
  return (
    <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded flex-shrink-0"
      style={{ background: c.bg + '15', color: c.text }}>
      {severity}
    </span>
  );
};

export default IntelMapPage;
