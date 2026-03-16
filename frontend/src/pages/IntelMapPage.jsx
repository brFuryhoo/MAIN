import React, { useState, useCallback } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion } from 'framer-motion';
import {
  Globe, Loader2, TrendingUp, TrendingDown, Minus, Play,
  ArrowUpRight, ArrowDownRight, Activity, Zap, Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const IntelMapPage = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const loadMap = useCallback(async () => {
    setIsLoading(true);
    toast.info('JARVIS mapping global markets...');
    try {
      const resp = await axios.get(`${API}/intelligence/map`, { headers, timeout: 120000 });
      setData(resp.data);
      toast.success(`Map complete! ${resp.data.assets?.length} assets analyzed`);
    } catch { toast.error('Failed to load intelligence map'); }
    finally { setIsLoading(false); }
  }, [token]);

  const momentumColor = (m) => m > 15 ? '#00E676' : m < -15 ? '#FF5252' : '#888';
  const flowIcon = (d) => d === 'inflow' ? ArrowUpRight : d === 'outflow' ? ArrowDownRight : Minus;
  const flowColor = (d) => d === 'inflow' ? '#00E676' : d === 'outflow' ? '#FF5252' : '#888';

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="intel-map-page">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins'] flex items-center gap-3">
              <Globe className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Intelligence Map</span>
            </h1>
            <p className="text-[#888] mt-1">Global Capital Flows, Correlations & Market Regime</p>
          </div>
          <Button onClick={loadMap} disabled={isLoading} className="aureos-btn-gold" data-testid="load-map-btn">
            {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Play size={16} className="mr-2" />}
            {isLoading ? 'Mapping...' : 'Generate Map'}
          </Button>
        </div>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aureos-card p-12 text-center">
            <Globe className="text-aureos-gold mx-auto mb-4 animate-pulse" size={48} />
            <p className="text-aureos-gold font-semibold">JARVIS analyzing global capital flows...</p>
            <p className="text-[#888] text-sm mt-1">Scanning 11 assets across crypto, stocks, forex, commodities</p>
          </motion.div>
        )}

        {!isLoading && !data && (
          <div className="aureos-card p-16 text-center">
            <Globe className="text-aureos-gold mx-auto mb-6" size={64} />
            <h3 className="text-2xl font-semibold mb-3">Global Market Intelligence</h3>
            <p className="text-[#888] max-w-lg mx-auto mb-8">
              JARVIS will map correlations between assets, detect capital flows between sectors,
              and classify the current market regime across the global financial system.
            </p>
            <Button onClick={loadMap} className="aureos-btn-gold text-lg px-8 py-3" data-testid="map-empty-btn">
              <Play size={20} className="mr-2" />Generate Intelligence Map
            </Button>
          </div>
        )}

        {!isLoading && data?.status === 'complete' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Market Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Assets" value={data.market_summary?.total_assets} color="#CFAE46" />
              <StatCard label="Bullish" value={data.market_summary?.bullish} color="#00E676" />
              <StatCard label="Bearish" value={data.market_summary?.bearish} color="#FF5252" />
              <StatCard label="Neutral" value={data.market_summary?.neutral} color="#888" />
              <StatCard label="Avg Volatility" value={`${data.market_summary?.avg_volatility}%`} color="#FF9800" />
            </div>

            {/* Capital Flows */}
            <div className="aureos-card p-6">
              <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                <Zap size={14} className="inline mr-2 text-aureos-gold" />Capital Flow Indicators
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.capital_flows?.map(flow => {
                  const Icon = flowIcon(flow.direction);
                  return (
                    <div key={flow.sector} className={`p-4 rounded-xl border ${
                      flow.direction === 'inflow' ? 'border-[#00E676]/20 bg-[#00E676]/5' :
                      flow.direction === 'outflow' ? 'border-[#FF5252]/20 bg-[#FF5252]/5' : 'border-white/10 bg-white/5'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold capitalize">{flow.sector}</span>
                        <Icon size={16} style={{ color: flowColor(flow.direction) }} />
                      </div>
                      <p className="font-mono text-lg font-bold" style={{ color: flowColor(flow.direction) }}>
                        {flow.avg_momentum > 0 ? '+' : ''}{flow.avg_momentum}
                      </p>
                      <p className="text-xs text-[#888] capitalize">{flow.direction} · {flow.asset_count} assets</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Heat Map Grid */}
            <div className="aureos-card p-6">
              <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                <Activity size={14} className="inline mr-2 text-aureos-gold" />Market Heat Map
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.assets?.sort((a, b) => b.momentum - a.momentum).map(asset => (
                  <motion.div key={asset.symbol} whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl border border-white/10 transition-all hover:border-[#CFAE46]/30"
                    style={{ background: `linear-gradient(135deg, ${momentumColor(asset.momentum)}08, transparent)` }}
                    data-testid={`heatmap-${asset.symbol}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{asset.name}</span>
                      <span className="text-[10px] text-[#888] uppercase">{asset.asset_type}</span>
                    </div>
                    <p className="font-mono text-lg font-bold" style={{ color: momentumColor(asset.momentum) }}>
                      {asset.momentum > 0 ? '+' : ''}{asset.momentum}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-[#888]">
                      <span>RSI: {asset.rsi}</span>
                      <span className="capitalize">{asset.regime}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(Math.abs(asset.momentum) + 50, 100)}%`, background: momentumColor(asset.momentum) }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Correlations */}
            {data.correlations?.length > 0 && (
              <div className="aureos-card p-6">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                  <Link2 size={14} className="inline mr-2 text-aureos-gold" />Cross-Asset Correlations
                </h3>
                <div className="space-y-2">
                  {data.correlations?.slice(0, 12).map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold">{c.asset_a}</span>
                        <Link2 size={12} className="text-[#888]" />
                        <span className="font-mono text-sm font-semibold">{c.asset_b}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${Math.abs(c.correlation) * 100}%`,
                            background: c.correlation > 0 ? '#00E676' : '#FF5252',
                          }} />
                        </div>
                        <span className={`font-mono text-sm font-bold ${c.correlation > 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                          {c.correlation > 0 ? '+' : ''}{c.correlation}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          c.strength === 'strong' ? 'bg-[#CFAE46]/15 text-aureos-gold' : 'bg-white/10 text-[#888]'
                        }`}>{c.strength}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
      <JarvisCopilot />
    </AureosLayout>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className="aureos-card p-4 text-center">
    <p className="font-mono text-2xl font-bold" style={{ color }}>{value}</p>
    <p className="text-xs text-[#888] mt-1">{label}</p>
  </div>
);

export default IntelMapPage;
