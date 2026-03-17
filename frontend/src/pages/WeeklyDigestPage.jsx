import React, { useState, useRef } from 'react';
import { useAuth, API } from '@/App';
import AureosLayout from '@/components/layout/DashboardLayout';
import JarvisCopilot from '@/components/jarvis/JarvisCopilot';
import { motion } from 'framer-motion';
import {
  BookOpen, Loader2, Volume2, Play, Pause, RefreshCw,
  TrendingUp, Calendar, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const WeeklyDigestPage = () => {
  const { token } = useAuth();
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [podcastLoading, setPodcastLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const loadDigest = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/quantica/weekly-digest`, { timeout: 60000 });
      setDigest(res.data);
      toast.success('Weekly digest generated');
    } catch { toast.error('Failed to generate digest'); }
    setLoading(false);
  };

  const loadPodcast = async () => {
    if (!digest) return;
    setPodcastLoading(true);
    try {
      const resp = await axios.post(`${API}/voice/narrate-report`, {
        text: `Narrate this weekly market digest as a podcast episode. Start with: "Welcome to the Aureos AI Weekly Intelligence Digest." Then cover the key themes naturally. End with "This has been your Aureos AI weekly digest. See you next week." Here is the content: ${digest.digest.substring(0, 3000)}`,
        language: 'en'
      }, { responseType: 'blob', timeout: 90000, headers });
      const audioUrl = URL.createObjectURL(new Blob([resp.data], { type: 'audio/mpeg' }));
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
      }
      toast.success('Podcast ready');
    } catch { toast.error('Failed to generate podcast'); }
    setPodcastLoading(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <AureosLayout>
      <div className="space-y-6" data-testid="weekly-digest-page">
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Poppins']"><span className="text-gradient-gold">Weekly Intelligence Digest</span></h1>
            <p className="text-[#666] mt-1">Comprehensive weekly market analysis by JARVIS AI Quantica</p>
          </div>
          <div className="flex gap-2">
            {digest && (
              <Button onClick={loadPodcast} disabled={podcastLoading}
                className="bg-[#00B4FF]/20 hover:bg-[#00B4FF]/30 text-[#00B4FF] border border-[#00B4FF]/30" data-testid="podcast-btn">
                {podcastLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Volume2 size={16} className="mr-2" />}
                {podcastLoading ? 'Generating Podcast...' : 'Podcast Version'}
              </Button>
            )}
            <Button onClick={loadDigest} disabled={loading} className="aureos-btn-gold" data-testid="generate-digest-btn">
              {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <BookOpen size={16} className="mr-2" />}
              {loading ? 'Analyzing Markets...' : 'Generate Digest'}
            </Button>
          </div>
        </div>

        {/* Podcast Player */}
        {audioRef.current?.src && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 bg-[#00B4FF]/5 border border-[#00B4FF]/20 flex items-center gap-4"
            data-testid="podcast-player">
            <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-[#00B4FF]/20 flex items-center justify-center hover:bg-[#00B4FF]/30 transition-colors">
              {isPlaying ? <Pause size={20} className="text-[#00B4FF]" /> : <Play size={20} className="text-[#00B4FF]" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#00B4FF]">JARVIS Weekly Podcast</p>
              <p className="text-[11px] text-[#888]">Week {digest?.week_number} &bull; {isPlaying ? 'Playing...' : 'Paused'}</p>
            </div>
            <Volume2 size={16} className={isPlaying ? 'text-[#00B4FF] animate-pulse' : 'text-[#555]'} />
          </motion.div>
        )}

        {!digest && !loading && (
          <div className="aureos-card p-12 text-center">
            <BookOpen className="mx-auto mb-4 text-[#444]" size={48} />
            <p className="text-[#666] text-sm mb-2">Click <strong className="text-aureos-gold">Generate Digest</strong> to create your weekly intelligence report</p>
            <p className="text-[10px] text-[#555]">Powered by JARVIS AI Quantica &bull; Comprehensive market, geopolitical & macro analysis</p>
          </div>
        )}

        {loading && (
          <div className="aureos-card p-12 text-center">
            <Loader2 className="animate-spin text-aureos-gold mx-auto mb-4" size={40} />
            <p className="text-[#888] text-sm">JARVIS is analyzing global markets, geopolitical events, and macro data...</p>
            <p className="text-[10px] text-[#555] mt-2">This may take up to 30 seconds</p>
          </div>
        )}

        {digest && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Header card */}
            <div className="aureos-card p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-aureos-gold/15 flex items-center justify-center">
                  <Calendar size={24} className="text-aureos-gold" />
                </div>
                <div>
                  <p className="text-lg font-bold">Week {digest.week_number} — {new Date().getFullYear()}</p>
                  <p className="text-xs text-[#888]">Generated {new Date(digest.generated_at).toLocaleString()}</p>
                </div>
              </div>
              {digest.fear_greed && (
                <div className="text-center px-4 py-2 rounded-xl" style={{ background: digest.fear_greed.color + '15', border: `1px solid ${digest.fear_greed.color}30` }}>
                  <p className="font-mono text-xl font-bold" style={{ color: digest.fear_greed.color }}>{digest.fear_greed.composite_score}</p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: digest.fear_greed.color }}>{digest.fear_greed.label}</p>
                </div>
              )}
            </div>

            {/* Digest content */}
            <div className="aureos-card p-6">
              <div className="prose prose-invert prose-sm max-w-none text-[#ccc] leading-relaxed whitespace-pre-wrap" data-testid="digest-content">
                {digest.digest}
              </div>
            </div>

            {/* Top performers */}
            {digest.top_performers?.length > 0 && (
              <div className="aureos-card p-6">
                <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Flame size={14} className="text-aureos-gold" /> Top Performers This Week
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {digest.top_performers.map(h => (
                    <div key={h.asset} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="font-mono font-bold text-sm">{h.asset}</p>
                      <p className="font-mono font-bold text-lg text-[#00E676] mt-1">+{h.performance.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        <JarvisCopilot />
      </div>
    </AureosLayout>
  );
};

export default WeeklyDigestPage;
