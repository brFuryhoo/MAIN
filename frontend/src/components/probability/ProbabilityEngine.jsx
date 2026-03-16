import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const ProbabilityEngine = ({ probability }) => {
  if (!probability) return null;

  const scenarios = probability.scenarios || {};
  const signal = probability.signal || {};
  const bullish = scenarios.bullish_continuation || 33;
  const bearish = scenarios.bearish_reversal || 33;
  const sideways = scenarios.sideways_consolidation || 34;

  return (
    <div className="aureos-card p-6" data-testid="probability-engine">
      {/* Main Signal */}
      <div className="text-center mb-6">
        <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl ${
          signal.direction === 'BUY' ? 'aureos-signal-buy' :
          signal.direction === 'SELL' ? 'aureos-signal-sell' :
          'bg-white/10 border border-white/20 text-white'
        }`}>
          {signal.direction === 'BUY' ? <TrendingUp size={24} /> :
           signal.direction === 'SELL' ? <TrendingDown size={24} /> :
           <Minus size={24} />}
          <span className="text-2xl font-bold">{signal.direction}</span>
          <span className="text-lg opacity-80">{signal.confidence}%</span>
        </div>
        <p className="text-sm text-[#888] mt-2 capitalize">Signal Strength: {signal.strength}</p>
      </div>

      {/* Scenario Bars */}
      <div className="space-y-4">
        <ScenarioBar label="Bullish Continuation" value={bullish} color="#00E676" icon={TrendingUp} />
        <ScenarioBar label="Bearish Reversal" value={bearish} color="#FF5252" icon={TrendingDown} />
        <ScenarioBar label="Sideways Consolidation" value={sideways} color="#888" icon={Minus} />
      </div>
    </div>
  );
};

const ScenarioBar = ({ label, value, color, icon: Icon }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color }} />
        <span className="text-sm text-[#888]">{label}</span>
      </div>
      <span className="font-mono font-bold text-sm" style={{ color }}>{value}%</span>
    </div>
    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

export default ProbabilityEngine;
