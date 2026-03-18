import React, { useState, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { API } from '@/App';
import axios from 'axios';

/**
 * JarvisNarrate — Universal narration button for any page/report/summary.
 * Pass `text` to narrate, or pass `contentRef` to extract from DOM.
 */
export const JarvisNarrate = ({ text, contentRef, className = '' }) => {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const narrate = useCallback(async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }

    let content = text;
    if (!content && contentRef?.current) {
      content = contentRef.current.innerText || contentRef.current.textContent || '';
    }
    if (!content) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/voice/narrate`,
        { text: content.slice(0, 4000), language: lang },
        { responseType: 'blob', timeout: 60000 }
      );
      const url = URL.createObjectURL(new Blob([res.data], { type: 'audio/mpeg' }));
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.play();
      setPlaying(true);
    } catch {
      // silent
    }
    setLoading(false);
  }, [text, contentRef, lang, playing]);

  return (
    <Button
      onClick={narrate}
      disabled={loading}
      className={`gap-1.5 text-xs ${playing ? 'bg-aureos-gold/20 text-aureos-gold border-aureos-gold/30' : 'bg-white/5 text-[#888] hover:text-aureos-gold hover:bg-aureos-gold/10'} ${className}`}
      size="sm"
      data-testid="jarvis-narrate-btn"
    >
      {loading ? (
        <><Loader2 size={13} className="animate-spin" /> {t('common.narrating')}</>
      ) : playing ? (
        <><VolumeX size={13} /> Stop</>
      ) : (
        <><Volume2 size={13} /> {t('common.narrate')}</>
      )}
    </Button>
  );
};

export default JarvisNarrate;
