import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Zap, Award } from 'lucide-react';

const ProbabilityEngine = ({ analysisData, asset }) => {
  // Calculate final signal based on analysis data
  const calculateSignal = () => {
    if (!analysisData) return null;
    
    // Aggregate probabilities from different analysis steps
    const technicalBias = analysisData[1]?.macd?.signal === 'bullish' ? 55 : 45;
    const sentimentBias = analysisData[2]?.sentiment === 'positive' ? 52 : 48;
    const institutionalBias = (analysisData[3]?.orderBlocks || 3) > 2 ? 54 : 46;
    const timingBias = analysisData[4]?.seasonalBias === 'bullish' ? 51 : 49;
    const monteCarloProb = analysisData[7]?.winProbability || 55;
    
    // Weighted average
    const buyProbability = Math.round(
      (technicalBias * 0.25) + 
      (sentimentBias * 0.15) + 
      (institutionalBias * 0.20) + 
      (timingBias * 0.10) + 
      (monteCarloProb * 0.30)
    );
    
    const sellProbability = 100 - buyProbability;
    const direction = buyProbability > 50 ? 'BUY' : 'SELL';
    const confidence = Math.abs(buyProbability - 50) * 2;
    
    return {
      direction,
      buyProbability,
      sellProbability,
      confidence,
      confluenceScore: analysisData[6]?.confluenceScore || 8,
      riskReward: analysisData[8]?.riskReward || '2.5',
      entry: analysisData[5]?.entry || '0.00',
      stopLoss: analysisData[5]?.stopLoss || '0.00',
      tp1: analysisData[5]?.tp1 || '0.00',
      tp2: analysisData[5]?.tp2 || '0.00',
      tp3: analysisData[5]?.tp3 || '0.00',
    };
  };

  const signal = calculateSignal();
  
  if (!signal) {
    return (
      <div className="aureos-card p-8 text-center">
        <p className="text-[#888]">Run analysis to generate probability signal</p>
      </div>
    );
  }

  const isBuy = signal.direction === 'BUY';

  return (
    <div className="space-y-6" data-testid="probability-engine">
      {/* Main Signal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`aureos-card p-6 relative overflow-hidden ${
          isBuy ? 'border-[#00E676]/30' : 'border-[#FF5252]/30'
        }`}
        style={{ 
          boxShadow: isBuy 
            ? '0 0 40px rgba(0, 230, 118, 0.15)' 
            : '0 0 40px rgba(255, 82, 82, 0.15)' 
        }}
      >
        {/* Background Gradient */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            background: isBuy 
              ? 'linear-gradient(135deg, #00E676, transparent)' 
              : 'linear-gradient(135deg, #FF5252, transparent)'
          }}
        />
        
        <div className="relative z-10">
          {/* Signal Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                isBuy ? 'bg-[#00E676]/20' : 'bg-[#FF5252]/20'
              }`}>
                {isBuy ? (
                  <TrendingUp className="text-[#00E676]" size={28} />
                ) : (
                  <TrendingDown className="text-[#FF5252]" size={28} />
                )}
              </div>
              <div>
                <p className="text-sm text-[#888]">Final Signal</p>
                <h2 className={`text-3xl font-bold ${
                  isBuy ? 'text-[#00E676]' : 'text-[#FF5252]'
                }`}>
                  {signal.direction}
                </h2>
              </div>
            </div>
            
            {/* Asset Badge */}
            <div className="text-right">
              <p className="text-sm text-[#888]">Asset</p>
              <p className="font-bold text-lg">{asset?.symbol || 'N/A'}</p>
            </div>
          </div>

          {/* Probability Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#00E676] font-semibold">BUY {signal.buyProbability}%</span>
              <span className="text-[#FF5252] font-semibold">SELL {signal.sellProbability}%</span>
            </div>
            <div className="h-4 rounded-full bg-[#1a1a1a] overflow-hidden flex">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${signal.buyProbability}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#00E676] to-[#00B4FF]"
                style={{ boxShadow: '0 0 10px rgba(0, 230, 118, 0.5)' }}
              />
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${signal.sellProbability}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                className="h-full bg-gradient-to-r from-[#FF5252] to-[#FF8A80]"
                style={{ boxShadow: '0 0 10px rgba(255, 82, 82, 0.5)' }}
              />
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="aureos-glass p-4 text-center">
              <Award className="text-aureos-gold mx-auto mb-2" size={20} />
              <p className="text-xs text-[#888]">Confluence</p>
              <p className="text-xl font-bold text-aureos-gold">{signal.confluenceScore}/10</p>
            </div>
            <div className="aureos-glass p-4 text-center">
              <Zap className="text-aureos-blue mx-auto mb-2" size={20} />
              <p className="text-xs text-[#888]">Confidence</p>
              <p className="text-xl font-bold text-aureos-blue">{signal.confidence}%</p>
            </div>
            <div className="aureos-glass p-4 text-center">
              <Target className="text-[#9C27B0] mx-auto mb-2" size={20} />
              <p className="text-xs text-[#888]">R:R Ratio</p>
              <p className="text-xl font-bold text-[#9C27B0]">1:{signal.riskReward}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Entry/Exit Levels */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Entry', value: signal.entry, color: '#CFAE46' },
          { label: 'Stop Loss', value: signal.stopLoss, color: '#FF5252' },
          { label: 'TP1', value: signal.tp1, color: '#00E676' },
          { label: 'TP2', value: signal.tp2, color: '#00B4FF' },
          { label: 'TP3', value: signal.tp3, color: '#9C27B0' },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="aureos-card p-4 text-center"
            style={{ borderColor: `${item.color}30` }}
          >
            <p className="text-xs text-[#888] mb-1">{item.label}</p>
            <p className="font-mono font-bold" style={{ color: item.color }}>
              ${item.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Signal Strength Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="aureos-glass p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[#888]">Signal Strength</span>
          <span className={`text-sm font-bold ${
            signal.confidence > 70 ? 'text-[#00E676]' :
            signal.confidence > 50 ? 'text-aureos-gold' :
            'text-[#FF5252]'
          }`}>
            {signal.confidence > 70 ? 'Strong' : signal.confidence > 50 ? 'Moderate' : 'Weak'}
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${signal.confidence}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: signal.confidence > 70 
                ? 'linear-gradient(90deg, #00E676, #00B4FF)'
                : signal.confidence > 50
                  ? 'linear-gradient(90deg, #CFAE46, #00B4FF)'
                  : 'linear-gradient(90deg, #FF5252, #FF8A80)'
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default ProbabilityEngine;
