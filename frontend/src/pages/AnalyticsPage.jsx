import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Shield,
  Target,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

const AnalyticsPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [riskRes, perfRes, heatmapRes] = await Promise.all([
        axios.get(`${API}/analytics/risk-score`, { headers }),
        axios.get(`${API}/analytics/performance`, { headers }),
        axios.get(`${API}/market/heatmap`)
      ]);
      
      setRiskData(riskRes.data);
      setPerformanceData(perfRes.data);
      setHeatmapData(heatmapRes.data.heatmap);
    } catch (error) {
      toast.error('Failed to load analytics');
    }
    setLoading(false);
  };

  const getRiskColor = (score) => {
    if (score < 40) return '#00E096';
    if (score < 70) return '#FFD700';
    return '#FF3B30';
  };

  const COLORS = ['#D4AF37', '#00E096', '#FF3B30', '#888888'];

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
      <div className="space-y-6" data-testid="analytics-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-['Space_Grotesk'] text-2xl md:text-3xl font-bold">
              Analytics & Insights
            </h1>
            <p className="text-[#888] mt-1">Portfolio performance and risk analysis</p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchAnalytics}
            className="border-[#333] hover:border-[#D4AF37]"
            data-testid="refresh-analytics-btn"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider">Total Return</p>
                    <p className={`font-['JetBrains_Mono'] text-2xl font-bold mt-1 ${
                      performanceData?.total_return >= 0 ? 'text-[#00E096]' : 'text-[#FF3B30]'
                    }`}>
                      {performanceData?.total_return >= 0 ? '+' : ''}{performanceData?.total_return?.toFixed(2)}%
                    </p>
                  </div>
                  {performanceData?.total_return >= 0 
                    ? <TrendingUp className="text-[#00E096]" size={24} />
                    : <TrendingDown className="text-[#FF3B30]" size={24} />
                  }
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider">Best Day</p>
                    <p className="font-['JetBrains_Mono'] text-2xl font-bold mt-1 text-[#00E096]">
                      +{performanceData?.best_day?.toFixed(2)}%
                    </p>
                  </div>
                  <Target className="text-[#00E096]" size={24} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider">Worst Day</p>
                    <p className="font-['JetBrains_Mono'] text-2xl font-bold mt-1 text-[#FF3B30]">
                      {performanceData?.worst_day?.toFixed(2)}%
                    </p>
                  </div>
                  <AlertTriangle className="text-[#FF3B30]" size={24} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#888] uppercase tracking-wider">Risk Score</p>
                    <p className="font-['JetBrains_Mono'] text-2xl font-bold mt-1" style={{ color: getRiskColor(riskData?.risk_score || 50) }}>
                      {riskData?.risk_score || 50}/100
                    </p>
                  </div>
                  <Shield className="text-[#D4AF37]" size={24} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Performance Chart */}
          <div className="lg:col-span-8">
            <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
              <CardHeader className="border-b border-[#1A1A1A]">
                <CardTitle className="font-['Space_Grotesk'] text-lg">Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[350px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData?.performance || []}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#888', fontSize: 10 }}
                        axisLine={{ stroke: '#262626' }}
                        tickLine={false}
                        tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis 
                        tick={{ fill: '#888', fontSize: 10 }}
                        axisLine={{ stroke: '#262626' }}
                        tickLine={false}
                        tickFormatter={(val) => `$${val.toLocaleString()}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0F0F0F', 
                          border: '1px solid #262626',
                          borderRadius: '0'
                        }}
                        formatter={(val) => [`$${val.toLocaleString()}`, 'Value']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#D4AF37" 
                        strokeWidth={2}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Analysis */}
          <div className="lg:col-span-4">
            <Card className="bg-[#0F0F0F] border-[#1A1A1A] h-full">
              <CardHeader className="border-b border-[#1A1A1A]">
                <CardTitle className="font-['Space_Grotesk'] text-lg">Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Risk Meter */}
                <div className="text-center mb-6">
                  <div className="relative inline-flex items-center justify-center w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#1A1A1A"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke={getRiskColor(riskData?.risk_score || 50)}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(riskData?.risk_score || 50) * 3.52} 352`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute">
                      <p className="font-['JetBrains_Mono'] text-2xl font-bold">{riskData?.risk_score || 50}</p>
                      <p className="text-xs text-[#888]">Risk Score</p>
                    </div>
                  </div>
                  <p className={`mt-4 font-semibold uppercase tracking-wider text-sm`} style={{ color: getRiskColor(riskData?.risk_score || 50) }}>
                    {riskData?.risk_level || 'Moderate'} Risk
                  </p>
                </div>

                {/* Breakdown */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#888]">Crypto Exposure</span>
                      <span>{riskData?.breakdown?.crypto_weight || 0}%</span>
                    </div>
                    <div className="h-2 bg-[#1A1A1A]">
                      <div 
                        className="h-full bg-[#D4AF37]" 
                        style={{ width: `${riskData?.breakdown?.crypto_weight || 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#888]">Stock Exposure</span>
                      <span>{riskData?.breakdown?.stock_weight || 0}%</span>
                    </div>
                    <div className="h-2 bg-[#1A1A1A]">
                      <div 
                        className="h-full bg-[#00E096]" 
                        style={{ width: `${riskData?.breakdown?.stock_weight || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#1A1A1A]">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#888]">Diversification</span>
                      <span className={riskData?.breakdown?.diversification === 'good' ? 'text-[#00E096]' : 'text-[#FF3B30]'}>
                        {riskData?.breakdown?.diversification || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Heatmap */}
        <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
          <CardHeader className="border-b border-[#1A1A1A]">
            <CardTitle className="font-['Space_Grotesk'] text-lg">Market Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {heatmapData.map((item, i) => {
                const intensity = Math.min(Math.abs(item.change_percent) / 5, 1);
                const bgColor = item.change_percent >= 0 
                  ? `rgba(0, 224, 150, ${intensity * 0.3})` 
                  : `rgba(255, 59, 48, ${intensity * 0.3})`;
                const borderColor = item.change_percent >= 0 
                  ? `rgba(0, 224, 150, ${intensity * 0.5})` 
                  : `rgba(255, 59, 48, ${intensity * 0.5})`;
                
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="p-4 text-center cursor-pointer hover:scale-105 transition-transform"
                    style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
                    data-testid={`heatmap-item-${item.symbol}`}
                  >
                    <p className="font-semibold">{item.symbol}</p>
                    <p className={`font-['JetBrains_Mono'] text-lg ${
                      item.change_percent >= 0 ? 'text-[#00E096]' : 'text-[#FF3B30]'
                    }`}>
                      {item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                    </p>
                    <p className="text-xs text-[#888] mt-1">{item.sector}</p>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily Performance */}
        <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
          <CardHeader className="border-b border-[#1A1A1A]">
            <CardTitle className="font-['Space_Grotesk'] text-lg">Daily Returns</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[200px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData?.performance?.slice(-14) || []}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#888', fontSize: 10 }}
                    axisLine={{ stroke: '#262626' }}
                    tickLine={false}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { day: 'numeric' })}
                  />
                  <YAxis 
                    tick={{ fill: '#888', fontSize: 10 }}
                    axisLine={{ stroke: '#262626' }}
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F0F0F', 
                      border: '1px solid #262626',
                      borderRadius: '0'
                    }}
                    formatter={(val) => [`${val.toFixed(2)}%`, 'Return']}
                  />
                  <Bar 
                    dataKey="change_percent" 
                    fill="#D4AF37"
                    radius={[2, 2, 0, 0]}
                  >
                    {performanceData?.performance?.slice(-14).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.change_percent >= 0 ? '#00E096' : '#FF3B30'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
