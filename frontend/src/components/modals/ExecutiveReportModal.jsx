import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, TrendingUp, TrendingDown, Target, Shield, BarChart2,
  Brain, Layers, Dices, Download, Share2, Activity, AlertTriangle, Gauge, Loader2,
  Volume2, VolumeX, Globe, Pause, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { API, useAuth } from '@/App';

const ExecutiveReportModal = ({ isOpen, onClose, report, fullAnalysis }) => {
  const [exporting, setExporting] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [narrationLang, setNarrationLang] = useState('en');
  const audioRef = useRef(null);
  const { token } = useAuth();
  if (!isOpen || !report) return null;

  const sig = report.signal_summary || {};
  const isBuy = sig.direction === 'BUY';
  const ta = report.technical_analysis || {};
  const mc = report.scenario_modeling || {};
  const risk = report.risk_assessment || {};
  const caus = report.market_causality || {};
  const struct = report.market_structure || {};
  const liq = report.liquidity_analysis || {};
  const action = report.action_plan || {};
  const regime = report.regime || {};
  const manipulation = report.manipulation || {};
  const asset = report.asset || {};

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'pt', label: 'Portugues' },
    { code: 'es', label: 'Espanol' },
    { code: 'fr', label: 'Francais' },
    { code: 'de', label: 'Deutsch' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ja', label: 'Japanese' },
  ];

  const buildNarrationScript = () => {
    const langName = LANGUAGES.find(l => l.code === narrationLang)?.label || 'English';
    const direction = sig.direction || 'NEUTRAL';
    const confidence = sig.confidence || 0;
    const support = ta.support || 'N/A';
    const resistance = ta.resistance || 'N/A';
    const riskScore = risk.risk_score || 'N/A';
    const riskLevel = risk.risk_level || 'N/A';
    const entryZone = action.entry_zone || 'N/A';
    const stopLoss = action.stop_loss || 'N/A';
    const target1 = action.target_1 || 'N/A';
    const winProb = mc.win_probability || 'N/A';
    const maxUp = mc.max_upside || 'N/A';
    const maxDown = mc.max_downside || 'N/A';
    const causality = caus.summary || '';
    const regimeSummary = regime.regime_summary || '';
    const manipScore = manipulation.score || 'N/A';

    return `Narrate this executive market report in ${langName} language, in a professional institutional analyst tone. Speak clearly and naturally like a senior trader briefing their team.

Asset: ${asset.symbol} (${asset.name}), Current Price: $${Number(asset.price).toLocaleString()}, Change: ${Number(asset.change_percent).toFixed(2)}%.

Signal: ${direction} with ${confidence}% confidence. Strength: ${sig.strength}.
Bullish probability: ${sig.bullish_probability}%, Bearish: ${sig.bearish_probability}%, Sideways: ${sig.sideways_probability}%.

Technical Analysis: Support at $${support}, Resistance at $${resistance}. RSI: ${ta.rsi} (${ta.rsi_signal}). MACD: ${ta.macd?.crossover}. Trend: ${ta.trend}.

Action Plan: ${action.recommendation}. Entry zone: ${entryZone}. Stop loss: ${stopLoss}. Target 1: ${target1}.

Monte Carlo (${mc.simulations} simulations): Win probability ${winProb}%, Expected return ${mc.expected_return}%, Max upside +${maxUp}%, Max downside ${maxDown}%.

Risk: Score ${riskScore}/100 (${riskLevel}). VaR 95%: ${risk.value_at_risk?.var_95}%. Max drawdown: ${risk.max_drawdown}%.

Market causality: ${causality}

Regime: ${regimeSummary}

Manipulation detection score: ${manipScore}/100.

End with a brief professional conclusion and risk disclaimer.`;
  };

  const handleNarrate = async () => {
    setNarrating(true);
    try {
      const script = buildNarrationScript();
      const resp = await axios.post(`${API}/voice/narrate-report`, {
        text: script,
        language: narrationLang,
      }, {
        responseType: 'blob',
        timeout: 60000,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const audioUrl = URL.createObjectURL(new Blob([resp.data], { type: 'audio/mpeg' }));
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
      }
      toast.success('JARVIS is narrating the report');
    } catch (e) {
      toast.error('Narration failed — check AI service');
    }
    setNarrating(false);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const sections = [
    {
      title: 'Signal Summary',
      icon: isBuy ? TrendingUp : sig.direction === 'SELL' ? TrendingDown : Activity,
      color: isBuy ? '#00E676' : sig.direction === 'SELL' ? '#FF5252' : '#CFAE46',
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#888]">Direction</p>
            <p className={`text-2xl font-bold ${isBuy ? 'text-[#00E676]' : sig.direction === 'SELL' ? 'text-[#FF5252]' : 'text-aureos-gold'}`}>
              {sig.direction}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#888]">Confidence</p>
            <p className="text-2xl font-bold text-aureos-gold">{sig.confidence}%</p>
          </div>
          <div>
            <p className="text-xs text-[#888]">Strength</p>
            <p className="text-xl font-bold text-aureos-blue capitalize">{sig.strength}</p>
          </div>
          <div>
            <p className="text-xs text-[#888]">Scenarios</p>
            <div className="space-y-1 mt-1">
              <div className="flex justify-between text-xs"><span className="text-[#00E676]">Bullish</span><span>{sig.bullish_probability}%</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#FF5252]">Bearish</span><span>{sig.bearish_probability}%</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#888]">Sideways</span><span>{sig.sideways_probability}%</span></div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Action Plan',
      icon: Target,
      color: '#CFAE46',
      content: (
        <div className="space-y-3">
          <div className={`p-3 rounded-lg ${isBuy ? 'bg-[#00E676]/10 border border-[#00E676]/30' : sig.direction === 'SELL' ? 'bg-[#FF5252]/10 border border-[#FF5252]/30' : 'bg-white/5 border border-white/10'}`}>
            <p className="font-semibold text-sm">{action.recommendation}</p>
          </div>
          {[
            { label: 'Entry Zone', value: action.entry_zone, color: '#CFAE46' },
            { label: 'Stop Loss', value: action.stop_loss, color: '#FF5252' },
            { label: 'Target 1', value: action.target_1, color: '#00E676' },
            { label: 'Target 2', value: action.target_2, color: '#00B4FF' },
            { label: 'Position Size', value: action.position_size },
            { label: 'Invalidation', value: action.invalidation, color: '#FF5252' },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="text-[#888]">{item.label}</span>
              <span className="font-mono font-semibold" style={item.color ? { color: item.color } : {}}>{item.value}</span>
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'Technical Indicators',
      icon: BarChart2,
      color: '#00B4FF',
      content: (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-[#888]">RSI (14)</p>
            <p className="text-lg font-bold">{ta.rsi}</p>
            <p className="text-xs text-[#888] capitalize">{ta.rsi_signal}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-[#888]">MACD</p>
            <p className={`text-lg font-bold ${ta.macd?.crossover === 'bullish' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
              {ta.macd?.crossover?.toUpperCase()}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-[#888]">Trend</p>
            <p className={`text-sm font-bold capitalize ${ta.trend?.includes('up') ? 'text-[#00E676]' : ta.trend?.includes('down') ? 'text-[#FF5252]' : ''}`}>
              {ta.trend?.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-[#888]">ATR Volatility</p>
            <p className="text-lg font-bold">{ta.atr_percent}%</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-[#888]">Support</p>
            <p className="text-sm font-mono font-bold text-[#00E676]">${Number(ta.support).toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-[#888]">Resistance</p>
            <p className="text-sm font-mono font-bold text-[#FF5252]">${Number(ta.resistance).toLocaleString()}</p>
          </div>
        </div>
      )
    },
    {
      title: 'Market Structure',
      icon: Layers,
      color: '#9C27B0',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Pattern</span>
            <span className="font-bold capitalize">{struct.bias}</span>
          </div>
          <p className="text-xs text-[#888] leading-relaxed">{struct.description}</p>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Consolidation</span>
            <span className="font-bold">{struct.consolidation?.is_consolidating ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Breakout</span>
            <span className={`font-bold ${struct.breakout?.detected ? 'text-aureos-gold' : ''}`}>
              {struct.breakout?.detected ? struct.breakout.type?.replace(/_/g, ' ') : 'None'}
            </span>
          </div>
        </div>
      )
    },
    {
      title: 'Monte Carlo Results',
      icon: Dices,
      color: '#FF6B6B',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between"><span className="text-[#888]">Simulations</span><span className="font-mono font-bold">{mc.simulations?.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-[#888]">Win Probability</span><span className="font-bold text-[#00E676]">{mc.win_probability}%</span></div>
          <div className="flex justify-between"><span className="text-[#888]">Expected Return</span><span className={`font-bold ${mc.expected_return >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>{mc.expected_return >= 0 ? '+' : ''}{mc.expected_return}%</span></div>
          <div className="flex justify-between"><span className="text-[#888]">Max Upside (95th)</span><span className="font-bold text-aureos-gold">+{mc.max_upside}%</span></div>
          <div className="flex justify-between"><span className="text-[#888]">Max Downside (5th)</span><span className="font-bold text-[#FF5252]">{mc.max_downside}%</span></div>
          <div className="flex justify-between"><span className="text-[#888]">Annual Volatility</span><span className="font-bold">{mc.volatility_annual}%</span></div>
        </div>
      )
    },
    {
      title: 'Risk Assessment',
      icon: Shield,
      color: '#CFAE46',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Risk Score</span>
            <span className={`text-lg font-bold ${risk.risk_level === 'low' ? 'text-[#00E676]' : risk.risk_level === 'high' ? 'text-[#FF5252]' : 'text-aureos-gold'}`}>
              {risk.risk_score}/100 ({risk.risk_level})
            </span>
          </div>
          <div className="flex justify-between"><span className="text-[#888]">VaR (95%)</span><span className="font-bold">{risk.value_at_risk?.var_95}%</span></div>
          <div className="flex justify-between"><span className="text-[#888]">Max Drawdown</span><span className="font-bold text-[#FF5252]">{risk.max_drawdown}%</span></div>
          <div className="flex justify-between"><span className="text-[#888]">Position Size</span><span className="font-bold">{risk.position_sizing?.recommended_pct}%</span></div>
          <div className="mt-3 p-3 rounded bg-[#FF5252]/10 border border-[#FF5252]/30">
            <p className="text-xs text-[#FF5252]">Always use proper risk management. Never risk more than {risk.position_sizing?.max_risk_per_trade || '2%'} per trade.</p>
          </div>
        </div>
      )
    },
    {
      title: 'Market Causality',
      icon: Brain,
      color: '#00E676',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Sentiment</span>
            <span className={`font-bold capitalize ${caus.sentiment === 'bullish' ? 'text-[#00E676]' : caus.sentiment === 'bearish' ? 'text-[#FF5252]' : 'text-aureos-gold'}`}>
              {caus.sentiment}
            </span>
          </div>
          <p className="text-sm text-[#ccc] leading-relaxed">{caus.summary}</p>
          {caus.explanations?.slice(0, 3).map((exp, i) => (
            <p key={i} className="text-xs text-[#888] pl-3 border-l-2 border-white/10">{exp}</p>
          ))}
        </div>
      )
    },
    {
      title: 'Bullish Signals & Bearish Risks',
      icon: Activity,
      color: '#00B4FF',
      content: (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#00E676] uppercase mb-2">Bullish Signals</p>
            {report.bullish_signals?.map((s, i) => (
              <p key={i} className="text-xs text-[#888] py-1 pl-3 border-l-2 border-[#00E676]/30">{s}</p>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#FF5252] uppercase mb-2">Bearish Risks</p>
            {report.bearish_risks?.map((r, i) => (
              <p key={i} className="text-xs text-[#888] py-1 pl-3 border-l-2 border-[#FF5252]/30">{r}</p>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'Market Regime',
      icon: Gauge,
      color: '#FF9800',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Trend Regime</span>
            <span className={`font-bold capitalize ${regime.trend_regime?.type?.includes('bull') ? 'text-[#00E676]' : regime.trend_regime?.type?.includes('bear') ? 'text-[#FF5252]' : 'text-[#888]'}`}>
              {regime.trend_regime?.type?.replace(/_/g, ' ') || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Volatility</span>
            <span className="font-bold capitalize">{regime.volatility_regime?.type || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Market Phase</span>
            <span className="font-bold capitalize text-aureos-gold">{regime.market_phase?.phase || 'N/A'}</span>
          </div>
          <p className="text-xs text-[#888] leading-relaxed">{regime.market_phase?.description}</p>
          <p className="text-sm text-[#ccc] leading-relaxed mt-2">{regime.regime_summary}</p>
        </div>
      )
    },
    {
      title: 'Manipulation Detection',
      icon: AlertTriangle,
      color: manipulation.risk_level === 'high' ? '#FF5252' : manipulation.risk_level === 'moderate' ? '#FF9800' : '#00E676',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Manipulation Score</span>
            <span className={`text-lg font-bold ${manipulation.risk_level === 'high' ? 'text-[#FF5252]' : manipulation.risk_level === 'moderate' ? 'text-[#FF9800]' : 'text-[#00E676]'}`}>
              {manipulation.score}/100 ({manipulation.risk_level})
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Events Detected</span>
            <span className="font-bold">{manipulation.events_detected}</span>
          </div>
          {manipulation.warnings?.map((w, i) => (
            <p key={i} className={`text-xs py-2 px-3 rounded-lg ${manipulation.risk_level === 'high' ? 'bg-[#FF5252]/10 text-[#FF5252]' : manipulation.risk_level === 'moderate' ? 'bg-[#FF9800]/10 text-[#FF9800]' : 'bg-white/5 text-[#888]'}`}>
              {w}
            </p>
          ))}
        </div>
      )
    },
  ];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
        onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden aureos-card"
          onClick={(e) => e.stopPropagation()} data-testid="executive-report-modal">
          {/* Header */}
          <div className="sticky top-0 z-10 p-6 border-b border-white/10 bg-[#0D0D0D]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gradient-gold">Executive Market Report</h2>
                <p className="text-sm text-[#888] mt-1">
                  {asset.symbol} ({asset.name}) &bull; {new Date(report.generated_at).toLocaleDateString()} &bull; ${Number(asset.price).toLocaleString()}
                  <span className={`ml-2 ${asset.change_percent >= 0 ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                    {asset.change_percent >= 0 ? '+' : ''}{Number(asset.change_percent).toFixed(2)}%
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Language selector */}
                <select value={narrationLang} onChange={e => setNarrationLang(e.target.value)}
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg text-xs px-2 py-1.5 text-[#ccc] focus:border-[#CFAE46]/50 focus:outline-none"
                  data-testid="narration-lang-select">
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>

                {/* Narrate button */}
                <Button variant="outline" size="sm" className="border-[#00B4FF]/50 text-[#00B4FF] hover:bg-[#00B4FF]/10"
                  disabled={narrating}
                  data-testid="narrate-report-btn"
                  onClick={handleNarrate}>
                  {narrating ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Volume2 size={16} className="mr-2" />}
                  {narrating ? 'Generating...' : 'Narrate'}
                </Button>

                {/* Playback control */}
                {audioRef.current?.src && (
                  <button onClick={togglePlayback} className="p-2 hover:bg-white/10 rounded-lg transition-colors" data-testid="playback-toggle-btn">
                    {isPlaying ? <Pause size={16} className="text-[#00B4FF]" /> : <Play size={16} className="text-[#00B4FF]" />}
                  </button>
                )}

                <Button variant="outline" size="sm" className="border-[#CFAE46]/50 text-aureos-gold hover:bg-[#CFAE46]/10"
                  disabled={exporting}
                  data-testid="export-pdf-btn"
                  onClick={async () => {
                    if (!fullAnalysis) { toast.error('No analysis data for export'); return; }
                    setExporting(true);
                    try {
                      const resp = await axios.post(`${API}/export/pdf`, {
                        analysis_data: fullAnalysis,
                      }, { responseType: 'blob', timeout: 30000 });
                      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Aureos_Report_${(fullAnalysis.symbol || 'report').toUpperCase()}.pdf`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      toast.success('PDF exported successfully!');
                    } catch { toast.error('PDF export failed'); }
                    finally { setExporting(false); }
                  }}>
                  {exporting ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                  Export PDF
                </Button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors" data-testid="close-report-btn">
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 100px)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <motion.div key={section.title}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`aureos-glass p-5 ${index === 0 ? 'md:col-span-2' : ''}`}>
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${section.color}15` }}>
                        <Icon size={20} style={{ color: section.color }} />
                      </div>
                      <h3 className="font-semibold" style={{ color: section.color }}>{section.title}</h3>
                    </div>
                    {section.content}
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-[#888] text-center">
                This report is generated by Aureos AI for educational purposes only.
                Past performance does not guarantee future results. Always conduct your own research
                and consult with a financial advisor before making investment decisions.
              </p>
            </div>

            {/* Hidden audio player */}
            <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

            {/* Audio progress bar */}
            {audioRef.current?.src && (
              <div className="mt-4 p-3 rounded-lg bg-[#00B4FF]/5 border border-[#00B4FF]/20 flex items-center gap-3">
                <button onClick={togglePlayback} className="p-2 rounded-full bg-[#00B4FF]/20 hover:bg-[#00B4FF]/30 transition-colors" data-testid="audio-play-btn">
                  {isPlaying ? <Pause size={16} className="text-[#00B4FF]" /> : <Play size={16} className="text-[#00B4FF]" />}
                </button>
                <div className="flex-1">
                  <p className="text-xs text-[#00B4FF] font-semibold">JARVIS Narration</p>
                  <p className="text-[10px] text-[#888]">{LANGUAGES.find(l => l.code === narrationLang)?.label} &bull; {isPlaying ? 'Playing...' : 'Paused'}</p>
                </div>
                <Volume2 size={14} className={`${isPlaying ? 'text-[#00B4FF] animate-pulse' : 'text-[#555]'}`} />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExecutiveReportModal;
