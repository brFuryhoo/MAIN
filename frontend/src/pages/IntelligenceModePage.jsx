import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Terminal, RefreshCw, Shield, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const IntelligenceModePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/ultra/intelligence-mode`);
      setData(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  if (loading) return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={40} /></div></AureosLayout>;

  const regimeColor = data?.regime === 'RISK-ON' ? '#00E676' : data?.regime === 'RISK-OFF' ? '#FF5252' : '#FF9800';

  return (
    <AureosLayout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="intelligence-mode-page">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="text-aureos-gold" size={28} />
            <h1 className="text-2xl font-bold font-mono tracking-tight text-aureos-gold">INTELLIGENCE MODE</h1>
          </div>
          <Button onClick={fetchData} size="sm" className="aureos-btn-outline text-xs"><RefreshCw size={14} className="mr-1" /> REFRESH</Button>
        </div>

        {/* Regime */}
        <div className="font-mono text-center py-6 border-y border-white/5">
          <p className="text-[10px] text-[#666] uppercase tracking-[0.3em]">MARKET REGIME</p>
          <p className="text-4xl font-bold mt-2" style={{ color: regimeColor }}>{data?.regime}</p>
          <p className="text-sm text-[#888] mt-1">Fear & Greed: <span className="font-bold" style={{ color: regimeColor }}>{data?.fear_greed}</span>/100</p>
        </div>

        {/* Decisions — Pure Data */}
        <div className="space-y-1">
          <div className="grid grid-cols-8 gap-2 px-3 text-[9px] text-[#555] uppercase tracking-wider font-mono">
            <span>ASSET</span><span>ACTION</span><span>CONF</span><span>ENTRY</span><span>STOP</span><span>TARGET</span><span>R:R</span><span>EDGE</span>
          </div>
          {data?.decisions?.map((d, i) => {
            const isGreen = d.action.includes('BUY');
            const color = isGreen ? '#00E676' : '#FF5252';
            return (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="grid grid-cols-8 gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all font-mono text-xs"
                data-testid={`decision-${i}`}>
                <span className="font-bold">{d.asset}</span>
                <span className="font-bold" style={{ color }}>{d.action}</span>
                <span style={{ color: d.confidence >= 80 ? '#00E676' : d.confidence >= 70 ? '#FF9800' : '#888' }}>{d.confidence}%</span>
                <span className="text-[#aaa]">${typeof d.entry === 'number' ? d.entry.toLocaleString(undefined, {maximumFractionDigits: 0}) : d.entry}</span>
                <span className="text-[#FF5252]">${typeof d.stop === 'number' ? d.stop.toLocaleString(undefined, {maximumFractionDigits: 0}) : d.stop}</span>
                <span className="text-[#00E676]">${typeof d.target === 'number' ? d.target.toLocaleString(undefined, {maximumFractionDigits: 0}) : d.target}</span>
                <span className="text-aureos-gold">{d.rr}:1</span>
                <span className="text-[#888] truncate text-[10px]">{d.edge}</span>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-[9px] text-[#444] font-mono uppercase tracking-wider pt-4">
          JARVIS Intelligence Mode — {data?.total_actionable} actionable signals — {new Date().toLocaleTimeString()}
        </p>
      </div>
    </AureosLayout>
  );
};

export default IntelligenceModePage;
