import React, { useState, useRef } from 'react';
import { API } from '@/App';
import { useLanguage } from '@/contexts/LanguageContext';
import AureosLayout from '@/components/layout/DashboardLayout';
import { JarvisNarrate } from '@/components/JarvisNarrate';
import { motion } from 'framer-motion';
import { Crosshair, RefreshCw, TrendingUp, Zap, Target, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const AlphaRadarPage = () => {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef(null);

  const scanAlpha = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/dominance/alpha-detection?language=${lang}`);
      setData(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="alpha-radar-page">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">
              {t('alpha.title')} <span className="text-gradient-gold">{t('alpha.subtitle')}</span>
            </h1>
            <p className="text-[#666] mt-1 text-sm">{t('alpha.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            {data && <JarvisNarrate text={data.analysis} />}
            <Button onClick={scanAlpha} disabled={loading} className="aureos-btn-gold" data-testid="scan-alpha-btn">
              {loading ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <Crosshair size={14} className="mr-2" />}
              {loading ? t('alpha.scanning') : t('alpha.scan')}
            </Button>
          </div>
        </div>

        {!data && !loading && (
          <div className="aureos-card p-16 text-center">
            <Crosshair className="mx-auto mb-4 text-[#444]" size={48} />
            <h3 className="text-lg font-semibold mb-2">Alpha Detection System</h3>
            <p className="text-[#888] text-sm max-w-md mx-auto">
              JARVIS scans all markets to find the top 5 highest-probability opportunities right now.
            </p>
            <Button onClick={scanAlpha} className="aureos-btn-gold mt-4" data-testid="scan-alpha-btn-empty">
              <Crosshair size={14} className="mr-2" /> {t('alpha.scan')}
            </Button>
          </div>
        )}

        {loading && (
          <div className="aureos-card p-16 text-center">
            <RefreshCw className="mx-auto mb-4 text-aureos-gold animate-spin" size={36} />
            <p className="text-[#888]">JARVIS is scanning all markets for alpha...</p>
            <p className="text-[10px] text-[#555] mt-1">This may take 5-10 seconds</p>
          </div>
        )}

        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Market Snapshot */}
            <div className="flex flex-wrap gap-2">
              {data.market_snapshot?.map(s => (
                <div key={s.symbol} className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs">
                  <span className="font-mono font-bold mr-2">{s.symbol}</span>
                  <span className="font-mono" style={{ color: s.change >= 0 ? '#00E676' : '#FF5252' }}>
                    {s.change >= 0 ? '+' : ''}{s.change?.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Alpha Analysis */}
            <div className="aureos-card p-6" ref={contentRef} data-testid="alpha-analysis">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider flex items-center gap-2">
                  <Target size={14} className="text-aureos-gold" /> Top Alpha Opportunities
                </h3>
                <span className="text-[10px] text-[#555]">{data.model}</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-[#ccc] text-[13px] leading-relaxed whitespace-pre-wrap">
                {data.analysis}
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] text-[#555]">Scanned at {new Date(data.scan_time).toLocaleString()}</p>
            </div>
          </motion.div>
        )}
      </div>
    </AureosLayout>
  );
};

export default AlphaRadarPage;
