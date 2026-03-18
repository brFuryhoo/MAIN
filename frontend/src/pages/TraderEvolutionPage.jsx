import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { useLanguage } from '@/contexts/LanguageContext';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Sprout, Flame, TrendingUp, Brain, Shield, Activity, Crown, Star, Lock, Check, ChevronRight, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';

const levelIcons = { 'seedling': Sprout, 'flame': Flame, 'trending-up': TrendingUp, 'brain': Brain, 'shield': Shield, 'activity': Activity, 'crown': Crown, 'star': Star };

const TraderEvolutionPage = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchEvolution(); }, []);

  const fetchEvolution = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/distribution/evolution`, { headers });
      setData(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  if (loading) return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;
  if (!data) return null;

  const { current_level, next_level, progress_to_next, all_levels, score, total_trades, unlocked_features } = data;

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="trader-evolution-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">
            Trader <span className="text-gradient-gold">Evolution</span>
          </h1>
          <p className="text-[#666] mt-1 text-sm">Your journey from beginner to legend. Each level unlocks new powers.</p>
        </div>

        {/* Current Level Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="aureos-card p-6" data-testid="current-level-card">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: current_level.color + '20', border: `2px solid ${current_level.color}40` }}>
              {React.createElement(levelIcons[current_level.icon] || Zap, { size: 28, style: { color: current_level.color } })}
            </div>
            <div>
              <p className="text-[10px] text-[#888] uppercase tracking-wider">Current Level</p>
              <h2 className="text-2xl font-bold" style={{ color: current_level.color }}>
                Level {current_level.level}: {current_level.name}
              </h2>
              <p className="text-sm text-[#888]">{current_level.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-[9px] text-[#666] uppercase">Score</p>
              <p className="text-lg font-mono font-bold text-aureos-gold">{score}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-[9px] text-[#666] uppercase">Trades</p>
              <p className="text-lg font-mono font-bold">{total_trades}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-[9px] text-[#666] uppercase">Tier</p>
              <p className="text-lg font-bold" style={{ color: current_level.color }}>{current_level.tier}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-[9px] text-[#666] uppercase">Features Unlocked</p>
              <p className="text-lg font-mono font-bold text-[#00E676]">{unlocked_features?.length || 0}</p>
            </div>
          </div>

          {/* Progress to Next Level */}
          {next_level && (
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#888]">Progress to <span className="font-semibold" style={{ color: next_level.color }}>{next_level.name}</span></span>
                <span className="font-mono text-aureos-gold">{progress_to_next}%</span>
              </div>
              <Progress value={progress_to_next} className="h-2.5" />
              <div className="flex justify-between text-[10px] text-[#555] mt-1">
                <span>Score: {score}/{next_level.min_score}</span>
                <span>Trades: {total_trades}/{next_level.min_trades}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Evolution Timeline */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Evolution Path</h3>
          {all_levels?.map((lvl, i) => {
            const Icon = levelIcons[lvl.icon] || Zap;
            return (
              <motion.div key={lvl.level} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`aureos-card p-4 flex items-center gap-4 transition-all ${lvl.is_current ? 'border-aureos-gold/30' : lvl.is_locked ? 'opacity-50' : ''}`}
                data-testid={`evolution-level-${lvl.level}`}>
                {/* Level Number */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: lvl.is_unlocked ? lvl.color + '20' : '#ffffff08',
                    border: lvl.is_current ? `2px solid ${lvl.color}` : '1px solid transparent',
                  }}>
                  {lvl.is_locked ? (
                    <Lock size={16} className="text-[#555]" />
                  ) : (
                    <Icon size={18} style={{ color: lvl.color }} />
                  )}
                </div>

                {/* Level Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: lvl.is_unlocked ? lvl.color : '#666' }}>
                      Lv.{lvl.level} {lvl.name}
                    </span>
                    {lvl.is_current && <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-aureos-gold/15 text-aureos-gold font-bold">Current</span>}
                    {lvl.is_unlocked && !lvl.is_current && <Check size={12} className="text-[#00E676]" />}
                  </div>
                  <p className="text-[11px] text-[#666] mt-0.5">{lvl.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {lvl.unlocks.map(u => (
                      <span key={u} className={`text-[9px] px-1.5 py-0.5 rounded ${lvl.is_unlocked ? 'bg-white/5 text-[#aaa]' : 'bg-white/[0.02] text-[#555]'}`}>
                        {u}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="text-[10px] text-[#666]">Score: {lvl.min_score}+</p>
                  <p className="text-[10px] text-[#666]">Trades: {lvl.min_trades}+</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AureosLayout>
  );
};

export default TraderEvolutionPage;
