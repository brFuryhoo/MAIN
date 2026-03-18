import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
  Trophy, Crown, Shield, Target, TrendingUp, TrendingDown,
  Award, Flame, Brain, Zap, Star, ChevronUp, ChevronDown,
  RefreshCw, Medal, Users, BarChart3, Lock, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const TIER_CONFIG = {
  Beginner: { color: '#FF5252', bg: 'rgba(255,82,82,0.1)', border: 'rgba(255,82,82,0.25)', icon: Target },
  Intermediate: { color: '#FF9800', bg: 'rgba(255,152,0,0.1)', border: 'rgba(255,152,0,0.25)', icon: Shield },
  Advanced: { color: '#00B4FF', bg: 'rgba(0,180,255,0.1)', border: 'rgba(0,180,255,0.25)', icon: Award },
  Elite: { color: '#CFAE46', bg: 'rgba(207,174,70,0.1)', border: 'rgba(207,174,70,0.25)', icon: Crown },
};

const ACHIEVEMENT_ICONS = {
  zap: Zap, activity: BarChart3, award: Award, 'trending-up': TrendingUp,
  target: Target, shield: Shield, crown: Crown, brain: Brain, flame: Flame,
  eye: Eye, crosshair: Target, 'dollar-sign': Trophy, 'shield-check': Shield,
};

const LeaderboardPage = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState('leaderboard');
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [myScore, setMyScore] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lbRes, rankRes, scoreRes, achRes] = await Promise.all([
        axios.get(`${API}/score/leaderboard`).catch(() => ({ data: { leaderboard: [], total_users: 0 } })),
        axios.get(`${API}/score/my-rank`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API}/score/my-score`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API}/score/achievements`, { headers }).catch(() => ({ data: null })),
      ]);
      setLeaderboard(lbRes.data.leaderboard || []);
      setMyRank(rankRes.data);
      setMyScore(scoreRes.data);
      setAchievements(achRes.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadExplanation = async () => {
    try {
      const res = await axios.get(`${API}/score/explain`, { headers });
      setExplanation(res.data);
    } catch { toast.error('Failed to load explanation'); }
  };

  const score = myScore?.score || 0;
  const tier = myScore?.tier || { name: 'Beginner', color: '#FF5252' };
  const tierCfg = TIER_CONFIG[tier.name] || TIER_CONFIG.Beginner;
  const TierIcon = tierCfg.icon;
  const delta = myScore?.delta || 0;

  if (loading) {
    return (
      <AureosLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <RefreshCw className="animate-spin text-aureos-gold" size={40} />
        </div>
      </AureosLayout>
    );
  }

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="leaderboard-page">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-['Poppins'] flex items-center gap-3">
              <Trophy className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Aureos Score</span>
            </h1>
            <p className="text-[#888] mt-1">Your financial intelligence metric — Trade, evolve, compete.</p>
          </div>
          <Button onClick={fetchData} className="aureos-btn-outline" data-testid="refresh-score-btn">
            <RefreshCw size={16} className="mr-2" /> Refresh
          </Button>
        </div>

        {/* ── MY SCORE HERO CARD ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="aureos-card overflow-hidden relative" data-testid="score-hero-card">
            {/* Glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full opacity-20 blur-[80px]" style={{ background: tier.color }} />

            <div className="relative p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">

                {/* Score Circle */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48">
                    {/* Background ring */}
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                      <circle cx="100" cy="100" r="85" fill="none" stroke={tier.color} strokeWidth="12"
                        strokeDasharray={`${(score / 1000) * 534} 534`}
                        strokeLinecap="round" className="transition-all duration-1000" />
                    </svg>
                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold font-mono tracking-tighter" style={{ color: tier.color }} data-testid="score-value">
                        {score}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-[#888] mt-1">/ 1000</span>
                    </div>
                  </div>
                  {/* Tier badge */}
                  <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: tierCfg.bg, border: `1px solid ${tierCfg.border}` }}>
                    <TierIcon size={16} style={{ color: tier.color }} />
                    <span className="text-sm font-bold uppercase tracking-wider" style={{ color: tier.color }} data-testid="score-tier">
                      {tier.name}
                    </span>
                  </div>
                  {/* Delta */}
                  {delta !== 0 && (
                    <div className={`mt-2 flex items-center gap-1 text-sm font-mono font-bold ${delta > 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`} data-testid="score-delta">
                      {delta > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {delta > 0 ? '+' : ''}{delta} pts
                    </div>
                  )}
                </div>

                {/* Component Breakdown */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Score Breakdown</h3>
                  {myScore?.components && Object.entries(myScore.components).map(([key, comp]) => {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const barColor = comp.score >= 70 ? '#00E676' : comp.score >= 40 ? '#FF9800' : '#FF5252';
                    return (
                      <div key={key} data-testid={`component-${key}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#aaa]">{label} <span className="text-[#555]">({comp.weight}%)</span></span>
                          <span className="text-xs font-mono font-bold" style={{ color: barColor }}>{comp.score}/100</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${comp.score}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="h-full rounded-full"
                            style={{ background: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Progress to next tier */}
                  {myScore?.next_tier && (
                    <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-[#888]">Progress to <span className="font-bold" style={{ color: myScore.next_tier.color }}>{myScore.next_tier.name}</span></span>
                        <span className="font-mono text-[#aaa]">{myScore.progress_to_next}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${myScore.progress_to_next}%` }}
                          transition={{ duration: 1 }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${tier.color}, ${myScore.next_tier.color})` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── TABS ── */}
        <div className="flex gap-2 border-b border-white/5 pb-0">
          {[
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'achievements', label: 'Achievements', icon: Award },
            { id: 'insights', label: 'JARVIS Insights', icon: Brain },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'insights' && !explanation) loadExplanation(); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
                tab === t.id ? 'text-aureos-gold border-aureos-gold' : 'text-[#888] border-transparent hover:text-white'
              }`} data-testid={`tab-${t.id}`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── LEADERBOARD TAB ── */}
        {tab === 'leaderboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* My rank summary */}
            {myRank && myRank.rank > 0 && (
              <div className="aureos-glass p-4 flex items-center justify-between" data-testid="my-rank-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tierCfg.bg }}>
                    <Medal size={20} style={{ color: tier.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Your Global Rank</p>
                    <p className="text-xs text-[#888]">Top {myRank.percentile}% of all traders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono" style={{ color: tier.color }}>#{myRank.rank}</p>
                  <p className="text-[10px] text-[#888]">of {myRank.total_users} traders</p>
                </div>
              </div>
            )}

            {/* Leaderboard table */}
            <div className="aureos-card overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
                  <Users size={14} className="text-aureos-gold" /> Global Rankings
                </h3>
                <span className="text-[10px] text-[#555]">{leaderboard.length} traders</span>
              </div>

              {leaderboard.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {leaderboard.map((entry, i) => {
                    const tc = TIER_CONFIG[entry.tier?.name] || TIER_CONFIG.Beginner;
                    const EntryIcon = tc.icon;
                    const isTop3 = i < 3;
                    const medals = ['#CFAE46', '#C0C0C0', '#CD7F32'];
                    return (
                      <motion.div key={entry.user_id || i}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors ${isTop3 ? 'bg-white/[0.01]' : ''}`}
                        data-testid={`lb-entry-${i}`}
                      >
                        {/* Rank */}
                        <div className="w-8 text-center flex-shrink-0">
                          {isTop3 ? (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: medals[i] + '20' }}>
                              <span className="text-sm font-bold" style={{ color: medals[i] }}>#{entry.rank}</span>
                            </div>
                          ) : (
                            <span className="text-sm font-mono text-[#888]">#{entry.rank}</span>
                          )}
                        </div>
                        {/* User */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate">{entry.username}</span>
                            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: tc.bg }}>
                              <EntryIcon size={10} style={{ color: tc.color }} />
                            </div>
                          </div>
                          <p className="text-[10px] text-[#888]">{entry.total_trades} trades | WR: {entry.win_rate}%</p>
                        </div>
                        {/* Score */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold font-mono" style={{ color: tc.color }}>{entry.score}</p>
                          <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: tc.color }}>{entry.tier?.name}</p>
                        </div>
                        {/* PnL */}
                        <div className="text-right w-24 flex-shrink-0 hidden sm:block">
                          <p className={`text-sm font-mono font-bold ${entry.total_pnl >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                            {entry.total_pnl >= 0 ? '+' : ''}${entry.total_pnl?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-[10px] text-[#888]">{entry.total_return_pct >= 0 ? '+' : ''}{entry.total_return_pct?.toFixed(1)}%</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Trophy className="mx-auto mb-3 text-[#444]" size={40} />
                  <p className="text-[#888] text-sm">No traders ranked yet. Start paper trading to join the leaderboard!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── ACHIEVEMENTS TAB ── */}
        {tab === 'achievements' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {achievements && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="aureos-glass p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Star size={20} className="text-aureos-gold" />
                    <div>
                      <p className="text-sm font-semibold">{achievements.total_unlocked}/{achievements.total_available} Unlocked</p>
                      <p className="text-xs text-[#888]">{achievements.total_points} total points earned</p>
                    </div>
                  </div>
                  <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-aureos-gold rounded-full" style={{ width: `${(achievements.total_unlocked / achievements.total_available) * 100}%` }} />
                  </div>
                </div>

                {/* Achievement Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {achievements.achievements?.map((a, i) => {
                    const AchIcon = ACHIEVEMENT_ICONS[a.icon] || Award;
                    return (
                      <motion.div key={a.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className={`p-4 rounded-xl border transition-all ${
                          a.unlocked
                            ? 'bg-[#CFAE46]/5 border-[#CFAE46]/20 hover:border-[#CFAE46]/40'
                            : 'bg-white/[0.02] border-white/5 opacity-50'
                        }`} data-testid={`achievement-${a.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            a.unlocked ? 'bg-[#CFAE46]/15' : 'bg-white/5'
                          }`}>
                            {a.unlocked ? (
                              <AchIcon size={18} className="text-aureos-gold" />
                            ) : (
                              <Lock size={16} className="text-[#555]" />
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${a.unlocked ? 'text-aureos-gold' : 'text-[#666]'}`}>{a.name}</p>
                            <p className="text-[11px] text-[#888] mt-0.5">{a.description}</p>
                            <p className="text-[10px] font-mono mt-1" style={{ color: a.unlocked ? '#CFAE46' : '#555' }}>+{a.points} pts</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── JARVIS INSIGHTS TAB ── */}
        {tab === 'insights' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {explanation ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="aureos-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#00B4FF]/15 flex items-center justify-center">
                      <Brain size={20} className="text-[#00B4FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#00B4FF]">JARVIS Score Analysis</p>
                      <p className="text-xs text-[#888]">{explanation.summary}</p>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-[#00E676]/5 border border-[#00E676]/15">
                      <p className="text-[10px] uppercase tracking-wider text-[#00E676] mb-1">Strongest Area</p>
                      <p className="text-sm font-semibold">{explanation.strongest_area}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FF5252]/5 border border-[#FF5252]/15">
                      <p className="text-[10px] uppercase tracking-wider text-[#FF5252] mb-1">Needs Work</p>
                      <p className="text-sm font-semibold">{explanation.weakest_area}</p>
                    </div>
                  </div>

                  {/* Explanations */}
                  <div className="space-y-2 mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-[#888] font-semibold">Analysis</p>
                    {explanation.explanations?.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-[#ccc]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00B4FF] mt-2 flex-shrink-0" />
                        <span>{e}</span>
                      </div>
                    ))}
                  </div>

                  {/* Suggestions */}
                  {explanation.suggestions?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-aureos-gold font-semibold">How to Improve</p>
                      {explanation.suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-[#ccc]">
                          <Zap size={14} className="text-aureos-gold mt-0.5 flex-shrink-0" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="aureos-card p-12 text-center">
                <Brain className="mx-auto mb-3 text-[#444]" size={40} />
                <p className="text-[#888]">Loading JARVIS insights...</p>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </AureosLayout>
  );
};

export default LeaderboardPage;
