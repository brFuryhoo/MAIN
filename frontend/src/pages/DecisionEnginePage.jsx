import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import { useLanguage } from '@/contexts/LanguageContext';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, Minus, BarChart3, Shield, Target, AlertTriangle, ChevronRight, RefreshCw, Zap, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const DecisionEnginePage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [topOpps, setTopOpps] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(true);

  const decisionColors = { BUY: '#00E676', SELL: '#FF5252', HOLD: '#FFB300' };
  const decisionIcons = { BUY: TrendingUp, SELL: TrendingDown, HOLD: Minus };

  useEffect(() => {
    axios.get(`${API}/decision/batch/top-opportunities?limit=8`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setTopOpps(r.data.opportunities || []))
      .catch(() => {})
      .finally(() => setLoadingOpps(false));
  }, [token]);

  const searchAssets = useCallback(async (q) => {
    if (!q || q.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await axios.get(`${API}/decision/universe/catalog?query=${encodeURIComponent(q)}`);
      setSearchResults((r.data.results || []).slice(0, 8));
    } catch { setSearchResults([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchAssets(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchAssets]);

  const fetchDecision = async (symbol, assetType = 'stock') => {
    setLoading(true);
    setSearchResults([]);
    setQuery(symbol);
    try {
      const r = await axios.get(`${API}/decision/${symbol}?asset_type=${assetType}`, { headers: { Authorization: `Bearer ${token}` } });
      setDecision(r.data);
      toast.success(`${t('decision.analysis_complete')} ${symbol}`);
    } catch {
      toast.error(t('decision.error'));
    }
    setLoading(false);
  };

  const DecIcon = decision ? (decisionIcons[decision?.decision?.decision] || Minus) : Minus;
  const d = decision?.decision || {};
  const why = decision?.why_this_trade || {};
  const tech = decision?.technicals || {};

  const confidenceBg = { very_high: 'bg-[#00E676]/10 text-[#00E676]', high: 'bg-[#00B4FF]/10 text-[#00B4FF]', medium: 'bg-[#FFB300]/10 text-[#FFB300]', low: 'bg-[#FF5252]/10 text-[#FF5252]' };

  return (
    <AureosLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header + Search */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']" data-testid="decision-title">{t('decision.title')} <span className="text-gradient-gold">{t('decision.subtitle')}</span></h1>
            <p className="text-[#666] mt-1 text-sm">{t('decision.desc')}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative" data-testid="decision-search">
          <div className="aureos-card p-4">
            <div className="flex items-center gap-3">
              <Search size={18} className="text-[#888]" />
              <Input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={t('decision.search_placeholder')}
                className="bg-transparent border-none text-white text-lg focus:ring-0 h-10"
                data-testid="decision-search-input"
              />
              {loading && <RefreshCw size={16} className="text-aureos-gold animate-spin" />}
            </div>
          </div>
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 w-full mt-1 aureos-card p-2 max-h-[300px] overflow-auto">
                {searchResults.map((r, i) => (
                  <button key={`${r.symbol}-${i}`} onClick={() => fetchDecision(r.symbol, r.type)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a1a] rounded-lg transition text-left" data-testid={`search-result-${i}`}>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${r.type === 'crypto' ? 'bg-[#FFB300]/10 text-[#FFB300]' : r.type === 'forex' ? 'bg-[#00B4FF]/10 text-[#00B4FF]' : 'bg-[#00E676]/10 text-[#00E676]'}`}>{r.type}</span>
                    <span className="text-white font-mono font-bold text-sm">{r.symbol}</span>
                    <span className="text-[#888] text-xs truncate">{r.name}</span>
                    <ChevronRight size={14} className="text-[#444] ml-auto" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Decision Result */}
        {decision && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Main Decision Card */}
            <div className="aureos-card p-6" data-testid="decision-result">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: (decisionColors[d.decision] || '#888') + '15' }}>
                    <DecIcon size={28} style={{ color: decisionColors[d.decision] }} />
                  </div>
                  <div>
                    <p className="text-xs text-[#888] uppercase">{decision.type} | {decision.source}</p>
                    <h2 className="text-xl font-bold">{decision.symbol} <span className="text-[#888] font-normal text-sm">— {decision.name}</span></h2>
                    <p className="text-lg font-mono text-aureos-gold">${decision.current_price?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center sm:items-end gap-1">
                  <div className="text-4xl font-black font-['Poppins']" style={{ color: decisionColors[d.decision] }} data-testid="decision-verdict">{d.decision}</div>
                  <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${confidenceBg[d.confidence_tier] || ''}`}>{d.confidence_tier} {t('decision.confidence')}</span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: t('decision.probability'), value: `${(d.probability * 100).toFixed(0)}%`, color: '#CFAE46' },
                  { label: t('decision.entry'), value: `$${d.entry_price?.toLocaleString()}`, color: '#00B4FF' },
                  { label: t('decision.target'), value: `$${d.target_price?.toLocaleString()}`, color: '#00E676' },
                  { label: t('decision.stop_loss'), value: `$${d.stop_loss?.toLocaleString()}`, color: '#FF5252' },
                  { label: t('decision.risk_reward'), value: `${d.risk_reward_ratio}:1`, color: d.risk_reward_ratio >= 2 ? '#00E676' : '#FFB300' },
                ].map((m, i) => (
                  <div key={i} className="bg-[#0a0a0a] rounded-xl p-3 text-center">
                    <p className="text-[9px] text-[#666] uppercase">{m.label}</p>
                    <p className="text-base font-mono font-bold mt-1" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Why This Trade + Factors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Why This Trade */}
              <div className="aureos-card p-5" data-testid="why-this-trade">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Target size={14} className="text-aureos-gold" /> {t('decision.why')}
                </h3>
                <div className="space-y-3">
                  {[
                    { label: t('decision.market_structure'), value: why.market_structure, icon: BarChart3 },
                    { label: t('decision.liquidity'), value: why.liquidity, icon: Activity },
                    { label: t('decision.volatility'), value: why.volatility, icon: AlertTriangle },
                    { label: t('decision.sentiment'), value: why.sentiment, icon: Zap },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-[#0a0a0a] rounded-lg">
                      <div className="flex items-center gap-2">
                        <f.icon size={13} className="text-[#666]" />
                        <span className="text-xs text-[#888]">{f.label}</span>
                      </div>
                      <span className={`text-xs font-bold capitalize ${f.value === 'bullish' || f.value === 'positive' ? 'text-[#00E676]' : f.value === 'bearish' || f.value === 'negative' ? 'text-[#FF5252]' : 'text-[#FFB300]'}`}>{f.value}</span>
                    </div>
                  ))}
                  {/* Quant signals */}
                  <div className="p-2.5 bg-[#0a0a0a] rounded-lg">
                    <p className="text-[9px] text-aureos-gold uppercase font-bold mb-2">{t('decision.quant_signals')}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-[9px] text-[#666]">RSI</p><p className="text-xs font-mono font-bold" style={{ color: (why.quant_signals?.rsi || 50) > 70 ? '#FF5252' : (why.quant_signals?.rsi || 50) < 30 ? '#00E676' : '#FFB300' }}>{why.quant_signals?.rsi}</p></div>
                      <div><p className="text-[9px] text-[#666]">MACD</p><p className={`text-xs font-bold capitalize ${why.quant_signals?.macd === 'bullish' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>{why.quant_signals?.macd}</p></div>
                      <div><p className="text-[9px] text-[#666]">{t('decision.momentum')}</p><p className="text-xs font-mono font-bold" style={{ color: (why.quant_signals?.momentum || 0) > 0 ? '#00E676' : '#FF5252' }}>{why.quant_signals?.momentum}%</p></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="aureos-card p-5" data-testid="decision-reasoning">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Shield size={14} className="text-[#00B4FF]" /> {t('decision.reasoning')}
                </h3>
                <div className="space-y-2">
                  {(d.reasoning || []).map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex gap-2 p-2.5 bg-[#0a0a0a] rounded-lg">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: (decisionColors[d.decision] || '#888') + '20' }}>
                        <span className="text-[9px] font-bold" style={{ color: decisionColors[d.decision] }}>{i + 1}</span>
                      </div>
                      <p className="text-xs text-[#ccc] leading-relaxed">{r}</p>
                    </motion.div>
                  ))}
                </div>
                {/* Factor Scores */}
                <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                  <p className="text-[9px] text-[#666] uppercase mb-2">{t('decision.factor_scores')}</p>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {Object.entries(d.factors || {}).map(([k, v]) => (
                      <div key={k}><p className="text-[8px] text-[#666] uppercase">{k}</p><p className="text-xs font-mono font-bold" style={{ color: v > 0 ? '#00E676' : v < 0 ? '#FF5252' : '#888' }}>{v > 0 ? '+' : ''}{v}</p></div>
                    ))}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-[9px] text-[#666] uppercase">{t('decision.total_score')}</p>
                    <p className="text-lg font-bold font-mono" style={{ color: d.total_score > 0 ? '#00E676' : d.total_score < 0 ? '#FF5252' : '#FFB300' }}>{d.total_score > 0 ? '+' : ''}{d.total_score}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Opportunities */}
        {!decision && (
          <div data-testid="top-opportunities">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={14} className="text-aureos-gold" /> {t('decision.top_opp')}
            </h3>
            {loadingOpps ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="aureos-card p-5 h-32 animate-pulse bg-[#111]" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {topOpps.map((o, i) => {
                  const OIcon = decisionIcons[o.decision] || Minus;
                  return (
                    <motion.button key={o.symbol} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      onClick={() => fetchDecision(o.symbol, o.type)} className="aureos-card p-4 text-left hover:border-aureos-gold/30 transition-all" data-testid={`opp-${o.symbol}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-mono font-bold">{o.symbol}</span>
                        <div className="flex items-center gap-1 text-xs font-bold" style={{ color: decisionColors[o.decision] }}>
                          <OIcon size={12} /> {o.decision}
                        </div>
                      </div>
                      <p className="text-[10px] text-[#888] truncate mb-2">{o.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-aureos-gold">${o.price?.toLocaleString()}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${confidenceBg[o.confidence_tier] || ''}`}>{(o.probability * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-[9px] text-[#666] mt-2 line-clamp-2">{o.top_reason}</p>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AureosLayout>
  );
};

export default DecisionEnginePage;
