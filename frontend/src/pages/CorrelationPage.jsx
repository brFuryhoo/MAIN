import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Grid3X3, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const CorrelationPage = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { setLoading(true); try { const r = await axios.get(`${API}/ecosystem/correlation-matrix`); setData(r.data); } catch {} setLoading(false); };

  const getColor = (v) => {
    if (v >= 0.7) return '#00E676';
    if (v >= 0.3) return '#00B4FF';
    if (v >= -0.3) return '#888';
    if (v >= -0.7) return '#FF9800';
    return '#FF5252';
  };
  const getBg = (v) => getColor(v) + '20';

  if (loading) return <AureosLayout><div className="flex justify-center h-[60vh] items-center"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  const assets = data?.assets || [];
  const matrix = data?.matrix || {};

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="correlation-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">{t('corr.title')} <span className="text-gradient-gold">{t('corr.subtitle')}</span></h1>
            <p className="text-[#666] mt-1 text-sm">{t('corr.desc')}</p>
          </div>
          <Button onClick={fetchData} className="aureos-btn-gold" data-testid="refresh-corr"><RefreshCw size={14} className="mr-2" /> {t('common.refresh')}</Button>
        </div>

        <div className="aureos-card p-4 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="text-left p-2 text-[10px] text-[#888] uppercase"></th>
                {assets.map(a => <th key={a} className="text-center p-2 text-[10px] font-mono text-[#888]">{a}</th>)}
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a}>
                  <td className="p-2 text-[11px] font-mono font-bold text-[#ccc]">{a}</td>
                  {assets.map(b => {
                    const v = matrix[a]?.[b] ?? 0;
                    return (
                      <td key={b} className="p-1 text-center">
                        <div className="w-full h-8 rounded flex items-center justify-center text-[10px] font-mono font-bold"
                          style={{ background: getBg(v), color: getColor(v) }} data-testid={`corr-${a}-${b}`}>
                          {a === b ? '1.00' : v.toFixed(2)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-4 text-[10px] text-[#666]">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{background:'#FF525220'}} /> Strong Negative</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{background:'#88888820'}} /> Neutral</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{background:'#00E67620'}} /> Strong Positive</span>
        </div>
      </div>
    </AureosLayout>
  );
};
export default CorrelationPage;
