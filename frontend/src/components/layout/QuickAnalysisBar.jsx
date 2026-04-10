/**
 * QuickAnalysisBar.jsx
 * Smart search bar for the Aureos dashboard header.
 * 
 * Behavior:
 * - If input looks like an asset symbol → navigate to /analysis?symbol=SYMBOL
 * - If input looks like a question → navigate to /copilot?q=QUESTION
 * - Shows 6 quick-access chip suggestions on focus
 * - Closes suggestions on outside click or ESC
 * - Styled to match existing aureos-input style (dark background)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Quick-access suggestions ───────────────────────────────────── */
const QUICK_SUGGESTIONS = [
  { symbol: 'BTC',    label: 'Bitcoin' },
  { symbol: 'AAPL',   label: 'Apple' },
  { symbol: 'NVDA',   label: 'NVIDIA' },
  { symbol: 'GOLD',   label: 'Gold' },
  { symbol: 'EUR/USD',label: 'EUR/USD' },
  { symbol: 'ETH',    label: 'Ethereum' },
];

/* ─── Pattern matchers ───────────────────────────────────────────── */
const SYMBOL_PATTERN = /^[A-Z]{1,10}(\/[A-Z]{1,10})?$/i;
const KNOWN_SYMBOLS = new Set([
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT',
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD', 'INTC', 'QCOM',
  'GOLD', 'SILVER', 'OIL', 'GAS',
  'SPX', 'NDX', 'DJI', 'ASX',
  'EUR', 'GBP', 'JPY', 'AUD', 'CHF', 'CAD',
]);

function isAssetSymbol(input) {
  const clean = input.trim().toUpperCase();
  // Check known symbols
  if (KNOWN_SYMBOLS.has(clean)) return true;
  // Check forex pair pattern like EUR/USD, BTC/USD
  if (/^[A-Z]{2,6}\/[A-Z]{2,6}$/i.test(clean)) return true;
  // Short all-caps (2-6 chars), no spaces, no question words
  const questionWords = /^(what|how|why|when|where|who|is|are|will|can|should|tell|explain|analyze|show)/i;
  if (questionWords.test(input.trim())) return false;
  if (SYMBOL_PATTERN.test(clean) && clean.length <= 8) return true;
  return false;
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function QuickAnalysisBar() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    if (!focused) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [focused]);

  /* Handle submit */
  const handleSubmit = useCallback((query) => {
    const trimmed = (query || value).trim();
    if (!trimmed) return;
    setFocused(false);
    setValue('');
    if (isAssetSymbol(trimmed)) {
      navigate(`/analysis?symbol=${encodeURIComponent(trimmed.toUpperCase())}`);
    } else {
      navigate(`/copilot?q=${encodeURIComponent(trimmed)}`);
    }
  }, [value, navigate]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (symbol) => {
    setFocused(false);
    setValue('');
    navigate(`/analysis?symbol=${encodeURIComponent(symbol)}`);
  };

  const showDropdown = focused;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input */}
      <div className="relative w-full">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          size={16}
          style={{ color: focused ? '#D4AF37' : '#888' }}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search assets or ask JARVIS..."
          className="aureos-input pl-11 pr-16 py-2 text-sm rounded-lg w-full transition-all"
          style={{
            outline: 'none',
            borderColor: focused ? 'rgba(212,175,55,0.4)' : undefined,
          }}
          data-testid="quick-analysis-input"
          autoComplete="off"
        />
        {/* Search button / keyboard shortcut hint */}
        {value ? (
          <button
            onClick={() => handleSubmit()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] font-bold transition-all"
            style={{
              background: 'rgba(212,175,55,0.15)',
              color: '#D4AF37',
              border: '1px solid rgba(212,175,55,0.3)',
            }}
            data-testid="quick-analysis-search-btn"
          >
            GO
          </button>
        ) : (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#888] bg-white/5 px-1.5 py-0.5 rounded pointer-events-none">
            K
          </kbd>
        )}
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border overflow-hidden z-50"
            style={{
              background: '#141414',
              borderColor: '#1f1f1f',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
            data-testid="quick-analysis-dropdown"
          >
            {/* Header */}
            <div
              className="px-4 py-2.5 border-b"
              style={{ borderColor: '#1f1f1f' }}
            >
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#555' }}>
                Quick Access
              </span>
            </div>

            {/* Chip grid */}
            <div className="p-3 grid grid-cols-3 gap-2">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => handleSuggestionClick(s.symbol)}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all hover:bg-white/5 group"
                  style={{ border: '1px solid #1f1f1f' }}
                  data-testid={`suggestion-${s.symbol}`}
                >
                  <div className="flex items-center gap-1.5">
                    <TrendingUp
                      size={11}
                      className="group-hover:text-aureos-gold transition-colors"
                      style={{ color: '#444' }}
                    />
                    <span
                      className="text-xs font-bold group-hover:text-white transition-colors"
                      style={{ color: '#ccc' }}
                    >
                      {s.symbol}
                    </span>
                  </div>
                  <span className="text-[9px]" style={{ color: '#555' }}>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Hint */}
            <div
              className="px-4 py-2.5 border-t flex items-center justify-between"
              style={{ borderColor: '#1a1a1a', background: '#111' }}
            >
              <span className="text-[10px]" style={{ color: '#444' }}>
                Type a symbol (BTC, AAPL) or ask a question
              </span>
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#444' }}>
                <kbd className="px-1.5 py-0.5 rounded bg-white/5">↵</kbd>
                <span>to search</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
