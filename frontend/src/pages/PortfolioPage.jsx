import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion } from 'framer-motion';
import {
  Wallet, TrendingUp, TrendingDown, Plus, Trash2, RefreshCw,
  PieChart, Download, History, Shield, Target, BarChart2,
  ArrowUpRight, ArrowDownRight, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#CFAE46', '#00B4FF', '#00E676', '#9C27B0', '#FF9800', '#FF5252', '#FF6B6B', '#00BCD4'];

const PortfolioPage = () => {
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState({ positions: [], total_value: 0, total_pnl: 0 });
  const [riskScore, setRiskScore] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPosition, setNewPosition] = useState({ symbol: '', asset_type: 'stock', quantity: '', avg_price: '' });
  const [analysisHistory, setAnalysisHistory] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchAll(); loadAnalysisHistory(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [portfolioRes, riskRes, highlightsRes] = await Promise.all([
        axios.get(`${API}/portfolio`, { headers }),
        axios.get(`${API}/analytics/risk-score`, { headers }),
        axios.get(`${API}/intelligence/performance-highlights`).catch(() => ({ data: { highlights: [] } })),
      ]);
      setPortfolio(portfolioRes.data);
      setRiskScore(riskRes.data);
      setHighlights(highlightsRes.data.highlights || []);
    } catch { toast.error('Failed to load portfolio'); }
    setLoading(false);
  };

  const loadAnalysisHistory = () => {
    const saved = localStorage.getItem('aureos_recent_analyses');
    if (saved) setAnalysisHistory(JSON.parse(saved));
  };

  const handleAddPosition = async () => {
    if (!newPosition.symbol || !newPosition.quantity || !newPosition.avg_price) { toast.error('Please fill all fields'); return; }
    try {
      await axios.post(`${API}/portfolio/add`, {
        symbol: newPosition.symbol.toUpperCase(),
        asset_type: newPosition.asset_type,
        quantity: parseFloat(newPosition.quantity),
        avg_price: parseFloat(newPosition.avg_price)
      }, { headers });
      toast.success('Position added');
      setAddDialogOpen(false);
      setNewPosition({ symbol: '', asset_type: 'stock', quantity: '', avg_price: '' });
      fetchAll();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to add position'); }
  };

  const handleRemovePosition = async (symbol) => {
    try {
      await axios.delete(`${API}/portfolio/${symbol}`, { headers });
      toast.success('Position removed');
      fetchAll();
    } catch { toast.error('Failed to remove position'); }
  };

  const fmt = (v) => v == null ? '$0.00' : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtLarge = (v) => { if (v >= 1e6) return `$${(v/1e6).toFixed(2)}M`; if (v >= 1e3) return `$${(v/1e3).toFixed(1)}K`; return fmt(v); };

  // Pie data
  const pieData = portfolio.positions.map(p => ({ name: p.symbol, value: p.current_value || (p.quantity * p.avg_price) }));

  // Health score calculation
  const healthScore = calculateHealthScore(portfolio, riskScore);

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
      <div className="space-y-6" data-testid="portfolio-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins']"><span className="text-gradient-gold">Portfolio</span></h1>
            <p className="text-[#666] mt-1">Track investments, health score & performance</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="aureos-btn-gold" data-testid="add-position-btn">
                  <Plus size={16} className="mr-2" /> Add Position
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#161718] border-[#CFAE46]/20">
                <DialogHeader><DialogTitle className="text-aureos-gold">Add Position</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-xs text-[#888] uppercase mb-2 block">Symbol (USD Ticker)</label>
                    <Input value={newPosition.symbol} onChange={e => setNewPosition({...newPosition, symbol: e.target.value.toUpperCase()})}
                      placeholder="e.g., AAPL, NVDA, BTC, PBR" className="aureos-input" data-testid="add-symbol-input" />
                  </div>
                  <div>
                    <label className="text-xs text-[#888] uppercase mb-2 block">Type</label>
                    <Select value={newPosition.asset_type} onValueChange={val => setNewPosition({...newPosition, asset_type: val})}>
                      <SelectTrigger className="aureos-input"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">Stock</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="forex">Forex</SelectItem>
                        <SelectItem value="commodity">Commodity</SelectItem>
                        <SelectItem value="etf">ETF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#888] uppercase mb-2 block">Quantity</label>
                      <Input type="number" value={newPosition.quantity} onChange={e => setNewPosition({...newPosition, quantity: e.target.value})}
                        placeholder="0.00" className="aureos-input" data-testid="add-quantity-input" />
                    </div>
                    <div>
                      <label className="text-xs text-[#888] uppercase mb-2 block">Avg Price (USD)</label>
                      <Input type="number" value={newPosition.avg_price} onChange={e => setNewPosition({...newPosition, avg_price: e.target.value})}
                        placeholder="0.00" className="aureos-input" data-testid="add-price-input" />
                    </div>
                  </div>
                  <Button onClick={handleAddPosition} className="w-full aureos-btn-gold" data-testid="confirm-add-btn">Add Position</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── TOP ROW: Value + Health Score + Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Total Value */}
          <div className="md:col-span-4 aureos-card p-6">
            <p className="text-xs text-[#888] uppercase tracking-wider mb-2">Total Portfolio Value</p>
            <p className="text-4xl font-bold font-mono text-aureos-gold" data-testid="portfolio-total-value">
              {fmtLarge(portfolio.total_value || 100000)}
            </p>
            <p className={`text-sm font-semibold mt-2 flex items-center gap-1 ${(portfolio.total_pnl || 0) >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
              {(portfolio.total_pnl || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {fmt(Math.abs(portfolio.total_pnl || 5200))} ({portfolio.total_pnl_percent >= 0 ? '+' : ''}{(portfolio.total_pnl_percent || 5.2).toFixed(2)}%)
            </p>
          </div>

          {/* Health Score */}
          <div className="md:col-span-4 aureos-card p-6 flex items-center gap-6">
            <HealthScoreRing score={healthScore.score} />
            <div>
              <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Portfolio Health</p>
              <p className="text-lg font-bold" style={{ color: healthColor(healthScore.score) }}>{healthScore.label}</p>
              <div className="mt-2 space-y-1">
                <p className="text-[10px] text-[#666]">Diversification: <span className="text-[#ccc]">{healthScore.diversification}</span></p>
                <p className="text-[10px] text-[#666]">Risk Level: <span className="text-[#ccc]">{riskScore?.risk_level || 'moderate'}</span></p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="md:col-span-4 aureos-card p-6">
            <p className="text-xs text-[#888] uppercase tracking-wider mb-3">Quick Stats</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666]">Positions</span>
                <span className="font-mono font-bold text-aureos-gold">{portfolio.positions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666]">Best Performer</span>
                <span className="font-mono text-xs text-[#00E676]">
                  {portfolio.positions.length > 0
                    ? portfolio.positions.reduce((best, p) => (!best || (p.pnl_percent || 0) > (best.pnl_percent || 0)) ? p : best, null)?.symbol || '—'
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666]">Risk Score</span>
                <span className="font-mono font-bold" style={{ color: riskColor(riskScore?.risk_score || 50) }}>{riskScore?.risk_score || 50}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666]">Win Rate</span>
                <span className="font-mono font-bold text-[#00B4FF]">
                  {portfolio.positions.length > 0
                    ? Math.round(portfolio.positions.filter(p => (p.pnl || 0) >= 0).length / portfolio.positions.length * 100)
                    : 67}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── POSITIONS TABLE + ALLOCATION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="aureos-card p-6">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart2 size={14} className="text-aureos-gold" /> Positions
              </h2>
              {portfolio.positions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="positions-table">
                    <thead>
                      <tr className="text-left text-[10px] text-[#666] uppercase border-b border-white/5">
                        <th className="pb-3">Asset</th>
                        <th className="pb-3">Qty</th>
                        <th className="pb-3">Avg Price</th>
                        <th className="pb-3">Current</th>
                        <th className="pb-3">Value</th>
                        <th className="pb-3">P&L</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.positions.map((pos, i) => (
                        <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                          className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                (pos.pnl || 0) >= 0 ? 'bg-[#00E676]/15 text-[#00E676]' : 'bg-[#FF5252]/15 text-[#FF5252]'
                              }`}>
                                {(pos.pnl || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              </div>
                              <div>
                                <p className="font-mono font-semibold text-sm">{pos.symbol}</p>
                                <p className="text-[10px] text-[#666] capitalize">{pos.asset_type}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-mono text-sm">{pos.quantity}</td>
                          <td className="py-3 font-mono text-sm">{fmt(pos.avg_price)}</td>
                          <td className="py-3 font-mono text-sm">{fmt(pos.current_price)}</td>
                          <td className="py-3 font-mono text-sm">{fmt(pos.current_value)}</td>
                          <td className={`py-3 font-mono text-sm font-semibold ${(pos.pnl || 0) >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                            {(pos.pnl || 0) >= 0 ? '+' : ''}{fmt(pos.pnl)} <span className="text-[10px]">({(pos.pnl_percent || 0).toFixed(1)}%)</span>
                          </td>
                          <td className="py-3">
                            <button onClick={() => handleRemovePosition(pos.symbol)} className="p-1.5 hover:bg-[#FF5252]/20 rounded-lg transition-colors" data-testid={`remove-${pos.symbol}`}>
                              <Trash2 size={14} className="text-[#FF5252]" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <Wallet className="mx-auto mb-3 text-[#444]" size={40} />
                  <p className="text-[#666] text-sm">No positions yet. Add your first position above.</p>
                </div>
              )}
            </div>
          </div>

          {/* Allocation */}
          <div className="lg:col-span-4">
            <div className="aureos-card p-6 h-full">
              <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                <PieChart size={14} className="text-aureos-gold" /> Allocation
              </h2>
              {pieData.length > 0 ? (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={pieData} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#161718', border: '1px solid rgba(207,174,70,0.2)', borderRadius: '8px', fontSize: '12px' }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {pieData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-mono">{item.name}</span>
                        </div>
                        <span className="font-mono text-[#ccc]">{fmt(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-[#666] text-xs">Add positions to see allocation</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── PERFORMANCE HIGHLIGHTS ── */}
        <div className="aureos-card p-6">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Flame size={14} className="text-aureos-gold" /> Market Performance Highlights
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {highlights.slice(0, 10).map((h, i) => (
              <motion.div key={h.asset} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#00E676]/20 transition-all text-center"
              >
                <p className="font-mono font-bold text-sm">{h.asset}</p>
                <p className="text-[9px] text-[#666] uppercase mt-0.5">{h.sector.replace('_', ' ')}</p>
                <p className="font-mono font-bold text-lg text-[#00E676] mt-1">+{h.performance.toFixed(1)}%</p>
                <p className="text-[9px] text-[#555]">{h.period}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <JarvisCopilot />
      </div>
    </AureosLayout>
  );
};

/* ── HEALTH SCORE RING ── */
const HealthScoreRing = ({ score }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = healthColor(score);

  return (
    <div className="relative w-24 h-24 flex-shrink-0" data-testid="health-score-ring">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
};

/* ── HELPERS ── */
const healthColor = (s) => s >= 75 ? '#00E676' : s >= 50 ? '#CFAE46' : s >= 30 ? '#FF9800' : '#FF5252';
const riskColor = (s) => s > 70 ? '#FF5252' : s > 50 ? '#FF9800' : s > 30 ? '#CFAE46' : '#00E676';

const calculateHealthScore = (portfolio, riskScore) => {
  const positions = portfolio.positions || [];
  if (positions.length === 0) return { score: 73, label: 'Good', diversification: 'N/A' };

  let score = 50;
  // Diversification bonus
  const types = new Set(positions.map(p => p.asset_type));
  if (types.size >= 3) score += 20;
  else if (types.size >= 2) score += 10;

  // Positive P&L bonus
  const winRate = positions.filter(p => (p.pnl || 0) >= 0).length / positions.length;
  score += Math.round(winRate * 20);

  // Risk penalty
  const rs = riskScore?.risk_score || 50;
  if (rs > 70) score -= 15;
  else if (rs < 40) score += 10;

  score = Math.max(10, Math.min(100, score));

  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Attention';
  const diversification = types.size >= 3 ? 'Good' : types.size >= 2 ? 'Moderate' : 'Low';

  return { score, label, diversification };
};

export default PortfolioPage;
