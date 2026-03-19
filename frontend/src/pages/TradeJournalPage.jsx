import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { BookMarked, TrendingUp, TrendingDown, RefreshCw, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';

const TradeJournalPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchJournal(); }, []);
  const fetchJournal = async () => { setLoading(true); try { const r = await axios.get(`${API}/ecosystem/trade-journal?limit=30`, { headers }); setJournal(r.data.journal || []); } catch {} setLoading(false); };

  const gradeColors = { A: '#00E676', B: '#00B4FF', C: '#FF9800', D: '#FF5252', F: '#FF5252' };

  if (loading) return <AureosLayout><div className="flex justify-center h-[60vh] items-center"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="trade-journal-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">{t('journal.title')} <span className="text-gradient-gold">{t('journal.subtitle')}</span></h1>
          <p className="text-[#666] mt-1 text-sm">{t('journal.desc')}</p>
        </div>
        {journal.length === 0 ? (
          <div className="aureos-card p-16 text-center"><BookMarked className="mx-auto mb-3 text-[#444]" size={36} /><p className="text-[#666]">{t('journal.empty')}</p></div>
        ) : (
          <div className="space-y-2">
            {journal.map((t, i) => (
              <motion.div key={t.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="aureos-card p-4 flex items-center gap-4" data-testid={`journal-${i}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: (gradeColors[t.grade] || '#888') + '20', color: gradeColors[t.grade] }}>
                  {t.grade}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">{t.symbol}</span>
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${t.action === 'buy' ? 'bg-[#00E676]/10 text-[#00E676]' : 'bg-[#FF5252]/10 text-[#FF5252]'}`}>{t.action}</span>
                  </div>
                  <p className="text-[11px] text-[#888] mt-0.5">{t.ai_insight}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-sm font-bold" style={{ color: t.is_win ? '#00E676' : '#FF5252' }}>
                    {t.pnl >= 0 ? '+' : ''}${t.pnl}
                  </p>
                  <p className="text-[10px] text-[#666]">{t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct}%</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AureosLayout>
  );
};
export default TradeJournalPage;
