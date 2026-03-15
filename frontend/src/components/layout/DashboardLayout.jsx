import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Bot, 
  BarChart3, 
  LineChart,
  Settings, 
  LogOut, 
  Menu, 
  X,
  Wallet,
  TrendingUp,
  Zap,
  History,
  Bell,
  Search,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/analysis', label: 'New Analysis', icon: Zap },
  { path: '/signals', label: 'AI Signals', icon: TrendingUp },
  { path: '/portfolio', label: 'Portfolio', icon: Wallet },
  { path: '/copilot', label: 'AI Copilot', icon: Bot },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const AureosLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPlanBadge = (plan) => {
    switch (plan) {
      case 'elite': return { bg: 'bg-gradient-gold', text: 'text-black', glow: 'shadow-[0_0_15px_rgba(207,174,70,0.5)]' };
      case 'pro': return { bg: 'bg-[#00B4FF]', text: 'text-black', glow: 'shadow-[0_0_15px_rgba(0,180,255,0.5)]' };
      case 'essential': return { bg: 'bg-white/20', text: 'text-white', glow: '' };
      default: return { bg: 'bg-white/10', text: 'text-white/60', glow: '' };
    }
  };

  const planStyle = getPlanBadge(user?.subscription_plan);

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-out lg:transform-none",
        "bg-gradient-to-b from-[#161718] to-[#0D0D0D] border-r border-white/5",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/5">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-gold group-hover:shadow-[0_0_20px_rgba(207,174,70,0.5)] transition-all">
                <span className="text-black font-bold text-xl">A</span>
              </div>
              <div>
                <span className="font-['Poppins'] font-bold text-xl tracking-tight">
                  AUREOS
                </span>
                <span className="text-aureos-gold font-bold text-xl">AI</span>
                <p className="text-[10px] text-[#888] uppercase tracking-widest">Trading Intelligence</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive 
                        ? "bg-[#CFAE46]/15 text-aureos-gold shadow-[0_0_15px_rgba(207,174,70,0.15)]" 
                        : "text-[#888] hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon size={18} className={isActive ? 'text-aureos-gold' : ''} />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeNav"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-aureos-gold"
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-white/5">
            <div className="aureos-glass p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#CFAE46]/20 to-[#00B4FF]/20 flex items-center justify-center">
                  <Crown size={20} className="text-aureos-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user?.full_name}</p>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-bold inline-flex items-center gap-1",
                    planStyle.bg, planStyle.text, planStyle.glow
                  )}>
                    {user?.subscription_plan || 'Free'}
                  </span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full justify-start text-[#888] hover:text-[#FF5252] hover:bg-[#FF5252]/10 rounded-xl"
                data-testid="logout-btn"
              >
                <LogOut size={16} className="mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 px-4 lg:px-8 py-4 bg-[#0D0D0D]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between">
            {/* Mobile Menu */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              data-testid="mobile-menu-btn"
            >
              <Menu size={24} />
            </Button>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
                <input
                  type="text"
                  placeholder="Search assets, commands, or ask AI..."
                  className="aureos-input pl-12 pr-4 py-2.5 text-sm rounded-xl"
                />
                <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#888] bg-white/5 px-2 py-0.5 rounded">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button className="relative p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <Bell size={20} className="text-[#888]" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF5252]" />
              </button>
              
              <Button
                onClick={() => navigate('/analysis')}
                className="aureos-btn-gold hidden sm:flex"
                data-testid="new-analysis-btn"
              >
                <Zap size={16} className="mr-2" />
                New Analysis
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AureosLayout;
