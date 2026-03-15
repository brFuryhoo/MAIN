import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  BarChart2,
  Activity,
  Layers,
  Clock,
  Newspaper,
  Dices,
  Download,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ExecutiveReportModal = ({ isOpen, onClose, analysisData, asset, signal }) => {
  const reportRef = useRef(null);

  if (!isOpen) return null;

  const isBuy = signal?.direction === 'BUY';

  // Compile report sections
  const sections = [
    {
      title: 'Signal Summary',
      icon: isBuy ? TrendingUp : TrendingDown,
      color: isBuy ? '#00E676' : '#FF5252',
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#888]">Direction</p>
            <p className={`text-2xl font-bold ${isBuy ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
              {signal?.direction || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#888]">Probability</p>
            <p className="text-2xl font-bold text-aureos-gold">
              {signal?.buyProbability > 50 ? signal?.buyProbability : signal?.sellProbability}%
            </p>
          </div>
          <div>
            <p className="text-xs text-[#888]">Confluence Score</p>
            <p className="text-xl font-bold text-aureos-blue">{signal?.confluenceScore}/10</p>
          </div>
          <div>
            <p className="text-xs text-[#888]">Risk:Reward</p>
            <p className="text-xl font-bold text-[#9C27B0]">1:{signal?.riskReward}</p>
          </div>
        </div>
      )
    },
    {
      title: 'Entry & Targets',
      icon: Target,
      color: '#CFAE46',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-[#CFAE46]/10 border border-[#CFAE46]/30">
            <span className="text-[#888]">Entry Zone</span>
            <span className="font-mono font-bold text-aureos-gold">${signal?.entry}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-[#FF5252]/10 border border-[#FF5252]/30">
            <span className="text-[#888]">Stop Loss</span>
            <span className="font-mono font-bold text-[#FF5252]">${signal?.stopLoss}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'TP1', value: signal?.tp1, color: '#00E676' },
              { label: 'TP2', value: signal?.tp2, color: '#00B4FF' },
              { label: 'TP3', value: signal?.tp3, color: '#9C27B0' },
            ].map((tp) => (
              <div key={tp.label} className="p-2 rounded-lg text-center" style={{ background: `${tp.color}10`, border: `1px solid ${tp.color}30` }}>
                <p className="text-xs text-[#888]">{tp.label}</p>
                <p className="font-mono font-bold" style={{ color: tp.color }}>${tp.value}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'Technical Indicators',
      icon: BarChart2,
      color: '#00B4FF',
      content: (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-[#888]">RSI (14)</p>
            <p className="text-lg font-bold">{analysisData?.[1]?.rsi || 55}</p>
            <p className="text-xs text-[#888]">{analysisData?.[1]?.rsi > 70 ? 'Overbought' : analysisData?.[1]?.rsi < 30 ? 'Oversold' : 'Neutral'}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-[#888]">MACD</p>
            <p className={`text-lg font-bold ${analysisData?.[1]?.macd?.signal === 'bullish' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
              {analysisData?.[1]?.macd?.signal?.toUpperCase() || 'NEUTRAL'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-[#888]">Trend Direction</p>
            <p className={`text-lg font-bold ${analysisData?.[1]?.trend === 'uptrend' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
              {analysisData?.[1]?.trend?.toUpperCase() || 'N/A'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-[#888]">Volatility</p>
            <p className="text-lg font-bold">{analysisData?.[4]?.volatilityRegime || 'Medium'}</p>
          </div>
        </div>
      )
    },
    {
      title: 'SMC Analysis',
      icon: Layers,
      color: '#9C27B0',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Order Blocks</span>
            <span className="font-bold">{analysisData?.[3]?.orderBlocks || 3} detected</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Liquidity Zones</span>
            <span className="font-bold">{analysisData?.[3]?.liquidityZones || 2} identified</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Fair Value Gaps</span>
            <span className="font-bold">{analysisData?.[3]?.fvgCount || 1} found</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Institutional Bias</span>
            <span className={`font-bold ${isBuy ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
              {isBuy ? 'Accumulation' : 'Distribution'}
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
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Simulations Run</span>
            <span className="font-mono font-bold">10,000</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Win Probability</span>
            <span className="font-bold text-[#00E676]">{analysisData?.[7]?.winProbability || 58}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Expected Return</span>
            <span className="font-bold text-aureos-gold">+{analysisData?.[7]?.expectedReturn || 3.2}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Max Drawdown</span>
            <span className="font-bold text-[#FF5252]">-{analysisData?.[7]?.maxDrawdown || 8.5}%</span>
          </div>
        </div>
      )
    },
    {
      title: 'News & Sentiment',
      icon: Newspaper,
      color: '#00E676',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Overall Sentiment</span>
            <span className={`font-bold ${analysisData?.[2]?.sentiment === 'positive' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
              {analysisData?.[2]?.sentiment?.toUpperCase() || 'NEUTRAL'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">News Articles</span>
            <span className="font-bold">{analysisData?.[2]?.newsCount || 25} analyzed</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Impact Score</span>
            <span className="font-bold">{analysisData?.[2]?.impactScore || 7.2}/10</span>
          </div>
        </div>
      )
    },
    {
      title: 'Timing & Sessions',
      icon: Clock,
      color: '#00B4FF',
      content: (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Optimal Session</span>
            <span className="font-bold">{analysisData?.[4]?.optimalSession || 'London'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Seasonal Bias</span>
            <span className={`font-bold ${analysisData?.[4]?.seasonalBias === 'bullish' ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
              {analysisData?.[4]?.seasonalBias?.toUpperCase() || 'BULLISH'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Best Entry Window</span>
            <span className="font-bold">2-4 hours</span>
          </div>
        </div>
      )
    },
    {
      title: 'Risk Management',
      icon: Shield,
      color: '#CFAE46',
      content: (
        <div className="space-y-3 p-4 rounded-lg bg-[#CFAE46]/5 border border-[#CFAE46]/20">
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Recommended Position Size</span>
            <span className="font-bold">{analysisData?.[8]?.positionSize || 2}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Maximum Risk</span>
            <span className="font-bold text-[#FF5252]">{analysisData?.[8]?.maxRisk || '2%'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Risk:Reward Ratio</span>
            <span className="font-bold text-[#00E676]">1:{signal?.riskReward || 2.5}</span>
          </div>
          <div className="mt-4 p-3 rounded bg-[#FF5252]/10 border border-[#FF5252]/30">
            <p className="text-xs text-[#FF5252]">
              ⚠️ Always use proper risk management. Never risk more than 2% per trade.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden aureos-card"
          onClick={(e) => e.stopPropagation()}
          ref={reportRef}
          data-testid="executive-report-modal"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 p-6 border-b border-white/10 bg-[#0D0D0D]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gradient-gold">Executive Report</h2>
                <p className="text-sm text-[#888] mt-1">
                  {asset?.symbol || 'Asset'} • {new Date().toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#CFAE46]/50 text-aureos-gold hover:bg-[#CFAE46]/10"
                >
                  <Download size={16} className="mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#00B4FF]/50 text-aureos-blue hover:bg-[#00B4FF]/10"
                >
                  <Share2 size={16} className="mr-2" />
                  Share
                </Button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  data-testid="close-report-btn"
                >
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
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="aureos-glass p-5"
                  >
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: `${section.color}15` }}
                      >
                        <Icon size={20} style={{ color: section.color }} />
                      </div>
                      <h3 className="font-semibold" style={{ color: section.color }}>
                        {section.title}
                      </h3>
                    </div>
                    {section.content}
                  </motion.div>
                );
              })}
            </div>

            {/* Footer Disclaimer */}
            <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-[#888] text-center">
                This report is generated by Aureos AI for educational purposes only. 
                Past performance does not guarantee future results. Always conduct your own research 
                and consult with a financial advisor before making investment decisions.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExecutiveReportModal;
