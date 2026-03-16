import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import GlobalAssetSelector from '@/components/analysis/GlobalAssetSelector';
import AnalysisPipeline from '@/components/pipeline/AnalysisPipeline';
import ProbabilityEngine from '@/components/probability/ProbabilityEngine';
import ExecutiveReportModal from '@/components/modals/ExecutiveReportModal';
import AssetChart from '@/components/charts/AssetChart';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Play, FileText, RotateCcw, Clock,
  TrendingUp, TrendingDown, ChevronRight, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const NewAnalysisPage = () => {
  const { token } = useAuth();
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [analysisType, setAnalysisType] = useState('full');
  const [timeframe, setTimeframe] = useState('4H');
  const [isRunning, setIsRunning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState([]);

  const timeframes = ['1M', '5M', '15M', '1H', '4H', '1D', '1W'];

  useEffect(() => {
    const saved = localStorage.getItem('aureos_recent_analyses');
    if (saved) {
      try { setRecentAnalyses(JSON.parse(saved).slice(0, 5)); } catch {}
    }
  }, []);

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
    setAnalysisResult(null);
  };

  const startAnalysis = async () => {
    if (!selectedAsset) {
      toast.error('Please select an asset first');
      return;
    }

    setIsRunning(true);
    setAnalysisResult(null);
    toast.info(`Starting ${analysisType} analysis for ${selectedAsset.symbol}`);

    try {
      const resp = await axios.post(`${API}/analysis/start`, {
        symbol: selectedAsset.symbol,
        asset_type: selectedAsset.type || 'crypto',
        coingecko_id: selectedAsset.coingecko_id || null,
        name: selectedAsset.name || selectedAsset.symbol,
        timeframe,
        analysis_type: analysisType,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setAnalysisResult(resp.data);

      // Save to recent
      const newEntry = {
        asset: selectedAsset,
        signal: resp.data.report?.signal_summary || {},
        timestamp: new Date().toISOString(),
        timeframe,
      };
      const updated = [newEntry, ...recentAnalyses].slice(0, 5);
      setRecentAnalyses(updated);
      localStorage.setItem('aureos_recent_analyses', JSON.stringify(updated));
      toast.success('Analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed');
    } finally {
      setIsRunning(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedAsset(null);
    setIsRunning(false);
    setAnalysisResult(null);
  };

  const report = analysisResult?.report;
  const candles = analysisResult?.candles;
  const probability = analysisResult?.steps?.probability;

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
          {analysisResult && (
            <div className="flex gap-3">
              <Button onClick={() => setShowReport(true)} className="aureos-btn-gold" data-testid="view-report-btn">
                <FileText size={16} className="mr-2" />Executive Report
              </Button>
              <Button onClick={resetAnalysis} className="aureos-btn-outline" data-testid="reset-analysis-btn">
                <RotateCcw size={16} className="mr-2" />New Analysis
              </Button>
            </div>
          )}
        </div>

        {/* Asset Selection Phase */}
        {!isRunning && !analysisResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="aureos-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="text-aureos-gold" size={20} />Select Asset
              </h2>
              <GlobalAssetSelector onAssetSelect={handleAssetSelect} selectedAsset={selectedAsset} />
            </div>

            {selectedAsset && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="grid md:grid-cols-2 gap-6">
                <div className="aureos-card p-6">
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Analysis Type</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'simple', label: 'Simple', desc: 'Quick 3-step analysis' },
                      { id: 'full', label: 'Full', desc: 'Complete 9-step pipeline' },
                    ].map((type) => (
                      <button key={type.id} onClick={() => setAnalysisType(type.id)}
                        className={`p-4 rounded-xl text-left transition-all ${
                          analysisType === type.id
                            ? 'bg-[#CFAE46]/15 border border-[#CFAE46]/50'
                            : 'bg-white/5 border border-transparent hover:border-white/20'
                        }`} data-testid={`analysis-type-${type.id}`}>
                        <p className={`font-semibold ${analysisType === type.id ? 'text-aureos-gold' : ''}`}>{type.label}</p>
                        <p className="text-xs text-[#888] mt-1">{type.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="aureos-card p-6">
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock size={14} />Timeframe
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {timeframes.map((tf) => (
                      <button key={tf} onClick={() => setTimeframe(tf)}
                        className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                          timeframe === tf
                            ? 'bg-[#00B4FF]/20 text-aureos-blue border border-[#00B4FF]/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`} data-testid={`timeframe-${tf}`}>
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {selectedAsset && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }} className="flex justify-center">
                <Button onClick={startAnalysis} className="aureos-btn-gold text-lg px-8 py-6" data-testid="start-analysis-btn">
                  <Play size={20} className="mr-2" />
                  Start {analysisType === 'full' ? 'Full' : 'Simple'} Analysis
                </Button>
              </motion.div>
            )}

            {/* Recent Analyses */}
            {recentAnalyses.length > 0 && (
              <div className="aureos-card p-6">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4">Recent Analyses</h3>
                <div className="space-y-2">
                  {recentAnalyses.map((analysis, index) => (
                    <button key={index} onClick={() => handleAssetSelect(analysis.asset)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          analysis.signal.direction === 'BUY' ? 'bg-[#00E676]/20' : analysis.signal.direction === 'SELL' ? 'bg-[#FF5252]/20' : 'bg-white/10'
                        }`}>
                          {analysis.signal.direction === 'BUY' ? <TrendingUp className="text-[#00E676]" size={18} /> :
                           analysis.signal.direction === 'SELL' ? <TrendingDown className="text-[#FF5252]" size={18} /> :
                           <TrendingUp className="text-[#888]" size={18} />}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{analysis.asset.symbol}</p>
                          <p className="text-xs text-[#888]">{new Date(analysis.timestamp).toLocaleDateString()} &bull; {analysis.timeframe}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${
                          analysis.signal.direction === 'BUY' ? 'text-[#00E676]' : analysis.signal.direction === 'SELL' ? 'text-[#FF5252]' : 'text-[#888]'
                        }`}>
                          {analysis.signal.direction} {analysis.signal.confidence}%
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

        {/* Pipeline Running / Results */}
        {(isRunning || analysisResult) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Asset Header */}
            <div className="aureos-glass p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#CFAE46]/20 flex items-center justify-center">
                  <Zap className="text-aureos-gold" size={24} />
                </div>
                <div>
                  <p className="text-sm text-[#888]">Analyzing</p>
                  <p className="text-xl font-bold">{selectedAsset?.symbol} <span className="text-sm text-[#888] font-normal">{selectedAsset?.name}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded-full bg-[#00B4FF]/20 text-aureos-blue text-sm font-mono">{timeframe}</span>
                {analysisResult && (
                  <span className="px-3 py-1 rounded-full bg-white/10 text-sm font-mono">${Number(analysisResult.price).toLocaleString()}</span>
                )}
              </div>
            </div>

            {/* Chart */}
            {candles && candles.length > 0 && (
              <div className="aureos-card p-4">
                <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-3">Price Chart</h3>
                <AssetChart
                  candles={candles}
                  support={report?.technical_analysis?.support}
                  resistance={report?.technical_analysis?.resistance}
                  height={350}
                />
              </div>
            )}

            {/* Pipeline */}
            <AnalysisPipeline isRunning={isRunning} analysisResult={analysisResult} />

            {/* Probability + Signal Results */}
            <AnimatePresence>
              {analysisResult && probability && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="text-aureos-gold" />Analysis Results
                  </h2>
                  <ProbabilityEngine probability={probability} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Executive Report Modal */}
        <ExecutiveReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          report={report}
        />
      </div>

      {/* JARVIS Copilot - Floating */}
      <JarvisCopilot analysisContext={analysisResult ? { report: analysisResult.report } : null} />
    </AureosLayout>
  );
};

export default NewAnalysisPage;
