import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Copy, Shield, Star, TrendingUp, RefreshCw, UserCheck, Zap, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import axios from 'axios';

const CopyTradingPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [traders, setTraders] = useState([]);
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eligRes, activeRes] = await Promise.all([
        axios.get(`${API}/ecosystem/copy-trading/eligible`, { headers }),
        axios.get(`${API}/ecosystem/copy-trading/active`, { headers }).catch(() => ({ data: { active_copies: [] } })),
      ]);
      setTraders(eligRes.data.eligible_traders || []);
      setCopies(activeRes.data.active_copies || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const startCopy = async (id) => {
    try {
      const res = await axios.post(`${API}/ecosystem/copy-trading/start/${id}`, {}, { headers });
      if (res.data.success) { toast.success('Now copying trader!'); fetchData(); }
      else toast.info(res.data.message);
    } catch { toast.error('Failed to start copy'); }
  };

  const riskColors = { low: '#00E676', moderate: '#FF9800', high: '#FF5252' };
  const tierColors = { Elite: '#CFAE46', Advanced: '#00B4FF', Intermediate: '#FF9800' };

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="copy-trading-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">{t('copy.title')} <span className="text-gradient-gold">{t('copy.subtitle')}</span></h1>
          <p className="text-[#666] mt-1 text-sm">{t('copy.desc')}</p>
        </div>
        {loading ? <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div> : (
          <div className="space-y-3">
            {traders.map((tr, i) => (
              <motion.div key={tr.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="aureos-card p-5 flex flex-col sm:flex-row sm:items-center gap-4" data-testid={`copy-trader-${i}`}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: (tierColors[tr.tier] || '#888') + '15' }}>
                  <span className="text-sm font-bold" style={{ color: tierColors[tr.tier] || '#888' }}>{tr.name?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><h3 className="font-semibold text-sm">{tr.name}</h3><Shield size={12} className="text-[#00E676]" /></div>
                  <p className="text-[11px] text-[#888]">{tr.tier} | {tr.total_trades} trades</p>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div><p className="text-[9px] text-[#666] uppercase">{t('copy.ai_rating')}</p><p className="text-sm font-mono font-bold text-aureos-gold">{tr.ai_rating}</p></div>
                  <div><p className="text-[9px] text-[#666] uppercase">{t('copy.win_rate')}</p><p className="text-sm font-mono font-bold text-[#00E676]">{tr.win_rate}%</p></div>
                  <div><p className="text-[9px] text-[#666] uppercase">{t('copy.pnl')}</p><p className="text-sm font-mono font-bold" style={{color: tr.total_pnl>0?'#00E676':'#FF5252'}}>${tr.total_pnl?.toLocaleString()}</p></div>
                  <div><p className="text-[9px] text-[#666] uppercase">{t('copy.risk')}</p><p className="text-sm font-bold capitalize" style={{ color: riskColors[tr.risk_level] }}>{tr.risk_level}</p></div>
                </div>
                <Button onClick={() => startCopy(tr.user_id)} className="aureos-btn-gold text-xs flex-shrink-0" data-testid={`copy-btn-${i}`}>
                  <Copy size={12} className="mr-1.5" /> {t('copy.btn')}
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AureosLayout>
  );
};
export default CopyTradingPage;
