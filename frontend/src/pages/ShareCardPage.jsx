import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { useLanguage } from '@/contexts/LanguageContext';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Share2, Copy, Trophy, TrendingUp, BarChart3, Target, Shield, Check, Twitter, MessageCircle, Link2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const ShareCardPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [cards, setCards] = useState({ score: null, performance: null });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchCards(); }, []);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const [scoreRes, perfRes] = await Promise.all([
        axios.get(`${API}/distribution/card/score`, { headers }),
        axios.get(`${API}/distribution/card/performance`, { headers }),
      ]);
      setCards({ score: scoreRes.data, performance: perfRes.data });
    } catch { /* silent */ }
    setLoading(false);
  };

  const shareToTwitter = (text) => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToWhatsApp = (text) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyLink = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(''), 2000);
  };

  const tierColors = { Elite: '#CFAE46', Advanced: '#00B4FF', Intermediate: '#FF9800', Beginner: '#FF5252' };

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="share-cards-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">
            Intelligence <span className="text-gradient-gold">Cards</span>
          </h1>
          <p className="text-[#666] mt-1 text-sm">Share your performance and achievements. Auto-marketing for Aureos.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Card */}
          {cards.score && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="aureos-card overflow-hidden" data-testid="score-card">
                {/* Card Visual */}
                <div className="relative p-6 pb-8" style={{ background: `linear-gradient(135deg, #0D0D0D 0%, ${tierColors[cards.score.tier] || '#888'}15 100%)` }}>
                  <div className="absolute top-4 right-4 text-[10px] text-[#555] flex items-center gap-1">
                    <Shield size={10} /> Verified by Aureos AI
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: (tierColors[cards.score.tier] || '#888') + '20', border: `2px solid ${tierColors[cards.score.tier] || '#888'}40` }}>
                      <Trophy size={24} style={{ color: tierColors[cards.score.tier] || '#888' }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#888] uppercase tracking-wider">Aureos Score</p>
                      <p className="text-3xl font-mono font-bold" style={{ color: tierColors[cards.score.tier] || '#888' }}>{cards.score.score}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 rounded-lg bg-white/[0.05]">
                      <p className="text-[9px] text-[#666] uppercase">Tier</p>
                      <p className="text-sm font-bold" style={{ color: tierColors[cards.score.tier] }}>{cards.score.tier}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.05]">
                      <p className="text-[9px] text-[#666] uppercase">Win Rate</p>
                      <p className="text-sm font-mono font-bold text-[#00E676]">{cards.score.win_rate}%</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.05]">
                      <p className="text-[9px] text-[#666] uppercase">Trades</p>
                      <p className="text-sm font-mono font-bold">{cards.score.total_trades}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#666]">{cards.score.user_name}</p>
                </div>
                {/* Share Actions */}
                <div className="p-4 border-t border-white/5 flex items-center gap-2">
                  <Button size="sm" onClick={() => shareToTwitter(cards.score.share_text)} className="bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 text-xs" data-testid="share-score-twitter">
                    <Twitter size={13} className="mr-1.5" /> Twitter
                  </Button>
                  <Button size="sm" onClick={() => shareToWhatsApp(cards.score.share_text)} className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 text-xs" data-testid="share-score-whatsapp">
                    <MessageCircle size={13} className="mr-1.5" /> WhatsApp
                  </Button>
                  <Button size="sm" onClick={() => copyLink(cards.score.share_text)} className="bg-white/5 text-[#888] hover:bg-white/10 text-xs ml-auto" data-testid="share-score-copy">
                    {copied === cards.score.share_text ? <Check size={13} className="mr-1.5 text-[#00E676]" /> : <Copy size={13} className="mr-1.5" />}
                    {copied === cards.score.share_text ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Performance Card */}
          {cards.performance && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="aureos-card overflow-hidden" data-testid="performance-card">
                <div className="relative p-6 pb-8" style={{ background: `linear-gradient(135deg, #0D0D0D 0%, #00E67615 100%)` }}>
                  <div className="absolute top-4 right-4 text-[10px] text-[#00E676] flex items-center gap-1">
                    <Shield size={10} /> Verified Track Record
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#00E676]/10 border-2 border-[#00E676]/30">
                      <BarChart3 size={24} className="text-[#00E676]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#888] uppercase tracking-wider">Total P&L</p>
                      <p className={`text-3xl font-mono font-bold ${cards.performance.total_pnl >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                        {cards.performance.total_pnl >= 0 ? '+' : ''}${cards.performance.total_pnl.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="text-center p-2 rounded-lg bg-white/[0.05]">
                      <p className="text-[9px] text-[#666] uppercase">Trades</p>
                      <p className="text-sm font-mono font-bold">{cards.performance.total_trades}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.05]">
                      <p className="text-[9px] text-[#666] uppercase">Win Rate</p>
                      <p className="text-sm font-mono font-bold text-[#00E676]">{cards.performance.win_rate}%</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.05]">
                      <p className="text-[9px] text-[#666] uppercase">Best</p>
                      <p className="text-sm font-mono font-bold text-[#00E676]">+${cards.performance.best_trade}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.05]">
                      <p className="text-[9px] text-[#666] uppercase">Score</p>
                      <p className="text-sm font-mono font-bold text-aureos-gold">{cards.performance.aureos_score}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#666]">{cards.performance.user_name} | {cards.performance.tier}</p>
                </div>
                <div className="p-4 border-t border-white/5 flex items-center gap-2">
                  <Button size="sm" onClick={() => shareToTwitter(cards.performance.share_text)} className="bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 text-xs" data-testid="share-perf-twitter">
                    <Twitter size={13} className="mr-1.5" /> Twitter
                  </Button>
                  <Button size="sm" onClick={() => shareToWhatsApp(cards.performance.share_text)} className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 text-xs" data-testid="share-perf-whatsapp">
                    <MessageCircle size={13} className="mr-1.5" /> WhatsApp
                  </Button>
                  <Button size="sm" onClick={() => copyLink(cards.performance.share_text)} className="bg-white/5 text-[#888] hover:bg-white/10 text-xs ml-auto" data-testid="share-perf-copy">
                    {copied === cards.performance.share_text ? <Check size={13} className="mr-1.5 text-[#00E676]" /> : <Copy size={13} className="mr-1.5" />}
                    {copied === cards.performance.share_text ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <p className="text-center text-[10px] text-[#555]">
          Share your achievements and attract followers. Every share is free marketing for your reputation.
        </p>
      </div>
    </AureosLayout>
  );
};

export default ShareCardPage;
