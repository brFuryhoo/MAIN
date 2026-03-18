import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
  Fingerprint, RefreshCw, Shield, Zap, TrendingUp, AlertTriangle,
  Activity, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const RISK_COLORS = { extreme: '#FF5252', high: '#FF9800', moderate: '#FF9800', low: '#00E676', unknown: '#888' };

const MarketPersonalityPage = () => {
  const [personalities, setPersonalities] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/ultra/market-personalities`);
      setPersonalities(res.data.personalities || []);
      if (res.data.personalities?.length > 0) setSelected(res.data.personalities[0]);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  };

  if (loading) return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={40} /></div></AureosLayout>;

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="personality-page">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-['Poppins'] flex items-center gap-3">
            <Fingerprint className="text-aureos-gold" size={32} />
            <span className="text-gradient-gold">Market Personality</span>
          </h1>
          <p className="text-[#888] mt-1">Every asset has a soul — understand it before you trade it.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Asset List */}
          <div className="lg:col-span-4">
            <div className="aureos-card p-4 space-y-2">
              {personalities.map((p) => {
                const rc = RISK_COLORS[p.risk_profile] || '#888';
                return (
                  <motion.button key={p.symbol} onClick={() => setSelected(p)}
                    whileHover={{ scale: 1.01 }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selected?.symbol === p.symbol ? 'border-aureos-gold/40 bg-[#CFAE46]/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    }`} data-testid={`personality-${p.symbol}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm">{p.symbol}</span>
                        <span className="text-[10px] text-[#888] ml-2">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ color: rc, background: rc + '15' }}>{p.risk_profile}</span>
                    </div>
                    <p className="text-xs text-aureos-gold mt-1">{p.personality}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Personality Detail */}
          <div className="lg:col-span-8">
            {selected && (
              <motion.div key={selected.symbol} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {/* Header */}
                <div className="aureos-card p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#CFAE46]/20 to-[#00B4FF]/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-aureos-gold">{selected.symbol.charAt(0)}</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selected.symbol} <span className="text-[#888] text-lg">— {selected.name}</span></h2>
                      <p className="text-aureos-gold font-semibold">&ldquo;{selected.personality}&rdquo;</p>
                    </div>
                  </div>
                  {/* Trait Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selected.traits?.map((t, i) => (
                      <span key={i} className="text-[11px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#aaa]">{t}</span>
                    ))}
                  </div>
                  {/* Behavior */}
                  <p className="text-sm text-[#ccc] leading-relaxed">{selected.behavior}</p>
                </div>

                {/* Metric Bars */}
                <div className="aureos-card p-6">
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">DNA Profile</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Volatility', value: selected.volatility, color: selected.volatility > 70 ? '#FF5252' : selected.volatility > 40 ? '#FF9800' : '#00E676' },
                      { label: 'Manipulation Risk', value: selected.manipulation_risk, color: selected.manipulation_risk > 60 ? '#FF5252' : selected.manipulation_risk > 30 ? '#FF9800' : '#00E676' },
                      { label: 'Trend Strength', value: selected.trend_strength, color: '#00B4FF' },
                      { label: 'Mean Reversion', value: selected.mean_reversion, color: '#CFAE46' },
                    ].map(m => (
                      <div key={m.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#aaa]">{m.label}</span>
                          <span className="text-xs font-mono font-bold" style={{ color: m.color }}>{m.value}/100</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${m.value}%` }} transition={{ duration: 0.8 }}
                            className="h-full rounded-full" style={{ background: m.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategy */}
                <div className="aureos-card p-6">
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Zap size={14} className="text-aureos-gold" /> Best Strategy
                  </h3>
                  <p className="text-sm text-[#ccc]">{selected.best_strategy}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AureosLayout>
  );
};

export default MarketPersonalityPage;
