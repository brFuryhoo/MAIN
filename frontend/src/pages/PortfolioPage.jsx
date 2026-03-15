import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import VoiceCopilotWindow from '@/components/voice/VoiceCopilotWindow';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus,
  Trash2,
  RefreshCw,
  PieChart,
  Download,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const PortfolioPage = () => {
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState({ positions: [], total_value: 0, total_pnl: 0 });
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPosition, setNewPosition] = useState({
    symbol: '',
    asset_type: 'stock',
    quantity: '',
    avg_price: ''
  });
  const [analysisHistory, setAnalysisHistory] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchPortfolio();
    loadAnalysisHistory();
  }, []);

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/portfolio`, { headers });
      setPortfolio(res.data);
    } catch (error) {
      toast.error('Failed to load portfolio');
    }
    setLoading(false);
  };

  const loadAnalysisHistory = () => {
    const saved = localStorage.getItem('aureos_recent_analyses');
    if (saved) {
      setAnalysisHistory(JSON.parse(saved));
    }
  };

  const handleAddPosition = async () => {
    if (!newPosition.symbol || !newPosition.quantity || !newPosition.avg_price) {
      toast.error('Please fill all fields');
      return;
    }

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
      fetchPortfolio();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add position');
    }
  };

  const handleRemovePosition = async (symbol) => {
    try {
      await axios.delete(`${API}/portfolio/${symbol}`, { headers });
      toast.success('Position removed');
      fetchPortfolio();
    } catch (error) {
      toast.error('Failed to remove position');
    }
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Pie chart data
  const pieData = portfolio.positions.map(pos => ({
    name: pos.symbol,
    value: pos.current_value || (pos.quantity * pos.avg_price)
  }));

  const COLORS = ['#CFAE46', '#00B4FF', '#00E676', '#9C27B0', '#FF5252', '#FF6B6B'];

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
            <h1 className="text-3xl font-bold font-['Poppins']">
              <span className="text-gradient-gold">Portfolio</span>
            </h1>
            <p className="text-[#888] mt-1">Track your investments and analysis history</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="border-[#888]/30">
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="aureos-btn-gold">
                  <Plus size={16} className="mr-2" />
                  Add Position
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#161718] border-[#CFAE46]/20">
                <DialogHeader>
                  <DialogTitle className="text-aureos-gold">Add Position</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-xs text-[#888] uppercase mb-2 block">Symbol</label>
                    <Input
                      value={newPosition.symbol}
                      onChange={(e) => setNewPosition({...newPosition, symbol: e.target.value.toUpperCase()})}
                      placeholder="e.g., AAPL, BTC"
                      className="aureos-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#888] uppercase mb-2 block">Type</label>
                    <Select 
                      value={newPosition.asset_type}
                      onValueChange={(val) => setNewPosition({...newPosition, asset_type: val})}
                    >
                      <SelectTrigger className="aureos-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">Stock</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="forex">Forex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#888] uppercase mb-2 block">Quantity</label>
                      <Input
                        type="number"
                        value={newPosition.quantity}
                        onChange={(e) => setNewPosition({...newPosition, quantity: e.target.value})}
                        placeholder="0.00"
                        className="aureos-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#888] uppercase mb-2 block">Avg Price</label>
                      <Input
                        type="number"
                        value={newPosition.avg_price}
                        onChange={(e) => setNewPosition({...newPosition, avg_price: e.target.value})}
                        placeholder="0.00"
                        className="aureos-input"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddPosition} className="w-full aureos-btn-gold">
                    Add Position
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="aureos-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#CFAE46]/20 flex items-center justify-center">
                <Wallet className="text-aureos-gold" size={24} />
              </div>
              <div>
                <p className="text-xs text-[#888] uppercase">Total Value</p>
                <p className="text-3xl font-bold text-aureos-gold">
                  {formatPrice(portfolio.total_value)}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="aureos-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                portfolio.total_pnl >= 0 ? 'bg-[#00E676]/20' : 'bg-[#FF5252]/20'
              }`}>
                {portfolio.total_pnl >= 0 
                  ? <TrendingUp className="text-[#00E676]" size={24} />
                  : <TrendingDown className="text-[#FF5252]" size={24} />
                }
              </div>
              <div>
                <p className="text-xs text-[#888] uppercase">Total P&L</p>
                <p className={`text-3xl font-bold ${
                  portfolio.total_pnl >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'
                }`}>
                  {portfolio.total_pnl >= 0 ? '+' : ''}{formatPrice(portfolio.total_pnl)}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="aureos-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#00B4FF]/20 flex items-center justify-center">
                <PieChart className="text-aureos-blue" size={24} />
              </div>
              <div>
                <p className="text-xs text-[#888] uppercase">Positions</p>
                <p className="text-3xl font-bold text-aureos-blue">
                  {portfolio.positions.length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Portfolio Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Positions Table */}
          <div className="lg:col-span-8">
            <div className="aureos-card p-6">
              <h2 className="text-lg font-semibold mb-4">Positions</h2>
              
              {portfolio.positions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-[#888] uppercase border-b border-white/10">
                        <th className="pb-3">Asset</th>
                        <th className="pb-3">Quantity</th>
                        <th className="pb-3">Avg Price</th>
                        <th className="pb-3">Current</th>
                        <th className="pb-3">P&L</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.positions.map((pos, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-white/5"
                        >
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                pos.pnl >= 0 ? 'bg-[#00E676]/20' : 'bg-[#FF5252]/20'
                              }`}>
                                {pos.pnl >= 0 
                                  ? <TrendingUp className="text-[#00E676]" size={18} />
                                  : <TrendingDown className="text-[#FF5252]" size={18} />
                                }
                              </div>
                              <div>
                                <p className="font-semibold">{pos.symbol}</p>
                                <p className="text-xs text-[#888]">{pos.asset_type}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 font-mono">{pos.quantity}</td>
                          <td className="py-4 font-mono">{formatPrice(pos.avg_price)}</td>
                          <td className="py-4 font-mono">{formatPrice(pos.current_price)}</td>
                          <td className={`py-4 font-mono font-semibold ${
                            pos.pnl >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'
                          }`}>
                            {pos.pnl >= 0 ? '+' : ''}{formatPrice(pos.pnl)}
                            <span className="text-xs ml-1">({pos.pnl_percent?.toFixed(1)}%)</span>
                          </td>
                          <td className="py-4">
                            <button
                              onClick={() => handleRemovePosition(pos.symbol)}
                              className="p-2 hover:bg-[#FF5252]/20 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} className="text-[#FF5252]" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Wallet className="mx-auto mb-4 text-[#888]" size={48} />
                  <p className="text-[#888]">No positions yet</p>
                  <p className="text-sm text-[#666] mt-1">Add your first position to start tracking</p>
                </div>
              )}
            </div>
          </div>

          {/* Allocation Chart */}
          <div className="lg:col-span-4">
            <div className="aureos-card p-6 h-full">
              <h2 className="text-lg font-semibold mb-4">Allocation</h2>
              
              {pieData.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#161718', 
                          border: '1px solid rgba(207,174,70,0.2)',
                          borderRadius: '12px'
                        }}
                        formatter={(val) => formatPrice(val)}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center">
                  <p className="text-[#888]">No data</p>
                </div>
              )}

              {/* Legend */}
              <div className="space-y-2 mt-4">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-mono">{formatPrice(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis History */}
        <div className="aureos-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <History size={18} className="text-aureos-gold" />
            Analysis History
          </h2>
          
          {analysisHistory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analysisHistory.map((analysis, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border ${
                    analysis.signal.direction === 'BUY' 
                      ? 'bg-[#00E676]/5 border-[#00E676]/30' 
                      : 'bg-[#FF5252]/5 border-[#FF5252]/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{analysis.asset.symbol}</span>
                    <span className={`text-sm font-bold ${
                      analysis.signal.direction === 'BUY' ? 'text-[#00E676]' : 'text-[#FF5252]'
                    }`}>
                      {analysis.signal.direction}
                    </span>
                  </div>
                  <p className="text-xs text-[#888]">
                    {new Date(analysis.timestamp).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-[#888]">
                    Confidence: {analysis.signal.buyProbability > 50 
                      ? analysis.signal.buyProbability 
                      : analysis.signal.sellProbability}%
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#888] py-8">No analysis history yet</p>
          )}
        </div>

        {/* Voice Copilot */}
        <VoiceCopilotWindow token={token} />
      </div>
    </AureosLayout>
  );
};

export default PortfolioPage;
