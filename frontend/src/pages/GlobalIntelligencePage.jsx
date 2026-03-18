import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Network, Users, TrendingUp, TrendingDown, Eye, BarChart3, AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';

const GlobalIntelligencePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/advantage/global-intelligence`);
      setData(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  if (loading) return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="global-intelligence-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">Global <span className="text-gradient-gold">Intelligence</span></h1>
            <p className="text-[#666] mt-1 text-sm">Network effect: {data?.network_stats?.data_points_analyzed?.toLocaleString()} data points analyzed</p>
          </div>
          <Button onClick={fetchData} className="aureos-btn-gold" data-testid="refresh-intel-btn">
            <RefreshCw size={14} className="mr-2" /> Refresh
          </Button>
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Users', value: data?.network_stats?.total_users, icon: Users, color: '#00B4FF' },
            { label: 'Total Trades', value: data?.network_stats?.total_trades, icon: BarChart3, color: '#CFAE46' },
            { label: 'Network Score', value: data?.network_effect_score, icon: Network, color: '#00E676' },
          ].map(s => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="aureos-card p-4 text-center" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
              <s.icon size={18} className="mx-auto mb-2" style={{ color: s.color }} />
              <p className="text-xl font-mono font-bold" style={{ color: s.color }}>{s.value?.toLocaleString()}</p>
              <p className="text-[10px] text-[#666] uppercase tracking-wider mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Crowd Positioning */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="aureos-card p-6">
          <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Eye size={14} className="text-aureos-gold" /> Crowd Positioning
          </h3>
          <div className="space-y-3">
            {data?.crowd_positioning?.map((c, i) => {
              const sentColor = c.long_pct > 70 ? '#00E676' : c.long_pct < 30 ? '#FF5252' : '#FF9800';
              return (
                <motion.div key={c.symbol} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors" data-testid={`crowd-${c.symbol}`}>
                  <span className="font-mono font-bold text-sm w-14">{c.symbol}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#00E676] rounded-l-full transition-all" style={{ width: `${c.long_pct}%` }} />
                        <div className="h-full bg-[#FF5252] rounded-r-full flex-1" />
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-[#666]">
                      <span className="text-[#00E676]">{c.long_pct}% Long</span>
                      <span className="text-[#FF5252]">{c.short_pct}% Short</span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase px-2 py-1 rounded" style={{ background: sentColor + '15', color: sentColor }}>
                    {c.sentiment?.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-[#555]">{c.total_trades} trades</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Smart Money Signals */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="aureos-card p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={14} className="text-[#00E676]" /> Smart Money vs Crowd
            </h3>
            {data?.smart_money_signals?.length > 0 ? (
              <div className="space-y-3">
                {data.smart_money_signals.map((s, i) => (
                  <div key={i} className="p-3 rounded-lg border border-[#00E676]/10 bg-[#00E676]/[0.03]" data-testid={`smart-money-${i}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm">{s.symbol}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E676]/15 text-[#00E676]">{s.confidence}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><span className="text-[#666]">Crowd:</span> <span className="text-[#FF5252]">{s.crowd}</span></div>
                      <div><span className="text-[#666]">Smart Money:</span> <span className="text-[#00E676]">{s.smart_money}</span></div>
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-aureos-gold">{s.contrarian_signal}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#666] text-sm text-center py-8">No extreme positioning detected. Markets balanced.</p>
            )}
          </motion.div>

          {/* Sentiment Shifts */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="aureos-card p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#FF9800]" /> Sentiment Shifts
            </h3>
            <div className="space-y-3">
              {data?.sentiment_shifts?.map((s, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5" data-testid={`sentiment-shift-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sm">{s.symbol}</span>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${s.significance === 'high' ? 'bg-[#FF5252]/15 text-[#FF5252]' : 'bg-[#FF9800]/15 text-[#FF9800]'}`}>
                      {s.significance}
                    </span>
                  </div>
                  <p className="text-sm text-[#ccc]">{s.shift}</p>
                  <p className="text-[10px] text-[#555] mt-1">Speed: {s.speed}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AureosLayout>
  );
};

export default GlobalIntelligencePage;
