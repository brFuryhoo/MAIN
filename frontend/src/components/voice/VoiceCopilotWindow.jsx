import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  X, 
  Minimize2,
  Maximize2,
  Send,
  Bot,
  User,
  Sparkles,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import axios from 'axios';
import { API } from '@/App';

const VoiceCopilotWindow = ({ token, onAnalysisRequest }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: "Hello! I'm your Aureos AI Copilot. I can help you with:\n\n• Market analysis for any asset\n• Trade signals and probability\n• Technical and fundamental insights\n• Risk management guidance\n\nTry saying: \"Analyze Bitcoin\" or type your question below.",
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processVoiceInput(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceInput = async (audioBlob) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const res = await axios.post(`${API}/voice/copilot-voice`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });

      const { user_text, ai_response, audio_base64 } = res.data;

      addMessage('user', user_text, true);
      addMessage('assistant', ai_response, true, audio_base64);

      // Check for analysis triggers
      checkForAnalysisTrigger(user_text);

      if (autoNarrate && audio_base64) {
        playAudio(audio_base64);
      }
    } catch (error) {
      addMessage('assistant', 'Sorry, I had trouble processing that. Please try again.');
    }
    
    setIsLoading(false);
  };

  const sendTextMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const res = await axios.post(`${API}/copilot/chat`, {
        message: userMessage,
        context: {}
      }, { headers });

      addMessage('assistant', res.data.response);

      // Check for analysis triggers
      checkForAnalysisTrigger(userMessage);

      if (autoNarrate) {
        await narrateText(res.data.response);
      }
    } catch (error) {
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }

    setIsLoading(false);
  };

  const checkForAnalysisTrigger = (text) => {
    const lower = text.toLowerCase();
    const assetPatterns = /analyze|analysis|signal|trade|look at|check\s+(btc|eth|bitcoin|gold|xauusd|eurusd|aapl|tsla|spy)/i;
    
    if (assetPatterns.test(lower)) {
      const match = lower.match(/(btc|eth|bitcoin|ethereum|gold|xauusd|eurusd|aapl|tsla|spy|gbpusd|usdjpy)/i);
      if (match && onAnalysisRequest) {
        const assetMap = {
          'btc': 'BTCUSDT',
          'bitcoin': 'BTCUSDT',
          'eth': 'ETHUSDT',
          'ethereum': 'ETHUSDT',
          'gold': 'XAUUSD',
          'xauusd': 'XAUUSD',
        };
        const symbol = assetMap[match[0].toLowerCase()] || match[0].toUpperCase();
        onAnalysisRequest({ symbol, type: 'crypto' });
      }
    }
  };

  const addMessage = (type, content, isVoice = false, audioBase64 = null) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type,
      content,
      isVoice,
      audioBase64,
      timestamp: new Date().toISOString()
    }]);
  };

  const narrateText = async (text) => {
    try {
      const res = await axios.post(`${API}/voice/text-to-speech`, {
        text: text.substring(0, 500),
        voice: 'onyx',
        speed: 1.0
      }, { headers });

      if (res.data.audio_base64) {
        playAudio(res.data.audio_base64);
      }
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const playAudio = (base64Audio) => {
    if (audioRef.current) audioRef.current.pause();
    
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audioRef.current = audio;
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.play();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-16 h-16 rounded-full z-50 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #CFAE46, #A8893A)',
              boxShadow: '0 0 30px rgba(207, 174, 70, 0.4)'
            }}
            data-testid="open-copilot-btn"
          >
            <Bot size={28} className="text-black" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? 60 : 500,
              width: isMinimized ? 300 : 400
            }}
            exit={{ opacity: 0, scale: 0.8, y: 100 }}
            className="fixed bottom-6 right-6 z-50 aureos-card overflow-hidden flex flex-col"
            style={{ 
              boxShadow: '0 0 40px rgba(207, 174, 70, 0.2)',
              border: '1px solid rgba(207, 174, 70, 0.3)'
            }}
            data-testid="voice-copilot-window"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#CFAE46]/20">
                  <Bot className="text-aureos-gold" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Aureos Copilot</h3>
                  <p className="text-xs text-[#00E676] flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#00E676] rounded-full animate-pulse" />
                    Voice Enabled
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content (hidden when minimized) */}
            {!isMinimized && (
              <>
                {/* Settings Bar */}
                <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Volume2 size={14} className="text-[#888]" />
                    <span className="text-xs text-[#888]">Auto-narrate</span>
                    <Switch 
                      checked={autoNarrate}
                      onCheckedChange={setAutoNarrate}
                      className="scale-75"
                    />
                  </div>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-[#CFAE46]/20 text-aureos-gold' : 'hover:bg-white/10'}`}
                  >
                    <History size={14} />
                  </button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                          message.type === 'user' ? 'bg-white/10' : 'bg-[#CFAE46]/20'
                        }`}>
                          {message.type === 'user' ? (
                            <User size={14} className="text-[#888]" />
                          ) : (
                            <Bot size={14} className="text-aureos-gold" />
                          )}
                        </div>
                        <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                          <div className={`inline-block p-3 rounded-xl text-sm max-w-[90%] ${
                            message.type === 'user' 
                              ? 'bg-[#CFAE46]/20 text-aureos-gold' 
                              : 'bg-white/5'
                          }`}>
                            {message.isVoice && (
                              <span className="flex items-center gap-1 text-xs text-[#888] mb-1">
                                <Mic size={10} /> Voice
                              </span>
                            )}
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>
                          {message.audioBase64 && (
                            <button
                              onClick={() => playAudio(message.audioBase64)}
                              className="text-xs text-aureos-gold mt-1 hover:underline"
                            >
                              {isPlaying ? '⏸ Pause' : '▶ Play'}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#CFAE46]/20 flex items-center justify-center">
                          <Bot size={14} className="text-aureos-gold" />
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl">
                          <Sparkles className="text-aureos-gold animate-pulse" size={16} />
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-white/10 flex-shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isLoading}
                      className={`p-3 rounded-xl transition-all ${
                        isRecording 
                          ? 'bg-[#FF5252] animate-pulse' 
                          : 'bg-white/10 hover:bg-[#CFAE46]/20'
                      }`}
                      data-testid="voice-mic-btn"
                    >
                      {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                      placeholder="Ask anything..."
                      className="flex-1 aureos-input h-10 text-sm"
                      disabled={isLoading || isRecording}
                      data-testid="copilot-text-input"
                    />
                    <button
                      onClick={sendTextMessage}
                      disabled={isLoading || !input.trim()}
                      className="p-3 rounded-xl bg-[#CFAE46] text-black hover:bg-[#E5C85A] transition-colors disabled:opacity-50"
                      data-testid="copilot-send-btn"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceCopilotWindow;
