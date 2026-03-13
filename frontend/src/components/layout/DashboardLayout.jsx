import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import { 
  LayoutDashboard, 
  Bot, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Wallet,
  BookOpen,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/copilot', label: 'AI Copilot', icon: Bot },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/tutorial', label: 'Learn', icon: BookOpen },
  { path: '/pricing', label: 'Plans', icon: CreditCard },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'elite': return 'bg-[#D4AF37] text-black';
      case 'pro': return 'bg-white/20 text-white';
      case 'essential': return 'bg-white/10 text-white/80';
      default: return 'bg-white/5 text-white/60';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0A0A0A] border-r border-[#1A1A1A] transform transition-transform duration-200 ease-in-out lg:transform-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-[#1A1A1A]">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#D4AF37] flex items-center justify-center">
                <span className="text-black font-bold text-lg">A</span>
              </div>
              <span className="font-['Space_Grotesk'] font-bold text-lg tracking-tight">
                AUREOS<span className="text-[#D4AF37]">AI</span>
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all",
                    isActive 
                      ? "bg-[#D4AF37]/10 text-[#D4AF37] border-l-2 border-[#D4AF37]" 
                      : "text-[#888] hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-[#1A1A1A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#1A1A1A] rounded-sm flex items-center justify-center">
                <Wallet size={18} className="text-[#888]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name}</p>
                <span className={cn(
                  "text-xs px-2 py-0.5 uppercase tracking-wider",
                  getPlanBadgeColor(user?.subscription_plan)
                )}>
                  {user?.subscription_plan || 'Free'}
                </span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start text-[#888] hover:text-white hover:bg-white/5"
              data-testid="logout-btn"
            >
              <LogOut size={18} className="mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#0A0A0A] border-b border-[#1A1A1A] p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu size={24} />
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#D4AF37] flex items-center justify-center">
                <span className="text-black font-bold text-sm">A</span>
              </div>
              <span className="font-['Space_Grotesk'] font-bold">AUREOS</span>
            </Link>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
