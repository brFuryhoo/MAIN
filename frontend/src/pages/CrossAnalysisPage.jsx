import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
  Brain, RefreshCw, Shield, Target, TrendingUp, AlertTriangle,
  Zap, Globe, ArrowUpRight, ArrowDownRight, Crosshair, Radio,
  ChevronRight, Flame, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const CrossAnalysisPage = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/ultra/cross-analysis`);
      setData(res.data);
    } catch { toast.error('Failed to load analysis'); }
    setLoading(false);
  };

  const loadBriefing = async () => {
    setBriefingLoading(true);
    try {
      const res = await axios.get(`${API}/ultra/jarvis-briefing`, { headers, timeout: 60000 });
      setBriefing(res.data);
    } catch { toast.error('Briefing generation failed'); }
    setBriefingLoading(false);
  };

  if (loading) {
    return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={40} /></div></AureosLayout>;
  }

  const regime = data?.market_regime || 'NEUTRAL';
  const regimeColor = regime === 'RISK-ON' ? '#00E676' : regime === 'RISK-OFF' ? '#FF5252' : '#FF9800';

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="cross-analysis-page">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-['Poppins'] flex items-center gap-3">
              <Brain className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">JARVIS Intelligence Hub</span>
            </h1>
            <p className="text-[#888] mt-1">Cross-information analysis engine — All data, one brain.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadBriefing} disabled={briefingLoading} className="aureos-btn-gold" data-testid="gen-briefing-btn">
              {briefingLoading ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Radio size={16} className="mr-2" />}
              {briefingLoading ? 'Generating...' : 'JARVIS Briefing'}
            </Button>
            <Button onClick={fetchData} className="aureos-btn-outline"><RefreshCw size={16} className="mr-2" /> Refresh</Button>
          </div>
        </div>

        {/* Regime Banner */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl px-5 py-3 flex items-center justify-center gap-3 font-semibold text-sm tracking-wider uppercase"
          style={{ background: `${regimeColor}10`, border: `1px solid ${regimeColor}25`, color: regimeColor }}
          data-testid="regime-banner">
          <Shield size={16} />
          Market Regime: {regime} | Fear & Greed: {data?.fear_greed}/100 | Cross-Confidence: {data?.cross_score}%
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: regimeColor }} />
        </motion.div>

        {/* JARVIS Briefing */}
        {briefing && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="aureos-card p-6" data-testid="jarvis-briefing">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#00B4FF]/15 flex items-center justify-center"><Brain size={20} className="text-[#00B4FF]" /></div>
              <div>
                <p className="text-sm font-semibold text-[#00B4FF]">JARVIS Institutional Briefing</p>
                <p className="text-[10px] text-[#888]">Generated {new Date(briefing.generated_at).toLocaleTimeString()}</p>
              </div>
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-[#ccc] leading-relaxed whitespace-pre-wrap text-sm">
              {briefing.briefing}
            </div>
          </motion.div>
        )}

        {/* Opportunities + Warnings + Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Opportunities */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="aureos-card p-5">
            <h3 className="text-sm font-semibold text-[#00E676] uppercase tracking-wider flex items-center gap-2 mb-4">
              <Target size={14} /> Opportunities ({data?.opportunities?.length || 0})
            </h3>
            <div className="space-y-3">
              {data?.opportunities?.map((o, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#00E676]/5 border border-[#00E676]/10" data-testid={`opportunity-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#00E676]">{o.action}</span>
                    <span className="text-[10px] font-mono text-[#888]">{o.confidence}%</span>
                  </div>
                  <p className="text-sm font-semibold">{o.title}</p>
                  <p className="text-[11px] text-[#888] mt-1">{o.detail}</p>
                  {o.assets && <div className="flex gap-1 mt-2">{o.assets.map(a => <span key={a} className="text-[9px] bg-[#00E676]/10 text-[#00E676] px-1.5 py-0.5 rounded">{a}</span>)}</div>}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Warnings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="aureos-card p-5">
            <h3 className="text-sm font-semibold text-[#FF5252] uppercase tracking-wider flex items-center gap-2 mb-4">
              <AlertTriangle size={14} /> Warnings ({data?.warnings?.length || 0})
            </h3>
            <div className="space-y-3">
              {data?.warnings?.map((w, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#FF5252]/5 border border-[#FF5252]/10" data-testid={`warning-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#FF5252]">{w.action}</span>
                    <span className="text-[10px] font-mono text-[#888]">{w.confidence}%</span>
                  </div>
                  <p className="text-sm font-semibold">{w.title}</p>
                  <p className="text-[11px] text-[#888] mt-1">{w.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Insights */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="aureos-card p-5">
            <h3 className="text-sm font-semibold text-[#00B4FF] uppercase tracking-wider flex items-center gap-2 mb-4">
              <Zap size={14} /> Insights ({data?.insights?.length || 0})
            </h3>
            <div className="space-y-3">
              {data?.insights?.map((ins, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#00B4FF]/5 border border-[#00B4FF]/10" data-testid={`insight-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#00B4FF]">{ins.action}</span>
                    <span className="text-[10px] font-mono text-[#888]">{ins.confidence}%</span>
                  </div>
                  <p className="text-sm font-semibold">{ins.title}</p>
                  <p className="text-[11px] text-[#888] mt-1">{ins.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AureosLayout>
  );
};

export default CrossAnalysisPage;
