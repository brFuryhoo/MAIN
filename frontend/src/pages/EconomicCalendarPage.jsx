import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import { JarvisNarrate } from '@/components/JarvisNarrate';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, Clock, RefreshCw, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const EconomicCalendarPage = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { setLoading(true); try { const r = await axios.get(`${API}/ecosystem/economic-calendar`); setData(r.data); } catch {} setLoading(false); };

  const impactColors = { critical: '#FF5252', high: '#FF9800', medium: '#00B4FF', low: '#888' };

  if (loading) return <AureosLayout><div className="flex justify-center h-[60vh] items-center"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="economic-calendar-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">{t('calendar.title')} <span className="text-gradient-gold">{t('calendar.subtitle')}</span></h1>
            <p className="text-[#666] mt-1 text-sm">{t('calendar.desc')}</p>
          </div>
          <Button onClick={fetchData} className="aureos-btn-gold" data-testid="refresh-cal"><RefreshCw size={14} className="mr-2" /> {t('common.refresh')}</Button>
        </div>

        <div className="space-y-3">
          {data?.events?.map((e, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="aureos-card p-5" data-testid={`event-${i}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: (impactColors[e.impact] || '#888') + '15' }}>
                  <Calendar size={18} style={{ color: impactColors[e.impact] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{e.title}</h3>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold"
                      style={{ background: (impactColors[e.impact]) + '15', color: impactColors[e.impact] }}>{e.impact}</span>
                    <span className="text-[10px] text-[#666] font-mono">{e.currency}</span>
                  </div>
                  <div className="flex gap-4 text-[11px] text-[#888] mb-2">
                    <span><Clock size={10} className="inline mr-1" />{new Date(e.date).toLocaleDateString()}</span>
                    <span>{t('calendar.previous')}: <span className="text-white font-mono">{e.previous}</span></span>
                    <span>{t('calendar.forecast')}: <span className="text-aureos-gold font-mono">{e.forecast}</span></span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                    <p className="text-[10px] text-aureos-gold uppercase font-bold mb-1">{t('calendar.ai_impact')}</p>
                    <p className="text-[12px] text-[#ccc]">{e.ai_analysis}</p>
                  </div>
                </div>
                <JarvisNarrate text={`${e.title}. ${e.ai_analysis}`} className="flex-shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AureosLayout>
  );
};
export default EconomicCalendarPage;
