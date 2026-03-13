import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowLeft, 
  LayoutDashboard, 
  Bot, 
  BarChart3, 
  Wallet,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';

const tutorialSteps = [
  {
    id: 1,
    title: "Welcome to Aureos AI",
    subtitle: "Your AI-powered trading intelligence platform",
    description: "Aureos AI combines advanced AI analytics with real-time market data to give you an edge in trading. Our platform covers ASX, NASDAQ, Forex, and Crypto markets.",
    icon: LayoutDashboard,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop"
  },
  {
    id: 2,
    title: "Market Dashboard",
    subtitle: "Your command center for market intelligence",
    description: "The dashboard shows real-time prices, charts, and market trends. Use the heatmap to quickly identify opportunities across sectors. Add assets to your watchlist to track them.",
    icon: BarChart3,
    image: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&h=400&fit=crop"
  },
  {
    id: 3,
    title: "AI Copilot",
    subtitle: "Your intelligent trading companion",
    description: "Ask the AI Copilot about any asset, market condition, or trading strategy. It provides probability-based suggestions with entry/exit points and risk analysis.",
    icon: Bot,
    image: "https://images.unsplash.com/photo-1684610529682-553625a1ffed?w=600&h=400&fit=crop"
  },
  {
    id: 4,
    title: "Portfolio & Watchlist",
    subtitle: "Track your investments and interests",
    description: "Add positions to track your portfolio performance. Use the watchlist to monitor assets you're interested in. Get risk scores and performance analytics.",
    icon: Wallet,
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&h=400&fit=crop"
  },
  {
    id: 5,
    title: "You're Ready!",
    subtitle: "Start trading smarter",
    description: "Remember: Aureos AI is for educational purposes. Always do your own research and consider your risk tolerance before trading. Let's begin your journey!",
    icon: CheckCircle,
    image: "https://images.unsplash.com/photo-1682923875240-3ef0a52a9e7e?w=600&h=400&fit=crop"
  }
];

const TutorialPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (user && token) {
      fetchProgress();
    }
  }, [user, token]);

  const fetchProgress = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API}/tutorial/progress`, { headers });
      if (res.data.completed) {
        // If already completed, start from beginning for review
        setCurrentStep(0);
      } else {
        setCurrentStep(res.data.step || 0);
      }
    } catch (error) {
      console.error('Failed to fetch progress');
    }
  };

  const updateProgress = async (step, completed = false) => {
    if (!user || !token) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/tutorial/progress`, {
        step,
        completed
      }, { headers });
    } catch (error) {
      console.error('Failed to update progress');
    }
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setDirection(1);
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateProgress(nextStep);
    } else {
      // Complete tutorial
      updateProgress(tutorialSteps.length - 1, true);
      navigate('/dashboard');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    updateProgress(tutorialSteps.length - 1, true);
    navigate('/dashboard');
  };

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const step = tutorialSteps[currentStep];
  const Icon = step.icon;

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col" data-testid="tutorial-page">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#D4AF37] flex items-center justify-center">
            <span className="text-black font-bold">A</span>
          </div>
          <span className="font-['Space_Grotesk'] font-bold text-lg">AUREOS AI</span>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleSkip}
          className="text-[#888] hover:text-white"
          data-testid="skip-tutorial-btn"
        >
          Skip Tutorial
        </Button>
      </header>

      {/* Progress */}
      <div className="px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between text-sm text-[#888] mb-2">
            <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-1 bg-[#1A1A1A]" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              {/* Text Content */}
              <div>
                <div className="w-12 h-12 bg-[#D4AF37]/10 flex items-center justify-center mb-6">
                  <Icon className="text-[#D4AF37]" size={24} />
                </div>
                
                <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-3">
                  {step.subtitle}
                </p>
                
                <h1 className="font-['Space_Grotesk'] text-3xl md:text-4xl font-bold mb-6">
                  {step.title}
                </h1>
                
                <p className="text-[#888] text-lg leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Image */}
              <div className="relative">
                <div className="aspect-video bg-[#0F0F0F] border border-[#1A1A1A] overflow-hidden">
                  <img 
                    src={step.image} 
                    alt={step.title}
                    className="w-full h-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <footer className="p-6 border-t border-[#1A1A1A]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="border-[#333] hover:border-[#D4AF37] rounded-none"
            data-testid="tutorial-prev-btn"
          >
            <ArrowLeft size={16} className="mr-2" />
            Previous
          </Button>

          {/* Step indicators */}
          <div className="hidden sm:flex items-center gap-2">
            {tutorialSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > currentStep ? 1 : -1);
                  setCurrentStep(i);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-[#D4AF37]' : 'bg-[#333] hover:bg-[#888]'
                }`}
                data-testid={`tutorial-dot-${i}`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none"
            data-testid="tutorial-next-btn"
          >
            {currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default TutorialPage;
