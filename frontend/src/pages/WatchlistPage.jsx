import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Plus, Trash2, RefreshCw, Bell, BellOff, TrendingUp,
  TrendingDown, Minus, AlertTriangle, Search, Loader2, Check,
  Zap, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const WatchlistPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchWatchlist = useCallback(async () => {
    try {
      const resp = await axios.get(`${API}/watchlist/`, { headers });
      setWatchlist(resp.data.watchlist || []);
      setAlerts(resp.data.alerts || []);
      setUnreadAlerts(resp.data.unread_alerts || 0);
    } catch {
      toast.error('Failed to load watchlist');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const searchAssets = async (q) => {
    if (q.length < 1) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const resp = await axios.get(`${API}/assets/search`, { params: { q } });
      setSearchResults(resp.data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addToWatchlist = async (asset) => {
    try {
      await axios.post(`${API}/watchlist/add`, {
        symbol: asset.symbol,
        name: asset.name,
        asset_type: asset.type || 'stock',
        coingecko_id: asset.coingecko_id || null,
        exchange: asset.exchange || null,
        alert_on_signal_change: true,
      }, { headers });
      toast.success(`${asset.symbol} added to watchlist`);
      setShowAddPanel(false);
      setAddQuery('');
      fetchWatchlist();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
    }
  };

  const removeFromWatchlist = async (symbol) => {
    try {
      await axios.post(`${API}/watchlist/remove`, { symbol }, { headers });
      toast.success(`${symbol} removed`);
      fetchWatchlist();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const scanWatchlist = async () => {
    setIsScanning(true);
    toast.info('JARVIS is scanning your watchlist...');
    try {
      const resp = await axios.post(`${API}/watchlist/scan`, {}, { headers });
      const data = resp.data;
      toast.success(`Scanned ${data.scanned} assets. ${data.alerts_generated} new alert(s).`);
      fetchWatchlist();
    } catch {
      toast.error('Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const markAlertsRead = async () => {
    try {
      await axios.post(`${API}/watchlist/alerts/mark-read`, {}, { headers });
      setUnreadAlerts(0);
      setAlerts(alerts.map(a => ({ ...a, read: true })));
    } catch {}
  };

  const SignalBadge = ({ signal }) => {
    if (!signal?.direction) return <span className="text-xs text-[#888]">No signal</span>;
    const colors = { BUY: 'text-[#00E676] bg-[#00E676]/15', SELL: 'text-[#FF5252] bg-[#FF5252]/15', HOLD: 'text-[#888] bg-white/10' };
    const icons = { BUY: TrendingUp, SELL: TrendingDown, HOLD: Minus };
    const Icon = icons[signal.direction] || Minus;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${colors[signal.direction] || colors.HOLD}`}>
        <Icon size={12} />{signal.direction} {signal.confidence ? `${signal.confidence}%` : ''}
      </span>
    );
  };

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="watchlist-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins']">
              <span className="text-gradient-gold">Watchlist</span>
            </h1>
            <p className="text-[#888] mt-1">JARVIS monitors your assets for signal changes</p>
          </div>
          <div className="flex items-center gap-3">
            {unreadAlerts > 0 && (
              <button onClick={markAlertsRead} className="relative p-2 hover:bg-white/10 rounded-lg transition-all" data-testid="alerts-badge">
                <Bell className="text-aureos-gold" size={20} />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF5252] text-white text-[10px] flex items-center justify-center font-bold">{unreadAlerts}</span>
              </button>
            )}
            <Button onClick={scanWatchlist} disabled={isScanning || watchlist.length === 0} className="aureos-btn-outline" data-testid="scan-watchlist-btn">
              {isScanning ? <Loader2 className="animate-spin mr-2" size={16} /> : <RefreshCw size={16} className="mr-2" />}
              {isScanning ? 'Scanning...' : 'Scan All'}
            </Button>
            <Button onClick={() => setShowAddPanel(!showAddPanel)} className="aureos-btn-gold" data-testid="add-asset-btn">
              <Plus size={16} className="mr-2" />Add Asset
            </Button>
          </div>
        </div>

        {/* Alerts Banner */}
        <AnimatePresence>
          {alerts.length > 0 && !alerts[0].read && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-2">
              {alerts.slice(0, 3).filter(a => !a.read).map((alert, i) => (
                <div key={i} className={`aureos-card p-4 border-l-4 ${alert.severity === 'high' ? 'border-l-[#FF5252]' : 'border-l-aureos-gold'}`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className={alert.severity === 'high' ? 'text-[#FF5252]' : 'text-aureos-gold'} />
                    <div>
                      <p className="font-semibold text-sm">{alert.title}</p>
                      <p className="text-xs text-[#888] mt-1">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Asset Panel */}
        <AnimatePresence>
          {showAddPanel && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="aureos-card p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Search size={18} className="text-aureos-gold" />Search & Add Asset
              </h3>
              <div className="relative">
                <input type="text" value={addQuery}
                  onChange={(e) => { setAddQuery(e.target.value); searchAssets(e.target.value); }}
                  placeholder="Search: AAPL, BTC, EUR/USD, Toyota..."
                  className="aureos-input w-full"
                  data-testid="watchlist-search-input" />
                {isSearching && <Loader2 className="absolute right-3 top-3 animate-spin text-aureos-gold" size={18} />}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
                  {searchResults.slice(0, 8).map((asset, i) => (
                    <button key={`${asset.symbol}-${i}`} onClick={() => addToWatchlist(asset)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all group">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold group-hover:text-aureos-gold">{asset.symbol}</span>
                        <span className="text-xs text-[#888]">{asset.name}{asset.exchange ? ` · ${asset.exchange}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase text-[#888]">{asset.type}</span>
                        <Plus size={14} className="text-[#888] group-hover:text-aureos-gold" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Watchlist Table */}
        {isLoading ? (
          <div className="aureos-card p-12 text-center">
            <Loader2 className="animate-spin text-aureos-gold mx-auto" size={32} />
            <p className="text-[#888] mt-3">Loading watchlist...</p>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="aureos-card p-12 text-center">
            <Eye className="text-[#888] mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-2">Watchlist is empty</h3>
            <p className="text-[#888] mb-6">Add assets to monitor. JARVIS will track signal changes.</p>
            <Button onClick={() => setShowAddPanel(true)} className="aureos-btn-gold">
              <Plus size={16} className="mr-2" />Add Your First Asset
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {watchlist.map((item, index) => (
              <motion.div key={item.symbol}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="aureos-card p-4 hover:border-[#CFAE46]/30 transition-all group cursor-pointer"
                onClick={() => navigate('/analysis')}
                data-testid={`watchlist-item-${item.symbol}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-[#CFAE46]/10 flex items-center justify-center">
                      <Zap className="text-aureos-gold" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{item.symbol}</span>
                        <span className="text-xs text-[#888] uppercase px-2 py-0.5 rounded bg-white/5">{item.asset_type}</span>
                      </div>
                      <p className="text-xs text-[#888]">{item.name}{item.exchange ? ` · ${item.exchange}` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {item.latest_price && (
                      <div className="text-right">
                        <p className="font-mono font-bold">${Number(item.latest_price).toLocaleString()}</p>
                      </div>
                    )}
                    <SignalBadge signal={item.latest_signal} />
                    {item.latest_regime?.market_phase?.phase && (
                      <span className="text-xs text-[#888] capitalize hidden md:inline">{item.latest_regime.market_phase.phase}</span>
                    )}
                    {item.last_analyzed && (
                      <span className="text-[10px] text-[#666] hidden md:inline">
                        {new Date(item.last_analyzed).toLocaleDateString()}
                      </span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.symbol); }}
                      className="p-2 hover:bg-[#FF5252]/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      data-testid={`remove-${item.symbol}`}>
                      <Trash2 size={14} className="text-[#FF5252]" />
                    </button>
                    <ChevronRight size={16} className="text-[#888] group-hover:text-aureos-gold transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <JarvisCopilot />
    </AureosLayout>
  );
};

export default WatchlistPage;
