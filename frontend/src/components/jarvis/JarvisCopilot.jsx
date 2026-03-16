import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Brain, Sparkles, Minimize2 } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '@/App';

const JarvisCopilot = ({ analysisContext = null }) => {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "I'm JARVIS, Aureos' Central Intelligence Core. I can explain analysis results, answer trading questions, and provide market intelligence.\n\nAsk me anything about markets, technical analysis, or your current analysis." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const payload = {
        message: userMsg,
        session_id: sessionId,
      };

      if (analysisContext?.report) {
        payload.analysis_context = {
          report: analysisContext.report,
          regime: analysisContext.report?.regime,
          manipulation: analysisContext.report?.manipulation,
        };
      }

      const resp = await axios.post(`${API}/jarvis/chat`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setMessages(prev => [...prev, { role: 'assistant', content: resp.data.response }]);
      if (resp.data.session_id) setSessionId(resp.data.session_id);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, my intelligence core encountered an error. Please try again.',
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: 'Explain my analysis', prompt: 'Explain my current analysis results in simple terms.' },
    { label: 'What is RSI?', prompt: 'What is RSI and how should I interpret it?' },
    { label: 'Position sizing', prompt: 'How should I determine position size for this trade?' },
  ];

  return (
    <>
      {/* Floating trigger */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-24 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #CFAE46, #B8941E)', boxShadow: '0 0 25px rgba(207,174,70,0.4)' }}
            data-testid="jarvis-trigger-btn"
          >
            <Brain className="text-black" size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed z-50 ${isMinimized ? 'bottom-6 right-24 w-72' : 'bottom-6 right-6 w-[420px]'}`}
            data-testid="jarvis-copilot-window"
          >
            <div className="aureos-card overflow-hidden flex flex-col" style={{ maxHeight: isMinimized ? '60px' : '600px', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#CFAE46]/10 to-transparent cursor-pointer"
                onClick={() => isMinimized && setIsMinimized(false)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#CFAE46]/20 flex items-center justify-center">
                    <Brain className="text-aureos-gold" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">JARVIS</p>
                    <p className="text-[10px] text-[#888]">Central Intelligence Core</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {analysisContext && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676]">
                      <Sparkles size={10} className="inline mr-1" />Context Active
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1 hover:bg-white/10 rounded">
                    <Minimize2 size={14} className="text-[#888]" />
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded" data-testid="jarvis-close-btn">
                    <X size={14} className="text-[#888]" />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '420px' }}>
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#CFAE46]/20 text-white ml-8'
                            : msg.error
                              ? 'bg-[#FF5252]/10 text-[#FF5252] mr-8'
                              : 'bg-white/5 text-[#ccc] mr-8'
                        }`}>
                          {msg.role === 'assistant' && (
                            <div className="flex items-center gap-2 mb-2">
                              <Brain size={12} className="text-aureos-gold" />
                              <span className="text-[10px] text-aureos-gold font-bold uppercase">JARVIS</span>
                            </div>
                          )}
                          <div className="whitespace-pre-wrap text-xs">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white/5 rounded-xl px-4 py-3 mr-8">
                          <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin text-aureos-gold" size={14} />
                            <span className="text-xs text-[#888]">JARVIS is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Actions */}
                  {messages.length <= 2 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-2">
                      {quickActions.map((action, i) => (
                        <button key={i} onClick={() => { setInput(action.prompt); }}
                          className="text-[10px] px-3 py-1.5 rounded-full bg-white/5 hover:bg-[#CFAE46]/20 text-[#888] hover:text-aureos-gold transition-all">
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="p-3 border-t border-white/10">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask JARVIS anything..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#CFAE46]/50 placeholder:text-[#666]"
                        disabled={isLoading}
                        data-testid="jarvis-chat-input"
                      />
                      <button onClick={sendMessage} disabled={isLoading || !input.trim()}
                        className="w-10 h-10 rounded-xl bg-[#CFAE46]/20 hover:bg-[#CFAE46]/30 flex items-center justify-center transition-all disabled:opacity-30"
                        data-testid="jarvis-send-btn">
                        <Send size={16} className="text-aureos-gold" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default JarvisCopilot;
