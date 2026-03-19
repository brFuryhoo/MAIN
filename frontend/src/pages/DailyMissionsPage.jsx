import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Target, Check, Gift, RefreshCw, Star, Zap, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import axios from 'axios';

const DailyMissionsPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchMissions(); }, []);
  const fetchMissions = async () => { setLoading(true); try { const r = await axios.get(`${API}/ecosystem/missions/daily`, { headers }); setData(r.data); } catch {} setLoading(false); };

  const completeMission = async (id) => {
    try {
      const r = await axios.post(`${API}/ecosystem/missions/complete/${id}`, {}, { headers });
      if (r.data.success) { toast.success(`+${r.data.reward} AT earned!`); fetchMissions(); }
      else toast.info(r.data.message);
    } catch { toast.error('Failed'); }
  };

  if (loading) return <AureosLayout><div className="flex justify-center h-[60vh] items-center"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  const completed = data?.completed_count || 0;
  const total = data?.total_count || 5;

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="daily-missions-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">{t('missions.title')} <span className="text-gradient-gold">{t('missions.subtitle')}</span></h1>
            <p className="text-[#666] mt-1 text-sm">{t('missions.desc')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#888]">{t('missions.total_reward')}</p>
            <p className="text-lg font-mono font-bold text-aureos-gold">{data?.total_reward} AT</p>
          </div>
        </div>

        {/* Progress */}
        <div className="aureos-card p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#888]">{completed}/{total} {t('missions.completed')}</span>
            <span className="font-mono text-aureos-gold">{Math.round(completed/total*100)}%</span>
          </div>
          <Progress value={completed/total*100} className="h-2.5" />
        </div>

        {/* Missions */}
        <div className="space-y-3">
          {data?.missions?.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`aureos-card p-4 flex items-center gap-4 ${m.completed ? 'opacity-60' : ''}`} data-testid={`mission-${m.id}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.completed ? 'bg-[#00E676]/15' : 'bg-aureos-gold/10'}`}>
                {m.completed ? <Check size={18} className="text-[#00E676]" /> : <Target size={18} className="text-aureos-gold" />}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{m.title}</h3>
                <p className="text-[11px] text-[#888]">{m.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-aureos-gold flex items-center gap-1"><Gift size={12} /> +{m.reward} AT</span>
                {!m.completed && (
                  <Button size="sm" onClick={() => completeMission(m.id)} className="aureos-btn-gold text-xs h-7" data-testid={`complete-${m.id}`}>
                    <Check size={12} className="mr-1" /> {t('missions.complete_btn')}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AureosLayout>
  );
};
export default DailyMissionsPage;
