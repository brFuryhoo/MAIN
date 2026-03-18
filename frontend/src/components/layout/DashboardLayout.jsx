import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import { useLanguage, LANGUAGES } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Bot, Settings, LogOut, Menu, X, Wallet, Zap, Bell, Search,
  Crown, Eye, Brain, Radar, Globe, Gauge, Banknote, Activity, BookOpen, Trophy,
  Fingerprint, Clock, Map, Terminal, Coins, RotateCcw, ChevronLeft, ChevronRight,
  ShieldCheck, Sparkles, BarChart3, Dna, ShoppingBag, Network, Users, ScanLine, Swords,
  Crosshair, Languages, ChevronDown, Share2, Route, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navSections = [
  {
    label: 'nav.intelligence',
    items: [
      { path: '/dashboard', labelKey: 'nav.command_center', icon: LayoutDashboard },
      { path: '/cross-analysis', labelKey: 'nav.jarvis_hub', icon: Brain },
      { path: '/intelligence', labelKey: 'nav.intel_terminal', icon: Globe },
      { path: '/intelligence-mode', labelKey: 'nav.intel_mode', icon: Terminal },
      { path: '/copilot', labelKey: 'nav.jarvis_copilot', icon: Bot },
      { path: '/alpha-radar', labelKey: 'nav.alpha_radar', icon: Crosshair },
      { path: '/market-narrative', labelKey: 'nav.market_narrative', icon: BookOpen },
    ],
  },
  {
    label: 'nav.analysis',
    items: [
      { path: '/market-radar', labelKey: 'nav.ai_quantica', icon: Activity },
      { path: '/analysis', labelKey: 'nav.deep_analysis', icon: Zap },
      { path: '/scanner', labelKey: 'nav.market_scanner', icon: Radar },
      { path: '/signal-timeline', labelKey: 'nav.signal_timeline', icon: Clock },
      { path: '/capital-flow', labelKey: 'nav.capital_flow', icon: Map },
      { path: '/market-personality', labelKey: 'nav.market_dna', icon: Fingerprint },
      { path: '/sentiment', labelKey: 'nav.sentiment', icon: Gauge },
      { path: '/weekly-digest', labelKey: 'nav.weekly_digest', icon: BookOpen },
    ],
  },
  {
    label: 'nav.trading',
    items: [
      { path: '/portfolio', labelKey: 'nav.my_portfolio', icon: Wallet },
      { path: '/watchlist', labelKey: 'nav.watchlist', icon: Eye },
      { path: '/paper-trading', labelKey: 'nav.paper_trading', icon: Banknote },
      { path: '/trade-simulator', labelKey: 'nav.trade_simulator', icon: Sparkles },
      { path: '/decision-replay', labelKey: 'nav.decision_replay', icon: RotateCcw },
    ],
  },
  {
    label: 'nav.unfair_advantage',
    items: [
      { path: '/trader-dna', labelKey: 'nav.trader_dna', icon: Dna },
      { path: '/strategy-marketplace', labelKey: 'nav.marketplace', icon: ShoppingBag },
      { path: '/global-intelligence', labelKey: 'nav.global_intel', icon: Network },
      { path: '/opportunity-scanner', labelKey: 'nav.opp_scanner', icon: ScanLine },
      { path: '/social-proof', labelKey: 'nav.top_traders', icon: Users },
      { path: '/jarvis-challenge', labelKey: 'nav.jarvis_challenge', icon: Swords },
      { path: '/share-cards', labelKey: 'nav.share_cards', icon: Share2 },
      { path: '/evolution', labelKey: 'nav.evolution', icon: Route },
      { path: '/strategy-creator', labelKey: 'nav.strategy_creator', icon: Wand2 },
    ],
  },
  {
    label: 'nav.system',
    items: [
      { path: '/leaderboard', labelKey: 'nav.aureos_score', icon: Trophy },
      { path: '/aureos-tokens', labelKey: 'nav.aureos_tokens', icon: Coins },
      { path: '/performance', labelKey: 'nav.track_record', icon: ShieldCheck },
      { path: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
];

export const AureosLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { t, lang, changeLang, LANGUAGES: langs } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const planStyle = (() => {
    switch (user?.subscription_plan) {
      case 'elite': return { bg: 'bg-gradient-gold', text: 'text-black', glow: 'shadow-[0_0_15px_rgba(207,174,70,0.5)]' };
      case 'pro': return { bg: 'bg-[#00B4FF]', text: 'text-black', glow: 'shadow-[0_0_15px_rgba(0,180,255,0.5)]' };
      default: return { bg: 'bg-white/10', text: 'text-white/60', glow: '' };
    }
  })();

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 transition-all duration-300 ease-out lg:transform-none",
        "bg-gradient-to-b from-[#161718] to-[#0D0D0D] border-r border-white/5",
        collapsed ? "w-[68px]" : "w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={cn("border-b border-white/5", collapsed ? "p-3" : "p-5")}>
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-gold group-hover:shadow-[0_0_20px_rgba(207,174,70,0.5)] transition-all flex-shrink-0">
                <span className="text-black font-bold text-lg">A</span>
              </div>
              {!collapsed && (
                <div>
                  <span className="font-['Poppins'] font-bold text-lg tracking-tight">AUREOS</span>
                  <span className="text-aureos-gold font-bold text-lg">AI</span>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className={cn("flex-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
            {navSections.map((section) => (
              <div key={section.label} className="mb-3">
                {!collapsed && (
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#555] font-semibold px-3 mb-1.5">{t(section.label)}</p>
                )}
                {collapsed && <div className="h-px bg-white/5 mx-1 mb-2" />}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const label = t(item.labelKey);
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                        title={collapsed ? label : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all",
                          collapsed ? "justify-center p-2.5" : "px-3 py-2",
                          isActive
                            ? "bg-[#CFAE46]/15 text-aureos-gold"
                            : "text-[#777] hover:text-white hover:bg-white/5"
                        )}>
                        <Icon size={16} className={cn("flex-shrink-0", isActive && "text-aureos-gold")} />
                        {!collapsed && <span className="truncate">{label}</span>}
                        {!collapsed && isActive && <div className="ml-auto w-1 h-1 rounded-full bg-aureos-gold" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Collapse Toggle */}
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center p-2 mx-3 mb-2 rounded-lg hover:bg-white/5 text-[#666] transition-all"
            data-testid="collapse-sidebar-btn">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* User Section */}
          <div className={cn("border-t border-white/5", collapsed ? "p-2" : "p-3")}>
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#CFAE46]/20 to-[#00B4FF]/20 flex items-center justify-center">
                  <Crown size={16} className="text-aureos-gold" />
                </div>
                <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-[#FF5252]/10 text-[#888] hover:text-[#FF5252] transition-all" data-testid="logout-btn">
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div className="aureos-glass p-3 rounded-xl">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#CFAE46]/20 to-[#00B4FF]/20 flex items-center justify-center flex-shrink-0">
                    <Crown size={16} className="text-aureos-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{user?.full_name}</p>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold", planStyle.bg, planStyle.text)}>
                      {user?.subscription_plan || 'Free'}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" onClick={handleLogout}
                  className="w-full justify-start text-[#888] hover:text-[#FF5252] hover:bg-[#FF5252]/10 rounded-lg text-xs h-8"
                  data-testid="logout-btn">
                  <LogOut size={14} className="mr-2" /> Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 px-4 lg:px-8 py-3 bg-[#0D0D0D]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden" data-testid="mobile-menu-btn">
              <Menu size={24} />
            </Button>
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" size={16} />
                <input type="text" placeholder="Search assets, commands, or ask JARVIS..."
                  className="aureos-input pl-11 pr-4 py-2 text-sm rounded-lg w-full" />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#888] bg-white/5 px-1.5 py-0.5 rounded">K</kbd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="relative">
                <button onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-[#888] text-xs"
                  data-testid="language-selector-btn">
                  <Languages size={14} />
                  <span className="hidden sm:inline font-mono uppercase">{lang}</span>
                  <ChevronDown size={10} />
                </button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                      className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
                      data-testid="language-dropdown">
                      {(langs || LANGUAGES).map(l => (
                        <button key={l.code} onClick={() => { changeLang(l.code); setLangOpen(false); }}
                          className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors",
                            lang === l.code ? 'text-aureos-gold bg-aureos-gold/5' : 'text-[#999]')}
                          data-testid={`lang-option-${l.code}`}>
                          <span className="font-mono text-[10px] w-5 uppercase">{l.code}</span>
                          <span>{l.label}</span>
                          {lang === l.code && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-aureos-gold" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
                <Bell size={18} className="text-[#888]" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FF5252]" />
              </button>
              <Button onClick={() => navigate('/analysis')} className="aureos-btn-gold hidden sm:flex text-xs h-8" data-testid="new-analysis-btn">
                <Zap size={14} className="mr-1.5" /> New Analysis
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default AureosLayout;
