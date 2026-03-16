import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Bitcoin, DollarSign, BarChart2, Gem, Loader2, Check } from 'lucide-react';
import axios from 'axios';
import { API } from '@/App';

const ASSET_ICONS = {
  stock: TrendingUp,
  crypto: Bitcoin,
  forex: DollarSign,
  index: BarChart2,
  commodity: Gem,
};

const ASSET_COLORS = {
  stock: '#00B4FF',
  crypto: '#CFAE46',
  forex: '#00E676',
  index: '#FF6B6B',
  commodity: '#9C27B0',
};

const POPULAR_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', coingecko_id: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', coingecko_id: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', coingecko_id: 'solana' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'XAUUSD', name: 'Gold', type: 'commodity' },
  { symbol: 'EURUSD', name: 'EUR/USD', type: 'forex' },
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'index' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
];

const GlobalAssetSelector = ({ onAssetSelect, selectedAsset }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(POPULAR_ASSETS);
  const [confirmedAsset, setConfirmedAsset] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  const searchAssets = async (q) => {
    if (q.length < 1) {
      setSuggestions(POPULAR_ASSETS);
      return;
    }
    setIsLoading(true);
    try {
      const resp = await axios.get(`${API}/assets/search`, { params: { q } });
      const results = resp.data.results || [];
      setSuggestions(results.length > 0 ? results : POPULAR_ASSETS);
    } catch {
      setSuggestions(POPULAR_ASSETS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAssets(value), 300);
  };

  const handleSelectAsset = (asset) => {
    const finalAsset = {
      symbol: asset.symbol,
      name: asset.name || asset.symbol,
      type: asset.type || 'stock',
      coingecko_id: asset.coingecko_id || null,
      price: asset.price || null,
      change_percent: asset.change_percent || null,
    };
    setQuery(asset.symbol);
    setIsOpen(false);
    setConfirmedAsset(finalAsset);
    if (onAssetSelect) onAssetSelect(finalAsset);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.length > 0 && suggestions.length > 0) {
      handleSelectAsset(suggestions[0]);
    }
    if (e.key === 'Escape') setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const detectedType = confirmedAsset?.type || (suggestions[0]?.type);
  const Icon = detectedType ? (ASSET_ICONS[detectedType] || Search) : Search;
  const iconColor = detectedType ? (ASSET_COLORS[detectedType] || '#888') : '#888';

  return (
    <div ref={containerRef} className="relative w-full max-w-xl" data-testid="global-asset-selector">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300">
          {isLoading ? (
            <Loader2 className="animate-aureos-spin" size={20} style={{ color: '#CFAE46' }} />
          ) : (
            <Icon size={20} style={{ color: iconColor }} />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search any asset: BTC, AAPL, XAUUSD, EURUSD..."
          className="aureos-input pl-12 pr-4 py-4 text-lg"
          data-testid="asset-search-input"
        />
        {query.length > 0 && detectedType && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="px-3 py-1 text-xs font-bold uppercase rounded-full"
              style={{ backgroundColor: `${ASSET_COLORS[detectedType] || '#888'}20`, color: ASSET_COLORS[detectedType] || '#888', border: `1px solid ${ASSET_COLORS[detectedType] || '#888'}` }}>
              {detectedType}
            </span>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 aureos-glass overflow-hidden z-50">
            <div className="p-2">
              <p className="text-xs text-[#888] uppercase tracking-wider px-3 py-2">
                {query.length > 0 ? 'Search Results' : 'Popular Assets'}
              </p>
              <div className="max-h-64 overflow-y-auto">
                {suggestions.map((asset, index) => {
                  const AssetIcon = ASSET_ICONS[asset.type] || TrendingUp;
                  const color = ASSET_COLORS[asset.type] || '#888';
                  return (
                    <motion.button key={`${asset.symbol}-${index}`}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}
                      onClick={() => handleSelectAsset(asset)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-all group"
                      data-testid={`asset-suggestion-${asset.symbol}`}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                        <AssetIcon size={18} style={{ color }} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold group-hover:text-aureos-gold transition-colors">{asset.symbol}</p>
                        <p className="text-xs text-[#888]">{asset.name}</p>
                      </div>
                      {asset.price && (
                        <span className="text-sm font-mono text-[#888]">${typeof asset.price === 'number' ? asset.price.toLocaleString() : asset.price}</span>
                      )}
                      <span className="text-xs uppercase opacity-60" style={{ color }}>{asset.type}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmedAsset && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="mt-4 aureos-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#CFAE46]/10">
                  <Check className="text-aureos-gold" size={24} />
                </div>
                <div>
                  <p className="text-sm text-[#888]">Asset Confirmed</p>
                  <p className="font-bold text-lg">{confirmedAsset.symbol}</p>
                  <p className="text-xs text-[#666]">{confirmedAsset.name}</p>
                </div>
              </div>
              <span className="px-3 py-1 text-sm font-bold uppercase rounded-full"
                style={{ backgroundColor: `${ASSET_COLORS[confirmedAsset.type] || '#888'}20`, color: ASSET_COLORS[confirmedAsset.type] || '#888' }}>
                {confirmedAsset.type}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalAssetSelector;
