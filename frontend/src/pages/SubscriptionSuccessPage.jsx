import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const SubscriptionSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, failed
  const [planId, setPlanId] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    } else {
      setStatus('failed');
    }
  }, [searchParams]);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('failed');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API}/subscription/status/${sessionId}`, { headers });

      if (res.data.payment_status === 'paid') {
        setStatus('success');
        setPlanId(res.data.plan_id);
        await refreshUser();
        return;
      } else if (res.data.status === 'expired') {
        setStatus('failed');
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6" data-testid="subscription-success-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-[#D4AF37]/10 flex items-center justify-center">
              <Loader2 className="text-[#D4AF37] animate-spin" size={40} />
            </div>
            <h1 className="font-['Space_Grotesk'] text-2xl font-bold mb-4">
              Processing Payment
            </h1>
            <p className="text-[#888]">
              Please wait while we confirm your subscription...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-[#00E096]/10 flex items-center justify-center">
              <CheckCircle className="text-[#00E096]" size={40} />
            </div>
            <h1 className="font-['Space_Grotesk'] text-2xl font-bold mb-4">
              Welcome to {planId?.charAt(0).toUpperCase() + planId?.slice(1)}!
            </h1>
            <p className="text-[#888] mb-8">
              Your subscription is now active. You have access to all {planId} features.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none py-6"
                data-testid="go-to-dashboard-btn"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => navigate('/copilot')}
                variant="outline"
                className="w-full border-[#333] hover:border-[#D4AF37] rounded-none py-6"
                data-testid="try-copilot-btn"
              >
                Try AI Copilot
              </Button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-[#FF3B30]/10 flex items-center justify-center">
              <XCircle className="text-[#FF3B30]" size={40} />
            </div>
            <h1 className="font-['Space_Grotesk'] text-2xl font-bold mb-4">
              Payment Failed
            </h1>
            <p className="text-[#888] mb-8">
              We couldn't process your payment. Please try again or contact support.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/pricing')}
                className="w-full bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none py-6"
                data-testid="try-again-btn"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full border-[#333] hover:border-[#D4AF37] rounded-none py-6"
              >
                Go to Dashboard
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default SubscriptionSuccessPage;
