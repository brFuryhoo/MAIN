import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, TrendingDown, BarChart3, Target, Award, Users, Activity, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { API } from '@/App';

const TrustDashboardPage = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [trackRecord, setTrackRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [perfRes, trackRes] = await Promise.all([
        axios.get(`${API}/trust/performance`),
        axios.get(`${API}/trust/track-record?limit=20`),
      ]);
      setData(perfRes.data);
      setTrackRecord(trackRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading || !data) return (
    <AureosLayout><div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="aureos-card p-8 animate-pulse bg-[#111]" />)}</div></AureosLayout>
  );

  const o = data.overview || {};
  const s = data.signals || {};
  const ps = data.platform_stats || {};
  const monthly = data.monthly_performance || [];
  const maxPnl = Math.max(...monthly.map(m => Math.abs(m.pnl)), 1);

  return (
    <AureosLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']" data-testid="trust-title">{t('trust.title')} <span className="text-gradient-gold">{t('trust.subtitle')}</span></h1>
            <p className="text-[#666] mt-1 text-sm">{t('trust.desc')}</p>
          </div>
          <Button onClick={fetchData} className="aureos-btn-gold" data-testid="refresh-trust"><RefreshCw size={14} className="mr-2" /> {t('common.refresh')}</Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="trust-overview">
          {[
            { label: t('trust.total_trades'), value: o.total_trades, color: '#00B4FF', icon: BarChart3 },
            { label: t('trust.win_rate'), value: `${o.win_rate}%`, color: o.win_rate >= 50 ? '#00E676' : '#FF5252', icon: Target },
            { label: t('trust.total_pnl'), value: `$${o.total_pnl?.toLocaleString()}`, color: o.total_pnl >= 0 ? '#00E676' : '#FF5252', icon: TrendingUp },
            { label: t('trust.max_drawdown'), value: `$${o.max_drawdown?.toLocaleString()}`, color: '#FF5252', icon: TrendingDown },
            { label: t('trust.risk_reward'), value: `${o.risk_reward_ratio}:1`, color: '#CFAE46', icon: Shield },
            { label: t('trust.sharpe'), value: o.sharpe_estimate, color: '#00B4FF', icon: Activity },
          ].map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="aureos-card p-4 text-center">
              <m.icon size={16} className="mx-auto mb-2" style={{ color: m.color }} />
              <p className="text-[9px] text-[#666] uppercase">{m.label}</p>
              <p className="text-lg font-mono font-bold mt-1" style={{ color: m.color }}>{m.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Platform Stats Bar */}
        <div className="aureos-card p-4 flex flex-wrap items-center justify-center gap-6" data-testid="platform-stats">
          {[
            { label: t('trust.users'), value: ps.total_users, icon: Users },
            { label: t('trust.strategies'), value: ps.total_strategies, icon: Award },
            { label: t('trust.assets_covered'), value: `${ps.assets_covered}+`, icon: BarChart3 },
            { label: t('trust.signal_accuracy'), value: `${s.accuracy}%`, icon: Target },
            { label: t('trust.total_signals'), value: s.total_signals, icon: Activity },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <m.icon size={14} className="text-aureos-gold" />
              <span className="text-xs text-[#888]">{m.label}:</span>
              <span className="text-sm font-mono font-bold text-white">{m.value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Performance */}
          <div className="aureos-card p-5" data-testid="monthly-performance">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-aureos-gold" /> {t('trust.monthly_perf')}
            </h3>
            {monthly.length === 0 ? (
              <p className="text-[#666] text-sm text-center py-8">{t('trust.no_data')}</p>
            ) : (
              <div className="space-y-2">
                {monthly.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-[#0a0a0a] rounded-lg">
                    <span className="text-xs text-[#888] font-mono w-16">{m.month}</span>
                    <div className="flex-1 h-5 bg-[#1a1a1a] rounded-full overflow-hidden relative">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.min(Math.abs(m.pnl) / maxPnl * 100, 100)}%`,
                        background: m.pnl >= 0 ? '#00E676' : '#FF5252',
                        opacity: 0.7,
                      }} />
                    </div>
                    <span className="text-xs font-mono font-bold w-20 text-right" style={{ color: m.pnl >= 0 ? '#00E676' : '#FF5252' }}>
                      {m.pnl >= 0 ? '+' : ''}${m.pnl.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-[#888] w-16 text-right">{m.win_rate}% WR</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verified Track Record */}
          <div className="aureos-card p-5" data-testid="track-record">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield size={14} className="text-[#00E676]" /> {t('trust.track_record')}
            </h3>
            {trackRecord && trackRecord.current_streak > 0 && (
              <div className="bg-[#00E676]/5 border border-[#00E676]/20 rounded-lg p-3 mb-4 text-center">
                <p className="text-[10px] text-[#00E676] uppercase">{t('trust.current_streak')}</p>
                <p className="text-2xl font-bold text-[#00E676] font-mono">{trackRecord.current_streak}</p>
              </div>
            )}
            {/* Accuracy by Class */}
            {trackRecord?.accuracy_by_class && Object.keys(trackRecord.accuracy_by_class).length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-[9px] text-[#666] uppercase">{t('trust.accuracy_by_class')}</p>
                {Object.entries(trackRecord.accuracy_by_class).map(([cls, v]) => (
                  <div key={cls} className="flex items-center justify-between p-2 bg-[#0a0a0a] rounded-lg">
                    <span className="text-xs capitalize text-[#ccc]">{cls}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#888]">{v.total} signals</span>
                      <span className="text-xs font-bold" style={{ color: v.accuracy >= 60 ? '#00E676' : v.accuracy >= 40 ? '#FFB300' : '#FF5252' }}>{v.accuracy}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Recent Signals */}
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {(trackRecord?.signals || []).slice(0, 10).map((sig, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-2.5 bg-[#0a0a0a] rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${sig.outcome === 'correct' ? 'bg-[#00E676]' : sig.outcome === 'incorrect' ? 'bg-[#FF5252]' : 'bg-[#FFB300]'}`} />
                  <span className="text-xs font-mono font-bold text-white w-14">{sig.symbol}</span>
                  <span className={`text-[9px] font-bold uppercase ${sig.direction === 'bullish' ? 'text-[#00E676]' : sig.direction === 'bearish' ? 'text-[#FF5252]' : 'text-[#FFB300]'}`}>{sig.direction}</span>
                  <span className="text-[9px] text-[#888] ml-auto">{sig.probability ? `${(sig.probability * 100).toFixed(0)}%` : ''}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${sig.outcome === 'correct' ? 'bg-[#00E676]/10 text-[#00E676]' : sig.outcome === 'incorrect' ? 'bg-[#FF5252]/10 text-[#FF5252]' : 'bg-[#FFB300]/10 text-[#FFB300]'}`}>{sig.outcome}</span>
                </motion.div>
              ))}
              {(!trackRecord?.signals || trackRecord.signals.length === 0) && (
                <p className="text-[#666] text-sm text-center py-4">{t('trust.no_signals')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Strategies */}
        {data.top_strategies && data.top_strategies.length > 0 && (
          <div className="aureos-card p-5" data-testid="top-strategies">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award size={14} className="text-[#FFB300]" /> {t('trust.top_strategies')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {data.top_strategies.map((s, i) => (
                <div key={i} className="bg-[#0a0a0a] rounded-xl p-3 text-center">
                  <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                  <p className="text-lg font-mono font-bold mt-1" style={{ color: s.return >= 0 ? '#00E676' : '#FF5252' }}>
                    {s.return >= 0 ? '+' : ''}{s.return}%
                  </p>
                  <p className="text-[9px] text-[#888]">{s.trades} trades</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AureosLayout>
  );
};

export default TrustDashboardPage;
