import React from 'react';
import { useAuth } from '@/App';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { User, Mail, Crown, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'elite': return 'bg-[#D4AF37] text-black';
      case 'pro': return 'bg-white/20 text-white';
      case 'essential': return 'bg-white/10 text-white/80';
      default: return 'bg-white/5 text-white/60';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6" data-testid="settings-page">
        {/* Header */}
        <div>
          <h1 className="font-['Space_Grotesk'] text-2xl md:text-3xl font-bold">
            Account Settings
          </h1>
          <p className="text-[#888] mt-1">Manage your account and subscription</p>
        </div>

        {/* Profile Card */}
        <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
          <CardHeader className="border-b border-[#1A1A1A]">
            <CardTitle className="font-['Space_Grotesk'] text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#1A1A1A] flex items-center justify-center">
                <User size={24} className="text-[#888]" />
              </div>
              <div>
                <p className="font-semibold text-lg">{user?.full_name}</p>
                <p className="text-[#888] text-sm flex items-center gap-2">
                  <Mail size={14} />
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4">
                <div className="flex items-center gap-2 text-[#888] text-xs uppercase tracking-wider mb-2">
                  <Crown size={14} />
                  Subscription Plan
                </div>
                <span className={`text-sm px-3 py-1 uppercase tracking-wider font-semibold ${getPlanBadgeColor(user?.subscription_plan)}`}>
                  {user?.subscription_plan || 'Free'}
                </span>
              </div>
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4">
                <div className="flex items-center gap-2 text-[#888] text-xs uppercase tracking-wider mb-2">
                  <Calendar size={14} />
                  Member Since
                </div>
                <p className="font-['JetBrains_Mono'] text-sm">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
          <CardHeader className="border-b border-[#1A1A1A]">
            <CardTitle className="font-['Space_Grotesk'] text-lg">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#888] text-sm mb-1">Current Plan</p>
                <p className="font-semibold text-lg capitalize">{user?.subscription_plan || 'Free'}</p>
              </div>
              <Button
                onClick={() => navigate('/pricing')}
                className="bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none"
                data-testid="upgrade-plan-btn"
              >
                {user?.subscription_plan === 'elite' ? 'Manage Plan' : 'Upgrade Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-[#0F0F0F] border-[#1A1A1A]">
          <CardHeader className="border-b border-[#1A1A1A]">
            <CardTitle className="font-['Space_Grotesk'] text-lg text-[#FF3B30]">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Sign Out</p>
                <p className="text-[#888] text-sm">Sign out of your account on this device</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white rounded-none"
                data-testid="settings-logout-btn"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
