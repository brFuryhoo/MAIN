import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion } from 'framer-motion';
import {
  Gauge, TrendingUp, TrendingDown, Minus, Flame, Snowflake,
  RefreshCw, Loader2, Coins, Globe, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const SentimentPage = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchSentiment = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await axios.get(`${API}/news/sentiment`, { headers, timeout: 30000 });
      setData(resp.data);
    } catch { toast.error('Failed to load sentiment'); }
    finally { setIsLoading(false); }
  }, [token]);

  useEffect(() => { fetchSentiment(); }, [fetchSentiment]);

  const moodColor = (score) => score >= 55 ? '#00E676' : score <= 45 ? '#FF5252' : '#CFAE46';
  const moodIcon = (score) => score >= 55 ? Flame : score <= 45 ? Snowflake : Minus;

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="sentiment-page">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins'] flex items-center gap-3">
              <Gauge className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Market Sentiment</span>
            </h1>
            <p className="text-[#888] mt-1">Fear & Greed Index, Trending Assets, Global Market Mood</p>
          </div>
          <Button onClick={fetchSentiment} disabled={isLoading} className="aureos-btn-outline" data-testid="refresh-sentiment-btn">
            {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <RefreshCw size={16} className="mr-2" />}Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="aureos-card p-12 text-center">
            <Loader2 className="animate-spin text-aureos-gold mx-auto" size={32} />
            <p className="text-[#888] mt-3">Reading market sentiment...</p>
          </div>
        ) : data?.status === 'complete' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Main Gauge */}
            <div className="aureos-card p-8 text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: `${moodColor(data.sentiment_score)}15`, border: `2px solid ${moodColor(data.sentiment_score)}40` }}>
                <div className="text-center">
                  <p className="font-mono text-4xl font-bold" style={{ color: moodColor(data.sentiment_score) }}>{data.sentiment_score}</p>
                  <p className="text-[10px] text-[#888]">/ 100</p>
                </div>
              </div>
              <h2 className="text-2xl font-bold" style={{ color: moodColor(data.sentiment_score) }}>{data.market_mood}</h2>
              <p className="text-[#888] mt-3 max-w-lg mx-auto text-sm">{data.interpretation}</p>
            </div>

            {/* Fear & Greed History */}
            {data.fear_greed?.history?.length > 0 && (
              <div className="aureos-card p-6">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Fear & Greed (7 Days)</h3>
                <div className="flex gap-3 justify-center">
                  {data.fear_greed.history.map((fg, i) => (
                    <div key={i} className="text-center">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-1"
                        style={{ background: `${moodColor(fg.value)}15` }}>
                        <span className="font-mono font-bold text-sm" style={{ color: moodColor(fg.value) }}>{fg.value}</span>
                      </div>
                      <p className="text-[10px] text-[#888]">{fg.label?.substring(0, 5) || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Trending */}
              {data.trending_coins?.length > 0 && (
                <div className="aureos-card p-6">
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                    <Flame size={14} className="inline mr-2 text-[#FF9800]" />Trending Now
                  </h3>
                  <div className="space-y-2">
                    {data.trending_coins.map((coin, i) => (
                      <div key={coin.symbol} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-aureos-gold w-6">#{i + 1}</span>
                          <div>
                            <p className="font-semibold text-sm">{coin.name}</p>
                            <p className="text-[10px] text-[#888]">{coin.symbol}</p>
                          </div>
                        </div>
                        {coin.rank && <span className="text-xs text-[#888]">Rank #{coin.rank}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Global Market */}
              {data.global_market && (
                <div className="aureos-card p-6">
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                    <Globe size={14} className="inline mr-2 text-[#00B4FF]" />Global Crypto Market
                  </h3>
                  <div className="space-y-3">
                    <KVRow label="Total Market Cap" value={`$${(data.global_market.total_market_cap_usd / 1e12).toFixed(2)}T`} />
                    <KVRow label="24h Volume" value={`$${(data.global_market.total_volume_24h / 1e9).toFixed(1)}B`} />
                    <KVRow label="24h Change" value={`${data.global_market.market_cap_change_24h?.toFixed(2)}%`}
                      color={data.global_market.market_cap_change_24h >= 0 ? '#00E676' : '#FF5252'} />
                    <KVRow label="BTC Dominance" value={`${data.global_market.btc_dominance?.toFixed(1)}%`} />
                    <KVRow label="ETH Dominance" value={`${data.global_market.eth_dominance?.toFixed(1)}%`} />
                    <KVRow label="Active Cryptos" value={data.global_market.active_cryptocurrencies?.toLocaleString()} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </div>
      <JarvisCopilot />
    </AureosLayout>
  );
};

const KVRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-[#888]">{label}</span>
    <span className="font-mono font-semibold text-sm" style={color ? { color } : {}}>{value}</span>
  </div>
);

export default SentimentPage;
