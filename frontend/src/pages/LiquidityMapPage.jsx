import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, TrendingDown, RefreshCw, Droplets, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const LiquidityMapPage = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { setLoading(true); try { const r = await axios.get(`${API}/ecosystem/liquidity-map`); setData(r.data); } catch {} setLoading(false); };

  const strengthColors = { strong: '#00E676', moderate: '#FF9800', weak: '#FF5252' };

  if (loading) return <AureosLayout><div className="flex justify-center h-[60vh] items-center"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="liquidity-map-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">{t('liquidity.title')} <span className="text-gradient-gold">{t('liquidity.subtitle')}</span></h1>
            <p className="text-[#666] mt-1 text-sm">{t('liquidity.desc')} {data?.total_volume_tracked}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: data?.regime === 'RISK-ON' ? '#00E67615' : '#FF525215', color: data?.regime === 'RISK-ON' ? '#00E676' : '#FF5252' }}>{data?.regime}</span>
            <Button onClick={fetchData} className="aureos-btn-gold" data-testid="refresh-liquidity"><RefreshCw size={14} className="mr-2" /> {t('common.refresh')}</Button>
          </div>
        </div>

        {/* Capital Flows */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="aureos-card p-6">
          <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2"><Droplets size={14} className="text-aureos-gold" /> {t('liquidity.capital_flows')}</h3>
          <div className="space-y-3">
            {data?.capital_flows?.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]" data-testid={`flow-${i}`}>
                <span className="font-mono text-sm font-bold w-28 text-right">{f.from}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(f.volume / 15 * 100, 100)}%`, background: strengthColors[f.strength] }} />
                  </div>
                  <ArrowRight size={14} style={{ color: strengthColors[f.strength] }} />
                </div>
                <span className="font-mono text-sm font-bold w-28">{f.to}</span>
                <span className="text-[10px] font-mono w-12 text-right" style={{ color: strengthColors[f.strength] }}>${f.volume}B</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded" style={{ background: strengthColors[f.strength] + '15', color: strengthColors[f.strength] }}>{f.strength}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Sector Flows */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="aureos-card p-6">
          <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2"><Activity size={14} className="text-[#00B4FF]" /> {t('liquidity.sector_flows')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data?.sector_flows?.map(s => (
              <div key={s.name} className="p-3 rounded-lg bg-white/[0.03] text-center" data-testid={`sector-${s.name.toLowerCase()}`}>
                <p className="text-[10px] text-[#666] uppercase">{s.name}</p>
                <p className="text-lg font-mono font-bold" style={{ color: s.inflow >= 0 ? '#00E676' : '#FF5252' }}>
                  {s.inflow >= 0 ? '+' : ''}{s.inflow}B
                </p>
                <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(s.inflow) / 15 * 100, 100)}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Liquidity Zones */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="aureos-card p-6">
          <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">{t('liquidity.zones')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data?.liquidity_zones?.map((z, i) => (
              <div key={i} className="p-4 rounded-lg bg-white/[0.03] border border-white/5" data-testid={`zone-${i}`}>
                <p className="text-sm font-semibold text-aureos-gold mb-1">{z.zone}</p>
                <div className="flex flex-wrap gap-1 mb-2">{z.assets.map(a => <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 bg-white/5 rounded">{a}</span>)}</div>
                <p className="text-[11px] text-[#888]">{z.signal}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AureosLayout>
  );
};
export default LiquidityMapPage;
