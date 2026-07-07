import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import { useLanguage, LANGUAGES } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical } from 'lucide-react';
import LivePriceTicker from '@/components/layout/LivePriceTicker';
import AlertsBell from '@/components/layout/AlertsBell';
import QuickAnalysisBar from '@/components/layout/QuickAnalysisBar';
import { 
  LayoutDashboard, Bot, Settings, LogOut, Menu, X, Wallet, Zap, Bell, Search,
  Crown, Eye, Brain, Radar, Globe, Gauge, Banknote, Activity, BookOpen, Trophy,
  Fingerprint, Clock, Map, Terminal, Coins, RotateCcw, ChevronLeft, ChevronRight,
  ShieldCheck, Sparkles, BarChart3, Dna, ShoppingBag, Network, Users, ScanLine, Swords,
  Crosshair, Languages, ChevronDown, Share2, Route, Wand2,
  Copy, Droplets, BookMarked, Target, Grid3X3, Calendar, HelpCircle, UserPlus, Gift,
  Shield, Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── MVP NAVIGATION — 5 core features ───────────────────────────────────────
const navSections = [
  {
    label: 'CORE',
    items: [
      { path: '/dashboard',     labelKey: 'nav.command_center', icon: LayoutDashboard },
      { path: '/global-fusion', labelKey: 'nav.global_fusion',  icon: Network, badge: 'LIVE' },
      { path: '/analysis',      labelKey: 'nav.analyze_asset',  icon: Zap },
      { path: '/copilot',       labelKey: 'nav.jarvis_copilot', icon: Bot },
      { path: '/signals',       labelKey: 'nav.my_signals',     icon: Activity },
      { path: '/satellite',     labelKey: 'nav.satellite',      icon: Radar, badge: 'NEW' },
    ],
  },
  {
    label: 'PORTFOLIO',
    items: [
      { path: '/watchlist',  labelKey: 'nav.watchlist',    icon: Eye },
      { path: '/portfolio',  labelKey: 'nav.my_portfolio', icon: Wallet },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/labs',     labelKey: 'nav.labs',     icon: FlaskConical, badge: 'NEW' },
      { path: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
];

// ─── MOBILE BOTTOM NAV — 5 thumb-reachable core items ──────────────────────
const mobileNavItems = [
  { path: '/dashboard', label: 'Início',    icon: LayoutDashboard },
  { path: '/global-fusion', label: 'Fusão', icon: Network },
  { path: '/copilot',    label: 'JARVIS',   icon: Bot, isCenter: true },
  { path: '/signals',    label: 'Sinais',   icon: Activity },
  { path: '/portfolio',  label: 'Carteira', icon: Wallet },
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
    <div className="min-h-screen bg-[#060607] flex">
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
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#555] font-semibold px-3 mb-1.5">{section.label}</p>
                )}
                {collapsed && <div className="h-px bg-white/5 mx-1 mb-2" />}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const label = item.label || t(item.labelKey || '');
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
                        {!collapsed && item.badge && (
                          <span className="ml-auto text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded font-mono"
                            style={{color:'#FF4444', background:'rgba(255,68,68,0.12)', border:'1px solid rgba(255,68,68,0.3)'}}>
                            {item.badge}
                          </span>
                        )}
                        {!collapsed && !item.badge && isActive && <div className="ml-auto w-1 h-1 rounded-full bg-aureos-gold" />}
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
              <QuickAnalysisBar />
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
              <AlertsBell />
              <Button onClick={() => navigate('/analysis')} className="aureos-btn-gold hidden sm:flex text-xs h-8" data-testid="new-analysis-btn">
                <Zap size={14} className="mr-1.5" /> New Analysis
              </Button>
            </div>
          </div>
        </header>
        {/* Live Price Ticker — always visible below header */}
        <LivePriceTicker />
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8">{children}</main>
      </div>

      {/* Mobile Bottom Nav — thumb-reachable, sticky, safe-area aware */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0b]/95 backdrop-blur-xl border-t border-white/[0.06] aureos-safe-bottom"
        data-testid="mobile-bottom-nav"
      >
        <div className="flex items-stretch justify-between px-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            if (item.isCenter) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex-1 flex flex-col items-center justify-center py-2 relative"
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                >
                  <div className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center -mt-5 border-4 border-[#0a0a0b] transition-colors",
                    isActive ? "bg-[#C9A94A]" : "bg-[#1B1B1E]"
                  )}>
                    <Icon size={20} className={isActive ? "text-black" : "text-[#C9A94A]"} />
                  </div>
                  <span className={cn("text-[9px] mt-0.5 font-medium tracking-wide", isActive ? "text-aureos-gold" : "text-[#666]")}>
                    {item.label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 aureos-tap-target"
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              >
                <Icon size={19} className={isActive ? "text-aureos-gold" : "text-[#666]"} />
                <span className={cn("text-[9px] font-medium tracking-wide", isActive ? "text-aureos-gold" : "text-[#666]")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AureosLayout;
