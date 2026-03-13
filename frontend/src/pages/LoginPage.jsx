import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Left side - Form */}
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
              Welcome back
            </h1>
            <p className="text-[#888] mb-8">
              Sign in to access your trading dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
              <div>
                <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none h-12"
                  placeholder="you@example.com"
                  data-testid="login-email-input"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none h-12 pr-12"
                    placeholder="Enter your password"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888] hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[#888]">
                  <input type="checkbox" className="accent-[#D4AF37]" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-sm text-[#D4AF37] hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none py-6 text-sm uppercase tracking-widest font-bold"
                data-testid="login-submit-btn"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-[#888]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#D4AF37] hover:underline">
                Create one
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 bg-[#0A0A0A] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative z-10 text-center">
          <h2 className="font-['Space_Grotesk'] text-4xl font-bold mb-4">
            Clarity in<br />
            <span className="gold-text-gradient">every trade</span>
          </h2>
          <p className="text-[#888] max-w-md">
            AI-powered insights for modern investors. Join thousands of traders making smarter decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
