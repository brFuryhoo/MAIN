import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  BarChart2, 
  Newspaper, 
  Building2, 
  Clock, 
  Lightbulb, 
  Zap,
  Dices,
  Shield,
  Check,
  Loader2
} from 'lucide-react';

const ANALYSIS_STEPS = [
  { id: 1, name: 'Collecting Data', icon: Database, description: 'Fetching market data from multiple sources' },
  { id: 2, name: 'Technical Analysis', icon: BarChart2, description: 'RSI, MACD, Moving Averages, Volume Profile' },
  { id: 3, name: 'Fundamental Analysis', icon: Newspaper, description: 'News sentiment, macro factors, earnings' },
  { id: 4, name: 'Institutional Analysis', icon: Building2, description: 'SMC zones, order blocks, liquidity pools' },
  { id: 5, name: 'Timing Analysis', icon: Clock, description: 'Session timing, volatility windows, seasonality' },
  { id: 6, name: 'Strategy Generation', icon: Lightbulb, description: 'Entry/exit points, position sizing' },
  { id: 7, name: 'Signal Calculation', icon: Zap, description: 'Confluence scoring, probability weighting' },
  { id: 8, name: 'Monte Carlo Simulation', icon: Dices, description: '10,000 scenario probability modeling' },
  { id: 9, name: 'Risk Management', icon: Shield, description: 'Stop loss, take profit, R:R optimization' },
];

const AnalysisPipeline = ({ asset, onComplete, isRunning, setIsRunning }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [stepData, setStepData] = useState({});

  // Run analysis pipeline
  useEffect(() => {
    if (isRunning && currentStep < ANALYSIS_STEPS.length) {
      const timer = setTimeout(() => {
        // Mark current step as complete
        setCompletedSteps(prev => [...prev, currentStep]);
        
        // Generate mock data for each step
        const mockData = generateStepData(currentStep, asset);
        setStepData(prev => ({ ...prev, [currentStep]: mockData }));
        
        // Move to next step
        setCurrentStep(prev => prev + 1);
      }, 1200 + Math.random() * 800);
      
      return () => clearTimeout(timer);
    } else if (currentStep >= ANALYSIS_STEPS.length && isRunning) {
      setIsRunning(false);
      if (onComplete) {
        onComplete(stepData);
      }
    }
  }, [isRunning, currentStep, asset]);

  // Generate mock analysis data for each step
  const generateStepData = (stepIndex, asset) => {
    switch (stepIndex) {
      case 0: // Data Collection
        return { 
          sources: ['Alpha Vantage', 'CoinGecko', 'NewsAPI'],
          dataPoints: Math.floor(Math.random() * 5000) + 10000,
          timeframe: '1H, 4H, 1D'
        };
      case 1: // Technical Analysis
        return {
          rsi: Math.floor(Math.random() * 40) + 30,
          macd: { signal: Math.random() > 0.5 ? 'bullish' : 'bearish', strength: Math.random() * 100 },
          trend: Math.random() > 0.5 ? 'uptrend' : 'downtrend',
          support: (Math.random() * 1000).toFixed(2),
          resistance: (Math.random() * 1000 + 1000).toFixed(2)
        };
      case 2: // Fundamental
        return {
          sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
          newsCount: Math.floor(Math.random() * 50) + 10,
          impactScore: (Math.random() * 10).toFixed(1)
        };
      case 3: // Institutional
        return {
          orderBlocks: Math.floor(Math.random() * 5) + 1,
          liquidityZones: Math.floor(Math.random() * 3) + 2,
          fvgCount: Math.floor(Math.random() * 4)
        };
      case 4: // Timing
        return {
          optimalSession: ['London', 'New York', 'Asian'][Math.floor(Math.random() * 3)],
          volatilityRegime: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
          seasonalBias: Math.random() > 0.5 ? 'bullish' : 'bearish'
        };
      case 5: // Strategy
        return {
          entry: (Math.random() * 100 + 100).toFixed(2),
          stopLoss: (Math.random() * 50 + 50).toFixed(2),
          tp1: (Math.random() * 100 + 200).toFixed(2),
          tp2: (Math.random() * 100 + 300).toFixed(2),
          tp3: (Math.random() * 100 + 400).toFixed(2)
        };
      case 6: // Signal
        return {
          confluenceScore: Math.floor(Math.random() * 4) + 7,
          signalStrength: Math.floor(Math.random() * 30) + 70,
          direction: Math.random() > 0.45 ? 'BUY' : 'SELL'
        };
      case 7: // Monte Carlo
        return {
          simulations: 10000,
          winProbability: Math.floor(Math.random() * 20) + 55,
          expectedReturn: (Math.random() * 5 + 2).toFixed(2),
          maxDrawdown: (Math.random() * 10 + 5).toFixed(2)
        };
      case 8: // Risk Management
        return {
          riskReward: (Math.random() * 2 + 2).toFixed(1),
          positionSize: Math.floor(Math.random() * 3) + 1,
          maxRisk: '2%'
        };
      default:
        return {};
    }
  };

  // Reset pipeline
  const resetPipeline = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setStepData({});
  };

  return (
    <div className="w-full" data-testid="analysis-pipeline">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#888]">Analysis Progress</span>
          <span className="text-sm font-mono text-aureos-gold">
            {Math.round((completedSteps.length / ANALYSIS_STEPS.length) * 100)}%
          </span>
        </div>
        <div className="aureos-progress h-2">
          <motion.div 
            className="aureos-progress-bar"
            initial={{ width: 0 }}
            animate={{ width: `${(completedSteps.length / ANALYSIS_STEPS.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ANALYSIS_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isComplete = completedSteps.includes(index);
          const isCurrent = currentStep === index && isRunning;
          const isPending = index > currentStep;
          
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`aureos-card p-4 transition-all duration-300 ${
                isComplete ? 'border-[#00E676]/50' : 
                isCurrent ? 'border-[#CFAE46]/50 animate-aureos-glow' : 
                'opacity-50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Step Icon/Status */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isComplete ? 'bg-[#00E676]/20' :
                  isCurrent ? 'bg-[#CFAE46]/20' :
                  'bg-white/5'
                }`}>
                  {isComplete ? (
                    <Check className="text-[#00E676]" size={20} />
                  ) : isCurrent ? (
                    <Loader2 className="text-aureos-gold animate-aureos-spin" size={20} />
                  ) : (
                    <Icon className="text-[#888]" size={20} />
                  )}
                </div>
                
                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#888] font-mono">0{step.id}</span>
                    <h4 className={`font-semibold text-sm truncate ${
                      isComplete ? 'text-[#00E676]' :
                      isCurrent ? 'text-aureos-gold' :
                      'text-[#888]'
                    }`}>
                      {step.name}
                    </h4>
                  </div>
                  <p className="text-xs text-[#666] mt-1 line-clamp-2">
                    {step.description}
                  </p>
                  
                  {/* Step Data Preview */}
                  <AnimatePresence>
                    {isComplete && stepData[index] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 pt-2 border-t border-white/5"
                      >
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(stepData[index]).slice(0, 2).map(([key, value]) => (
                            <span 
                              key={key}
                              className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#888]"
                            >
                              {key}: {typeof value === 'object' ? JSON.stringify(value).slice(0, 15) : String(value).slice(0, 10)}
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
        {isRunning && currentStep < ANALYSIS_STEPS.length && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 aureos-glass p-6 text-center"
          >
            <Loader2 className="animate-aureos-spin text-aureos-gold mx-auto mb-3" size={32} />
            <p className="text-lg font-semibold text-aureos-gold">
              {ANALYSIS_STEPS[currentStep].name}
            </p>
            <p className="text-sm text-[#888] mt-1">
              {ANALYSIS_STEPS[currentStep].description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Status */}
      {completedSteps.length === ANALYSIS_STEPS.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 aureos-card p-6 text-center border-[#00E676]/50"
          style={{ boxShadow: '0 0 30px rgba(0, 230, 118, 0.2)' }}
        >
          <div className="w-16 h-16 rounded-full bg-[#00E676]/20 flex items-center justify-center mx-auto mb-4">
            <Check className="text-[#00E676]" size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#00E676]">Analysis Complete</h3>
          <p className="text-sm text-[#888] mt-2">
            All 9 analysis modules processed successfully
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default AnalysisPipeline;
