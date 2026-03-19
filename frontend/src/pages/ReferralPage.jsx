import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { UserPlus, Copy, Gift, Check, Twitter, MessageCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const ReferralPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchRef(); }, []);
  const fetchRef = async () => { setLoading(true); try { const r = await axios.get(`${API}/ecosystem/referral`, { headers }); setData(r.data); } catch {} setLoading(false); };

  const copyCode = () => { navigator.clipboard.writeText(data?.code || ''); setCopied(true); toast.success('Code copied!'); setTimeout(() => setCopied(false), 2000); };

  if (loading) return <AureosLayout><div className="flex justify-center h-[60vh] items-center"><RefreshCw className="animate-spin text-aureos-gold" size={32} /></div></AureosLayout>;

  return (
    <AureosLayout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="referral-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">{t('referral.title')} <span className="text-gradient-gold">{t('referral.subtitle')}</span></h1>
          <p className="text-[#666] mt-1 text-sm">{t('referral.desc')} {data?.reward_per_referral} AT.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="aureos-card p-6 text-center">
          <UserPlus className="mx-auto mb-4 text-aureos-gold" size={36} />
          <p className="text-[10px] text-[#888] uppercase tracking-wider mb-2">{t('referral.code')}</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <code className="text-2xl font-mono font-bold text-aureos-gold bg-aureos-gold/10 px-6 py-3 rounded-xl border border-aureos-gold/20" data-testid="referral-code">{data?.code}</code>
            <Button size="sm" onClick={copyCode} className="bg-white/5 text-[#888]" data-testid="copy-code-btn">
              {copied ? <Check size={14} className="text-[#00E676]" /> : <Copy size={14} />}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-white/[0.03]">
              <p className="text-[9px] text-[#666] uppercase">{t('referral.referrals')}</p>
              <p className="text-2xl font-mono font-bold text-[#00B4FF]">{data?.referrals}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.03]">
              <p className="text-[9px] text-[#666] uppercase">{t('referral.tokens_earned')}</p>
              <p className="text-2xl font-mono font-bold text-aureos-gold">{data?.tokens_earned} AT</p>
            </div>
          </div>
          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(data?.share_text||'')}`, '_blank')}
              className="bg-[#1DA1F2]/10 text-[#1DA1F2] text-xs" data-testid="ref-twitter"><Twitter size={13} className="mr-1.5" /> {t('referral.twitter')}</Button>
            <Button size="sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(data?.share_text||'')}`, '_blank')}
              className="bg-[#25D366]/10 text-[#25D366] text-xs" data-testid="ref-whatsapp"><MessageCircle size={13} className="mr-1.5" /> {t('referral.whatsapp')}</Button>
          </div>
        </motion.div>

        <div className="aureos-card p-5">
          <h3 className="text-sm font-semibold mb-3">{t('referral.how')}</h3>
          <div className="space-y-2 text-[12px] text-[#888]">
            {[{step:'1',t:t('referral.step1')},{step:'2',t:t('referral.step2')},{step:'3',t:`${t('referral.desc')} ${data?.reward_per_referral} AT`}].map(s=>(
              <div key={s.step} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                <span className="w-6 h-6 rounded-full bg-aureos-gold/10 text-aureos-gold text-[10px] flex items-center justify-center font-bold">{s.step}</span>
                <span>{s.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AureosLayout>
  );
};
export default ReferralPage;
