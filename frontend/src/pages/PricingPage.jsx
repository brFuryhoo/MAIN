import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { motion } from 'framer-motion';
import { Check, ArrowLeft, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const PricingPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API}/subscription/plans`);
      setPlans(res.data.plans);
    } catch (error) {
      console.error('Failed to fetch plans');
    }
  };

  const handleSubscribe = async (planId) => {
    if (!user) {
      navigate('/register');
      return;
    }

    if (user.subscription_plan === planId) {
      toast.info('You are already on this plan');
      return;
    }

    setLoading(planId);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const originUrl = window.location.origin;
      
      const res = await axios.post(`${API}/subscription/checkout`, {
        plan_id: planId,
        origin_url: originUrl
      }, { headers });

      // Redirect to Stripe checkout
      window.location.href = res.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate checkout');
      setLoading(null);
    }
  };

  const isCurrentPlan = (planId) => user?.subscription_plan === planId;

  return (
    <div className="min-h-screen bg-[#050505] py-12 px-6" data-testid="pricing-page">
      {/* Navigation */}
      <div className="max-w-7xl mx-auto mb-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate(user ? '/dashboard' : '/')}
          className="text-[#888] hover:text-white"
        >
          <ArrowLeft size={16} className="mr-2" />
          {user ? 'Back to Dashboard' : 'Back to Home'}
        </Button>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] mb-4">Pricing Plans</p>
          <h1 className="font-['Space_Grotesk'] text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Choose your<br />
            <span className="gold-text-gradient">trading edge</span>
          </h1>
          <p className="text-lg text-[#888] max-w-2xl mx-auto">
            Start free, upgrade anytime. All plans include core platform access.
          </p>
        </motion.div>
      </div>

      {/* Current Plan Badge */}
      {user && (
        <div className="max-w-7xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 bg-[#0F0F0F] border border-[#1A1A1A] px-4 py-2">
            <Crown className="text-[#D4AF37]" size={16} />
            <span className="text-sm">
              Current plan: <span className="text-[#D4AF37] font-semibold uppercase">{user.subscription_plan || 'Free'}</span>
            </span>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        {plans.map((plan, i) => {
          const isPopular = plan.name === 'Pro';
          const isCurrent = isCurrentPlan(plan.id);
          
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`bg-[#0F0F0F] border relative h-full ${
                isPopular ? 'border-[#D4AF37]' : isCurrent ? 'border-[#00E096]' : 'border-[#1A1A1A]'
              }`}>
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-[#D4AF37] text-black text-xs font-bold px-3 py-1 uppercase tracking-wider">
                    Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-0 left-0 bg-[#00E096] text-black text-xs font-bold px-3 py-1 uppercase tracking-wider">
                    Current
                  </div>
                )}
                <CardContent className="p-8 flex flex-col h-full">
                  <div className="flex-1">
                    <h3 className="font-['Space_Grotesk'] text-2xl font-semibold mb-2">{plan.name}</h3>
                    <div className="mb-6">
                      <span className="font-['Space_Grotesk'] text-5xl font-bold">${plan.price}</span>
                      <span className="text-[#888]">/month</span>
                    </div>
                    
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <div className="w-5 h-5 bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="text-[#D4AF37]" size={12} />
                          </div>
                          <span className="text-[#888]">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading === plan.id || isCurrent}
                    className={`w-full rounded-none py-6 ${
                      isPopular 
                        ? 'bg-[#D4AF37] text-black hover:bg-[#C5A028]' 
                        : isCurrent
                          ? 'bg-[#00E096]/20 text-[#00E096] cursor-not-allowed'
                          : 'bg-transparent border border-[#333] hover:border-[#D4AF37] hover:text-[#D4AF37]'
                    }`}
                    data-testid={`subscribe-${plan.id}-btn`}
                  >
                    {loading === plan.id ? 'Processing...' : isCurrent ? 'Current Plan' : 'Subscribe'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-24">
        <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {[
            {
              q: "Can I upgrade or downgrade anytime?",
              a: "Yes, you can change your plan at any time. Changes take effect at the start of your next billing cycle."
            },
            {
              q: "Is there a free trial?",
              a: "Yes! Start with our free tier to explore the platform. Upgrade when you're ready for advanced features."
            },
            {
              q: "What payment methods do you accept?",
              a: "We accept all major credit cards through our secure Stripe payment processing."
            },
            {
              q: "Can I cancel anytime?",
              a: "Absolutely. Cancel anytime from your account settings with no cancellation fees."
            }
          ].map((faq, i) => (
            <div key={i} className="bg-[#0F0F0F] border border-[#1A1A1A] p-6">
              <h3 className="font-semibold mb-2">{faq.q}</h3>
              <p className="text-[#888] text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-[#1A1A1A] text-center">
        <p className="text-sm text-[#888]">
          Need a custom enterprise solution?{' '}
          <a href="/#contact" className="text-[#D4AF37] hover:underline">Contact our team</a>
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
