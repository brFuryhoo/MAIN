import React, { useState } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
  Sparkles, RefreshCw, TrendingUp, TrendingDown, Shield,
  Target, AlertTriangle, CheckCircle, Zap, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const TradeSimulatorPage = () => {
  const { token } = useAuth();
  const [form, setForm] = useState({ symbol: 'BTC', direction: 'BUY', entry_price: '', quantity: '', stop_loss: '', take_profit: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const simulate = async () => {
    if (!form.entry_price || !form.quantity) return toast.error('Entry price and quantity required');
    setLoading(true);
    try {
      const payload = {
        symbol: form.symbol, direction: form.direction,
        entry_price: parseFloat(form.entry_price), quantity: parseFloat(form.quantity),
        stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
        take_profit: form.take_profit ? parseFloat(form.take_profit) : null,
      };
      const res = await axios.post(`${API}/godmode/simulate`, payload, { headers });
      setResult(res.data);
    } catch { toast.error('Simulation failed'); }
    setLoading(false);
  };

  const r = result;
  const verdictColor = r?.verdict === 'FAVORABLE' ? '#00E676' : r?.verdict === 'UNFAVORABLE' ? '#FF5252' : '#FF9800';

  return (
    <AureosLayout>
      <div className="max-w-5xl mx-auto space-y-6" data-testid="simulator-page">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-['Poppins'] flex items-center gap-3">
            <Sparkles className="text-aureos-gold" size={32} />
            <span className="text-gradient-gold">Trade Simulator</span>
          </h1>
          <p className="text-[#888] mt-1">Simulate before you trade — see best, worst, and expected outcomes.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-4">
            <div className="aureos-card p-5 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Symbol</label>
                <input value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})}
                  className="aureos-input w-full px-3 py-2 rounded-lg text-sm" placeholder="BTC" data-testid="sim-symbol" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  {['BUY', 'SELL'].map(d => (
                    <button key={d} onClick={() => setForm({...form, direction: d})}
                      className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                        form.direction === d
                          ? d === 'BUY' ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30' : 'bg-[#FF5252]/15 text-[#FF5252] border border-[#FF5252]/30'
                          : 'bg-white/5 text-[#888] border border-transparent'
                      }`} data-testid={`sim-dir-${d.toLowerCase()}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Entry Price</label>
                  <input value={form.entry_price} onChange={e => setForm({...form, entry_price: e.target.value})} type="number"
                    className="aureos-input w-full px-3 py-2 rounded-lg text-sm" placeholder="$0.00" data-testid="sim-entry" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Quantity</label>
                  <input value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} type="number"
                    className="aureos-input w-full px-3 py-2 rounded-lg text-sm" placeholder="0" data-testid="sim-qty" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Stop Loss</label>
                  <input value={form.stop_loss} onChange={e => setForm({...form, stop_loss: e.target.value})} type="number"
                    className="aureos-input w-full px-3 py-2 rounded-lg text-sm" placeholder="Optional" data-testid="sim-sl" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Take Profit</label>
                  <input value={form.take_profit} onChange={e => setForm({...form, take_profit: e.target.value})} type="number"
                    className="aureos-input w-full px-3 py-2 rounded-lg text-sm" placeholder="Optional" data-testid="sim-tp" />
                </div>
              </div>
              <Button onClick={simulate} disabled={loading} className="aureos-btn-gold w-full" data-testid="sim-run-btn">
                {loading ? <RefreshCw size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
                {loading ? 'Simulating...' : 'Run Simulation'}
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-8">
            {r ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Verdict */}
                <div className="aureos-card p-5 text-center" data-testid="sim-verdict">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#888]">JARVIS Verdict</p>
                  <p className="text-3xl font-bold font-mono mt-1" style={{ color: verdictColor }}>{r.verdict}</p>
                  <p className="text-xs text-[#aaa] mt-2 max-w-md mx-auto">{r.jarvis_note}</p>
                </div>

                {/* Edge Score + Risk Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="aureos-card p-5 text-center" data-testid="sim-edge">
                    <p className="text-[10px] uppercase tracking-wider text-[#888] mb-2">Edge Score</p>
                    <div className="relative w-24 h-24 mx-auto">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke={r.edge_score?.score >= 75 ? '#00E676' : r.edge_score?.score >= 50 ? '#FF9800' : '#FF5252'}
                          strokeWidth="8" strokeDasharray={`${r.edge_score?.score * 2.51} 251`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold font-mono" style={{ color: r.edge_score?.score >= 75 ? '#00E676' : r.edge_score?.score >= 50 ? '#FF9800' : '#FF5252' }}>
                          {r.edge_score?.score}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-bold mt-2" style={{ color: r.edge_score?.score >= 75 ? '#00E676' : '#FF9800' }}>{r.edge_score?.rating}</p>
                  </div>

                  <div className="aureos-card p-5 space-y-3" data-testid="sim-risk-metrics">
                    <p className="text-[10px] uppercase tracking-wider text-[#888]">Risk Metrics</p>
                    {[
                      { label: 'Win Probability', value: `${r.risk_metrics?.win_probability}%`, color: r.risk_metrics?.win_probability >= 55 ? '#00E676' : '#FF9800' },
                      { label: 'Risk/Reward', value: `${r.risk_metrics?.risk_reward}:1`, color: r.risk_metrics?.risk_reward >= 2 ? '#00E676' : '#FF9800' },
                      { label: 'Expected P&L', value: `$${r.risk_metrics?.expected_pnl?.toFixed(2)}`, color: r.risk_metrics?.expected_pnl >= 0 ? '#00E676' : '#FF5252' },
                      { label: 'Max Loss', value: `-$${r.risk_metrics?.max_loss?.toFixed(2)}`, color: '#FF5252' },
                    ].map(m => (
                      <div key={m.label} className="flex items-center justify-between">
                        <span className="text-[11px] text-[#888]">{m.label}</span>
                        <span className="text-xs font-mono font-bold" style={{ color: m.color }}>{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scenario Outcomes */}
                <div className="aureos-card p-5" data-testid="sim-scenarios">
                  <p className="text-[10px] uppercase tracking-wider text-[#888] mb-3">Scenario Analysis (1,000 Monte Carlo Simulations)</p>
                  <div className="space-y-2">
                    {r.scenarios && Object.entries(r.scenarios).map(([key, sc]) => {
                      const isPos = sc.pnl >= 0;
                      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-[10px] text-[#888] w-24">{label}</span>
                          <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.abs(sc.pct) * 5 + 20)}%` }}
                              transition={{ duration: 0.6 }}
                              className="h-full rounded-full" style={{ background: isPos ? '#00E67660' : '#FF525260' }} />
                          </div>
                          <span className={`text-xs font-mono font-bold w-16 text-right ${isPos ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                            {isPos ? '+' : ''}{sc.pct}%
                          </span>
                          <span className={`text-[10px] font-mono w-20 text-right ${isPos ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                            ${sc.pnl?.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="aureos-card p-16 text-center">
                <Sparkles className="mx-auto mb-3 text-[#444]" size={48} />
                <p className="text-[#888]">Configure your trade and run the simulation</p>
                <p className="text-[10px] text-[#555] mt-1">1,000 Monte Carlo simulations in milliseconds</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AureosLayout>
  );
};

export default TradeSimulatorPage;
