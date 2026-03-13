import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  X,
  RefreshCw,
  Eye,
  Bitcoin,
  DollarSign,
  BarChart2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const DashboardPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState({ stocks: [], crypto: [], forex: [] });
  const [overview, setOverview] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [portfolio, setPortfolio] = useState({ positions: [], total_value: 0, total_pnl: 0 });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [addWatchlistOpen, setAddWatchlistOpen] = useState(false);
  const [newWatchlistItem, setNewWatchlistItem] = useState({ symbol: '', asset_type: 'stock', name: '' });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [stocksRes, cryptoRes, forexRes, overviewRes, watchlistRes, portfolioRes] = await Promise.all([
        axios.get(`${API}/market/stocks`),
        axios.get(`${API}/market/crypto`),
        axios.get(`${API}/market/forex`),
        axios.get(`${API}/market/overview`),
        axios.get(`${API}/watchlist`, { headers }),
        axios.get(`${API}/portfolio`, { headers })
      ]);
      
      setMarketData({
        stocks: stocksRes.data.stocks,
        crypto: cryptoRes.data.crypto,
        forex: forexRes.data.forex
      });
      setOverview(overviewRes.data);
      setWatchlist(watchlistRes.data.watchlist);
      setPortfolio(portfolioRes.data);
      
      // Select first stock for chart
      if (stocksRes.data.stocks.length > 0) {
        handleSelectAsset(stocksRes.data.stocks[0].symbol, 'stock');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load market data');
    }
    setLoading(false);
  };

  const handleSelectAsset = async (symbol, type) => {
    try {
      let response;
      if (type === 'stock') {
        response = await axios.get(`${API}/market/stocks/${symbol}`);
      } else if (type === 'crypto') {
        response = await axios.get(`${API}/market/crypto/${symbol}`);
      }
      
      if (response?.data?.chart_data) {
        setSelectedAsset({ 
          symbol, 
          type, 
          ...response.data,
          price: response.data.price || response.data.current_price 
        });
        setChartData(response.data.chart_data);
      }
    } catch (error) {
      console.error('Failed to fetch asset details');
    }
  };

  const handleAddToWatchlist = async () => {
    if (!newWatchlistItem.symbol) {
      toast.error('Please enter a symbol');
      return;
    }
    
    try {
      await axios.post(`${API}/watchlist/add`, {
        symbol: newWatchlistItem.symbol.toUpperCase(),
        asset_type: newWatchlistItem.asset_type,
        name: newWatchlistItem.name || newWatchlistItem.symbol.toUpperCase()
      }, { headers });
      
      toast.success('Added to watchlist');
      setAddWatchlistOpen(false);
      setNewWatchlistItem({ symbol: '', asset_type: 'stock', name: '' });
      
      // Refresh watchlist
      const res = await axios.get(`${API}/watchlist`, { headers });
      setWatchlist(res.data.watchlist);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add to watchlist');
    }
  };

  const handleRemoveFromWatchlist = async (symbol) => {
    try {
      await axios.delete(`${API}/watchlist/${symbol}`, { headers });
      toast.success('Removed from watchlist');
      const res = await axios.get(`${API}/watchlist`, { headers });
      setWatchlist(res.data.watchlist);
    } catch (error) {
      toast.error('Failed to remove from watchlist');
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <RefreshCw className="animate-spin text-[#D4AF37]" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="dashboard-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-['Space_Grotesk'] text-2xl md:text-3xl font-bold">
              Welcome back, {user?.full_name?.split(' ')[0]}
            </h1>
            <p className="text-[#888] mt-1">Market Overview</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={fetchAllData}
              className="border-[#333] hover:border-[#D4AF37]"
              data-testid="refresh-data-btn"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={() => navigate('/copilot')}
              className="bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none"
              data-testid="open-copilot-btn"
            >
              Ask AI Copilot
            </Button>
          </div>
        </div>

        {/* Market Indices */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {overview.indices.map((index, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-[#0F0F0F] border-[#1A1A1A] hover:border-[#D4AF37]/30 transition-colors">
                  <CardContent className="p-4">
                    <p className="text-xs text-[#888] uppercase tracking-wider">{index.name}</p>
                    <p className="font-['JetBrains_Mono'] text-xl font-semibold mt-1">
                      {index.value.toLocaleString()}
                    </p>
                    <div className={`flex items-center mt-1 ${index.change_percent >= 0 ? 'text-[#00E096]' : 'text-[#FF3B30]'}`}>
                      {index.change_percent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span className="text-sm ml-1">{formatChange(index.change_percent)}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-8">
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardHeader className="border-b border-[#1A1A1A] pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-['Space_Grotesk'] text-lg">
                      {selectedAsset?.symbol || 'Select Asset'}
                    </CardTitle>
                    {selectedAsset && (
                      <p className="text-sm text-[#888] mt-1">
                        {selectedAsset.name}
                      </p>
                    )}
                  </div>
                  {selectedAsset && (
                    <div className="text-right">
                      <p className="font-['JetBrains_Mono'] text-2xl font-bold">
                        {formatPrice(selectedAsset.price)}
                      </p>
                      <p className={`text-sm ${selectedAsset.change_percent >= 0 ? 'text-[#00E096]' : 'text-[#FF3B30]'}`}>
                        {formatChange(selectedAsset.change_percent || selectedAsset.change_24h)}
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[300px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="timestamp" 
                        tick={{ fill: '#888', fontSize: 10 }}
                        tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        axisLine={{ stroke: '#262626' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fill: '#888', fontSize: 10 }}
                        domain={['dataMin - 1', 'dataMax + 1']}
                        axisLine={{ stroke: '#262626' }}
                        tickLine={false}
                        tickFormatter={(val) => `$${val.toFixed(0)}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0F0F0F', 
                          border: '1px solid #262626',
                          borderRadius: '0'
                        }}
                        labelFormatter={(val) => new Date(val).toLocaleString()}
                        formatter={(val) => [`$${val.toFixed(2)}`, 'Price']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#D4AF37" 
                        strokeWidth={2}
                        fill="url(#colorPrice)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Market Tabs */}
            <Card className="bg-[#0F0F0F] border-[#1A1A1A] mt-6">
              <Tabs defaultValue="stocks">
                <CardHeader className="border-b border-[#1A1A1A] pb-0">
                  <TabsList className="bg-transparent border-b-0">
                    <TabsTrigger 
                      value="stocks" 
                      className="data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] data-[state=active]:border-b-2 data-[state=active]:border-[#D4AF37] rounded-none"
                    >
                      <DollarSign size={16} className="mr-2" />
                      Stocks
                    </TabsTrigger>
                    <TabsTrigger 
                      value="crypto"
                      className="data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] data-[state=active]:border-b-2 data-[state=active]:border-[#D4AF37] rounded-none"
                    >
                      <Bitcoin size={16} className="mr-2" />
                      Crypto
                    </TabsTrigger>
                    <TabsTrigger 
                      value="forex"
                      className="data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] data-[state=active]:border-b-2 data-[state=active]:border-[#D4AF37] rounded-none"
                    >
                      <BarChart2 size={16} className="mr-2" />
                      Forex
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                
                <CardContent className="p-0">
                  <TabsContent value="stocks" className="m-0">
                    <ScrollArea className="h-[300px]">
                      <div className="divide-y divide-[#1A1A1A]">
                        {marketData.stocks.map((stock, i) => (
                          <div 
                            key={i}
                            onClick={() => handleSelectAsset(stock.symbol, 'stock')}
                            className="flex items-center justify-between p-4 hover:bg-[#1A1A1A]/50 cursor-pointer transition-colors"
                            data-testid={`stock-row-${stock.symbol}`}
                          >
                            <div>
                              <p className="font-semibold">{stock.symbol}</p>
                              <p className="text-xs text-[#888]">{stock.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-['JetBrains_Mono']">{formatPrice(stock.price)}</p>
                              <p className={`text-sm ${stock.change_percent >= 0 ? 'text-[#00E096]' : 'text-[#FF3B30]'}`}>
                                {formatChange(stock.change_percent)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="crypto" className="m-0">
                    <ScrollArea className="h-[300px]">
                      <div className="divide-y divide-[#1A1A1A]">
                        {marketData.crypto.map((coin, i) => (
                          <div 
                            key={i}
                            onClick={() => handleSelectAsset(coin.id, 'crypto')}
                            className="flex items-center justify-between p-4 hover:bg-[#1A1A1A]/50 cursor-pointer transition-colors"
                            data-testid={`crypto-row-${coin.id}`}
                          >
                            <div>
                              <p className="font-semibold">{coin.symbol}</p>
                              <p className="text-xs text-[#888]">{coin.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-['JetBrains_Mono']">{formatPrice(coin.price)}</p>
                              <p className={`text-sm ${coin.change_24h >= 0 ? 'text-[#00E096]' : 'text-[#FF3B30]'}`}>
                                {formatChange(coin.change_24h)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="forex" className="m-0">
                    <ScrollArea className="h-[300px]">
                      <div className="divide-y divide-[#1A1A1A]">
                        {marketData.forex.map((pair, i) => (
                          <div 
                            key={i}
                            className="flex items-center justify-between p-4 hover:bg-[#1A1A1A]/50 cursor-pointer transition-colors"
                            data-testid={`forex-row-${pair.pair}`}
                          >
                            <div>
                              <p className="font-semibold">{pair.pair}</p>
                              <p className="text-xs text-[#888]">{pair.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-['JetBrains_Mono']">{pair.price.toFixed(4)}</p>
                              <p className={`text-sm ${pair.change_percent >= 0 ? 'text-[#00E096]' : 'text-[#FF3B30]'}`}>
                                {formatChange(pair.change_percent)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Portfolio Summary */}
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardHeader className="border-b border-[#1A1A1A]">
                <CardTitle className="font-['Space_Grotesk'] text-lg">Portfolio</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-center py-4">
                  <p className="text-xs text-[#888] uppercase tracking-wider">Total Value</p>
                  <p className="font-['JetBrains_Mono'] text-3xl font-bold mt-2">
                    {formatPrice(portfolio.total_value)}
                  </p>
                  <p className={`text-sm mt-1 ${portfolio.total_pnl >= 0 ? 'text-[#00E096]' : 'text-[#FF3B30]'}`}>
                    {portfolio.total_pnl >= 0 ? '+' : ''}{formatPrice(portfolio.total_pnl)} ({portfolio.total_pnl_percent?.toFixed(2)}%)
                  </p>
                </div>
                
                {portfolio.positions.length > 0 ? (
                  <div className="space-y-3 mt-4">
                    {portfolio.positions.slice(0, 4).map((pos, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{pos.symbol}</span>
                        <span className={pos.pnl >= 0 ? 'text-[#00E096]' : 'text-[#FF3B30]'}>
                          {formatChange(pos.pnl_percent)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#888] text-sm mt-4">No positions yet</p>
                )}
              </CardContent>
            </Card>

            {/* Watchlist */}
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardHeader className="border-b border-[#1A1A1A] flex flex-row items-center justify-between">
                <CardTitle className="font-['Space_Grotesk'] text-lg">Watchlist</CardTitle>
                <Dialog open={addWatchlistOpen} onOpenChange={setAddWatchlistOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="add-watchlist-btn">
                      <Plus size={16} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0F0F0F] border-[#1A1A1A]">
                    <DialogHeader>
                      <DialogTitle>Add to Watchlist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">Symbol</label>
                        <Input
                          value={newWatchlistItem.symbol}
                          onChange={(e) => setNewWatchlistItem({...newWatchlistItem, symbol: e.target.value.toUpperCase()})}
                          placeholder="e.g., AAPL"
                          className="bg-[#0A0A0A] border-[#333] rounded-none"
                          data-testid="watchlist-symbol-input"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">Type</label>
                        <Select 
                          value={newWatchlistItem.asset_type} 
                          onValueChange={(val) => setNewWatchlistItem({...newWatchlistItem, asset_type: val})}
                        >
                          <SelectTrigger className="bg-[#0A0A0A] border-[#333] rounded-none" data-testid="watchlist-type-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stock">Stock</SelectItem>
                            <SelectItem value="crypto">Crypto</SelectItem>
                            <SelectItem value="forex">Forex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">Name (Optional)</label>
                        <Input
                          value={newWatchlistItem.name}
                          onChange={(e) => setNewWatchlistItem({...newWatchlistItem, name: e.target.value})}
                          placeholder="e.g., Apple Inc."
                          className="bg-[#0A0A0A] border-[#333] rounded-none"
                          data-testid="watchlist-name-input"
                        />
                      </div>
                      <Button 
                        onClick={handleAddToWatchlist}
                        className="w-full bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none"
                        data-testid="confirm-add-watchlist-btn"
                      >
                        Add to Watchlist
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[250px]">
                  {watchlist.length > 0 ? (
                    <div className="divide-y divide-[#1A1A1A]">
                      {watchlist.map((item, i) => (
                        <div 
                          key={i}
                          className="flex items-center justify-between p-4 group"
                        >
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => handleSelectAsset(item.symbol, item.asset_type)}
                          >
                            <p className="font-semibold">{item.symbol}</p>
                            <p className="text-xs text-[#888]">{item.name}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-['JetBrains_Mono'] text-sm">{formatPrice(item.price)}</p>
                              <p className={`text-xs ${item.change_percent >= 0 ? 'text-[#00E096]' : 'text-[#FF3B30]'}`}>
                                {formatChange(item.change_percent)}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleRemoveFromWatchlist(item.symbol)}
                              className="opacity-0 group-hover:opacity-100 text-[#888] hover:text-[#FF3B30] transition-opacity"
                              data-testid={`remove-watchlist-${item.symbol}-btn`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <Eye className="text-[#888] mb-3" size={24} />
                      <p className="text-sm text-[#888]">Your watchlist is empty</p>
                      <p className="text-xs text-[#888] mt-1">Add assets to track them here</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Market Sentiment */}
            {overview && (
              <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
                <CardHeader className="border-b border-[#1A1A1A]">
                  <CardTitle className="font-['Space_Grotesk'] text-lg">Market Sentiment</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-[#888]">Fear & Greed Index</span>
                    <span className="font-['JetBrains_Mono'] font-bold text-[#D4AF37]">
                      {overview.fear_greed_index}
                    </span>
                  </div>
                  <div className="h-2 bg-gradient-to-r from-[#FF3B30] via-[#FFD700] to-[#00E096] rounded-full">
                    <div 
                      className="h-full w-2 bg-white rounded-full relative"
                      style={{ marginLeft: `${overview.fear_greed_index}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-[#888]">
                    <span>Extreme Fear</span>
                    <span>Extreme Greed</span>
                  </div>
                  <div className="mt-4 p-3 bg-[#0A0A0A] border border-[#1A1A1A]">
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Current Sentiment</p>
                    <p className={`font-semibold capitalize ${
                      overview.market_sentiment === 'bullish' ? 'text-[#00E096]' : 
                      overview.market_sentiment === 'bearish' ? 'text-[#FF3B30]' : 'text-[#888]'
                    }`}>
                      {overview.market_sentiment}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
