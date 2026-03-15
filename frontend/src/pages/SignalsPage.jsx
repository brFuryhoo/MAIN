import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import VoiceCopilotWindow from '@/components/voice/VoiceCopilotWindow';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap,
  Filter,
  Clock,
  Target,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SignalsPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [signals, setSignals] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'buy', 'sell'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week'

  useEffect(() => {
    loadSignals();
  }, []);

  const loadSignals = () => {
    const saved = localStorage.getItem('aureos_recent_analyses');
    if (saved) {
      setSignals(JSON.parse(saved));
    }
  };

  const filteredSignals = signals.filter(s => {
    if (filter === 'buy' && s.signal.direction !== 'BUY') return false;
    if (filter === 'sell' && s.signal.direction !== 'SELL') return false;
    
    if (timeFilter === 'today') {
      const today = new Date().toDateString();
      if (new Date(s.timestamp).toDateString() !== today) return false;
    }
    
    return true;
  });

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="signals-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins']">
              <span className="text-gradient-gold">AI Signals</span>
            </h1>
            <p className="text-[#888] mt-1">Your generated trading signals</p>
          </div>
          <Button 
            onClick={() => navigate('/analysis')}
            className="aureos-btn-gold"
          >
            <Zap size={18} className="mr-2" />
            New Signal
          </Button>
        </div>

        {/* Filters */}
        <div className="aureos-glass p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#888]" />
            <span className="text-sm text-[#888]">Filter:</span>
          </div>
          
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'buy', label: 'Buy Only', color: '#00E676' },
              { id: 'sell', label: 'Sell Only', color: '#FF5252' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f.id
                    ? f.color 
                      ? `bg-[${f.color}]/20 text-[${f.color}]` 
                      : 'bg-[#CFAE46]/20 text-aureos-gold'
                    : 'bg-white/5 text-[#888] hover:bg-white/10'
                }`}
                style={filter === f.id && f.color ? { 
                  backgroundColor: `${f.color}20`, 
                  color: f.color 
                } : {}}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Clock size={16} className="text-[#888]" />
            {['all', 'today', 'week'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeFilter === t
                    ? 'bg-[#00B4FF]/20 text-aureos-blue'
                    : 'text-[#888] hover:bg-white/5'
                }`}
              >
                {t === 'all' ? 'All Time' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Signals Grid */}
        {filteredSignals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSignals.map((signal, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`aureos-card p-6 cursor-pointer hover:scale-[1.02] transition-transform ${
                  signal.signal.direction === 'BUY' 
                    ? 'border-[#00E676]/30' 
                    : 'border-[#FF5252]/30'
                }`}
                onClick={() => navigate('/analysis')}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      signal.signal.direction === 'BUY' ? 'bg-[#00E676]/20' : 'bg-[#FF5252]/20'
                    }`}>
                      {signal.signal.direction === 'BUY' 
                        ? <TrendingUp className="text-[#00E676]" size={24} />
                        : <TrendingDown className="text-[#FF5252]" size={24} />
                      }
                    </div>
                    <div>
                      <p className="font-bold text-lg">{signal.asset.symbol}</p>
                      <p className="text-xs text-[#888]">{signal.asset.type}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#00B4FF]/20 text-aureos-blue text-xs font-mono">
                    {signal.timeframe}
                  </span>
                </div>

                {/* Signal */}
                <div className={`p-4 rounded-xl mb-4 ${
                  signal.signal.direction === 'BUY' 
                    ? 'bg-[#00E676]/10 border border-[#00E676]/30' 
                    : 'bg-[#FF5252]/10 border border-[#FF5252]/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-bold ${
                      signal.signal.direction === 'BUY' ? 'text-[#00E676]' : 'text-[#FF5252]'
                    }`}>
                      {signal.signal.direction}
                    </span>
                    <span className="text-xl font-bold">
                      {signal.signal.buyProbability > 50 
                        ? signal.signal.buyProbability 
                        : signal.signal.sellProbability}%
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-xs text-[#888]">Entry</p>
                    <p className="font-mono text-sm">${signal.signal.entry}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-xs text-[#888]">R:R</p>
                    <p className="font-mono text-sm">1:{signal.signal.riskReward}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-xs text-[#888]">Score</p>
                    <p className="font-mono text-sm">{signal.signal.confluenceScore}/10</p>
                  </div>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-[#888] text-center mt-4">
                  {new Date(signal.timestamp).toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="aureos-card p-12 text-center">
            <Zap className="mx-auto mb-4 text-[#888]" size={48} />
            <h3 className="text-xl font-semibold mb-2">No Signals Yet</h3>
            <p className="text-[#888] mb-6">Run your first analysis to generate AI trading signals</p>
            <Button 
              onClick={() => navigate('/analysis')}
              className="aureos-btn-gold"
            >
              Start Analysis
            </Button>
          </div>
        )}

        {/* Voice Copilot */}
        <VoiceCopilotWindow token={token} />
      </div>
    </AureosLayout>
  );
};

export default SignalsPage;
