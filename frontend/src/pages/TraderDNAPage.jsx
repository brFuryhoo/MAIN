import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Dna, ShieldAlert, Target, TrendingUp, AlertTriangle, Heart, Crosshair, BarChart3, Eye, Brain, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';

const TraderDNAPage = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDNA(); }, []);

  const fetchDNA = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/advantage/trader-dna`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch { setData({ status: 'insufficient_data', trades_needed: 3, message: 'Execute more trades to unlock your Trader DNA.' }); }
    setLoading(false);
  };

  if (loading) return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  if (data?.status === 'insufficient_data') {
    return (
      <AureosLayout>
        <div className="flex items-center justify-center h-[60vh]" data-testid="trader-dna-page">
          <div className="text-center max-w-md">
            <Dna className="mx-auto mb-4 text-aureos-gold" size={48} />
            <h2 className="text-2xl font-bold mb-2">Trader DNA Locked</h2>
            <p className="text-[#888] mb-4">{data.message}</p>
            <p className="text-sm text-[#666]">Need {data.trades_needed} more trade(s) to unlock</p>
          </div>
        </div>
      </AureosLayout>
    );
  }

  const dna = data?.dna;
  if (!dna) return null;

  const riskColor = dna.risk_tolerance?.level === 'aggressive' ? '#FF5252' : dna.risk_tolerance?.level === 'moderate' ? '#FF9800' : '#00E676';
  const profileIcons = { 'The Sniper': Crosshair, 'The Maverick': TrendingUp, 'The Operator': Target, 'The Gambler': AlertTriangle, 'The Apprentice': Brain, 'The Guardian': ShieldAlert, 'The Strategist': BarChart3 };
  const ProfileIcon = profileIcons[dna.profile_type] || Brain;

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="trader-dna-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">Trader <span className="text-gradient-gold">DNA</span></h1>
            <p className="text-[#666] mt-1 text-sm">JARVIS behavioral intelligence profile</p>
          </div>
          <Button onClick={fetchDNA} className="aureos-btn-gold" data-testid="refresh-dna-btn">
            <RefreshCw size={14} className="mr-2" /> Refresh
          </Button>
        </div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="aureos-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${riskColor}15`, border: `1px solid ${riskColor}30` }}>
              <ProfileIcon size={28} style={{ color: riskColor }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" data-testid="dna-profile-type">{dna.profile_type}</h2>
              <p className="text-[#888] text-sm">Win Rate: <span className="text-aureos-gold font-mono">{dna.stats?.win_rate}%</span> | {dna.stats?.total_trades} trades</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Risk Tolerance" value={dna.risk_tolerance?.level} sub={`${dna.risk_tolerance?.avg_position_pct}% avg position`} color={riskColor} />
            <StatCard label="Entry Timing" value={dna.entry_timing?.style} sub={`${dna.entry_timing?.early_exit_rate}% early exits`} color="#00B4FF" />
            <StatCard label="Emotions" value={dna.emotional_patterns?.pattern?.replace('_', ' ')} sub={`${dna.emotional_patterns?.revenge_trade_rate}% revenge rate`} color="#9C27B0" />
            <StatCard label="Volatility" value={dna.volatility_reaction?.replace(/_/g, ' ')} sub={`Direction: ${dna.asset_preferences?.direction_bias?.replace('_', ' ')}`} color="#FF9800" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Profile */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="aureos-card p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert size={14} className="text-aureos-gold" /> Risk Profile
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#888]">Risk Score</span>
                  <span className="font-mono font-bold" style={{ color: riskColor }}>{dna.risk_tolerance?.score}/100</span>
                </div>
                <Progress value={dna.risk_tolerance?.score} className="h-2" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#888]">Avg Position Size</span>
                <span className="font-mono">{dna.risk_tolerance?.avg_position_pct}% of capital</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#888]">Max Position Size</span>
                <span className="font-mono">{dna.risk_tolerance?.max_position_pct}% of capital</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#888]">Max Consecutive Losses</span>
                <span className="font-mono">{dna.emotional_patterns?.max_consecutive_losses}</span>
              </div>
            </div>
          </motion.div>

          {/* Favorite Assets */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="aureos-card p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Heart size={14} className="text-aureos-gold" /> Asset Preferences
            </h3>
            <div className="space-y-3">
              {dna.asset_preferences?.favorites?.map((a, i) => (
                <div key={a.symbol} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono w-5 h-5 flex items-center justify-center rounded bg-aureos-gold/10 text-aureos-gold">{i + 1}</span>
                    <span className="font-mono font-semibold text-sm">{a.symbol}</span>
                  </div>
                  <span className="text-[#888] text-xs">{a.trades} trades</span>
                </div>
              ))}
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-white/5">
                <span className="text-[#888]">Buy/Long Ratio</span>
                <span className="font-mono text-aureos-gold">{dna.asset_preferences?.buy_ratio}%</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Warnings */}
        {dna.warnings?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="aureos-card p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#FF5252]" /> JARVIS Behavioral Warnings
            </h3>
            <div className="space-y-3">
              {dna.warnings.map((w, i) => (
                <div key={i} className="p-3 rounded-lg border" style={{
                  background: w.severity === 'high' ? 'rgba(255,82,82,0.05)' : 'rgba(255,152,0,0.05)',
                  borderColor: w.severity === 'high' ? 'rgba(255,82,82,0.2)' : 'rgba(255,152,0,0.2)',
                }} data-testid={`dna-warning-${i}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: w.severity === 'high' ? '#FF5252' : '#FF9800' }} />
                    <p className="text-sm">{w.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recommendations */}
        {dna.recommendations?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="aureos-card p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Brain size={14} className="text-[#00B4FF]" /> JARVIS Personalized Recommendations
            </h3>
            <div className="space-y-2">
              {dna.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03]">
                  <ChevronRight size={14} className="text-[#00B4FF] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#ccc]">{r}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AureosLayout>
  );
};

const StatCard = ({ label, value, sub, color }) => (
  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
    <p className="text-[10px] uppercase tracking-wider text-[#666] mb-1">{label}</p>
    <p className="text-sm font-semibold capitalize" style={{ color }}>{value}</p>
    <p className="text-[10px] text-[#555] mt-0.5">{sub}</p>
  </div>
);

export default TraderDNAPage;
