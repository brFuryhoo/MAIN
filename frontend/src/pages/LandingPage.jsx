import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowUpRight,
  BarChart3, 
  Bot, 
  Shield, 
  Zap, 
  Check,
  ChevronRight,
  Menu,
  X,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '@/App';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const features = [
    {
      icon: BarChart3,
      title: "Market Intelligence",
      description: "Real-time data from ASX, NASDAQ, Forex, and Crypto markets with advanced charting and analytics."
    },
    {
      icon: Bot,
      title: "AI Copilot",
      description: "GPT-powered assistant providing probability-based trade suggestions with clear reasoning."
    },
    {
      icon: Shield,
      title: "Predictive Analytics",
      description: "Risk assessment, portfolio analysis, and backtesting tools for informed decisions."
    }
  ];

  const plans = [
    {
      id: 'essential',
      name: 'Essential',
      price: 29,
      description: 'Perfect for getting started',
      features: ['Core charts & data', 'Basic AI predictions', '5 watchlist items', 'Daily market brief']
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 79,
      popular: true,
      description: 'For serious traders',
      features: ['All Essential features', 'Advanced analytics', 'Portfolio insights', 'Risk alerts', '50 watchlist items', 'Priority support']
    },
    {
      id: 'elite',
      name: 'Elite',
      price: 199,
      description: 'Institutional grade',
      features: ['All Pro features', 'Institutional analytics', 'API access', 'Dedicated AI guidance', 'Unlimited watchlist', 'Personal account manager']
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Portfolio Manager",
      image: "https://images.unsplash.com/photo-1712174766230-cb7304feaafe?w=100&h=100&fit=crop",
      quote: "Aureos AI has transformed how I analyze markets. The AI Copilot gives me insights I'd spend hours researching."
    },
    {
      name: "Michael Torres",
      role: "Day Trader",
      image: "https://images.unsplash.com/photo-1659353221237-6a1cfb73fd90?w=100&h=100&fit=crop",
      quote: "The real-time analysis and trade suggestions have improved my win rate significantly. Essential tool for any trader."
    }
  ];

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/contact`, contactForm);
      toast.success('Message sent successfully!');
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#D4AF37] flex items-center justify-center">
                <span className="text-black font-bold text-lg">A</span>
              </div>
              <span className="font-['Space_Grotesk'] font-bold text-xl tracking-tight">
                AUREOS<span className="text-[#D4AF37]">AI</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-[#888] hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-[#888] hover:text-white transition-colors">Pricing</a>
              <a href="#about" className="text-sm text-[#888] hover:text-white transition-colors">About</a>
              <a href="#contact" className="text-sm text-[#888] hover:text-white transition-colors">Contact</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none px-6"
                  data-testid="go-to-dashboard-btn"
                >
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/login')}
                    className="text-[#888] hover:text-white"
                    data-testid="login-btn"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => navigate('/register')}
                    className="bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none px-6"
                    data-testid="get-started-btn"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-nav-btn"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-[#0A0A0A] border-t border-white/5 p-6"
          >
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-[#888] hover:text-white" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="text-[#888] hover:text-white" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#about" className="text-[#888] hover:text-white" onClick={() => setMobileMenuOpen(false)}>About</a>
              <a href="#contact" className="text-[#888] hover:text-white" onClick={() => setMobileMenuOpen(false)}>Contact</a>
              <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                {user ? (
                  <Button onClick={() => navigate('/dashboard')} className="bg-[#D4AF37] text-black rounded-none">Dashboard</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate('/login')} className="rounded-none border-white/20">Sign In</Button>
                    <Button onClick={() => navigate('/register')} className="bg-[#D4AF37] text-black rounded-none">Get Started</Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#0A0A0A]" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-6">
              Australian Trading Intelligence
            </p>
            
            <h1 className="font-['Space_Grotesk'] text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6 leading-none">
              Clarity in<br />
              <span className="gold-text-gradient">every trade</span>
            </h1>
            
            <p className="text-lg md:text-xl text-[#888] max-w-2xl mx-auto mb-10">
              AI-powered insights for modern investors. Real-time market intelligence across ASX, NASDAQ, Forex, and Crypto.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={() => navigate('/register')}
                className="bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none px-8 py-6 text-sm uppercase tracking-widest font-bold"
                data-testid="hero-cta-btn"
              >
                Start Free Trial
                <ArrowRight className="ml-2" size={18} />
              </Button>
              <Button 
                variant="outline"
                className="border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] rounded-none px-8 py-6 text-sm uppercase tracking-widest"
                data-testid="demo-btn"
              >
                <Play className="mr-2" size={18} />
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {[
              { value: '50K+', label: 'Active Traders' },
              { value: '$2.1B', label: 'Analyzed Daily' },
              { value: '89%', label: 'Prediction Accuracy' },
              { value: '4.9', label: 'User Rating' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="font-['Space_Grotesk'] text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                <p className="text-xs uppercase tracking-wider text-[#888] mt-2">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-6 h-10 border border-white/20 rounded-full flex items-start justify-center pt-2"
          >
            <div className="w-1 h-2 bg-[#D4AF37] rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-4">Platform Features</p>
            <h2 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tight">
              Intelligence at your<br />fingertips
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-[#0F0F0F] border border-[#1A1A1A] p-8 group hover:border-[#D4AF37]/30 transition-colors"
                >
                  <div className="w-12 h-12 bg-[#D4AF37]/10 flex items-center justify-center mb-6">
                    <Icon className="text-[#D4AF37]" size={24} />
                  </div>
                  <h3 className="font-['Space_Grotesk'] text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-[#888] leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Copilot Section */}
      <section className="py-24 md:py-32 bg-[#0A0A0A] relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-4">AI Copilot</p>
              <h2 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Your intelligent trading companion
              </h2>
              <p className="text-[#888] text-lg mb-8 leading-relaxed">
                Powered by GPT-5.2, our AI Copilot analyzes market conditions in real-time, providing probability-based trade suggestions with clear reasoning for every recommendation.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Probability-based bullish/bearish signals',
                  'Optimal entry and exit point suggestions',
                  'Risk assessment for every trade',
                  'Natural language explanations'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-[#D4AF37]/20 flex items-center justify-center">
                      <Check className="text-[#D4AF37]" size={12} />
                    </div>
                    <span className="text-[#888]">{item}</span>
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => navigate('/register')}
                className="bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none px-8"
                data-testid="try-copilot-btn"
              >
                Try AI Copilot
                <ArrowUpRight className="ml-2" size={18} />
              </Button>
            </div>
            
            {/* AI Preview Card */}
            <div className="relative">
              <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1A1A1A]">
                  <Bot className="text-[#D4AF37]" size={24} />
                  <span className="font-semibold">AI Copilot</span>
                  <span className="ml-auto text-xs text-[#00E096]">Online</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-[#1A1A1A] p-4">
                    <p className="text-sm text-[#888]">User</p>
                    <p className="mt-1">Analyze AAPL for a potential long position</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 border-l-2 border-[#D4AF37]">
                    <p className="text-sm text-[#D4AF37]">Aureos AI</p>
                    <p className="mt-2 text-sm leading-relaxed">
                      <span className="text-[#00E096] font-semibold">BULLISH (78% confidence)</span><br/><br/>
                      Entry Zone: $176.50 - $178.00<br/>
                      Target: $185.00 (4.2% upside)<br/>
                      Stop Loss: $174.00 (2.5% risk)<br/><br/>
                      <span className="text-[#888]">Technical indicators show strong momentum with RSI at 58 and MACD crossing bullish. Recent earnings beat expectations by 12%.</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-4">Pricing Plans</p>
            <h2 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tight">
              Choose your edge
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-[#0F0F0F] border p-8 ${
                  plan.popular ? 'border-[#D4AF37]' : 'border-[#1A1A1A]'
                }`}
                data-testid={`plan-card-${plan.id}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-[#D4AF37] text-black text-xs font-bold px-3 py-1 uppercase tracking-wider">
                    Popular
                  </div>
                )}
                <h3 className="font-['Space_Grotesk'] text-xl font-semibold mb-2">{plan.name}</h3>
                <p className="text-sm text-[#888] mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="font-['Space_Grotesk'] text-4xl font-bold">${plan.price}</span>
                  <span className="text-[#888]">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <Check className="text-[#D4AF37] mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-[#888]">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => navigate(user ? '/pricing' : '/register')}
                  className={`w-full rounded-none ${
                    plan.popular 
                      ? 'bg-[#D4AF37] text-black hover:bg-[#C5A028]' 
                      : 'bg-transparent border border-[#333] hover:border-[#D4AF37] hover:text-[#D4AF37]'
                  }`}
                  data-testid={`select-plan-${plan.id}-btn`}
                >
                  Get Started
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-4">Testimonials</p>
            <h2 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tight">
              Trusted by traders
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0F0F0F] border border-[#1A1A1A] p-8"
              >
                <p className="text-[#888] leading-relaxed mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 object-cover"
                  />
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-[#888]">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-4">About Aureos</p>
              <h2 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Australian innovation in trading intelligence
              </h2>
              <p className="text-[#888] text-lg leading-relaxed mb-6">
                Founded in Sydney, Aureos AI was born from a vision to democratize institutional-grade trading intelligence. We combine cutting-edge AI technology with decades of market expertise to deliver insights that matter.
              </p>
              <p className="text-[#888] leading-relaxed">
                Our platform serves traders and investors across Australia and globally, processing billions in market data daily to provide real-time intelligence that gives our users an edge.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-square bg-[#0F0F0F] border border-[#1A1A1A] p-8">
                <img 
                  src="https://images.unsplash.com/photo-1763567823709-9df979a3b7b8?w=600&h=600&fit=crop"
                  alt="Modern office"
                  className="w-full h-full object-cover opacity-60"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 md:py-32 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-4">Contact Us</p>
              <h2 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Get in touch
              </h2>
              <p className="text-[#888]">Have questions? We'd love to hear from you.</p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-6" data-testid="contact-form">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">Name</label>
                  <Input 
                    value={contactForm.name}
                    onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                    required
                    className="bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none h-12"
                    data-testid="contact-name-input"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">Email</label>
                  <Input 
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                    required
                    className="bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none h-12"
                    data-testid="contact-email-input"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">Subject</label>
                <Input 
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                  required
                  className="bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none h-12"
                  data-testid="contact-subject-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[#888] mb-2 block">Message</label>
                <Textarea 
                  value={contactForm.message}
                  onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                  required
                  rows={5}
                  className="bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none resize-none"
                  data-testid="contact-message-input"
                />
              </div>
              <Button 
                type="submit"
                disabled={submitting}
                className="w-full bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none py-6 text-sm uppercase tracking-widest font-bold"
                data-testid="contact-submit-btn"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-[#D4AF37] flex items-center justify-center">
                <span className="text-black font-bold text-sm">A</span>
              </div>
              <span className="font-['Space_Grotesk'] font-bold">AUREOS AI</span>
            </div>
            <p className="text-sm text-[#888]">© 2024 Aureos AI. Australian Trading Intelligence.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-[#888] hover:text-white">Privacy</a>
              <a href="#" className="text-sm text-[#888] hover:text-white">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
