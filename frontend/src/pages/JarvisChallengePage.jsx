import React, { useState } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Brain, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Swords, Target, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const JarvisChallengePage = () => {
  const { token } = useAuth();
  const [form, setForm] = useState({ symbol: 'BTC', direction: 'BUY', reasoning: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const challenge = async () => {
    if (!form.symbol) return toast.error('Enter a symbol');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/advantage/jarvis-challenge`, form, { headers });
      setResult(res.data);
    } catch (e) {
      toast.error('JARVIS challenge failed');
    }
    setLoading(false);
  };

  const verdictColors = { PROCEED: '#00E676', RECONSIDER: '#FF5252', WAIT: '#FF9800' };
  const verdictIcons = { PROCEED: CheckCircle, RECONSIDER: XCircle, WAIT: AlertTriangle };
  const VerdictIcon = result ? (verdictIcons[result.verdict] || Brain) : Brain;

  const assets = ['BTC', 'ETH', 'SOL', 'NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOLD', 'SPY', 'OIL'];

  return (
    <AureosLayout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="jarvis-challenge-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins'] flex items-center gap-3">
            <Swords className="text-aureos-gold" size={28} />
            <span>JARVIS <span className="text-gradient-gold">Challenge Mode</span></span>
          </h1>
          <p className="text-[#666] mt-1 text-sm">JARVIS plays devil's advocate on your trade ideas. Not a yes-man.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input */}
          <div className="lg:col-span-4">
            <div className="aureos-card p-5 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Asset</label>
                <select value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })}
                  className="aureos-input w-full px-3 py-2 rounded-lg text-sm bg-[#161718] border border-white/10" data-testid="challenge-symbol">
                  {assets.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Your Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  {['BUY', 'SELL'].map(d => (
                    <button key={d} onClick={() => setForm({ ...form, direction: d })}
                      className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                        form.direction === d
                          ? d === 'BUY' ? 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30' : 'bg-[#FF5252]/15 text-[#FF5252] border border-[#FF5252]/30'
                          : 'bg-white/5 text-[#888] border border-transparent'
                      }`} data-testid={`challenge-dir-${d.toLowerCase()}`}>{d === 'BUY' ? 'LONG' : 'SHORT'}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Your Reasoning (optional)</label>
                <textarea value={form.reasoning} onChange={e => setForm({ ...form, reasoning: e.target.value })}
                  className="aureos-input w-full px-3 py-2 rounded-lg text-sm min-h-[80px] resize-none bg-[#161718] border border-white/10"
                  placeholder="Why do you want to take this trade? JARVIS will challenge your logic..."
                  data-testid="challenge-reasoning" />
              </div>
              <Button onClick={challenge} disabled={loading} className="aureos-btn-gold w-full" data-testid="challenge-submit-btn">
                {loading ? <RefreshCw size={16} className="animate-spin mr-2" /> : <Swords size={16} className="mr-2" />}
                {loading ? 'JARVIS is analyzing...' : 'Challenge My Decision'}
              </Button>
              <p className="text-[10px] text-[#555] text-center">JARVIS will argue AGAINST your trade to stress-test it</p>
            </div>
          </div>

          {/* Result */}
          <div className="lg:col-span-8">
            {result ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Verdict */}
                <div className="aureos-card p-5" data-testid="challenge-verdict">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: (verdictColors[result.verdict] || '#FF9800') + '15' }}>
                        <VerdictIcon size={20} style={{ color: verdictColors[result.verdict] || '#FF9800' }} />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#888] uppercase">JARVIS Verdict</p>
                        <p className="text-lg font-bold font-mono" style={{ color: verdictColors[result.verdict] }}>{result.verdict}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#888] uppercase">Challenge Score</p>
                      <p className="text-lg font-bold font-mono text-aureos-gold">{result.challenge_score}/100</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#888]">
                    <span className="font-mono">{result.symbol}</span>
                    <span className={result.direction === 'BUY' ? 'text-[#00E676]' : 'text-[#FF5252]'}>{result.direction === 'BUY' ? 'LONG' : 'SHORT'}</span>
                  </div>
                </div>

                {/* Challenge Analysis */}
                <div className="aureos-card p-6" data-testid="challenge-analysis">
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Brain size={14} className="text-aureos-gold" /> JARVIS Challenge Analysis
                  </h3>
                  <div className="prose prose-invert prose-sm max-w-none text-[#ccc] text-[13px] leading-relaxed whitespace-pre-wrap">
                    {result.challenge}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="aureos-card p-16 text-center">
                <Swords className="mx-auto mb-4 text-[#444]" size={48} />
                <h3 className="text-lg font-semibold mb-2">Challenge Mode Ready</h3>
                <p className="text-[#888] text-sm max-w-md mx-auto">
                  Submit your trade idea. JARVIS will argue against it, find your blind spots, and stress-test your reasoning.
                </p>
                <p className="text-[10px] text-[#555] mt-3">If your trade survives JARVIS, it's worth taking.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AureosLayout>
  );
};

export default JarvisChallengePage;
