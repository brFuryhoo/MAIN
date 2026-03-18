import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import {
  Coins, RefreshCw, ArrowUpRight, ArrowDownRight, Gift, ShoppingBag,
  Calendar, Trophy, Zap, Lock, Unlock, Star, ChevronRight, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const AureosTokensPage = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState('wallet');
  const [balance, setBalance] = useState(null);
  const [store, setStore] = useState(null);
  const [rules, setRules] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, storeRes, rulesRes, chalRes] = await Promise.all([
        axios.get(`${API}/tokens/balance`, { headers }).catch(() => ({ data: { balance: 0, total_earned: 0, total_spent: 0, recent_transactions: [] } })),
        axios.get(`${API}/tokens/store`, { headers }).catch(() => ({ data: { items: [], balance: 0 } })),
        axios.get(`${API}/tokens/earning-rules`).catch(() => ({ data: { rules: [] } })),
        axios.get(`${API}/tokens/weekly-challenge`, { headers }).catch(() => ({ data: null })),
      ]);
      setBalance(balRes.data);
      setStore(storeRes.data);
      setRules(rulesRes.data);
      setChallenge(chalRes.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const claimDaily = async () => {
    try {
      const res = await axios.post(`${API}/tokens/daily-login`, {}, { headers });
      if (res.data.success) {
        toast.success(`+${res.data.earned} Aureos Tokens! Streak: ${res.data.streak} days`);
        fetchData();
      } else {
        toast.info(res.data.message);
      }
    } catch { toast.error('Failed to claim'); }
  };

  const spendTokens = async (itemId) => {
    try {
      const res = await axios.post(`${API}/tokens/spend`, { item_id: itemId }, { headers });
      toast.success(`Purchased: ${res.data.item}! New balance: ${res.data.new_balance} AT`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Purchase failed');
    }
  };

  const registerChallenge = async () => {
    try {
      const res = await axios.post(`${API}/tokens/weekly-challenge/register`, {}, { headers });
      toast.success(res.data.message);
      fetchData();
    } catch { toast.error('Registration failed'); }
  };

  if (loading) return <AureosLayout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-aureos-gold" size={40} /></div></AureosLayout>;

  const bal = balance?.balance || 0;

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="tokens-page">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-['Poppins'] flex items-center gap-3">
              <Coins className="text-aureos-gold" size={32} />
              <span className="text-gradient-gold">Aureos Tokens</span>
            </h1>
            <p className="text-[#888] mt-1">Earn, spend, and grow your Aureos Token balance.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={claimDaily} className="aureos-btn-gold" data-testid="claim-daily-btn">
              <Gift size={16} className="mr-2" /> Claim Daily
            </Button>
            <Button onClick={fetchData} className="aureos-btn-outline"><RefreshCw size={16} /></Button>
          </div>
        </div>

        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="aureos-card p-8 text-center relative overflow-hidden" data-testid="token-balance-card">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full bg-[#CFAE46] opacity-10 blur-[60px]" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#888] mb-2">Your Balance</p>
            <p className="text-6xl font-bold font-mono text-aureos-gold" data-testid="token-balance">{bal.toLocaleString()}</p>
            <p className="text-sm text-[#888] mt-1">Aureos Tokens (AT)</p>
            <div className="flex items-center justify-center gap-8 mt-4">
              <div className="text-center">
                <p className="text-xs text-[#888]">Total Earned</p>
                <p className="text-sm font-mono text-[#00E676] font-bold">{(balance?.total_earned || 0).toLocaleString()} AT</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#888]">Total Spent</p>
                <p className="text-sm font-mono text-[#FF9800] font-bold">{(balance?.total_spent || 0).toLocaleString()} AT</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/5">
          {[
            { id: 'wallet', label: 'Activity', icon: Clock },
            { id: 'earn', label: 'How to Earn', icon: Zap },
            { id: 'store', label: 'Token Store', icon: ShoppingBag },
            { id: 'challenge', label: 'Weekly Challenge', icon: Trophy },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
                tab === t.id ? 'text-aureos-gold border-aureos-gold' : 'text-[#888] border-transparent hover:text-white'
              }`} data-testid={`tab-${t.id}`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* Wallet / Activity Tab */}
        {tab === 'wallet' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {balance?.recent_transactions?.length > 0 ? (
              balance.recent_transactions.map((t, i) => (
                <motion.div key={t.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="aureos-card p-4 flex items-center gap-4" data-testid={`txn-${i}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    t.type === 'earn' ? 'bg-[#00E676]/15' : 'bg-[#FF9800]/15'
                  }`}>
                    {t.type === 'earn' ? <ArrowUpRight size={18} className="text-[#00E676]" /> : <ArrowDownRight size={18} className="text-[#FF9800]" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{t.description || t.reason || t.item_name || 'Transaction'}</p>
                    <p className="text-[10px] text-[#888]">{new Date(t.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`font-mono font-bold text-sm ${t.amount > 0 ? 'text-[#00E676]' : 'text-[#FF9800]'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount} AT
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="aureos-card p-12 text-center">
                <Coins className="mx-auto mb-3 text-[#444]" size={40} />
                <p className="text-[#888]">No transactions yet. Start trading to earn tokens!</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Earning Rules Tab */}
        {tab === 'earn' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rules?.rules?.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#CFAE46]/20 transition-all" data-testid={`rule-${r.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <Zap size={14} className="text-aureos-gold" />
                  <span className="font-mono text-sm font-bold text-[#00E676]">+{r.tokens} AT</span>
                </div>
                <p className="text-sm font-semibold">{r.description}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Store Tab */}
        {tab === 'store' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {store?.items?.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`p-5 rounded-xl border transition-all ${
                  item.can_afford ? 'bg-white/[0.02] border-white/5 hover:border-[#CFAE46]/20' : 'bg-white/[0.01] border-white/5 opacity-60'
                }`} data-testid={`store-${item.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-[10px] text-[#888] uppercase">{item.category}</p>
                  </div>
                  <span className="font-mono text-lg font-bold text-aureos-gold">{item.cost} AT</span>
                </div>
                <p className="text-xs text-[#aaa] mb-3">{item.description}</p>
                <Button onClick={() => spendTokens(item.id)} disabled={!item.can_afford} size="sm"
                  className={item.can_afford ? 'aureos-btn-gold w-full' : 'w-full opacity-50 cursor-not-allowed bg-white/5 text-[#888]'}
                  data-testid={`buy-${item.id}`}>
                  {item.can_afford ? <><Unlock size={14} className="mr-2" /> Redeem</> : <><Lock size={14} className="mr-2" /> Need {item.cost - bal} more</>}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Weekly Challenge Tab */}
        {tab === 'challenge' && challenge && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Challenge Info */}
            <div className="aureos-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-aureos-gold/15 flex items-center justify-center">
                    <Trophy size={24} className="text-aureos-gold" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Weekly Score Challenge</h3>
                    <p className="text-xs text-[#888]">Week {challenge.week_id} | {challenge.days_remaining} days remaining</p>
                  </div>
                </div>
                {challenge.my_entry?.rank === 0 ? (
                  <Button onClick={registerChallenge} className="aureos-btn-gold" data-testid="register-challenge-btn">
                    <Star size={16} className="mr-2" /> Join Challenge
                  </Button>
                ) : (
                  <div className="text-right">
                    <p className="text-sm text-[#888]">Your Rank</p>
                    <p className="text-2xl font-bold font-mono text-aureos-gold">#{challenge.my_entry?.rank || '-'}</p>
                  </div>
                )}
              </div>
              {/* Prizes */}
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(challenge.prizes || {}).map(([place, prize]) => (
                  <div key={place} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-xs text-[#888] uppercase">{place} Place</p>
                    <p className="text-lg font-bold text-aureos-gold">{prize.tokens} AT</p>
                    <p className="text-[10px] text-aureos-gold">{prize.badge}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Challenge Leaderboard */}
            <div className="aureos-card overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider">Challenge Leaderboard ({challenge.total_participants} participants)</h3>
              </div>
              {challenge.leaderboard?.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {challenge.leaderboard.map((e, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3" data-testid={`challenge-entry-${i}`}>
                      <span className="w-8 text-center font-mono text-sm font-bold" style={{ color: i < 3 ? '#CFAE46' : '#888' }}>#{e.rank}</span>
                      <div className="flex-1">
                        <span className="text-sm font-semibold">{e.username}</span>
                        {e.badge && <span className="ml-2 text-[9px] bg-aureos-gold/15 text-aureos-gold px-1.5 py-0.5 rounded">{e.badge}</span>}
                        <p className="text-[10px] text-[#666]">{e.trades_this_week} trades this week</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-mono font-bold ${e.score_delta >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                          {e.score_delta >= 0 ? '+' : ''}{e.score_delta} pts
                        </p>
                        <p className="text-[10px] text-[#888]">{e.score_start} → {e.score_current}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Trophy className="mx-auto mb-3 text-[#444]" size={40} />
                  <p className="text-[#888] text-sm">No participants yet this week. Be the first!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </AureosLayout>
  );
};

export default AureosTokensPage;
