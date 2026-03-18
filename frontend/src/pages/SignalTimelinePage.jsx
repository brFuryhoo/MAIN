import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
  Clock, RefreshCw, TrendingUp, TrendingDown, CheckCircle, XCircle,
  BarChart3, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const SignalTimelinePage = () => {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/ultra/signal-timeline`);
      setData(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  if (loading) return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={40} /></div></AureosLayout>;

  const signals = data?.signals || [];
  const filtered = filter === 'all' ? signals : filter === 'winners' ? signals.filter(s => s.is_winner) : signals.filter(s => !s.is_winner);
  const stats = data?.stats || {};

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="signal-timeline-page">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-['Poppins'] flex items-center gap-3">
              <Clock className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Signal Timeline</span>
            </h1>
            <p className="text-[#888] mt-1">Track every JARVIS signal — see what worked and what didn't.</p>
          </div>
          <Button onClick={fetchData} className="aureos-btn-outline"><RefreshCw size={16} className="mr-2" /> Refresh</Button>
        </div>

        {/* Stats Bar */}
        <div className="aureos-glass px-5 py-3 flex items-center gap-6 overflow-x-auto text-[11px]">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <BarChart3 size={14} className="text-aureos-gold" />
            <span className="text-[#888]">Total:</span><span className="font-mono font-bold">{stats.total_signals}</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <CheckCircle size={14} className="text-[#00E676]" />
            <span className="text-[#888]">Winners:</span><span className="font-mono font-bold text-[#00E676]">{stats.winners}</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Target size={14} className="text-aureos-gold" />
            <span className="text-[#888]">Win Rate:</span><span className="font-mono font-bold text-aureos-gold">{stats.win_rate}%</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[#888]">Avg Return:</span>
            <span className={`font-mono font-bold ${stats.avg_return >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>{stats.avg_return >= 0 ? '+' : ''}{stats.avg_return}%</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[#888]">Active:</span><span className="font-mono font-bold text-[#00B4FF]">{stats.active}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'winners', 'losers'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase transition-all ${
                filter === f ? 'bg-aureos-gold/15 text-aureos-gold border border-aureos-gold/30' : 'bg-white/5 text-[#888] border border-transparent hover:border-white/10'
              }`} data-testid={`filter-${f}`}>
              {f} ({f === 'all' ? signals.length : f === 'winners' ? signals.filter(s => s.is_winner).length : signals.filter(s => !s.is_winner).length})
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {filtered.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              className={`aureos-card p-4 flex items-center gap-4 ${s.status === 'active' ? 'border-[#00B4FF]/20' : ''}`} data-testid={`signal-${s.id}`}>
              {/* Status Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                s.status === 'active' ? 'bg-[#00B4FF]/15' : s.is_winner ? 'bg-[#00E676]/15' : 'bg-[#FF5252]/15'
              }`}>
                {s.status === 'active' ? <Clock size={18} className="text-[#00B4FF]" /> : s.is_winner ? <CheckCircle size={18} className="text-[#00E676]" /> : <XCircle size={18} className="text-[#FF5252]" />}
              </div>
              {/* Signal Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{s.symbol}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    s.direction.includes('BUY') ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-[#FF5252]/10 text-[#FF5252]'
                  }`}>{s.direction}</span>
                  <span className="text-[10px] font-mono text-[#888]">{s.confidence}%</span>
                  <span className="text-[10px] text-[#555]">{s.timeframe}</span>
                  {s.status === 'active' && <span className="text-[9px] bg-[#00B4FF]/15 text-[#00B4FF] px-1.5 py-0.5 rounded uppercase font-bold animate-pulse">LIVE</span>}
                </div>
                <p className="text-[10px] text-[#666] mt-0.5">Entry: ${s.entry_price?.toLocaleString()} → Current: ${s.current_price?.toLocaleString()}</p>
              </div>
              {/* Outcome */}
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-mono font-bold ${s.outcome_pct >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                  {s.outcome_pct >= 0 ? '+' : ''}{s.outcome_pct}%
                </p>
                <p className="text-[10px] text-[#666]">{s.date}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AureosLayout>
  );
};

export default SignalTimelinePage;
