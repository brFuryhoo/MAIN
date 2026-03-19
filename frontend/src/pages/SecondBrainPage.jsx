import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { JarvisNarrate } from '@/components/JarvisNarrate';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, BarChart3, Lightbulb, Calendar, RefreshCw, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const SecondBrainPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef(null);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { setLoading(true); try { const r = await axios.get(`${API}/ecosystem/second-brain`, { headers }); setData(r.data); } catch {} setLoading(false); };

  if (loading) return <AureosLayout><div className="flex justify-center h-[60vh] items-center"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  const m = data?.memory || {};
  const p = data?.patterns || {};

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="second-brain-page" ref={contentRef}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">{t('brain.title')} <span className="text-gradient-gold">{t('brain.subtitle')}</span></h1>
            <p className="text-[#666] mt-1 text-sm">{t('brain.desc')}</p>
          </div>
          <JarvisNarrate text={data?.insights?.join('. ') || ''} />
        </div>

        {/* Memory Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('brain.total_decisions'), value: m.total_decisions, color: '#00B4FF' },
            { label: t('brain.win_rate'), value: `${m.win_rate}%`, color: '#00E676' },
            { label: t('brain.total_pnl'), value: `$${m.total_pnl?.toLocaleString()}`, color: m.total_pnl >= 0 ? '#00E676' : '#FF5252' },
            { label: t('brain.score'), value: data?.score, color: '#CFAE46' },
          ].map(s => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="aureos-card p-4 text-center">
              <p className="text-[9px] text-[#666] uppercase">{s.label}</p>
              <p className="text-xl font-mono font-bold" style={{ color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patterns */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="aureos-card p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2"><Target size={14} className="text-aureos-gold" /> {t('brain.patterns')}</h3>
            <div className="space-y-3">
              {[{label:t('brain.best_day'), value:p.best_day, color:'#00E676'}, {label:t('brain.worst_day'), value:p.worst_day, color:'#FF5252'},
                {label:t('brain.best_asset'), value:p.best_asset, color:'#00E676'}, {label:t('brain.worst_asset'), value:p.worst_asset, color:'#FF5252'}
              ].map(item => (
                <div key={item.label} className="flex justify-between p-2 rounded-lg bg-white/[0.03]">
                  <span className="text-sm text-[#888]">{item.label}</span>
                  <span className="font-mono text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
            {p.by_asset && Object.keys(p.by_asset).length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] text-[#666] uppercase">{t('brain.asset_perf')}</p>
                {Object.entries(p.by_asset).map(([sym, d]) => (
                  <div key={sym} className="flex items-center gap-2 text-[11px]">
                    <span className="font-mono font-bold w-16">{sym}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.wins/Math.max(d.trades,1)*100}%`, background: d.pnl>=0?'#00E676':'#FF5252' }} /></div>
                    <span className="font-mono w-20 text-right" style={{ color: d.pnl>=0?'#00E676':'#FF5252' }}>${d.pnl}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Insights */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="aureos-card p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2"><Lightbulb size={14} className="text-[#FF9800]" /> {t('brain.insights')}</h3>
            <div className="space-y-3">
              {data?.insights?.map((insight, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5" data-testid={`insight-${i}`}>
                  <p className="text-sm text-[#ccc]">{insight}</p>
                </div>
              ))}
              {(!data?.insights || data.insights.length === 0) && <p className="text-[#666] text-sm text-center py-4">{t('brain.no_insights')}</p>}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-aureos-gold/5 border border-aureos-gold/20">
              <p className="text-[10px] text-aureos-gold uppercase font-bold mb-1">{t('brain.dna_profile')}</p>
              <p className="text-sm font-semibold">{data?.dna_profile || 'Unknown'}</p>
            </div>
          </motion.div>
        </div>

        {/* Monthly Evolution */}
        {data?.evolution?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="aureos-card p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2"><Calendar size={14} className="text-[#00B4FF]" /> {t('brain.evolution')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data.evolution.map(e => (
                <div key={e.month} className="p-3 rounded-lg bg-white/[0.03] text-center">
                  <p className="text-[10px] text-[#666]">{e.month}</p>
                  <p className="text-sm font-mono font-bold" style={{ color: e.pnl >= 0 ? '#00E676' : '#FF5252' }}>${e.pnl?.toFixed(0)}</p>
                  <p className="text-[9px] text-[#888]">{e.trades} trades | {e.win_rate}%</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AureosLayout>
  );
};
export default SecondBrainPage;
