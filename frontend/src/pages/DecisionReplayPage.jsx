import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
  RotateCcw, RefreshCw, Zap, ChevronRight, TrendingUp, TrendingDown,
  Target, Award, Brain, Shield, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const DecisionReplayPage = () => {
  const { token } = useAuth();
  const [trades, setTrades] = useState([]);
  const [replay, setReplay] = useState(null);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replayLoading, setReplayLoading] = useState(false);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchTrades(); }, []);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/ultra/decision-replay-list`, { headers });
      setTrades(res.data.trades || []);
    } catch { toast.error('Failed to load trades'); }
    setLoading(false);
  };

  const loadReplay = async (tradeId) => {
    setSelectedTrade(tradeId);
    setReplayLoading(true);
    setReplay(null);
    try {
      const res = await axios.get(`${API}/ultra/decision-replay/${tradeId}`, { headers, timeout: 60000 });
      setReplay(res.data);
    } catch { toast.error('Replay generation failed'); }
    setReplayLoading(false);
  };

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="decision-replay-page">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-['Poppins'] flex items-center gap-3">
            <RotateCcw className="text-aureos-gold" size={32} />
            <span className="text-gradient-gold">Decision Replay</span>
          </h1>
          <p className="text-[#888] mt-1">Review your trades — learn from every decision with JARVIS AI analysis.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Trade List */}
          <div className="lg:col-span-4">
            <div className="aureos-card p-4">
              <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Closed Trades ({trades.length})</h3>
              {loading ? (
                <div className="p-8 text-center"><RefreshCw className="animate-spin text-aureos-gold mx-auto" size={24} /></div>
              ) : trades.length > 0 ? (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {trades.map((t) => (
                    <motion.button key={t.trade_id} onClick={() => loadReplay(t.trade_id)}
                      whileHover={{ scale: 1.01 }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedTrade === t.trade_id ? 'border-aureos-gold/40 bg-[#CFAE46]/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                      }`} data-testid={`replay-trade-${t.trade_id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {t.pnl >= 0 ? <TrendingUp size={14} className="text-[#00E676]" /> : <TrendingDown size={14} className="text-[#FF5252]" />}
                          <span className="font-semibold text-sm">{t.symbol}</span>
                          <span className="text-[10px] text-[#888] uppercase">{t.action}</span>
                        </div>
                        <span className={`font-mono text-sm font-bold ${t.pnl >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#666]">
                        <span>${t.entry_price?.toLocaleString()} → ${t.close_price?.toLocaleString()}</span>
                        <span>({t.pnl_pct > 0 ? '+' : ''}{t.pnl_pct}%)</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#888] py-8 text-sm">No closed trades yet. Start paper trading!</p>
              )}
            </div>
          </div>

          {/* Replay Panel */}
          <div className="lg:col-span-8">
            {replayLoading ? (
              <div className="aureos-card p-12 text-center">
                <Brain className="animate-pulse text-[#00B4FF] mx-auto mb-3" size={40} />
                <p className="text-[#888]">JARVIS is analyzing your trade decision...</p>
              </div>
            ) : replay ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Trade Summary */}
                <div className="aureos-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${replay.trade.pnl >= 0 ? 'bg-[#00E676]/15' : 'bg-[#FF5252]/15'}`}>
                        {replay.trade.pnl >= 0 ? <TrendingUp size={24} className="text-[#00E676]" /> : <TrendingDown size={24} className="text-[#FF5252]" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{replay.trade.action.toUpperCase()} {replay.trade.symbol}</h3>
                        <p className="text-xs text-[#888]">${replay.trade.entry_price?.toLocaleString()} → ${replay.trade.close_price?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold font-mono ${replay.trade.pnl >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                        {replay.trade.pnl >= 0 ? '+' : ''}${replay.trade.pnl?.toFixed(2)}
                      </p>
                      <p className="text-xs text-[#888]">{replay.trade.pnl_pct > 0 ? '+' : ''}{replay.trade.pnl_pct}%</p>
                    </div>
                  </div>
                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-3">
                    <ScoreCard label="Entry Timing" value={replay.entry_timing_score} />
                    <ScoreCard label="Exit Timing" value={replay.exit_timing_score} />
                    <ScoreCard label="Risk Grade" value={replay.risk_grade} isGrade />
                  </div>
                </div>

                {/* AI Replay */}
                <div className="aureos-card p-6" data-testid="replay-analysis">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain size={16} className="text-[#00B4FF]" />
                    <span className="text-sm font-semibold text-[#00B4FF]">JARVIS Decision Analysis</span>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none text-[#ccc] leading-relaxed whitespace-pre-wrap text-sm">
                    {replay.replay}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="aureos-card p-16 text-center">
                <RotateCcw className="mx-auto mb-3 text-[#444]" size={48} />
                <p className="text-[#888]">Select a trade to replay the decision</p>
                <p className="text-[10px] text-[#555] mt-1">JARVIS will analyze every aspect of your trade</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AureosLayout>
  );
};

const ScoreCard = ({ label, value, isGrade }) => {
  const color = isGrade
    ? (value?.startsWith('A') ? '#00E676' : value?.startsWith('B') ? '#FF9800' : '#FF5252')
    : (value >= 70 ? '#00E676' : value >= 50 ? '#FF9800' : '#FF5252');
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
      <p className="text-2xl font-bold font-mono" style={{ color }}>{isGrade ? value : `${value}%`}</p>
      <p className="text-[10px] text-[#888] uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
};

export default DecisionReplayPage;
