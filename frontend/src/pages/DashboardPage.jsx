import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import VoiceCopilotWindow from '@/components/voice/VoiceCopilotWindow';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap,
  BarChart2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Activity,
  Users,
  Bot,
  Target,
  Clock,
  DollarSign,
  Bitcoin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const DashboardPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState({ stocks: [], crypto: [], forex: [] });
  const [overview, setOverview] = useState(null);
  const [portfolio, setPortfolio] = useState({ positions: [], total_value: 0, total_pnl: 0 });
  const [recentSignals, setRecentSignals] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAllData();
    loadRecentSignals();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [stocksRes, cryptoRes, overviewRes, portfolioRes] = await Promise.all([
        axios.get(`${API}/market/stocks`),
        axios.get(`${API}/market/crypto`),
        axios.get(`${API}/market/overview`),
        axios.get(`${API}/portfolio`, { headers })
      ]);
      
      setMarketData({
        stocks: stocksRes.data.stocks,
        crypto: cryptoRes.data.crypto,
        forex: []
      });
      setOverview(overviewRes.data);
      setPortfolio(portfolioRes.data);
    } catch (error) {
      toast.error('Failed to load market data');
    }
    setLoading(false);
  };

  const loadRecentSignals = () => {
    const saved = localStorage.getItem('aureos_recent_analyses');
    if (saved) {
      setRecentSignals(JSON.parse(saved).slice(0, 4));
    }
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    return price < 1 
      ? `$${price.toFixed(4)}` 
      : `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatChange = (change) => {
    if (!change) return '0.00%';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // Generate mock chart data
  const generateChartData = () => {
    const data = [];
    let value = 10000;
    for (let i = 0; i < 30; i++) {
      value *= (1 + (Math.random() - 0.48) * 0.02);
      data.push({
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.round(value)
      });
    }
    return data;
  };

  const chartData = generateChartData();

  if (loading) {
    return (
      <AureosLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <RefreshCw className="animate-spin text-aureos-gold mx-auto mb-4" size={40} />
            <p className="text-[#888]">Loading dashboard...</p>
          </div>
        </div>
      </AureosLayout>
    );
  }

  return (
    <AureosLayout>
      <div className="space-y-8" data-testid="dashboard-page">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold font-['Poppins']"
            >
              Welcome back, <span className="text-gradient-gold">{user?.full_name?.split(' ')[0]}</span>
            </motion.h1>
            <p className="text-[#888] mt-1">Here's your trading intelligence overview</p>
          </div>
          <Button 
            onClick={() => navigate('/analysis')}
            className="aureos-btn-gold"
            data-testid="start-analysis-btn"
          >
            <Zap size={18} className="mr-2" />
            New Analysis
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { 
              label: 'Portfolio Value', 
              value: formatPrice(portfolio.total_value || 12500),
              change: portfolio.total_pnl_percent || 5.2,
              icon: Wallet,
              color: '#CFAE46'
            },
            { 
              label: 'Total P&L', 
              value: formatPrice(portfolio.total_pnl || 650),
              change: portfolio.total_pnl_percent || 5.2,
              icon: TrendingUp,
              color: '#00E676'
            },
            { 
              label: 'Win Rate', 
              value: '67%',
              change: 3.5,
              icon: Target,
              color: '#00B4FF'
            },
            { 
              label: 'Analyses Today', 
              value: recentSignals.length.toString(),
              change: null,
              icon: Activity,
              color: '#9C27B0'
            },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="aureos-card p-5 h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <Icon size={20} style={{ color: stat.color }} />
                    </div>
                    {stat.change !== null && (
                      <span className={`text-xs font-semibold flex items-center gap-1 ${
                        stat.change >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'
                      }`}>
                        {stat.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(stat.change)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#888] uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Portfolio Chart */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-8"
          >
            <div className="aureos-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Portfolio Performance</h2>
                  <p className="text-sm text-[#888]">Last 30 days</p>
                </div>
                <div className="flex gap-2">
                  {['1D', '1W', '1M', '3M'].map((period) => (
                    <button
                      key={period}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                        period === '1M' 
                          ? 'bg-[#CFAE46]/20 text-aureos-gold' 
                          : 'text-[#888] hover:bg-white/5'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#CFAE46" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#CFAE46" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#888', fontSize: 10 }}
                      axisLine={{ stroke: '#262626' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#888', fontSize: 10 }}
                      axisLine={{ stroke: '#262626' }}
                      tickLine={false}
                      tickFormatter={(val) => `$${(val/1000).toFixed(1)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#161718', 
                        border: '1px solid rgba(207,174,70,0.2)',
                        borderRadius: '12px'
                      }}
                      formatter={(val) => [`$${val.toLocaleString()}`, 'Value']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#CFAE46" 
                      strokeWidth={2}
                      fill="url(#goldGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          {/* AI Signals */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4"
          >
            <div className="aureos-card p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="text-aureos-gold" size={18} />
                  Recent Signals
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/signals')}
                  className="text-aureos-gold hover:bg-[#CFAE46]/10"
                >
                  View All
                </Button>
              </div>
              
              {recentSignals.length > 0 ? (
                <div className="space-y-3">
                  {recentSignals.map((signal, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-xl border ${
                        signal.signal.direction === 'BUY' 
                          ? 'bg-[#00E676]/5 border-[#00E676]/30' 
                          : 'bg-[#FF5252]/5 border-[#FF5252]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {signal.signal.direction === 'BUY' 
                            ? <TrendingUp className="text-[#00E676]" size={20} />
                            : <TrendingDown className="text-[#FF5252]" size={20} />
                          }
                          <div>
                            <p className="font-semibold">{signal.asset.symbol}</p>
                            <p className="text-xs text-[#888]">{signal.timeframe}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            signal.signal.direction === 'BUY' ? 'text-[#00E676]' : 'text-[#FF5252]'
                          }`}>
                            {signal.signal.direction}
                          </p>
                          <p className="text-xs text-[#888]">
                            {signal.signal.buyProbability > 50 
                              ? signal.signal.buyProbability 
                              : signal.signal.sellProbability}% conf
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bot className="mx-auto mb-3 text-[#888]" size={40} />
                  <p className="text-[#888]">No signals yet</p>
                  <Button 
                    onClick={() => navigate('/analysis')}
                    className="mt-4 aureos-btn-blue"
                  >
                    Start Analysis
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Top Stocks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="aureos-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="text-[#00B4FF]" size={18} />
              Top Stocks
            </h3>
            <div className="space-y-3">
              {marketData.stocks.slice(0, 4).map((stock, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
                  <div>
                    <p className="font-semibold">{stock.symbol}</p>
                    <p className="text-xs text-[#888]">{stock.name?.substring(0, 15)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono">{formatPrice(stock.price)}</p>
                    <p className={`text-xs ${stock.change_percent >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                      {formatChange(stock.change_percent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Crypto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="aureos-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bitcoin className="text-aureos-gold" size={18} />
              Top Crypto
            </h3>
            <div className="space-y-3">
              {marketData.crypto.slice(0, 4).map((coin, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
                  <div>
                    <p className="font-semibold">{coin.symbol}</p>
                    <p className="text-xs text-[#888]">{coin.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono">{formatPrice(coin.price)}</p>
                    <p className={`text-xs ${coin.change_24h >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                      {formatChange(coin.change_24h)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Market Indices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="aureos-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart2 className="text-[#9C27B0]" size={18} />
              Market Indices
            </h3>
            <div className="space-y-3">
              {overview?.indices?.slice(0, 4).map((index, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div>
                    <p className="font-semibold">{index.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono">{index.value.toLocaleString()}</p>
                    <p className={`text-xs ${index.change_percent >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                      {formatChange(index.change_percent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="aureos-glass p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'New Analysis', icon: Zap, path: '/analysis', color: '#CFAE46' },
              { label: 'AI Copilot', icon: Bot, path: '/copilot', color: '#00B4FF' },
              { label: 'View Portfolio', icon: Wallet, path: '/portfolio', color: '#00E676' },
              { label: 'AI Signals', icon: TrendingUp, path: '/signals', color: '#9C27B0' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="h-auto py-6 flex flex-col items-center gap-3 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20"
                >
                  <Icon size={24} style={{ color: action.color }} />
                  <span>{action.label}</span>
                </Button>
              );
            })}
          </div>
        </motion.div>

        {/* Voice Copilot */}
        <VoiceCopilotWindow 
          token={token}
          onAnalysisRequest={(asset) => navigate('/analysis')}
        />
      </div>
    </AureosLayout>
  );
};

export default DashboardPage;
