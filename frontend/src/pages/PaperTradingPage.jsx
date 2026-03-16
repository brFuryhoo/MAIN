import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion } from 'framer-motion';
import {
  Banknote, TrendingUp, TrendingDown, RefreshCw, Loader2, Plus,
  X, DollarSign, Percent, Award, BarChart3, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const PaperTradingPage = () => {
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTrade, setShowTrade] = useState(false);
  const [tradeForm, setTradeForm] = useState({ symbol: '', name: '', action: 'buy', quantity: 0, price: 0, asset_type: 'crypto' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchPortfolio = useCallback(async () => {
    try {
      const resp = await axios.get(`${API}/paper/portfolio`, { headers });
      setPortfolio(resp.data);
    } catch { toast.error('Failed to load portfolio'); }
    finally { setIsLoading(false); }
  }, [token]);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  const executeTrade = async () => {
    if (!tradeForm.symbol || !tradeForm.quantity || !tradeForm.price) {
      toast.error('Fill all fields'); return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${API}/paper/trade`, tradeForm, { headers });
      toast.success(`${tradeForm.action.toUpperCase()} ${tradeForm.quantity} ${tradeForm.symbol} at $${tradeForm.price}`);
      setShowTrade(false);
      setTradeForm({ symbol: '', name: '', action: 'buy', quantity: 0, price: 0, asset_type: 'crypto' });
      fetchPortfolio();
    } catch (e) { toast.error(e.response?.data?.detail || 'Trade failed'); }
    finally { setIsSubmitting(false); }
  };

  const closeTrade = async (tradeId, closePrice) => {
    const price = prompt('Enter close price:');
    if (!price) return;
    try {
      const resp = await axios.post(`${API}/paper/close`, { trade_id: tradeId, close_price: parseFloat(price) }, { headers });
      toast.success(`Trade closed. P&L: ${resp.data.pnl > 0 ? '+' : ''}$${resp.data.pnl.toFixed(2)}`);
      fetchPortfolio();
    } catch { toast.error('Close failed'); }
  };

  const resetPortfolio = async () => {
    if (!confirm('Reset portfolio to $100,000? All trades will be lost.')) return;
    try {
      await axios.post(`${API}/paper/reset`, {}, { headers });
      toast.success('Portfolio reset');
      fetchPortfolio();
    } catch { toast.error('Reset failed'); }
  };

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="paper-trading-page">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins'] flex items-center gap-3">
              <Banknote className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Paper Trading</span>
            </h1>
            <p className="text-[#888] mt-1">Virtual Portfolio — Practice Without Risk</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={resetPortfolio} className="aureos-btn-outline" data-testid="reset-portfolio-btn">
              <RotateCcw size={16} className="mr-2" />Reset
            </Button>
            <Button onClick={() => setShowTrade(true)} className="aureos-btn-gold" data-testid="new-trade-btn">
              <Plus size={16} className="mr-2" />New Trade
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="aureos-card p-12 text-center">
            <Loader2 className="animate-spin text-aureos-gold mx-auto" size={32} />
          </div>
        ) : portfolio && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Portfolio Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Balance" value={`$${portfolio.balance?.toLocaleString()}`} color="#CFAE46" />
              <StatCard icon={portfolio.total_pnl >= 0 ? TrendingUp : TrendingDown} label="Total P&L"
                value={`${portfolio.total_pnl >= 0 ? '+' : ''}$${portfolio.total_pnl?.toLocaleString()}`}
                color={portfolio.total_pnl >= 0 ? '#00E676' : '#FF5252'} />
              <StatCard icon={Percent} label="Return" value={`${portfolio.total_return_pct >= 0 ? '+' : ''}${portfolio.total_return_pct}%`}
                color={portfolio.total_return_pct >= 0 ? '#00E676' : '#FF5252'} />
              <StatCard icon={Award} label="Win Rate" value={`${portfolio.win_rate}%`}
                color={portfolio.win_rate > 50 ? '#00E676' : '#FF5252'} />
            </div>

            {/* Open Positions */}
            <div className="aureos-card p-6">
              <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Open Positions ({portfolio.open_positions?.length || 0})</h3>
              {portfolio.open_positions?.length > 0 ? (
                <div className="space-y-2">
                  {portfolio.open_positions.map(pos => (
                    <div key={pos.trade_id} className="flex items-center justify-between p-3 rounded-xl bg-white/5" data-testid={`position-${pos.trade_id}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pos.action === 'buy' ? 'bg-[#00E676]/15' : 'bg-[#FF5252]/15'}`}>
                          {pos.action === 'buy' ? <TrendingUp size={14} className="text-[#00E676]" /> : <TrendingDown size={14} className="text-[#FF5252]" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{pos.symbol} <span className="text-xs text-[#888] uppercase">{pos.action}</span></p>
                          <p className="text-xs text-[#888]">{pos.quantity} @ ${pos.entry_price?.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm">${pos.cost?.toLocaleString()}</span>
                        <Button size="sm" variant="outline" onClick={() => closeTrade(pos.trade_id)} className="text-xs border-[#CFAE46]/30 text-aureos-gold"
                          data-testid={`close-${pos.trade_id}`}>Close</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[#888] py-4">No open positions. Click "New Trade" to start.</p>
              )}
            </div>

            {/* Closed Trades */}
            {portfolio.closed_trades?.length > 0 && (
              <div className="aureos-card p-6">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Trade History</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {portfolio.closed_trades.map(trade => (
                    <div key={trade.trade_id} className={`flex items-center justify-between p-3 rounded-lg ${trade.pnl >= 0 ? 'bg-[#00E676]/5' : 'bg-[#FF5252]/5'}`}>
                      <div>
                        <span className="font-semibold text-sm">{trade.symbol}</span>
                        <span className="text-xs text-[#888] ml-2">{trade.action} {trade.quantity} @ ${trade.entry_price?.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold text-sm ${trade.pnl >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl?.toFixed(2)}
                        </span>
                        <span className="text-xs text-[#888] ml-2">({trade.pnl_pct > 0 ? '+' : ''}{trade.pnl_pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Trade Modal */}
        {showTrade && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={() => setShowTrade(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()} data-testid="trade-modal">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">New Paper Trade</h3>
                <button onClick={() => setShowTrade(false)}><X size={20} className="text-[#888]" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button onClick={() => setTradeForm(f => ({...f, action: 'buy'}))}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${tradeForm.action === 'buy' ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30' : 'bg-white/5 text-[#888]'}`}>BUY</button>
                  <button onClick={() => setTradeForm(f => ({...f, action: 'sell'}))}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${tradeForm.action === 'sell' ? 'bg-[#FF5252]/20 text-[#FF5252] border border-[#FF5252]/30' : 'bg-white/5 text-[#888]'}`}>SELL</button>
                </div>
                <input placeholder="Symbol (e.g. BTC, AAPL)" value={tradeForm.symbol}
                  onChange={e => setTradeForm(f => ({...f, symbol: e.target.value.toUpperCase()}))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm" data-testid="trade-symbol" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Quantity" value={tradeForm.quantity || ''}
                    onChange={e => setTradeForm(f => ({...f, quantity: parseFloat(e.target.value) || 0}))}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm" data-testid="trade-quantity" />
                  <input type="number" placeholder="Price ($)" value={tradeForm.price || ''}
                    onChange={e => setTradeForm(f => ({...f, price: parseFloat(e.target.value) || 0}))}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm" data-testid="trade-price" />
                </div>
                {tradeForm.quantity > 0 && tradeForm.price > 0 && (
                  <p className="text-sm text-[#888] text-center">Total: <span className="font-mono text-white">${(tradeForm.quantity * tradeForm.price).toLocaleString()}</span></p>
                )}
                <Button onClick={executeTrade} disabled={isSubmitting} className="w-full aureos-btn-gold" data-testid="execute-trade-btn">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                  {tradeForm.action === 'buy' ? 'Buy' : 'Sell'} {tradeForm.symbol || 'Asset'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      <JarvisCopilot />
    </AureosLayout>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="aureos-card p-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="font-bold font-mono text-lg">{value}</p>
        <p className="text-xs text-[#888]">{label}</p>
      </div>
    </div>
  </div>
);

export default PaperTradingPage;
