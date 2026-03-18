import React, { useState, useRef } from 'react';
import { API } from '@/App';
import { useLanguage } from '@/contexts/LanguageContext';
import AureosLayout from '@/components/layout/DashboardLayout';
import { JarvisNarrate } from '@/components/JarvisNarrate';
import { motion } from 'framer-motion';
import { BookOpen, RefreshCw, TrendingUp, TrendingDown, Activity, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

const MarketNarrativePage = () => {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef(null);

  const generateNarrative = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/dominance/market-narrative?language=${lang}`);
      setData(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const regimeColors = {
    'RISK-ON': '#00E676', 'RISK-OFF': '#FF5252', 'CONSOLIDATION': '#FF9800',
    'ROTATION': '#00B4FF', 'TRANSITIONAL': '#9C27B0',
  };

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="market-narrative-page">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">
              {t('narrative.title')} <span className="text-gradient-gold">{t('narrative.subtitle')}</span>
            </h1>
            <p className="text-[#666] mt-1 text-sm">{t('narrative.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            {data && <JarvisNarrate text={data.narrative} />}
            <Button onClick={generateNarrative} disabled={loading} className="aureos-btn-gold" data-testid="generate-narrative-btn">
              {loading ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <BookOpen size={14} className="mr-2" />}
              {loading ? t('narrative.generating') : t('narrative.generate')}
            </Button>
          </div>
        </div>

        {!data && !loading && (
          <div className="aureos-card p-16 text-center">
            <BookOpen className="mx-auto mb-4 text-[#444]" size={48} />
            <h3 className="text-lg font-semibold mb-2">Market Narrative Engine</h3>
            <p className="text-[#888] text-sm max-w-md mx-auto">
              JARVIS writes the story behind the markets — regime, capital flows, smart money, and outlook.
            </p>
            <Button onClick={generateNarrative} className="aureos-btn-gold mt-4" data-testid="generate-narrative-btn-empty">
              <BookOpen size={14} className="mr-2" /> {t('narrative.generate')}
            </Button>
          </div>
        )}

        {loading && (
          <div className="aureos-card p-16 text-center">
            <RefreshCw className="mx-auto mb-4 text-aureos-gold animate-spin" size={36} />
            <p className="text-[#888]">JARVIS is writing the market narrative...</p>
            <p className="text-[10px] text-[#555] mt-1">Bloomberg-level analysis in seconds</p>
          </div>
        )}

        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Market Regime Badge */}
            {data.market_regime && (
              <div className="aureos-card p-4 flex items-center justify-between" data-testid="market-regime">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: (regimeColors[data.market_regime.regime] || '#FF9800') + '15' }}>
                    <Activity size={18} style={{ color: regimeColors[data.market_regime.regime] || '#FF9800' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#888] uppercase">Current Market Regime</p>
                    <p className="text-lg font-bold font-mono" style={{ color: regimeColors[data.market_regime.regime] || '#FF9800' }}>
                      {data.market_regime.regime}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#888]">{data.market_regime.description}</p>
                  <p className="text-[10px] text-[#555]">Confidence: {data.market_regime.confidence}%</p>
                </div>
              </div>
            )}

            {/* Market Snapshot */}
            <div className="flex flex-wrap gap-2">
              {data.market_snapshot?.map(s => (
                <div key={s.symbol} className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs flex items-center gap-2">
                  <span className="font-mono font-bold">{s.symbol}</span>
                  <span className="font-mono" style={{ color: s.change >= 0 ? '#00E676' : '#FF5252' }}>
                    {s.change >= 0 ? '+' : ''}{s.change?.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Narrative */}
            <div className="aureos-card p-6" ref={contentRef} data-testid="narrative-content">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={14} className="text-aureos-gold" /> JARVIS Market Narrative
                </h3>
                <span className="text-[10px] text-[#555]">{data.model}</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-[#ccc] text-[13px] leading-relaxed whitespace-pre-wrap">
                {data.narrative}
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] text-[#555]">Generated at {new Date(data.generated_at).toLocaleString()}</p>
            </div>
          </motion.div>
        )}
      </div>
    </AureosLayout>
  );
};

export default MarketNarrativePage;
