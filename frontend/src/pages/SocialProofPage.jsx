import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Trophy, Users, Star, Shield, ChevronRight, RefreshCw, Crown, Medal, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const SocialProofPage = () => {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTraders(); }, []);

  const fetchTraders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/advantage/top-traders`);
      setTraders(res.data.traders || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const tierColors = { Elite: '#CFAE46', Advanced: '#00B4FF', Intermediate: '#00E676', Beginner: '#888' };
  const planBadge = { elite: { bg: 'bg-gradient-gold text-black', label: 'ELITE' }, pro: { bg: 'bg-[#00B4FF] text-black', label: 'PRO' }, free: { bg: 'bg-white/10 text-white/60', label: 'FREE' } };

  if (loading) return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="social-proof-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">Top <span className="text-gradient-gold">Traders</span></h1>
            <p className="text-[#666] mt-1 text-sm">Verified public performance profiles</p>
          </div>
          <Button onClick={fetchTraders} className="aureos-btn-gold" data-testid="refresh-traders-btn">
            <RefreshCw size={14} className="mr-2" /> Refresh
          </Button>
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-4">
          {traders.slice(0, 3).map((t, i) => {
            const medals = [{ icon: Crown, color: '#CFAE46', label: '1st' }, { icon: Medal, color: '#C0C0C0', label: '2nd' }, { icon: Medal, color: '#CD7F32', label: '3rd' }];
            const medal = medals[i];
            return (
              <motion.div key={t.user_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`aureos-card p-5 text-center ${i === 0 ? 'border-aureos-gold/30' : ''}`} data-testid={`top-trader-${i}`}>
                <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: medal.color + '15', border: `2px solid ${medal.color}40` }}>
                  <medal.icon size={24} style={{ color: medal.color }} />
                </div>
                <h3 className="font-semibold text-sm">{t.name}</h3>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold mt-1 inline-block ${planBadge[t.plan]?.bg || 'bg-white/10'}`}>
                  {planBadge[t.plan]?.label || 'FREE'}
                </span>
                <div className="mt-3">
                  <p className="text-2xl font-mono font-bold" style={{ color: tierColors[t.tier] || '#888' }}>{t.score}</p>
                  <p className="text-[10px] text-[#666] uppercase">{t.tier}</p>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-[#888]">
                  <TrendingUp size={11} /> {t.total_trades} trades
                </div>
                {t.verified && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-[#00E676]">
                    <Shield size={10} /> Verified
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Full Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="aureos-card p-6">
          <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Trophy size={14} className="text-aureos-gold" /> Full Rankings
          </h3>
          <div className="space-y-2">
            {traders.map((t, i) => (
              <motion.div key={t.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
                className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                data-testid={`trader-row-${i}`}>
                <span className={`font-mono text-sm w-8 text-center font-bold ${i < 3 ? 'text-aureos-gold' : 'text-[#666]'}`}>#{i + 1}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: (tierColors[t.tier] || '#888') + '15' }}>
                  <span className="text-[10px] font-bold" style={{ color: tierColors[t.tier] || '#888' }}>{t.name?.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: tierColors[t.tier] || '#888' }}>{t.tier}</span>
                    {t.verified && <Shield size={9} className="text-[#00E676]" />}
                  </div>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: tierColors[t.tier] || '#888' }}>{t.score}</span>
                <span className="text-[11px] text-[#666]">{t.total_trades} trades</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </AureosLayout>
  );
};

export default SocialProofPage;
