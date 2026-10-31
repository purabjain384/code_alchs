'use client';

import React, { useState, useEffect, useRef } from 'react';
import { synthesizeHindiTts } from '@/lib/api';

interface AudioAdvisoryPlayerProps {
  motherName?: string;
  hindiAdvisory?: string;
  englishTranslation?: string;
  doctorName?: string;
  recordedAt?: string;
  audioBase64?: string;
}

const MOCK_FRAME_PREFIX = '//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZw';

export const AudioAdvisoryPlayer: React.FC<AudioAdvisoryPlayerProps> = ({
  motherName = 'बहनजी',
  hindiAdvisory = 'नमस्ते, कृपया रोज़ दोपहर के भोजन के बाद आयरन की लाल गोली और रात को कैल्शियम की गोली लें।',
  englishTranslation = 'Please take your Iron tablet after lunch and Calcium tablet after dinner daily.',
  doctorName = 'Gemini 3.8 Flash • MoHFW Clinical AI',
  recordedAt = 'Live Audio Advisory',
  audioBase64,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakWithBrowserFallback = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.onboundary = (ev) => {
      const pct = Math.min(95, Math.round((ev.charIndex / Math.max(1, text.length)) * 100));
      setProgress(pct);
    };
    utterance.onend = () => {
      setProgress(100);
      setIsPlaying(false);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
    };
    window.speechSynthesis.speak(utterance);
  };

  const togglePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setProgress(5);

    let b64 = audioBase64;
    if (!b64) {
      try {
        const res = await synthesizeHindiTts(hindiAdvisory);
        b64 = res.audio_base64;
      } catch {
        // fallback to browser speech synthesis
      }
    }

    // If b64 is real MP3 audio (not the tiny silent mock frame), play via HTML5 Audio
    if (b64 && !b64.startsWith(MOCK_FRAME_PREFIX)) {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${b64}`);
        audioRef.current = audio;
        audio.ontimeupdate = () => {
          if (audio.duration) {
            setProgress(Math.round((audio.currentTime / audio.duration) * 100));
          }
        };
        audio.onended = () => {
          setProgress(100);
          setIsPlaying(false);
        };
        audio.onerror = () => {
          speakWithBrowserFallback(hindiAdvisory);
        };
        await audio.play();
        return;
      } catch {
        speakWithBrowserFallback(hindiAdvisory);
        return;
      }
    }

    // Otherwise use native Hindi Web Speech synthesis so live audio works even when USE_MOCK_AI=true
    speakWithBrowserFallback(hindiAdvisory);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-primary-container via-primary to-primary-container text-on-primary p-5 md:p-6 shadow-lg relative overflow-hidden">
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">campaign</span>
              <span>हिंदी स्वास्थ्य सलाह (Voice Advisory)</span>
            </span>
            <span className="text-xs text-primary-fixed/80 font-medium">
              • {recordedAt} ({motherName})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowEnglish(!showEnglish)}
            className="text-xs text-secondary-fixed hover:underline font-semibold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">translate</span>
            <span>{showEnglish ? 'हिंदी में देखें' : 'Read in English'}</span>
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-xs rounded-xl p-4 border border-white/15">
          {!showEnglish ? (
            <p className="text-base md:text-lg font-bold leading-relaxed text-white">
              &ldquo;{hindiAdvisory}&rdquo;
            </p>
          ) : (
            <p className="text-sm md:text-base font-medium leading-relaxed text-primary-fixed">
              &ldquo;{englishTranslation}&rdquo;
            </p>
          )}
          <p className="text-xs text-secondary-fixed mt-2 font-semibold">
            — {doctorName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed font-extrabold text-sm shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isPlaying ? 'pause_circle' : 'play_circle'}
            </span>
            <span>{isPlaying ? 'रोकें (Pause)' : 'सुनें (Listen Audio)'}</span>
          </button>

          <div className="flex-1 flex flex-col gap-1.5">
            <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary-fixed rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-primary-fixed/80 font-semibold">
              <span>{isPlaying ? 'Playing Hindi Voice Advisory...' : 'Ready to play'}</span>
              <span>{progress}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
