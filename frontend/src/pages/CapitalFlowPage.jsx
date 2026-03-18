import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
  Map, RefreshCw, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const CapitalFlowPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/ultra/capital-flow`);
      setData(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  if (loading) return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={40} /></div></AureosLayout>;

  const sectors = data?.sectors || [];
  const sorted = [...sectors].sort((a, b) => b.flow - a.flow);

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="capital-flow-page">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-['Poppins'] flex items-center gap-3">
              <Map className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Capital Flow Heatmap</span>
            </h1>
            <p className="text-[#888] mt-1">Where institutional money is flowing — follow the smart money.</p>
          </div>
          <Button onClick={fetchData} className="aureos-btn-outline"><RefreshCw size={16} className="mr-2" /> Refresh</Button>
        </div>

        {/* Summary Bar */}
        <div className="aureos-glass px-5 py-3 flex items-center gap-6 text-[11px]">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-aureos-gold" />
            <span className="text-[#888]">Trend:</span>
            <span className={`font-bold uppercase ${data?.dominant_trend === 'Risk-On' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>{data?.dominant_trend}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpRight size={14} className="text-[#00E676]" />
            <span className="text-[#888]">Inflow:</span><span className="font-mono font-bold text-[#00E676]">+{data?.total_inflow}%</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownRight size={14} className="text-[#FF5252]" />
            <span className="text-[#888]">Outflow:</span><span className="font-mono font-bold text-[#FF5252]">{data?.total_outflow}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#888]">Net:</span>
            <span className={`font-mono font-bold ${data?.net_flow >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>{data?.net_flow >= 0 ? '+' : ''}{data?.net_flow}%</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {sorted.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
              className="p-4 rounded-xl border transition-all hover:scale-[1.02]"
              style={{ borderColor: s.color + '25', background: s.color + '08' }}
              data-testid={`flow-${s.id}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#888]">{s.name}</span>
                {s.flow > 0 ? <ArrowUpRight size={14} style={{ color: s.color }} /> : <ArrowDownRight size={14} style={{ color: s.color }} />}
              </div>
              <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.flow > 0 ? '+' : ''}{s.flow}%</p>
              <p className="text-[10px] text-[#888] uppercase mt-1">{s.status.replace(/_/g, ' ')}</p>
              {/* Intensity bar */}
              <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${s.intensity}%` }} transition={{ duration: 0.8 }}
                  className="h-full rounded-full" style={{ background: s.color }} />
              </div>
              {/* Volume */}
              <p className="text-[9px] text-[#666] mt-2">Vol: ${s.volume}B/day</p>
              {/* Leaders */}
              <div className="flex flex-wrap gap-1 mt-2">
                {s.leaders?.map(l => <span key={l} className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-[#aaa]">{l}</span>)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AureosLayout>
  );
};

export default CapitalFlowPage;
