import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Radar, Zap, TrendingUp, TrendingDown, AlertTriangle, Target, RefreshCw, Clock, BarChart3, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const OpportunityScannerPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 30000); return () => clearInterval(iv); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/advantage/opportunity-scanner`);
      setData(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const typeIcons = { breakout: Zap, reversal: TrendingDown, liquidity_zone: Target, momentum: TrendingUp, divergence: AlertTriangle };
  const typeColors = { breakout: '#00E676', reversal: '#FF9800', liquidity_zone: '#00B4FF', momentum: '#CFAE46', divergence: '#FF5252' };
  const urgencyColors = { high: '#FF5252', medium: '#FF9800', low: '#00E676' };

  const filtered = data?.opportunities?.filter(o => filter === 'all' || o.type === filter) || [];

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="opportunity-scanner-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">Opportunity <span className="text-gradient-gold">Scanner</span></h1>
            <p className="text-[#666] mt-1 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              Live scanning {data?.assets_monitored || 0} assets | {data?.total || 0} active opportunities
            </p>
          </div>
          <Button onClick={fetchData} className="aureos-btn-gold" data-testid="refresh-scanner-btn">
            <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Scan Now
          </Button>
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2">
          {['all', 'breakout', 'reversal', 'momentum', 'liquidity_zone', 'divergence'].map(f => (
            <Button key={f} size="sm" onClick={() => setFilter(f)}
              className={`text-[11px] h-7 px-3 capitalize ${filter === f ? 'bg-aureos-gold/20 text-aureos-gold border-aureos-gold/30' : 'bg-white/5 text-[#888]'}`}
              data-testid={`filter-${f}`}>
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </Button>
          ))}
        </div>

        {/* Opportunities */}
        <div className="space-y-3">
          {filtered.map((opp, i) => {
            const Icon = typeIcons[opp.type] || Activity;
            const color = typeColors[opp.type] || '#CFAE46';
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="aureos-card p-5 hover:border-white/10 transition-all" data-testid={`opportunity-${i}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: color + '15', border: `1px solid ${color}30` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{opp.title}</h3>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold"
                        style={{ background: (urgencyColors[opp.urgency] || '#FF9800') + '15', color: urgencyColors[opp.urgency] || '#FF9800' }}>
                        {opp.urgency}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#888] mb-2">{opp.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-[#666]">
                        <Target size={11} /> Key Level: <span className="font-mono text-white">${opp.key_level?.toLocaleString()}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[#666]">
                        <Clock size={11} /> {opp.timeframe}
                      </span>
                      <span className="font-mono px-2 py-0.5 rounded" style={{ background: color + '15', color }}>
                        {opp.direction}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto"
                      style={{ background: `conic-gradient(${color} ${opp.confidence}%, transparent ${opp.confidence}%)` }}>
                      <div className="w-9 h-9 rounded-lg bg-[#161718] flex items-center justify-center">
                        <span className="text-xs font-mono font-bold" style={{ color }}>{opp.confidence}%</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-[#555] mt-1 uppercase">Confidence</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16">
            <Radar className="mx-auto mb-3 text-[#444]" size={36} />
            <p className="text-[#666] text-sm">No opportunities matching this filter. Scanner is continuously monitoring.</p>
          </div>
        )}
      </div>
    </AureosLayout>
  );
};

export default OpportunityScannerPage;
