import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import GlobalAssetSelector from '@/components/analysis/GlobalAssetSelector';
import AnalysisPipeline from '@/components/pipeline/AnalysisPipeline';
import ProbabilityEngine from '@/components/probability/ProbabilityEngine';
import ExecutiveReportModal from '@/components/modals/ExecutiveReportModal';
import VoiceCopilotWindow from '@/components/voice/VoiceCopilotWindow';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Play, 
  FileText, 
  RotateCcw,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const NewAnalysisPage = () => {
  const { token } = useAuth();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [analysisType, setAnalysisType] = useState('full'); // 'simple' or 'full'
  const [timeframe, setTimeframe] = useState('4H');
  const [isRunning, setIsRunning] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [signal, setSignal] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState([]);

  const timeframes = ['1M', '5M', '15M', '1H', '4H', '1D', '1W'];

  // Load recent analyses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aureos_recent_analyses');
    if (saved) {
      setRecentAnalyses(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
    setAnalysisComplete(false);
    setAnalysisData(null);
    setSignal(null);
  };

  const startAnalysis = () => {
    if (!selectedAsset) {
      toast.error('Please select an asset first');
      return;
    }
    
    setIsRunning(true);
    setAnalysisComplete(false);
    setAnalysisData(null);
    setSignal(null);
    toast.info(`Starting ${analysisType} analysis for ${selectedAsset.symbol}`);
  };

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data);
    setAnalysisComplete(true);
    
    // Calculate signal
    const buyProb = Math.floor(Math.random() * 25) + 50;
    const direction = buyProb > 50 ? 'BUY' : 'SELL';
    
    const newSignal = {
      direction,
      buyProbability: buyProb,
      sellProbability: 100 - buyProb,
      confidence: Math.abs(buyProb - 50) * 2,
      confluenceScore: data[6]?.confluenceScore || 8,
      riskReward: data[8]?.riskReward || '2.5',
      entry: data[5]?.entry || '100.00',
      stopLoss: data[5]?.stopLoss || '95.00',
      tp1: data[5]?.tp1 || '110.00',
      tp2: data[5]?.tp2 || '120.00',
      tp3: data[5]?.tp3 || '135.00',
    };
    
    setSignal(newSignal);
    
    // Save to recent analyses
    const newAnalysis = {
      asset: selectedAsset,
      signal: newSignal,
      timestamp: new Date().toISOString(),
      timeframe
    };
    
    const updated = [newAnalysis, ...recentAnalyses].slice(0, 5);
    setRecentAnalyses(updated);
    localStorage.setItem('aureos_recent_analyses', JSON.stringify(updated));
    
    toast.success('Analysis complete!');
  };

  const resetAnalysis = () => {
    setSelectedAsset(null);
    setIsRunning(false);
    setAnalysisComplete(false);
    setAnalysisData(null);
    setSignal(null);
  };

  return (
    <AureosLayout>
      <div className="max-w-6xl mx-auto space-y-8" data-testid="analysis-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins']">
              <span className="text-gradient-gold">New Analysis</span>
            </h1>
            <p className="text-[#888] mt-1">Select any asset for comprehensive AI analysis</p>
          </div>
          
          {analysisComplete && (
            <div className="flex gap-3">
              <Button
                onClick={() => setShowReport(true)}
                className="aureos-btn-gold"
                data-testid="view-report-btn"
              >
                <FileText size={16} className="mr-2" />
                Executive Report
              </Button>
              <Button
                onClick={resetAnalysis}
                className="aureos-btn-outline"
                data-testid="reset-analysis-btn"
              >
                <RotateCcw size={16} className="mr-2" />
                New Analysis
              </Button>
            </div>
          )}
        </div>

        {/* Asset Selection */}
        {!isRunning && !analysisComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Global Asset Selector */}
            <div className="aureos-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="text-aureos-gold" size={20} />
                Select Asset
              </h2>
              <GlobalAssetSelector 
                onAssetSelect={handleAssetSelect}
                selectedAsset={selectedAsset}
              />
            </div>

            {/* Analysis Options */}
            {selectedAsset && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid md:grid-cols-2 gap-6"
              >
                {/* Analysis Type */}
                <div className="aureos-card p-6">
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                    Analysis Type
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'simple', label: 'Simple', desc: 'Quick 3-step analysis' },
                      { id: 'full', label: 'Full', desc: 'Complete 9-step pipeline' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setAnalysisType(type.id)}
                        className={`p-4 rounded-xl text-left transition-all ${
                          analysisType === type.id
                            ? 'bg-[#CFAE46]/15 border border-[#CFAE46]/50'
                            : 'bg-white/5 border border-transparent hover:border-white/20'
                        }`}
                        data-testid={`analysis-type-${type.id}`}
                      >
                        <p className={`font-semibold ${analysisType === type.id ? 'text-aureos-gold' : ''}`}>
                          {type.label}
                        </p>
                        <p className="text-xs text-[#888] mt-1">{type.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeframe */}
                <div className="aureos-card p-6">
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock size={14} />
                    Timeframe
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {timeframes.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                          timeframe === tf
                            ? 'bg-[#00B4FF]/20 text-aureos-blue border border-[#00B4FF]/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                        data-testid={`timeframe-${tf}`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Start Button */}
            {selectedAsset && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center"
              >
                <Button
                  onClick={startAnalysis}
                  className="aureos-btn-gold text-lg px-8 py-6"
                  data-testid="start-analysis-btn"
                >
                  <Play size={20} className="mr-2" />
                  Start {analysisType === 'full' ? 'Full' : 'Simple'} Analysis
                </Button>
              </motion.div>
            )}

            {/* Recent Analyses */}
            {recentAnalyses.length > 0 && (
              <div className="aureos-card p-6">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">
                  Recent Analyses
                </h3>
                <div className="space-y-2">
                  {recentAnalyses.map((analysis, index) => (
                    <button
                      key={index}
                      onClick={() => handleAssetSelect(analysis.asset)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          analysis.signal.direction === 'BUY' ? 'bg-[#00E676]/20' : 'bg-[#FF5252]/20'
                        }`}>
                          {analysis.signal.direction === 'BUY' 
                            ? <TrendingUp className="text-[#00E676]" size={18} />
                            : <TrendingDown className="text-[#FF5252]" size={18} />
                          }
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{analysis.asset.symbol}</p>
                          <p className="text-xs text-[#888]">
                            {new Date(analysis.timestamp).toLocaleDateString()} • {analysis.timeframe}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${
                          analysis.signal.direction === 'BUY' ? 'text-[#00E676]' : 'text-[#FF5252]'
                        }`}>
                          {analysis.signal.direction} {analysis.signal.buyProbability > 50 
                            ? analysis.signal.buyProbability 
                            : analysis.signal.sellProbability}%
                        </span>
                        <ChevronRight className="text-[#888] group-hover:text-aureos-gold transition-colors" size={18} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Analysis Pipeline */}
        {(isRunning || analysisComplete) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Selected Asset Display */}
            <div className="aureos-glass p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#CFAE46]/20 flex items-center justify-center">
                  <Zap className="text-aureos-gold" size={24} />
                </div>
                <div>
                  <p className="text-sm text-[#888]">Analyzing</p>
                  <p className="text-xl font-bold">{selectedAsset?.symbol}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded-full bg-[#00B4FF]/20 text-aureos-blue text-sm font-mono">
                  {timeframe}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-sm">
                  {analysisType === 'full' ? 'Full Analysis' : 'Simple Analysis'}
                </span>
              </div>
            </div>

            {/* Pipeline */}
            <AnalysisPipeline 
              asset={selectedAsset}
              onComplete={handleAnalysisComplete}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
            />

            {/* Results */}
            <AnimatePresence>
              {analysisComplete && signal && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="text-aureos-gold" />
                    Analysis Results
                  </h2>
                  <ProbabilityEngine 
                    analysisData={analysisData}
                    asset={selectedAsset}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Executive Report Modal */}
        <ExecutiveReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          analysisData={analysisData}
          asset={selectedAsset}
          signal={signal}
        />

        {/* Voice Copilot */}
        <VoiceCopilotWindow 
          token={token}
          onAnalysisRequest={handleAssetSelect}
        />
      </div>
    </AureosLayout>
  );
};

export default NewAnalysisPage;
