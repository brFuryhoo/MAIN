import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API } from '@/App';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Target,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const CopilotPage = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [autoNarrate, setAutoNarrate] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const quickPrompts = [
    { text: "Analyze AAPL for a potential trade", icon: TrendingUp },
    { text: "What's the outlook for Bitcoin?", icon: Zap },
    { text: "Best risk management strategy?", icon: AlertTriangle },
    { text: "Compare NVDA vs GOOGL", icon: Target },
  ];

  useEffect(() => {
    fetchHistory();
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      content: "Hello! I'm your AI Copilot. I can help you with:\n\n• **Trade Analysis** - Get probability-based trade suggestions\n• **Market Insights** - Understand market conditions\n• **Risk Assessment** - Evaluate entry/exit points\n• **Strategy Guidance** - Learn optimal trading approaches\n\n🎤 **Voice Enabled**: Click the microphone to speak, or toggle auto-narrate for voice responses.\n\nAsk me anything about the markets!",
      timestamp: new Date().toISOString()
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/copilot/history?limit=10`, { headers });
      setHistory(res.data.conversations);
    } catch (error) {
      console.error('Failed to fetch history');
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processVoiceInput(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.info('Recording... Click again to stop');
    } catch (error) {
      toast.error('Microphone access denied');
      console.error('Microphone error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const processVoiceInput = async (audioBlob) => {
    setVoiceLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const res = await axios.post(`${API}/voice/copilot-voice`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      const { user_text, ai_response, audio_base64 } = res.data;

      // Add user message
      const userMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: user_text,
        isVoice: true,
        timestamp: new Date().toISOString()
      };

      // Add AI response
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: ai_response,
        audioBase64: audio_base64,
        isVoice: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);

      // Auto-play response
      if (audio_base64) {
        playAudio(audio_base64);
      }

      fetchHistory();
    } catch (error) {
      toast.error('Voice processing failed. Please try again.');
      console.error('Voice error:', error);
    }
    
    setVoiceLoading(false);
  };

  const playAudio = (base64Audio) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audioRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        toast.error('Audio playback failed');
      };
      
      audio.play();
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const narrateMessage = async (text) => {
    setVoiceLoading(true);
    try {
      const res = await axios.post(`${API}/voice/text-to-speech`, {
        text: text.substring(0, 1000),
        voice: 'onyx',
        speed: 1.0
      }, { headers });

      if (res.data.audio_base64) {
        playAudio(res.data.audio_base64);
      }
    } catch (error) {
      toast.error('Text-to-speech failed');
    }
    setVoiceLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API}/copilot/chat`, {
        message: input,
        context: {}
      }, { headers });

      const assistantMessage = {
        id: res.data.id,
        type: 'assistant',
        content: res.data.response,
        trade_suggestion: res.data.trade_suggestion,
        confidence_score: res.data.confidence_score,
        timestamp: res.data.timestamp
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-narrate if enabled
      if (autoNarrate && res.data.response) {
        await narrateMessage(res.data.response);
      }

      fetchHistory();
    } catch (error) {
      toast.error('Failed to get response. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    }
    
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const formatMessage = (content) => {
    return content
      .split('\n')
      .map((line, i) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return `<li key=${i}>${line.substring(2)}</li>`;
        }
        return `<p key=${i}>${line}</p>`;
      })
      .join('');
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-6" data-testid="copilot-page">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-[#0F0F0F] border border-[#1A1A1A]">
          {/* Header */}
          <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/10 flex items-center justify-center">
                <Bot className="text-[#D4AF37]" size={20} />
              </div>
              <div>
                <h2 className="font-['Space_Grotesk'] font-semibold">AI Copilot</h2>
                <p className="text-xs text-[#00E096] flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#00E096] rounded-full animate-pulse" />
                  Powered by GPT-5.2 • Voice Enabled
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-narrate toggle */}
              <div className="flex items-center gap-2 px-3 py-1 bg-[#0A0A0A] border border-[#1A1A1A]">
                <Volume2 size={14} className="text-[#888]" />
                <span className="text-xs text-[#888]">Auto-narrate</span>
                <Switch 
                  checked={autoNarrate}
                  onCheckedChange={setAutoNarrate}
                  className="scale-75"
                  data-testid="auto-narrate-toggle"
                />
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setMessages([messages[0]])}
                className="text-[#888] hover:text-white"
                data-testid="clear-chat-btn"
              >
                <RefreshCw size={18} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6 max-w-3xl mx-auto">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-4 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-[#1A1A1A]' 
                        : 'bg-[#D4AF37]/10'
                    }`}>
                      {message.type === 'user' 
                        ? <User size={16} className="text-[#888]" />
                        : <Bot size={16} className="text-[#D4AF37]" />
                      }
                    </div>
                    
                    <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block text-left p-4 ${
                        message.type === 'user' 
                          ? 'bg-[#1A1A1A] max-w-[80%]' 
                          : 'bg-[#0A0A0A] border border-[#1A1A1A] max-w-full'
                      }`}>
                        {message.isVoice && (
                          <div className="flex items-center gap-1 mb-2 text-xs text-[#D4AF37]">
                            <Mic size={12} />
                            <span>Voice message</span>
                          </div>
                        )}
                        <div 
                          className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                        />
                        
                        {/* Trade Suggestion Card */}
                        {message.trade_suggestion && (
                          <div className={`mt-4 p-4 border ${
                            message.trade_suggestion.direction === 'bullish' 
                              ? 'border-[#00E096] bg-[#00E096]/5' 
                              : 'border-[#FF3B30] bg-[#FF3B30]/5'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              {message.trade_suggestion.direction === 'bullish' 
                                ? <TrendingUp className="text-[#00E096]" size={18} />
                                : <TrendingDown className="text-[#FF3B30]" size={18} />
                              }
                              <span className={`font-semibold uppercase ${
                                message.trade_suggestion.direction === 'bullish' ? 'text-[#00E096]' : 'text-[#FF3B30]'
                              }`}>
                                {message.trade_suggestion.direction}
                              </span>
                              <span className="ml-auto text-sm text-[#888]">
                                {(message.trade_suggestion.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                            <div className="h-2 bg-[#1A1A1A] overflow-hidden">
                              <div 
                                className={`h-full ${
                                  message.trade_suggestion.direction === 'bullish' ? 'bg-[#00E096]' : 'bg-[#FF3B30]'
                                }`}
                                style={{ width: `${message.trade_suggestion.confidence * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Narrate button for assistant messages */}
                        {message.type === 'assistant' && message.id !== 'welcome' && (
                          <div className="mt-3 pt-3 border-t border-[#1A1A1A] flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => message.audioBase64 ? playAudio(message.audioBase64) : narrateMessage(message.content)}
                              disabled={voiceLoading}
                              className="text-xs text-[#888] hover:text-[#D4AF37]"
                              data-testid={`narrate-btn-${message.id}`}
                            >
                              {isPlaying ? <VolumeX size={14} className="mr-1" /> : <Volume2 size={14} className="mr-1" />}
                              {isPlaying ? 'Stop' : 'Narrate'}
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#888] mt-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(loading || voiceLoading) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4"
                >
                  <div className="w-8 h-8 bg-[#D4AF37]/10 flex items-center justify-center">
                    <Bot size={16} className="text-[#D4AF37]" />
                  </div>
                  <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-[#D4AF37] animate-pulse" size={16} />
                      <span className="text-sm text-[#888]">
                        {voiceLoading ? 'Processing voice...' : 'Analyzing market data...'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <div className="p-4 border-t border-[#1A1A1A]">
              <p className="text-xs text-[#888] uppercase tracking-wider mb-3">Quick Prompts</p>
              <div className="grid grid-cols-2 gap-2">
                {quickPrompts.map((prompt, i) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(prompt.text)}
                      className="flex items-center gap-2 p-3 bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#D4AF37]/50 text-left text-sm transition-colors"
                      data-testid={`quick-prompt-${i}`}
                    >
                      <Icon size={14} className="text-[#D4AF37] flex-shrink-0" />
                      <span className="text-[#888] truncate">{prompt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-[#1A1A1A]">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-3"
            >
              {/* Voice Record Button */}
              <Button
                type="button"
                onClick={toggleRecording}
                disabled={loading || voiceLoading}
                className={`rounded-none h-12 px-4 ${
                  isRecording 
                    ? 'bg-[#FF3B30] hover:bg-[#FF3B30]/80 animate-pulse' 
                    : 'bg-[#1A1A1A] hover:bg-[#262626] border border-[#333]'
                }`}
                data-testid="voice-record-btn"
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>

              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any market, stock, or trading strategy..."
                className="flex-1 bg-[#0A0A0A] border-[#333] focus:border-[#D4AF37] rounded-none h-12"
                disabled={loading || isRecording}
                data-testid="copilot-input"
              />
              <Button 
                type="submit"
                disabled={loading || !input.trim() || isRecording}
                className="bg-[#D4AF37] text-black hover:bg-[#C5A028] rounded-none px-6 h-12"
                data-testid="copilot-send-btn"
              >
                <Send size={18} />
              </Button>
            </form>
            <p className="text-xs text-[#888] mt-2 text-center">
              🎤 Voice enabled • AI suggestions are for educational purposes
            </p>
          </div>
        </div>

        {/* Sidebar - History */}
        <div className="hidden xl:block w-72">
          <Card className="bg-[#0F0F0F] border-[#1A1A1A] h-full">
            <CardHeader className="border-b border-[#1A1A1A]">
              <CardTitle className="font-['Space_Grotesk'] text-lg">Recent Chats</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-16rem)]">
                {history.length > 0 ? (
                  <div className="divide-y divide-[#1A1A1A]">
                    {history.map((item, i) => (
                      <div 
                        key={i}
                        className="p-4 hover:bg-[#1A1A1A]/50 cursor-pointer"
                        onClick={() => {
                          setInput(item.message);
                          inputRef.current?.focus();
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {item.voice_interaction && <Mic size={12} className="text-[#D4AF37]" />}
                          <p className="text-sm truncate flex-1">{item.message}</p>
                        </div>
                        <p className="text-xs text-[#888] mt-1">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                        {item.trade_suggestion && (
                          <span className={`text-xs ${
                            item.trade_suggestion.direction === 'bullish' ? 'text-[#00E096]' : 'text-[#FF3B30]'
                          }`}>
                            {item.trade_suggestion.direction}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-sm text-[#888]">No chat history yet</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CopilotPage;
