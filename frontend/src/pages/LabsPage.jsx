import React from 'react';
import { useNavigate } from 'react-router-dom';
import AureosLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { 
  FlaskConical, Lock, ArrowRight, Zap, Brain, Copy, Target,
  BookMarked, Route, Trophy, Dna, ShoppingBag, Radar,
  Droplets, Map, Gauge, Calendar, Swords, HelpCircle,
  Share2, Users, UserPlus, ShieldCheck, Banknote, Wand2,
  BookOpen, Terminal, Cpu, Shield, Grid3X3, Network, Activity
} from 'lucide-react';

const LABS_FEATURES = [
  { icon: Cpu,        label: 'Decision Engine',       path: '/decision-engine',      eta: 'Q3 2026' },
  { icon: Shield,     label: 'Trust Dashboard',       path: '/trust-dashboard',      eta: 'Q3 2026' },
  { icon: Brain,      label: 'JARVIS Hub',            path: '/cross-analysis',       eta: 'Q3 2026' },
  { icon: BookOpen,   label: 'Market Narrative',      path: '/market-narrative',     eta: 'Q2 2026' },
  { icon: Terminal,   label: 'Intelligence Mode',     path: '/intelligence-mode',    eta: 'Q3 2026' },
  { icon: Activity,   label: 'AI Quantica Radar',     path: '/market-radar',         eta: 'Q2 2026' },
  { icon: Radar,      label: 'Market Scanner',        path: '/scanner',              eta: 'Q2 2026' },
  { icon: Grid3X3,    label: 'Correlation Matrix',    path: '/correlation',          eta: 'Q2 2026' },
  { icon: Calendar,   label: 'Economic Calendar',     path: '/economic-calendar',    eta: 'Q2 2026' },
  { icon: Droplets,   label: 'Liquidity Map',         path: '/liquidity-map',        eta: 'Q3 2026' },
  { icon: Map,        label: 'Capital Flow',          path: '/capital-flow',         eta: 'Q3 2026' },
  { icon: Gauge,      label: 'Sentiment Engine',      path: '/sentiment',            eta: 'Q2 2026' },
  { icon: Banknote,   label: 'Paper Trading',         path: '/paper-trading',        eta: 'Q3 2026' },
  { icon: Copy,       label: 'Copy Trading',          path: '/copy-trading',         eta: 'Q4 2026' },
  { icon: Zap,        label: 'Trade Simulator',       path: '/trade-simulator',      eta: 'Q3 2026' },
  { icon: BookMarked, label: 'Trade Journal',         path: '/trade-journal',        eta: 'Q3 2026' },
  { icon: Dna,        label: 'Trader DNA',            path: '/trader-dna',           eta: 'Q4 2026' },
  { icon: Brain,      label: 'Second Brain',          path: '/second-brain',         eta: 'Q4 2026' },
  { icon: Swords,     label: 'JARVIS Challenge',      path: '/jarvis-challenge',     eta: 'Q3 2026' },
  { icon: Network,    label: 'Global Intelligence',   path: '/global-intelligence',  eta: 'Q3 2026' },
  { icon: ShoppingBag,label: 'Strategy Marketplace',  path: '/strategy-marketplace', eta: 'Q4 2026' },
  { icon: Wand2,      label: 'Strategy Creator',      path: '/strategy-creator',     eta: 'Q3 2026' },
  { icon: Route,      label: 'Trader Evolution',      path: '/evolution',            eta: 'Q4 2026' },
  { icon: Target,     label: 'Daily Missions',        path: '/daily-missions',       eta: 'Q3 2026' },
  { icon: HelpCircle, label: 'Market Quiz',           path: '/quiz',                 eta: 'Q3 2026' },
  { icon: Share2,     label: 'Share Cards',           path: '/share-cards',          eta: 'Q3 2026' },
  { icon: Users,      label: 'Top Traders',           path: '/social-proof',         eta: 'Q4 2026' },
  { icon: UserPlus,   label: 'Referral Program',      path: '/referral',             eta: 'Q3 2026' },
  { icon: Trophy,     label: 'Leaderboard',           path: '/leaderboard',          eta: 'Q3 2026' },
  { icon: ShieldCheck,label: 'Track Record',          path: '/performance',          eta: 'Q3 2026' },
];

const ETA_COLORS = {
  'Q2 2026': '#00E676',
  'Q3 2026': '#D4AF37',
  'Q4 2026': '#888',
};

const ETA_KEYS = { 'Q2 2026': 'labs.q2', 'Q3 2026': 'labs.q3', 'Q4 2026': 'labs.q4' };

export default function LabsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <AureosLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                <FlaskConical size={18} className="text-[#D4AF37]" />
              </div>
              <h1 className="text-2xl font-bold font-['Poppins']">
AUREOS <span className="text-[#D4AF37]">LABS</span>
              </h1>
            </div>
            <p className="text-[#666] text-sm max-w-xl">
              {t('labs.subtitle')}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#555] bg-[#111] border border-[#1a1a1a] px-4 py-2 rounded-lg">
            <Lock size={12} />
<span>{LABS_FEATURES.length} {t('labs.pipeline')}</span>
          </div>
        </div>

        {/* ETA Legend */}
        <div className="flex items-center gap-6">
          {Object.entries(ETA_COLORS).map(([eta, color]) => (
            <div key={eta} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
<span className="text-xs text-[#666]">{t(ETA_KEYS[eta] || eta)}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {LABS_FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            const etaColor = ETA_COLORS[feat.eta] || '#888';
            return (
              <motion.div
                key={feat.path}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(feat.path)}
                className="group relative bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-4 cursor-pointer
                           hover:border-[#D4AF37]/20 hover:bg-[#111] transition-all duration-200"
              >
                {/* ETA dot */}
                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full" style={{ background: etaColor }} />

                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-3 
                                group-hover:bg-[#D4AF37]/10 transition-colors">
                  <Icon size={15} className="text-[#555] group-hover:text-[#D4AF37] transition-colors" />
                </div>

                <p className="text-xs font-semibold text-[#777] group-hover:text-white transition-colors leading-tight mb-1">
                  {feat.label}
                </p>
                <p className="text-[10px] font-mono" style={{ color: etaColor }}>
                  {t(ETA_KEYS[feat.eta] || feat.eta)}
                </p>

                <ArrowRight size={11} className="absolute bottom-3 right-3 text-[#333] group-hover:text-[#D4AF37] transition-colors" />
              </motion.div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-xl p-6 text-center">
          <p className="text-[#555] text-sm">
            {t('labs.footer')}
          </p>
          <p className="text-[#D4AF37] text-xs mt-2 font-mono">
            {t('labs.tagline')}
          </p>
        </div>

      </div>
    </AureosLayout>
  );
}
