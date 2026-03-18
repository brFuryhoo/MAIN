import React, { useState } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, ChevronRight, ChevronLeft, Check, Plus, X, Zap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const STEPS = ['Name & Description', 'Configuration', 'Rules', 'Review & Publish'];

const StrategyCreatorPage = () => {
  const { token } = useAuth();
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', asset_class: 'all', timeframe: '1D', risk_level: 'moderate', rules: [''],
  });

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addRule = () => setForm(f => ({ ...f, rules: [...f.rules, ''] }));
  const removeRule = (i) => setForm(f => ({ ...f, rules: f.rules.filter((_, idx) => idx !== i) }));
  const updateRule = (i, val) => setForm(f => ({ ...f, rules: f.rules.map((r, idx) => idx === i ? val : r) }));

  const canNext = () => {
    if (step === 0) return form.name.length >= 3 && form.description.length >= 10;
    if (step === 1) return true;
    if (step === 2) return form.rules.filter(r => r.trim()).length >= 1;
    return true;
  };

  const publish = async () => {
    setLoading(true);
    try {
      const data = { ...form, rules: form.rules.filter(r => r.trim()) };
      const res = await axios.post(`${API}/advantage/strategies/create`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPublished(res.data.strategy);
      toast.success('Strategy published to Marketplace!');
    } catch (e) {
      toast.error('Failed to publish strategy');
    }
    setLoading(false);
  };

  const riskColors = { low: '#00E676', moderate: '#FF9800', high: '#FF5252' };

  if (published) {
    return (
      <AureosLayout>
        <div className="flex items-center justify-center h-[60vh]" data-testid="strategy-published">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-[#00E676]/10 flex items-center justify-center mx-auto mb-4">
              <Check size={36} className="text-[#00E676]" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Strategy Published!</h2>
            <p className="text-[#888] mb-4">{published.name} is now live on the Marketplace.</p>
            <div className="aureos-card p-4 mb-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-[9px] text-[#666] uppercase">Asset Class</p><p className="text-sm font-bold capitalize">{published.asset_class}</p></div>
                <div><p className="text-[9px] text-[#666] uppercase">Timeframe</p><p className="text-sm font-bold">{published.timeframe}</p></div>
                <div><p className="text-[9px] text-[#666] uppercase">Risk</p><p className="text-sm font-bold capitalize" style={{ color: riskColors[published.risk_level] }}>{published.risk_level}</p></div>
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setPublished(null); setStep(0); setForm({ name: '', description: '', asset_class: 'all', timeframe: '1D', risk_level: 'moderate', rules: [''] }); }}
                className="bg-white/5 text-[#888]" data-testid="create-another-btn">
                <Plus size={14} className="mr-1.5" /> Create Another
              </Button>
              <Button onClick={() => window.location.href = '/strategy-marketplace'} className="aureos-btn-gold" data-testid="view-marketplace-btn">
                View on Marketplace
              </Button>
            </div>
          </motion.div>
        </div>
      </AureosLayout>
    );
  }

  return (
    <AureosLayout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="strategy-creator-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Poppins']">
            Strategy <span className="text-gradient-gold">Creator</span>
          </h1>
          <p className="text-[#666] mt-1 text-sm">Build and publish your strategy. Share your edge with the world.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1.5 text-xs ${i <= step ? 'text-aureos-gold' : 'text-[#555]'}`} data-testid={`step-${i}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i < step ? 'bg-aureos-gold text-black' : i === step ? 'border-2 border-aureos-gold text-aureos-gold' : 'border border-[#555] text-[#555]'
                }`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-aureos-gold' : 'bg-[#333]'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="aureos-card p-6">
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Name & Description</h3>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Strategy Name</label>
                  <input value={form.name} onChange={e => update('name', e.target.value)} maxLength={50}
                    className="aureos-input w-full px-3 py-2.5 rounded-lg text-sm bg-[#161718] border border-white/10"
                    placeholder="e.g., Momentum Alpha Pro" data-testid="input-name" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Description</label>
                  <textarea value={form.description} onChange={e => update('description', e.target.value)} maxLength={200}
                    className="aureos-input w-full px-3 py-2.5 rounded-lg text-sm min-h-[80px] resize-none bg-[#161718] border border-white/10"
                    placeholder="Describe your strategy approach, what makes it unique..." data-testid="input-description" />
                  <p className="text-[10px] text-[#555] mt-1">{form.description.length}/200</p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuration</h3>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Asset Class</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['all', 'stocks', 'crypto', 'forex'].map(ac => (
                      <button key={ac} onClick={() => update('asset_class', ac)}
                        className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                          form.asset_class === ac ? 'bg-aureos-gold/15 text-aureos-gold border border-aureos-gold/30' : 'bg-white/5 text-[#888] border border-transparent'
                        }`} data-testid={`ac-${ac}`}>{ac}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Timeframe</label>
                  <div className="grid grid-cols-5 gap-2">
                    {['1H', '4H', '1D', '1W', '1M'].map(tf => (
                      <button key={tf} onClick={() => update('timeframe', tf)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all ${
                          form.timeframe === tf ? 'bg-[#00B4FF]/15 text-[#00B4FF] border border-[#00B4FF]/30' : 'bg-white/5 text-[#888] border border-transparent'
                        }`} data-testid={`tf-${tf}`}>{tf}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#888] block mb-1">Risk Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'moderate', 'high'].map(rl => (
                      <button key={rl} onClick={() => update('risk_level', rl)}
                        className={`py-2.5 rounded-lg text-xs font-bold capitalize transition-all ${
                          form.risk_level === rl ? `border` : 'bg-white/5 text-[#888] border border-transparent'
                        }`}
                        style={form.risk_level === rl ? { background: riskColors[rl] + '15', color: riskColors[rl], borderColor: riskColors[rl] + '40' } : {}}
                        data-testid={`risk-${rl}`}>{rl}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Trading Rules</h3>
                  <Button size="sm" onClick={addRule} className="bg-white/5 text-[#888] text-xs" data-testid="add-rule-btn">
                    <Plus size={12} className="mr-1" /> Add Rule
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.rules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono w-5 text-[#555]">{i + 1}.</span>
                      <input value={rule} onChange={e => updateRule(i, e.target.value)}
                        className="aureos-input flex-1 px-3 py-2 rounded-lg text-sm bg-[#161718] border border-white/10"
                        placeholder="e.g., Enter on breakout above 20-day high"
                        data-testid={`rule-input-${i}`} />
                      {form.rules.length > 1 && (
                        <button onClick={() => removeRule(i)} className="p-1 hover:bg-[#FF5252]/10 rounded text-[#FF5252]"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#00E676]" /> Review & Publish
                </h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-white/[0.03]">
                    <p className="text-[10px] text-[#888] uppercase">Name</p>
                    <p className="font-semibold">{form.name}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03]">
                    <p className="text-[10px] text-[#888] uppercase">Description</p>
                    <p className="text-sm text-[#ccc]">{form.description}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                      <p className="text-[9px] text-[#666] uppercase">Asset</p>
                      <p className="text-sm font-bold capitalize">{form.asset_class}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                      <p className="text-[9px] text-[#666] uppercase">Timeframe</p>
                      <p className="text-sm font-bold">{form.timeframe}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                      <p className="text-[9px] text-[#666] uppercase">Risk</p>
                      <p className="text-sm font-bold capitalize" style={{ color: riskColors[form.risk_level] }}>{form.risk_level}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03]">
                    <p className="text-[10px] text-[#888] uppercase mb-2">Rules ({form.rules.filter(r => r.trim()).length})</p>
                    {form.rules.filter(r => r.trim()).map((r, i) => (
                      <p key={i} className="text-sm text-[#ccc] flex items-start gap-2 mb-1">
                        <span className="text-aureos-gold font-mono text-[10px] mt-0.5">{i + 1}.</span> {r}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button onClick={() => setStep(s => s - 1)} disabled={step === 0}
            className="bg-white/5 text-[#888]" data-testid="step-prev">
            <ChevronLeft size={14} className="mr-1" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className="aureos-btn-gold" data-testid="step-next">
              Next <ChevronRight size={14} className="ml-1" />
            </Button>
          ) : (
            <Button onClick={publish} disabled={loading} className="aureos-btn-gold" data-testid="publish-strategy-btn">
              {loading ? <Zap size={14} className="mr-1.5 animate-pulse" /> : <Wand2 size={14} className="mr-1.5" />}
              {loading ? 'Publishing...' : 'Publish Strategy'}
            </Button>
          )}
        </div>
      </div>
    </AureosLayout>
  );
};

export default StrategyCreatorPage;
