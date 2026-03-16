import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, TrendingUp, TrendingDown, BarChart3, RefreshCw,
  Play, Target, Award, Activity, Cpu, FlaskConical, Loader2,
  ChevronRight, ArrowUpRight, ArrowDownRight, Minus, History,
  Layers, Crosshair, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const QuantLabPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [performance, setPerformance] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [backtest, setBacktest] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [experiments, setExperiments] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = useCallback(async () => {
    try {
      const [perfResp, rankResp] = await Promise.all([
        axios.get(`${API}/quant/performance`, { headers }),
        axios.get(`${API}/quant/rankings`, { headers }),
      ]);
      setPerformance(perfResp.data);
      setRankings(rankResp.data);
    } catch {
      toast.error('Failed to load Quant Lab data');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runBacktest = async () => {
    setIsRunning('backtest');
    toast.info('JARVIS is running backtest simulation...');
    try {
      const resp = await axios.post(`${API}/quant/backtest`, {}, { headers });
      setBacktest(resp.data);
      if (resp.data.status === 'complete') {
        toast.success(`Backtest complete! Accuracy: ${resp.data.accuracy}%`);
      } else {
        toast.warning(resp.data.message);
      }
      fetchData();
    } catch { toast.error('Backtest failed'); }
    finally { setIsRunning(null); }
  };

  const runOptimization = async () => {
    setIsRunning('optimize');
    toast.info('JARVIS is optimizing signal weights...');
    try {
      const resp = await axios.post(`${API}/quant/optimize`, {}, { headers });
      if (resp.data.status === 'complete') {
        toast.success(`Optimization complete! Improvement: ${resp.data.improvement}%`);
      } else {
        toast.warning(resp.data.message);
      }
      fetchData();
    } catch { toast.error('Optimization failed'); }
    finally { setIsRunning(null); }
  };

  const discoverPatterns = async () => {
    setIsRunning('patterns');
    toast.info('JARVIS is scanning for new patterns...');
    try {
      const resp = await axios.get(`${API}/quant/patterns`, { headers });
      setPatterns(resp.data);
      if (resp.data.status === 'complete') {
        toast.success(`Found ${resp.data.discovery_count} new pattern(s)!`);
      } else {
        toast.warning(resp.data.message);
      }
    } catch { toast.error('Pattern discovery failed'); }
    finally { setIsRunning(null); }
  };

  const loadExperiments = async () => {
    try {
      const resp = await axios.get(`${API}/quant/experiments`, { headers });
      setExperiments(resp.data);
    } catch {}
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'rankings', label: 'Rankings', icon: Award },
    { id: 'backtest', label: 'Backtest', icon: Target },
    { id: 'patterns', label: 'Patterns', icon: Crosshair },
    { id: 'history', label: 'Log', icon: History },
  ];

  const CATEGORY_COLORS = {
    momentum: '#00B4FF', trend: '#CFAE46', volatility: '#FF6B6B',
    volume: '#00E676', structure: '#9C27B0', quantitative: '#FF9800',
    risk: '#E91E63', macro: '#4CAF50', microstructure: '#00BCD4',
  };

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="quant-lab-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins'] flex items-center gap-3">
              <Brain className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Quant Lab</span>
            </h1>
            <p className="text-[#888] mt-1">JARVIS Autonomous Quantitative Intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={runBacktest} disabled={!!isRunning} className="aureos-btn-outline" data-testid="run-backtest-btn">
              {isRunning === 'backtest' ? <Loader2 className="animate-spin mr-2" size={16} /> : <Target size={16} className="mr-2" />}
              Backtest
            </Button>
            <Button onClick={runOptimization} disabled={!!isRunning} className="aureos-btn-gold" data-testid="run-optimize-btn">
              {isRunning === 'optimize' ? <Loader2 className="animate-spin mr-2" size={16} /> : <Cpu size={16} className="mr-2" />}
              Optimize
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'history' && !experiments) loadExperiments();
                if (tab.id === 'patterns' && !patterns) discoverPatterns();
              }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-[#CFAE46]/15 text-aureos-gold' : 'text-[#888] hover:text-white hover:bg-white/5'
                }`} data-testid={`tab-${tab.id}`}>
                <Icon size={16} />{tab.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="aureos-card p-12 text-center">
            <Loader2 className="animate-spin text-aureos-gold mx-auto" size={32} />
            <p className="text-[#888] mt-3">Loading Quant Lab...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={BarChart3} label="Analyses" value={performance?.total_analyses || 0} color="#CFAE46" />
                  <StatCard icon={Layers} label="Assets" value={performance?.unique_assets || 0} color="#00B4FF" />
                  <StatCard icon={FlaskConical} label="Experiments" value={performance?.experiments_run || 0} color="#00E676" />
                  <StatCard icon={Shield} label="Decisions Logged" value={performance?.decisions_logged || 0} color="#FF9800" />
                </div>

                {/* Signal Distribution */}
                {performance?.signal_distribution && (
                  <div className="aureos-card p-6">
                    <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Signal Distribution</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(performance.signal_distribution).map(([signal, count]) => (
                        <div key={signal} className={`p-4 rounded-xl text-center ${
                          signal === 'BUY' ? 'bg-[#00E676]/10' : signal === 'SELL' ? 'bg-[#FF5252]/10' : 'bg-white/5'
                        }`}>
                          <p className={`text-2xl font-bold font-mono ${
                            signal === 'BUY' ? 'text-[#00E676]' : signal === 'SELL' ? 'text-[#FF5252]' : 'text-[#888]'
                          }`}>{count}</p>
                          <p className="text-xs text-[#888] mt-1">{signal} Signals</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Weights */}
                {performance?.current_weights && (
                  <div className="aureos-card p-6">
                    <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Current Model Weights</h3>
                    <div className="space-y-3">
                      {Object.entries(performance.current_weights).sort((a, b) => b[1] - a[1]).map(([key, value]) => (
                        <WeightBar key={key} indicatorKey={key} value={value} color={CATEGORY_COLORS} />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* RANKINGS TAB */}
            {activeTab === 'rankings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {rankings?.rankings?.map((ind, i) => (
                  <motion.div key={ind.indicator} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="aureos-card p-4 flex items-center justify-between" data-testid={`ranking-${ind.indicator}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        i === 0 ? 'bg-[#CFAE46]/20 text-aureos-gold' : i === 1 ? 'bg-white/10 text-white' : i === 2 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' : 'bg-white/5 text-[#888]'
                      }`}>#{i + 1}</div>
                      <div>
                        <p className="font-semibold">{ind.name}</p>
                        <p className="text-xs text-[#888]">
                          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase" style={{
                            background: `${CATEGORY_COLORS[ind.category] || '#888'}15`,
                            color: CATEGORY_COLORS[ind.category] || '#888',
                          }}>{ind.category}</span>
                          <span className="ml-2">{ind.total_signals} signals</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={`font-mono font-bold ${ind.accuracy > 60 ? 'text-[#00E676]' : ind.accuracy > 45 ? 'text-aureos-gold' : 'text-[#FF5252]'}`}>
                          {ind.accuracy}%
                        </p>
                        <p className="text-[10px] text-[#888]">Accuracy</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">{ind.current_weight}%</p>
                        <p className="text-[10px] text-[#888]">Weight</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {rankings?.status === 'default' && (
                  <div className="aureos-card p-8 text-center">
                    <Target className="text-[#888] mx-auto mb-3" size={40} />
                    <p className="text-[#888]">{rankings.message}</p>
                    <p className="text-xs text-[#666] mt-2">Run analyses on different assets to build ranking data</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* BACKTEST TAB */}
            {activeTab === 'backtest' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {!backtest ? (
                  <div className="aureos-card p-12 text-center">
                    <Target className="text-aureos-gold mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-semibold mb-2">Run Backtest</h3>
                    <p className="text-[#888] mb-6 max-w-md mx-auto">
                      JARVIS will evaluate all your historical analyses against actual price outcomes to measure model accuracy.
                    </p>
                    <Button onClick={runBacktest} disabled={!!isRunning} className="aureos-btn-gold" data-testid="backtest-start-btn">
                      {isRunning === 'backtest' ? <Loader2 className="animate-spin mr-2" size={16} /> : <Play size={16} className="mr-2" />}
                      Start Backtest
                    </Button>
                  </div>
                ) : backtest.status === 'insufficient_data' ? (
                  <div className="aureos-card p-8 text-center">
                    <BarChart3 className="text-[#888] mx-auto mb-3" size={40} />
                    <p className="text-[#888]">{backtest.message}</p>
                  </div>
                ) : (
                  <>
                    {/* Backtest Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <MetricCard label="Accuracy" value={`${backtest.accuracy}%`} color={backtest.accuracy > 55 ? '#00E676' : '#FF5252'} />
                      <MetricCard label="Win Rate" value={`${backtest.win_rate}%`} color={backtest.win_rate > 50 ? '#00E676' : '#FF5252'} />
                      <MetricCard label="Sharpe Ratio" value={backtest.sharpe_ratio} color={backtest.sharpe_ratio > 0 ? '#00E676' : '#FF5252'} />
                      <MetricCard label="Total P&L" value={`${backtest.total_profit_pct > 0 ? '+' : ''}${backtest.total_profit_pct}%`}
                        color={backtest.total_profit_pct > 0 ? '#00E676' : '#FF5252'} />
                    </div>

                    {/* Recent Trades */}
                    {backtest.trades?.length > 0 && (
                      <div className="aureos-card p-6">
                        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Recent Trades ({backtest.total_trades} total)</h3>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {backtest.trades.slice(0, 20).map((trade, i) => (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${trade.correct ? 'bg-[#00E676]/5' : 'bg-[#FF5252]/5'}`}>
                              <div className="flex items-center gap-3">
                                {trade.correct ? <ArrowUpRight size={16} className="text-[#00E676]" /> : <ArrowDownRight size={16} className="text-[#FF5252]" />}
                                <span className="font-mono font-semibold">{trade.symbol}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  trade.predicted === 'BUY' ? 'bg-[#00E676]/15 text-[#00E676]' : trade.predicted === 'SELL' ? 'bg-[#FF5252]/15 text-[#FF5252]' : 'bg-white/10 text-[#888]'
                                }`}>{trade.predicted}</span>
                                <ChevronRight size={12} className="text-[#666]" />
                                <span className={`text-xs ${trade.actual === 'BUY' ? 'text-[#00E676]' : trade.actual === 'SELL' ? 'text-[#FF5252]' : 'text-[#888]'}`}>
                                  {trade.actual}
                                </span>
                              </div>
                              <span className={`font-mono text-sm ${trade.profit_pct > 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                                {trade.profit_pct > 0 ? '+' : ''}{trade.profit_pct}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* PATTERNS TAB */}
            {activeTab === 'patterns' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {isRunning === 'patterns' ? (
                  <div className="aureos-card p-12 text-center">
                    <Loader2 className="animate-spin text-aureos-gold mx-auto" size={32} />
                    <p className="text-[#888] mt-3">Scanning for patterns...</p>
                  </div>
                ) : !patterns || patterns.status === 'insufficient_data' ? (
                  <div className="aureos-card p-12 text-center">
                    <Crosshair className="text-aureos-gold mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-semibold mb-2">Pattern Discovery</h3>
                    <p className="text-[#888] mb-6">{patterns?.message || 'JARVIS will scan indicator combinations for high-probability patterns.'}</p>
                    <Button onClick={discoverPatterns} disabled={!!isRunning} className="aureos-btn-gold">
                      <FlaskConical size={16} className="mr-2" />Discover Patterns
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <StatCard icon={Crosshair} label="Patterns Analyzed" value={patterns.patterns_analyzed} color="#CFAE46" />
                      <StatCard icon={Target} label="Significant" value={patterns.significant_patterns} color="#00E676" />
                      <StatCard icon={Zap} label="New Discoveries" value={patterns.discovery_count} color="#FF9800" />
                    </div>

                    {patterns.top_patterns?.length > 0 && (
                      <div className="aureos-card p-6">
                        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Top Indicator Combinations</h3>
                        <div className="space-y-3">
                          {patterns.top_patterns.map((p, i) => (
                            <div key={p.combination} className={`p-4 rounded-xl flex items-center justify-between ${
                              p.accuracy > 60 ? 'bg-[#00E676]/5 border border-[#00E676]/20' : 'bg-white/5'
                            }`}>
                              <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                  i < 3 ? 'bg-[#CFAE46]/20 text-aureos-gold' : 'bg-white/10 text-[#888]'
                                }`}>#{i + 1}</span>
                                <div>
                                  <p className="font-semibold text-sm">{p.indicator_1} + {p.indicator_2}</p>
                                  <p className="text-xs text-[#888]">{p.occurrences} occurrences · Avg return: {p.avg_return > 0 ? '+' : ''}{p.avg_return}%</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className={`font-mono font-bold ${p.accuracy > 60 ? 'text-[#00E676]' : 'text-aureos-gold'}`}>{p.accuracy}%</p>
                                  <p className="text-[10px] text-[#888]">Accuracy</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono text-sm">{p.score}</p>
                                  <p className="text-[10px] text-[#888]">Score</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* HISTORY/LOG TAB */}
            {activeTab === 'history' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {!experiments ? (
                  <div className="aureos-card p-12 text-center">
                    <Loader2 className="animate-spin text-aureos-gold mx-auto" size={32} />
                    <p className="text-[#888] mt-3">Loading experiment log...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <StatCard icon={FlaskConical} label="Total Experiments" value={experiments.total_experiments} color="#CFAE46" />
                      <StatCard icon={Shield} label="Decision Logs" value={experiments.total_decisions} color="#00E676" />
                    </div>

                    {experiments.experiments?.length > 0 ? (
                      <div className="aureos-card p-6">
                        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Experiment Log</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {experiments.experiments.map((exp, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  exp.type === 'optimization' ? 'bg-[#CFAE46]/20' : exp.type === 'backtest' ? 'bg-[#00B4FF]/20' : 'bg-[#00E676]/20'
                                }`}>
                                  {exp.type === 'optimization' ? <Cpu size={14} className="text-aureos-gold" /> :
                                   exp.type === 'backtest' ? <Target size={14} className="text-[#00B4FF]" /> :
                                   <Crosshair size={14} className="text-[#00E676]" />}
                                </div>
                                <div>
                                  <p className="text-sm font-medium capitalize">{exp.type.replace('_', ' ')}</p>
                                  <p className="text-xs text-[#888]">{new Date(exp.timestamp).toLocaleString()} · {exp.input_size} analyses</p>
                                </div>
                              </div>
                              {exp.result_summary && (
                                <div className="text-right text-xs text-[#888]">
                                  {exp.result_summary.accuracy && <span>Acc: {exp.result_summary.accuracy}%</span>}
                                  {exp.result_summary.improvement && <span>Imp: {exp.result_summary.improvement}%</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="aureos-card p-8 text-center">
                        <History className="text-[#888] mx-auto mb-3" size={40} />
                        <p className="text-[#888]">No experiments yet. Run a backtest or optimization to start.</p>
                      </div>
                    )}

                    {experiments.decisions?.length > 0 && (
                      <div className="aureos-card p-6">
                        <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                          <Shield size={14} className="inline mr-2 text-aureos-gold" />Decision Log (IP Protected)
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {experiments.decisions.map((dec, i) => (
                            <div key={i} className="p-3 rounded-lg bg-white/5 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold capitalize">{dec.type.replace('_', ' ')}</span>
                                <span className="text-[#888]">{new Date(dec.timestamp).toLocaleString()}</span>
                              </div>
                              {dec.improvement !== undefined && (
                                <span className={`font-mono ${dec.improvement > 0 ? 'text-[#00E676]' : 'text-[#888]'}`}>
                                  Improvement: {dec.improvement > 0 ? '+' : ''}{dec.improvement}%
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
      <JarvisCopilot />
    </AureosLayout>
  );
};

// Sub-components
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="aureos-card p-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold font-mono">{value}</p>
        <p className="text-xs text-[#888]">{label}</p>
      </div>
    </div>
  </div>
);

const MetricCard = ({ label, value, color }) => (
  <div className="aureos-card p-4 text-center">
    <p className="font-mono text-2xl font-bold" style={{ color }}>{value}</p>
    <p className="text-xs text-[#888] mt-1">{label}</p>
  </div>
);

const WeightBar = ({ indicatorKey, value, color }) => {
  const INDICATOR_NAMES = {
    rsi_14: "RSI (14)", macd_crossover: "MACD Crossover", sma_20_50_cross: "SMA 20/50",
    bollinger_squeeze: "Bollinger Squeeze", volume_breakout: "Volume Breakout",
    market_structure: "Market Structure", monte_carlo_prob: "Monte Carlo",
    risk_reward: "Risk/Reward", regime_alignment: "Regime Alignment",
    liquidity_zone: "Liquidity Zone", atr_expansion: "ATR Expansion",
  };
  const INDICATOR_CATS = {
    rsi_14: "momentum", macd_crossover: "momentum", sma_20_50_cross: "trend",
    bollinger_squeeze: "volatility", volume_breakout: "volume",
    market_structure: "structure", monte_carlo_prob: "quantitative",
    risk_reward: "risk", regime_alignment: "macro",
    liquidity_zone: "microstructure", atr_expansion: "volatility",
  };
  const cat = INDICATOR_CATS[indicatorKey] || 'momentum';
  const barColor = color[cat] || '#888';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#888] w-32 truncate">{INDICATOR_NAMES[indicatorKey] || indicatorKey}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(value * 4, 100)}%`, background: barColor }} />
      </div>
      <span className="font-mono text-xs w-12 text-right">{value}%</span>
    </div>
  );
};

export default QuantLabPage;
