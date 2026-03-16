import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion } from 'framer-motion';
import {
  Radar, Play, Loader2, TrendingUp, TrendingDown, Minus, Shield,
  Zap, Target, BarChart3, RefreshCw, AlertTriangle, Activity,
  ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const ScannerPage = () => {
  const { token } = useAuth();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const categories = [
    { id: 'crypto', label: 'Crypto', count: 5, color: '#FF9800' },
    { id: 'stocks_us', label: 'US Stocks', count: 7, color: '#00B4FF' },
    { id: 'forex', label: 'Forex', count: 3, color: '#00E676' },
    { id: 'commodities', label: 'Commodities', count: 2, color: '#CFAE46' },
  ];

  const toggleCategory = (id) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    axios.get(`${API}/scanner/history`, { headers }).then(r => setScanHistory(r.data.history || [])).catch(() => {});
  }, [token]);

  const runScan = async () => {
    setIsScanning(true);
    toast.info('JARVIS scanning global markets...');
    try {
      const resp = await axios.post(`${API}/scanner/scan`, {
        categories: selectedCategories.length > 0 ? selectedCategories : null,
        max_assets: 17,
      }, { headers, timeout: 120000 });

      setScanResult(resp.data);
      if (resp.data.status === 'complete') {
        toast.success(`Scan complete! ${resp.data.opportunities?.length || 0} opportunities found across ${resp.data.scanned} assets`);
      }
      // Refresh history
      const histResp = await axios.get(`${API}/scanner/history`, { headers });
      setScanHistory(histResp.data.history || []);
    } catch {
      toast.error('Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const signalColor = (s) => s === 'BUY' ? '#00E676' : s === 'SELL' ? '#FF5252' : '#888';
  const signalIcon = (s) => s === 'BUY' ? TrendingUp : s === 'SELL' ? TrendingDown : Minus;

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="scanner-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins'] flex items-center gap-3">
              <Radar className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Market Scanner</span>
            </h1>
            <p className="text-[#888] mt-1">JARVIS Autonomous Opportunity Detection</p>
          </div>
          <Button onClick={runScan} disabled={isScanning} className="aureos-btn-gold" data-testid="run-scan-btn">
            {isScanning ? <Loader2 className="animate-spin mr-2" size={16} /> : <Play size={16} className="mr-2" />}
            {isScanning ? 'Scanning...' : 'Scan Markets'}
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-3 flex-wrap">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => toggleCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                selectedCategories.includes(cat.id) || selectedCategories.length === 0
                  ? 'border-[#CFAE46]/30 bg-[#CFAE46]/10 text-aureos-gold'
                  : 'border-white/10 bg-white/5 text-[#888]'
              }`} data-testid={`cat-${cat.id}`}>
              {cat.label} <span className="text-xs opacity-60 ml-1">({cat.count})</span>
            </button>
          ))}
        </div>

        {/* Scanning Animation */}
        {isScanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="aureos-card p-12 text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 border-2 border-[#CFAE46]/30 rounded-full animate-ping" />
              <div className="absolute inset-2 border-2 border-[#CFAE46]/50 rounded-full animate-pulse" />
              <div className="absolute inset-4 flex items-center justify-center">
                <Radar className="text-aureos-gold animate-spin" size={40} style={{ animationDuration: '3s' }} />
              </div>
            </div>
            <p className="text-aureos-gold font-semibold text-lg">JARVIS Scanning Markets...</p>
            <p className="text-[#888] text-sm mt-1">Analyzing 17 global assets across all categories</p>
          </motion.div>
        )}

        {/* Results */}
        {!isScanning && scanResult?.status === 'complete' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={BarChart3} label="Assets Scanned" value={scanResult.scanned} color="#CFAE46" />
              <StatCard icon={Target} label="Opportunities" value={scanResult.opportunities?.length || 0} color="#00E676" />
              <StatCard icon={AlertTriangle} label="High Priority" value={scanResult.summary?.high_priority || 0} color="#FF5252" />
              <StatCard icon={Activity} label="Scan Time" value={`${new Date(scanResult.timestamp).toLocaleTimeString()}`} color="#00B4FF" isText />
            </div>

            {/* Opportunities */}
            {scanResult.opportunities?.length > 0 && (
              <div className="aureos-card p-6">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                  <Zap size={14} className="inline mr-2 text-aureos-gold" />Detected Opportunities
                </h3>
                <div className="space-y-3">
                  {scanResult.opportunities.map((opp, i) => (
                    <motion.div key={`${opp.symbol}-${opp.type}-${i}`}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className={`p-4 rounded-xl flex items-center justify-between ${
                        opp.severity === 'high' ? 'bg-[#FF5252]/5 border border-[#FF5252]/20' :
                        opp.severity === 'medium' ? 'bg-[#CFAE46]/5 border border-[#CFAE46]/20' : 'bg-white/5'
                      }`} data-testid={`opportunity-${opp.symbol}-${opp.type}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          opp.signal === 'BUY' ? 'bg-[#00E676]/15' : opp.signal === 'SELL' ? 'bg-[#FF5252]/15' : 'bg-white/10'
                        }`}>
                          {React.createElement(signalIcon(opp.signal), { size: 18, color: signalColor(opp.signal) })}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{opp.name || opp.symbol}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${
                              opp.severity === 'high' ? 'bg-[#FF5252]/15 text-[#FF5252]' :
                              opp.severity === 'medium' ? 'bg-[#CFAE46]/15 text-aureos-gold' : 'bg-white/10 text-[#888]'
                            }`}>{opp.severity}</span>
                          </div>
                          <p className="text-sm text-[#888]">{opp.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <p className="font-mono text-sm" style={{ color: signalColor(opp.signal) }}>{opp.signal}</p>
                          <p className="text-[10px] text-[#888]">{opp.confidence}% conf</p>
                        </div>
                        <div>
                          <p className="font-mono text-sm">${opp.price?.toLocaleString()}</p>
                          <p className="text-[10px] text-[#888]">RSI: {opp.details?.rsi?.toFixed(0)}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Scanned Assets Grid */}
            <div className="aureos-card p-6">
              <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">All Scanned Assets</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#888] border-b border-white/5">
                      <th className="text-left pb-3 font-medium">Asset</th>
                      <th className="text-right pb-3 font-medium">Price</th>
                      <th className="text-right pb-3 font-medium">Change</th>
                      <th className="text-center pb-3 font-medium">Signal</th>
                      <th className="text-right pb-3 font-medium">Confidence</th>
                      <th className="text-right pb-3 font-medium">RSI</th>
                      <th className="text-right pb-3 font-medium">Risk</th>
                      <th className="text-center pb-3 font-medium">Regime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.assets?.map((a, i) => (
                      <tr key={a.symbol} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-3 flex items-center gap-2">
                          <span className="font-semibold">{a.symbol}</span>
                          <span className="text-xs text-[#888]">{a.asset_type}</span>
                        </td>
                        <td className="text-right font-mono py-3">${a.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className={`text-right font-mono py-3 ${a.change_percent >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                          {a.change_percent >= 0 ? '+' : ''}{a.change_percent?.toFixed(2)}%
                        </td>
                        <td className="text-center py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            a.signal === 'BUY' ? 'bg-[#00E676]/15 text-[#00E676]' :
                            a.signal === 'SELL' ? 'bg-[#FF5252]/15 text-[#FF5252]' : 'bg-white/10 text-[#888]'
                          }`}>{a.signal}</span>
                        </td>
                        <td className="text-right font-mono py-3">{a.confidence}%</td>
                        <td className={`text-right font-mono py-3 ${a.rsi > 70 ? 'text-[#FF5252]' : a.rsi < 30 ? 'text-[#00E676]' : ''}`}>
                          {a.rsi?.toFixed(0)}
                        </td>
                        <td className={`text-right font-mono py-3 ${a.risk_score > 65 ? 'text-[#FF5252]' : a.risk_score < 35 ? 'text-[#00E676]' : ''}`}>
                          {a.risk_score?.toFixed(0)}
                        </td>
                        <td className="text-center py-3">
                          <span className="text-xs text-[#888] capitalize">{a.regime}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!isScanning && !scanResult && (
          <div className="aureos-card p-16 text-center">
            <Radar className="text-aureos-gold mx-auto mb-6" size={64} />
            <h3 className="text-2xl font-semibold mb-3">Market Scanner</h3>
            <p className="text-[#888] max-w-lg mx-auto mb-8">
              JARVIS will scan 17+ global assets across crypto, stocks, forex, and commodities 
              to detect breakouts, reversals, momentum surges, and high-probability opportunities.
            </p>
            <Button onClick={runScan} className="aureos-btn-gold text-lg px-8 py-3" data-testid="scan-empty-btn">
              <Play size={20} className="mr-2" />Start Scan
            </Button>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="aureos-card p-6">
            <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
              <Clock size={14} className="inline mr-2" />Scan History
            </h3>
            <div className="space-y-2">
              {scanHistory.slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <Radar size={16} className="text-aureos-gold" />
                    <div>
                      <p className="text-sm">{h.assets_scanned} assets scanned</p>
                      <p className="text-xs text-[#888]">{new Date(h.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-[#00E676]">{h.opportunities_found} opps</span>
                    <span className="text-[#FF5252]">{h.high_priority} high</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <JarvisCopilot />
    </AureosLayout>
  );
};

const StatCard = ({ icon: Icon, label, value, color, isText }) => (
  <div className="aureos-card p-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className={`${isText ? 'text-sm' : 'text-2xl font-bold font-mono'}`}>{value}</p>
        <p className="text-xs text-[#888]">{label}</p>
      </div>
    </div>
  </div>
);

export default ScannerPage;
