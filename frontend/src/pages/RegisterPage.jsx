import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(formData.password) },
    { label: 'Contains uppercase', met: /[A-Z]/.test(formData.password) },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    const allRequirementsMet = passwordRequirements.every(req => req.met);
    if (!allRequirementsMet) {
      toast.error('Please meet all password requirements');
      return;
    }

    setLoading(true);
    
    try {
      await register(formData.email, formData.password, formData.fullName);
      toast.success('Account created successfully!');
      navigate('/tutorial');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Left side - Visual */}
      <div className="hidden lg:flex flex-1 bg-[#0A0A0A] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative z-10 text-center">
          <h2 className="font-['Space_Grotesk'] text-4xl font-bold mb-4">
            Start your<br />
            <span className="gold-text-gradient">trading journey</span>
          </h2>
          <p className="text-[#888] max-w-md">
            Join Aureos AI and gain access to institutional-grade trading intelligence powered by advanced AI.
          </p>
          <div className="mt-12 space-y-4 text-left max-w-sm mx-auto">
            {[
              'Real-time market data',
              'AI-powered trade suggestions',
              'Portfolio analytics',
              'Risk management tools'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-[#D4AF37]/20 flex items-center justify-center">
                  <Check className="text-[#D4AF37]" size={12} />
                </div>
                <span className="text-[#888]">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20">
        <div className="max-w-md w-full mx-auto">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-[#888] hover:text-white mb-12"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#D4AF37] flex items-center justify-center">
                <span className="text-black font-bold text-xl">A</span>
              </div>
              <span className="font-['Space_Grotesk'] font-bold text-2xl">
                AUREOS<span className="text-[#D4AF37]">AI</span>
              </span>
            </div>

            <h1 className="font-['Space_Grotesk'] text-3xl font-bold mb-2">
              Create your account
            </h1>
            <p className="text-[#888] mb-8">
              Start with a free account. No credit card required.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" data-testid="register-form">
              <div>
                <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                  className="bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none h-12"
                  placeholder="John Doe"
                  data-testid="register-name-input"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none h-12"
                  placeholder="you@example.com"
                  data-testid="register-email-input"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    className="bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none h-12 pr-12"
                    placeholder="Create a strong password"
                    data-testid="register-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888] hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="mt-3 space-y-1">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-3 h-3 rounded-full ${req.met ? 'bg-[#00E096]' : 'bg-[#333]'}`} />
                      <span className={req.met ? 'text-[#00E096]' : 'text-[#888]'}>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
                  className="bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none h-12"
                  placeholder="Confirm your password"
                  data-testid="register-confirm-password-input"
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-[#888] pt-2">
                <input 
                  type="checkbox" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="accent-[#D4AF37] mt-1" 
                  data-testid="register-terms-checkbox"
                />
                <span>
                  I agree to the{' '}
                  <a href="#" className="text-[#D4AF37] hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-[#D4AF37] hover:underline">Privacy Policy</a>
                </span>
              </label>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none py-6 text-sm uppercase tracking-widest font-bold mt-4"
                data-testid="register-submit-btn"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-[#888]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#D4AF37] hover:underline">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
