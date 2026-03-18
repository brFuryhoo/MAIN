import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
  ShieldCheck, RefreshCw, TrendingUp, TrendingDown, BarChart3,
  CheckCircle, XCircle, Target, Award, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const PerformancePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/godmode/performance`);
      setData(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  if (loading) return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={40} /></div></AureosLayout>;

  const d = data || {};

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="performance-page">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-['Poppins'] flex items-center gap-3">
              <ShieldCheck className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Verified Track Record</span>
            </h1>
            <p className="text-[#888] mt-1">Public, transparent, verifiable performance — since {d.verified_since}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00E676]/10 border border-[#00E676]/20">
              <ShieldCheck size={14} className="text-[#00E676]" />
              <span className="text-[10px] font-bold text-[#00E676] uppercase tracking-wider">Verified</span>
            </div>
            <Button onClick={fetchData} className="aureos-btn-outline" size="sm"><RefreshCw size={14} /></Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Signals', value: d.total_signals, color: '#CFAE46' },
            { label: 'Win Rate', value: `${d.win_rate}%`, color: d.win_rate >= 60 ? '#00E676' : '#FF9800' },
            { label: 'Avg Return', value: `${d.avg_return >= 0 ? '+' : ''}${d.avg_return}%`, color: d.avg_return >= 0 ? '#00E676' : '#FF5252' },
            { label: 'Best Trade', value: `+${d.best_trade}%`, color: '#00E676' },
            { label: 'Max Drawdown', value: `-${d.max_drawdown}%`, color: '#FF5252' },
            { label: 'Profit Factor', value: `${d.profit_factor}x`, color: d.profit_factor >= 1.5 ? '#00E676' : '#FF9800' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center" data-testid={`kpi-${i}`}>
              <p className="text-2xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-[10px] text-[#888] uppercase tracking-wider mt-1">{kpi.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strategy Breakdown */}
          <div className="aureos-card p-5">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-aureos-gold" /> Strategy Performance
            </h3>
            <div className="space-y-3">
              {d.strategy_breakdown?.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3" data-testid={`strategy-${i}`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{s.name}</span>
                      <span className="text-[10px] font-mono text-[#888]">{s.signals} signals</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${s.win_rate}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full" style={{ background: s.win_rate >= 65 ? '#00E676' : s.win_rate >= 50 ? '#FF9800' : '#FF5252' }} />
                    </div>
                  </div>
                  <div className="text-right w-20">
                    <p className="text-xs font-mono font-bold" style={{ color: s.win_rate >= 60 ? '#00E676' : '#FF9800' }}>{s.win_rate}%</p>
                    <p className="text-[9px] text-[#888]">{s.avg_return >= 0 ? '+' : ''}{s.avg_return}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Signals */}
          <div className="aureos-card p-5">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={14} className="text-aureos-gold" /> Recent Signals
            </h3>
            <div className="space-y-1.5">
              {d.recent_signals?.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors" data-testid={`signal-${i}`}>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${s.is_winner ? 'bg-[#00E676]/15' : 'bg-[#FF5252]/15'}`}>
                    {s.is_winner ? <CheckCircle size={12} className="text-[#00E676]" /> : <XCircle size={12} className="text-[#FF5252]" />}
                  </div>
                  <span className="text-xs font-semibold w-12">{s.symbol}</span>
                  <span className={`text-[10px] font-bold w-12 ${s.direction === 'LONG' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>{s.direction}</span>
                  <span className="text-[10px] font-mono text-[#888] w-10">{s.confidence}%</span>
                  <div className="flex-1" />
                  <span className={`text-xs font-mono font-bold ${s.outcome_pct >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                    {s.outcome_pct >= 0 ? '+' : ''}{s.outcome_pct}%
                  </span>
                  <span className="text-[9px] text-[#666] w-20 text-right">{s.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Performance */}
        <div className="aureos-card p-5">
          <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Monthly Performance</h3>
          <div className="flex items-end gap-2 h-32">
            {d.monthly_performance?.map((m, i) => {
              const height = Math.min(100, Math.abs(m.return) * 10);
              const isPositive = m.return >= 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1" data-testid={`month-${i}`}>
                  <span className={`text-[9px] font-mono ${isPositive ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                    {isPositive ? '+' : ''}{m.return}%
                  </span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="w-full rounded-sm" style={{ background: isPositive ? '#00E67640' : '#FF525240', minHeight: 4 }} />
                  <span className="text-[8px] text-[#555]">{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AureosLayout>
  );
};

export default PerformancePage;
