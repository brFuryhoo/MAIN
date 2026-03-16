import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, BarChart2, Layers, Droplets, Dices,
  Shield, Brain, Target, FileText,
  Check, Loader2
} from 'lucide-react';

const ANALYSIS_STEPS = [
  { id: 1, key: 'market_data', name: 'Market Data Aggregation', icon: Database, description: 'Fetching price, volume, historical candles & volatility metrics' },
  { id: 2, key: 'technical_analysis', name: 'Technical Analysis', icon: BarChart2, description: 'RSI, MACD, Moving Averages, Bollinger Bands, ATR' },
  { id: 3, key: 'market_structure', name: 'Market Structure', icon: Layers, description: 'HH/HL, LH/LL detection, consolidation, breakouts' },
  { id: 4, key: 'liquidity_mapping', name: 'Liquidity Mapping', icon: Droplets, description: 'Volume clusters, volatility zones, liquidity pools' },
  { id: 5, key: 'monte_carlo', name: 'Scenario Modeling', icon: Dices, description: 'Monte Carlo simulation with 5,000 price paths' },
  { id: 6, key: 'risk_model', name: 'Risk Modeling', icon: Shield, description: 'VaR, drawdown analysis, position sizing' },
  { id: 7, key: 'causality', name: 'Market Causality', icon: Brain, description: 'Explaining why price is moving' },
  { id: 8, key: 'probability', name: 'Probability Engine', icon: Target, description: 'Combining all signals into scenario probabilities' },
  { id: 9, key: 'executive_report', name: 'Executive Report', icon: FileText, description: 'Generating institutional-grade market report' },
];

const AnalysisPipeline = ({ isRunning, analysisResult, onStepProgress }) => {
  const [animatedStep, setAnimatedStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const isComplete = !!analysisResult;

  useEffect(() => {
    if (isRunning && !isComplete) {
      setAnimatedStep(0);
      setCompletedSteps([]);
      // Animate steps progressively
      const interval = setInterval(() => {
        setAnimatedStep(prev => {
          const next = prev + 1;
          if (next <= ANALYSIS_STEPS.length) {
            setCompletedSteps(p => [...p, prev]);
            if (onStepProgress) onStepProgress(next, ANALYSIS_STEPS.length);
          }
          if (next >= ANALYSIS_STEPS.length) clearInterval(interval);
          return next;
        });
      }, 600 + Math.random() * 400);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  useEffect(() => {
    if (isComplete) {
      setCompletedSteps(ANALYSIS_STEPS.map((_, i) => i));
      setAnimatedStep(ANALYSIS_STEPS.length);
    }
  }, [isComplete]);

  const getStepData = (step) => {
    if (!analysisResult?.steps) return null;
    return analysisResult.steps[step.key];
  };

  const progress = isComplete ? 100 : Math.round((completedSteps.length / ANALYSIS_STEPS.length) * 100);

  return (
    <div className="w-full" data-testid="analysis-pipeline">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#888]">Analysis Progress</span>
          <span className="text-sm font-mono text-aureos-gold">{progress}%</span>
        </div>
        <div className="aureos-progress h-2">
          <motion.div className="aureos-progress-bar"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ANALYSIS_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isStepComplete = completedSteps.includes(index);
          const isCurrent = animatedStep === index && isRunning && !isComplete;
          const stepData = getStepData(step);

          return (
            <motion.div key={step.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`aureos-card p-4 transition-all duration-300 ${
                isStepComplete ? 'border-[#00E676]/50' :
                isCurrent ? 'border-[#CFAE46]/50 animate-aureos-glow' :
                'opacity-50'
              }`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isStepComplete ? 'bg-[#00E676]/20' :
                  isCurrent ? 'bg-[#CFAE46]/20' : 'bg-white/5'
                }`}>
                  {isStepComplete ? <Check className="text-[#00E676]" size={20} /> :
                   isCurrent ? <Loader2 className="text-aureos-gold animate-aureos-spin" size={20} /> :
                   <Icon className="text-[#888]" size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#888] font-mono">0{step.id}</span>
                    <h4 className={`font-semibold text-sm truncate ${
                      isStepComplete ? 'text-[#00E676]' :
                      isCurrent ? 'text-aureos-gold' : 'text-[#888]'
                    }`}>{step.name}</h4>
                  </div>
                  <p className="text-xs text-[#666] mt-1 line-clamp-2">{step.description}</p>

                  {/* Live data preview from backend */}
                  <AnimatePresence>
                    {isStepComplete && stepData && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} className="mt-2 pt-2 border-t border-white/5">
                        <div className="flex flex-wrap gap-1">
                          {_extractPreview(step.key, stepData).map(([label, value], i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#888]">
                              {label}: {value}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Current Step Detail */}
      <AnimatePresence mode="wait">
        {isRunning && !isComplete && animatedStep < ANALYSIS_STEPS.length && (
          <motion.div key={animatedStep}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 aureos-glass p-6 text-center">
            <Loader2 className="animate-aureos-spin text-aureos-gold mx-auto mb-3" size={32} />
            <p className="text-lg font-semibold text-aureos-gold">{ANALYSIS_STEPS[animatedStep].name}</p>
            <p className="text-sm text-[#888] mt-1">{ANALYSIS_STEPS[animatedStep].description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion */}
      {isComplete && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="mt-6 aureos-card p-6 text-center border-[#00E676]/50"
          style={{ boxShadow: '0 0 30px rgba(0, 230, 118, 0.2)' }}>
          <div className="w-16 h-16 rounded-full bg-[#00E676]/20 flex items-center justify-center mx-auto mb-4">
            <Check className="text-[#00E676]" size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#00E676]">Analysis Complete</h3>
          <p className="text-sm text-[#888] mt-2">All 9 analysis modules processed successfully</p>
        </motion.div>
      )}
    </div>
  );
};

function _extractPreview(key, data) {
  switch (key) {
    case 'market_data':
      return [['source', data.source || '?'], ['candles', data.candle_count || '?']];
    case 'technical_analysis':
      return [['RSI', data.rsi], ['trend', data.trend?.replace(/_/g, ' ')]];
    case 'market_structure':
      return [['pattern', data.bias || '?'], ['breakout', data.breakout?.detected ? 'yes' : 'no']];
    case 'liquidity_mapping':
      return [['zones', data.total_zones_detected], ['high-vol', data.high_volume_areas]];
    case 'monte_carlo':
      return [['win%', `${data.win_probability}%`], ['sims', data.simulations]];
    case 'risk_model':
      return [['risk', data.risk_level], ['score', data.risk_score]];
    case 'causality':
      return [['sentiment', data.overall_sentiment], ['conf', `${data.confidence}%`]];
    case 'probability':
      return [['signal', data.signal?.direction], ['conf', `${data.signal?.confidence}%`]];
    case 'executive_report':
      return [['status', 'generated']];
    default:
      return [];
  }
}

export default AnalysisPipeline;
