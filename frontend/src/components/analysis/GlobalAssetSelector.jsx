import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Bitcoin, DollarSign, BarChart2, Gem, Loader2, Check, X } from 'lucide-react';

// Asset type detection patterns
const ASSET_PATTERNS = {
  crypto: /^(BTC|ETH|SOL|ADA|XRP|DOGE|MATIC|AVAX|DOT|LINK|SHIB|LTC|UNI|ATOM|NEAR|APT|ARB|OP|IMX|INJ|SEI|SUI|TIA|PYTH|JUP|WIF|PEPE|BONK|FLOKI|BOME)/i,
  forex: /^(EUR|USD|GBP|JPY|AUD|NZD|CAD|CHF|CNY|HKD|SGD|KRW|INR|MXN|ZAR|BRL|RUB|TRY|SEK|NOK|DKK|PLN|CZK|HUF|ILS|THB|MYR|PHP|IDR|VND|TWD)/i,
  commodity: /^(XAU|XAG|WTI|BRENT|CRUDE|OIL|GAS|NATGAS|GOLD|SILVER|COPPER|PLATINUM|PALLADIUM|COFFEE|COCOA|SUGAR|CORN|WHEAT|SOYBEAN|COTTON|LUMBER)/i,
  index: /^(SPX|SPY|QQQ|DJI|IXIC|RUT|VIX|NDX|FTSE|DAX|CAC|NIKKEI|HSI|KOSPI|ASX|STI|SENSEX|NIFTY)/i,
};

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

// Popular assets for suggestions
const POPULAR_ASSETS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETHUSDT', name: 'Ethereum', type: 'crypto' },
  { symbol: 'XAUUSD', name: 'Gold', type: 'commodity' },
  { symbol: 'EURUSD', name: 'EUR/USD', type: 'forex' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'index' },
  { symbol: 'WTICOUSD', name: 'Crude Oil WTI', type: 'commodity' },
];

const GlobalAssetSelector = ({ onAssetSelect, selectedAsset }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedType, setDetectedType] = useState(null);
  const [suggestions, setSuggestions] = useState(POPULAR_ASSETS);
  const [confirmedAsset, setConfirmedAsset] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Detect asset type from symbol
  const detectAssetType = (symbol) => {
    const upperSymbol = symbol.toUpperCase();
    
    // Check for crypto pairs
    if (upperSymbol.includes('USDT') || upperSymbol.includes('USDC') || upperSymbol.includes('BUSD')) {
      return 'crypto';
    }
    
    // Check for forex pairs (6 char like EURUSD)
    if (/^[A-Z]{6}$/.test(upperSymbol) && ASSET_PATTERNS.forex.test(upperSymbol.slice(0, 3))) {
      return 'forex';
    }
    
    // Check patterns
    for (const [type, pattern] of Object.entries(ASSET_PATTERNS)) {
      if (pattern.test(upperSymbol)) {
        return type;
      }
    }
    
    // Default to stock
    return 'stock';
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setQuery(value);
    
    if (value.length > 0) {
      const type = detectAssetType(value);
      setDetectedType(type);
      
      // Filter suggestions
      const filtered = POPULAR_ASSETS.filter(
        asset => asset.symbol.includes(value) || asset.name.toUpperCase().includes(value)
      );
      setSuggestions(filtered.length > 0 ? filtered : POPULAR_ASSETS);
    } else {
      setDetectedType(null);
      setSuggestions(POPULAR_ASSETS);
    }
  };

  // Select asset
  const handleSelectAsset = async (asset) => {
    setIsLoading(true);
    setQuery(asset.symbol);
    setIsOpen(false);
    
    // Simulate API detection confirmation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const finalAsset = {
      symbol: asset.symbol,
      name: asset.name || asset.symbol,
      type: asset.type || detectAssetType(asset.symbol),
    };
    
    setConfirmedAsset(finalAsset);
    setIsLoading(false);
    
    if (onAssetSelect) {
      onAssetSelect(finalAsset);
    }
  };

  // Handle enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.length > 0) {
      handleSelectAsset({ symbol: query, type: detectedType || 'stock' });
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const Icon = detectedType ? ASSET_ICONS[detectedType] : Search;
  const iconColor = detectedType ? ASSET_COLORS[detectedType] : '#888';

  return (
    <div ref={containerRef} className="relative w-full max-w-xl" data-testid="global-asset-selector">
      {/* Main Input */}
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
          placeholder="Search any asset: BTCUSDT, XAUUSD, AAPL, EURUSD..."
          className="aureos-input pl-12 pr-4 py-4 text-lg"
          data-testid="asset-search-input"
        />
        
        {/* Detected Type Badge */}
        {detectedType && query.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <span 
              className="px-3 py-1 text-xs font-bold uppercase rounded-full"
              style={{ 
                backgroundColor: `${ASSET_COLORS[detectedType]}20`,
                color: ASSET_COLORS[detectedType],
                border: `1px solid ${ASSET_COLORS[detectedType]}`
              }}
            >
              {detectedType}
            </span>
          </motion.div>
        )}
      </div>

      {/* Dropdown Suggestions */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 aureos-glass overflow-hidden z-50"
          >
            <div className="p-2">
              <p className="text-xs text-[#888] uppercase tracking-wider px-3 py-2">
                {query.length > 0 ? 'Matching Assets' : 'Popular Assets'}
              </p>
              
              <div className="max-h-64 overflow-y-auto">
                {suggestions.map((asset, index) => {
                  const AssetIcon = ASSET_ICONS[asset.type] || TrendingUp;
                  return (
                    <motion.button
                      key={asset.symbol}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSelectAsset(asset)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-all group"
                      data-testid={`asset-suggestion-${asset.symbol}`}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${ASSET_COLORS[asset.type]}15` }}
                      >
                        <AssetIcon size={18} style={{ color: ASSET_COLORS[asset.type] }} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold group-hover:text-aureos-gold transition-colors">
                          {asset.symbol}
                        </p>
                        <p className="text-xs text-[#888]">{asset.name}</p>
                      </div>
                      <span 
                        className="text-xs uppercase opacity-60"
                        style={{ color: ASSET_COLORS[asset.type] }}
                      >
                        {asset.type}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmed Asset Display */}
      <AnimatePresence>
        {confirmedAsset && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 aureos-card p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#CFAE46]/10">
                  <Check className="text-aureos-gold" size={24} />
                </div>
                <div>
                  <p className="text-sm text-[#888]">Asset Confirmed</p>
                  <p className="font-bold text-lg">{confirmedAsset.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <span 
                  className="px-3 py-1 text-sm font-bold uppercase rounded-full"
                  style={{ 
                    backgroundColor: `${ASSET_COLORS[confirmedAsset.type]}20`,
                    color: ASSET_COLORS[confirmedAsset.type]
                  }}
                >
                  {confirmedAsset.type}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalAssetSelector;
