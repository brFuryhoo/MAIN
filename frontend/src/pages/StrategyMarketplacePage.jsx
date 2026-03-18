import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, Users, TrendingUp, Filter, Plus, ChevronRight, RefreshCw, Trophy, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const StrategyMarketplacePage = () => {
  const { token } = useAuth();
  const [strategies, setStrategies] = useState([]);
  const [myStrategies, setMyStrategies] = useState({ created: [], subscribed: [] });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('subscribers');
  const [assetFilter, setAssetFilter] = useState('all');
  const [tab, setTab] = useState('browse');

  useEffect(() => { fetchAll(); }, [sortBy, assetFilter]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [marketRes, myRes] = await Promise.all([
        axios.get(`${API}/advantage/strategies/marketplace?sort_by=${sortBy}&asset_class=${assetFilter}`),
        token ? axios.get(`${API}/advantage/strategies/my-strategies`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { created: [], subscribed: [] } })) : Promise.resolve({ data: { created: [], subscribed: [] } }),
      ]);
      setStrategies(marketRes.data.strategies || []);
      setMyStrategies(myRes.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const subscribe = async (id) => {
    try {
      await axios.post(`${API}/advantage/strategies/${id}/subscribe`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Subscribed to strategy!');
      fetchAll();
    } catch { toast.error('Already subscribed'); }
  };

  const riskColors = { low: '#00E676', moderate: '#FF9800', high: '#FF5252' };

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="strategy-marketplace-page">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">Strategy <span className="text-gradient-gold">Marketplace</span></h1>
            <p className="text-[#666] mt-1 text-sm">Discover, subscribe, and share proven trading strategies</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[{ id: 'browse', label: 'Browse', icon: ShoppingBag }, { id: 'my', label: 'My Strategies', icon: Star }].map(t => (
            <Button key={t.id} onClick={() => setTab(t.id)}
              className={`text-xs ${tab === t.id ? 'aureos-btn-gold' : 'bg-white/5 text-[#888] hover:bg-white/10'}`}
              data-testid={`tab-${t.id}`}>
              <t.icon size={14} className="mr-1.5" /> {t.label}
            </Button>
          ))}
        </div>

        {tab === 'browse' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1">
                {['all', 'stocks', 'crypto', 'forex'].map(f => (
                  <Button key={f} size="sm" onClick={() => setAssetFilter(f)}
                    className={`text-[11px] h-7 px-3 ${assetFilter === f ? 'bg-aureos-gold/20 text-aureos-gold border-aureos-gold/30' : 'bg-white/5 text-[#888]'}`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1 ml-auto">
                {[{ id: 'subscribers', label: 'Popular' }, { id: 'rating', label: 'Top Rated' }, { id: 'performance', label: 'Best Return' }].map(s => (
                  <Button key={s.id} size="sm" onClick={() => setSortBy(s.id)}
                    className={`text-[11px] h-7 px-3 ${sortBy === s.id ? 'bg-[#00B4FF]/20 text-[#00B4FF]' : 'bg-white/5 text-[#888]'}`}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Strategy Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-20"><RefreshCw className="animate-spin text-aureos-gold" size={24} /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {strategies.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="aureos-card p-5 hover:border-aureos-gold/20 transition-all" data-testid={`strategy-card-${i}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-sm">{s.name}</h3>
                        <p className="text-[10px] text-[#666] mt-0.5">by {s.creator_name}</p>
                      </div>
                      <Badge className="text-[9px]" style={{ background: (riskColors[s.risk_level] || '#FF9800') + '20', color: riskColors[s.risk_level] || '#FF9800', border: `1px solid ${riskColors[s.risk_level] || '#FF9800'}30` }}>
                        {s.risk_level}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#888] mb-3 line-clamp-2">{s.description}</p>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-[9px] text-[#666] uppercase">Win Rate</p>
                        <p className="text-sm font-mono font-bold text-[#00E676]">{s.performance?.win_rate}%</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-[9px] text-[#666] uppercase">Return</p>
                        <p className="text-sm font-mono font-bold text-aureos-gold">+{s.performance?.total_return}%</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                        <p className="text-[9px] text-[#666] uppercase">Sharpe</p>
                        <p className="text-sm font-mono font-bold text-[#00B4FF]">{s.performance?.sharpe}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 text-[11px] text-[#888]">
                        <span className="flex items-center gap-1"><Users size={11} /> {s.subscribers}</span>
                        <span className="flex items-center gap-1"><Star size={11} className="text-aureos-gold" /> {s.rating}</span>
                      </div>
                      <span className="text-[10px] uppercase text-[#666]">{s.timeframe} | {s.asset_class}</span>
                    </div>

                    <Button onClick={() => subscribe(s.id)} className="w-full aureos-btn-gold text-xs h-8" data-testid={`subscribe-btn-${i}`}>
                      <Zap size={12} className="mr-1.5" /> Subscribe
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'my' && (
          <div className="space-y-6">
            {myStrategies.subscribed?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Subscribed Strategies</h3>
                <div className="space-y-2">
                  {myStrategies.subscribed.map((s, i) => (
                    <div key={s.id} className="aureos-card p-4 flex items-center justify-between" data-testid={`subscribed-strategy-${i}`}>
                      <div>
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-[10px] text-[#888]">{s.asset_class} | {s.timeframe}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-[#00E676]">+{s.performance?.total_return}%</span>
                        <ChevronRight size={14} className="text-[#666]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!myStrategies.subscribed?.length && !myStrategies.created?.length && (
              <div className="text-center py-16">
                <ShoppingBag className="mx-auto mb-3 text-[#444]" size={36} />
                <p className="text-[#666] text-sm">No strategies yet. Browse the marketplace to subscribe!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AureosLayout>
  );
};

export default StrategyMarketplacePage;
