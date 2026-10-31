'use client';

import React, { useEffect, useRef, useState } from 'react';
import { synthesizeSpeechApi } from '@/lib/api';

interface HindiAudioPlayerProps {
  text: string;
  initialAudioBase64?: string;
  title?: string;
}

export function HindiAudioPlayer({
  text,
  initialAudioBase64,
  title = 'आपकी स्वास्थ्य सलाह (Hindi Audio)',
}: HindiAudioPlayerProps) {
  const [audioBase64, setAudioBase64] = useState<string | null>(
    initialAudioBase64 && initialAudioBase64.length > 500 ? initialAudioBase64 : null
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(
    !initialAudioBase64 || initialAudioBase64.length <= 500
  );
  const [speechMode, setSpeechMode] = useState<'mp3' | 'speech-api' | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (initialAudioBase64 && initialAudioBase64.length > 500) {
      setAudioBase64(initialAudioBase64);
      setIsLoading(false);
    }
  }, [initialAudioBase64]);

  // Clean up audio on unmount
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

  // Asynchronously generate audio in the background after results page renders
  useEffect(() => {
    let isMounted = true;
    if ((!audioBase64 || audioBase64.length <= 500) && text && text.trim()) {
      setIsLoading(true);
      synthesizeSpeechApi(text)
        .then((res) => {
          if (isMounted && res && res.audio_base64 && res.audio_base64.length > 500) {
            setAudioBase64(res.audio_base64);
          }
        })
        .catch((err) => {
          console.warn('Background speech synthesis failed:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [text]);

  const stopAllPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setSpeechMode(null);
  };

  const playViaWebSpeech = (phrase: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const hiVoice = voices.find(
      (v) => v.lang === 'hi-IN' || v.lang.toLowerCase().includes('hindi') || v.lang.startsWith('hi')
    );
    if (hiVoice) {
      utterance.voice = hiVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setSpeechMode(null);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setSpeechMode(null);
    };

    setSpeechMode('speech-api');
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      stopAllPlayback();
      return;
    }

    if (!text || !text.trim()) return;

    if (audioBase64 && audioBase64.length > 500) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(`data:audio/mp3;base64,${audioBase64}`);
          audioRef.current.onended = () => {
            setIsPlaying(false);
            setSpeechMode(null);
          };
          audioRef.current.onerror = () => {
            playViaWebSpeech(text);
          };
        } else {
          audioRef.current.src = `data:audio/mp3;base64,${audioBase64}`;
        }

        setSpeechMode('mp3');
        setIsPlaying(true);
        await audioRef.current.play();
        return;
      } catch (err) {
        console.warn('HTML5 Audio playback error, using Web Speech fallback:', err);
      }
    }

    // Fallback: Immediate browser speech synthesis
    playViaWebSpeech(text);
  };

  // State A: Audio is still generating in the background
  if (isLoading && (!audioBase64 || audioBase64.length <= 500)) {
    return (
      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 transition">
        <div className="flex items-center space-x-2.5 text-xs text-slate-600">
          <svg
            className="animate-spin h-4 w-4 text-teal-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <span className="font-medium">
            🎧 हिंदी ऑडियो तैयार हो रहा है... (Audio loading in background)
          </span>
        </div>
        <button
          type="button"
          onClick={() => (isPlaying ? stopAllPlayback() : playViaWebSpeech(text))}
          className="px-3 py-1.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs font-bold transition cursor-pointer"
        >
          {isPlaying ? '⏹ रोकें (Stop)' : '🔊 तुरंत सुनें (Speak Now)'}
        </button>
      </div>
    );
  }

  // State B: Audio is ready
  return (
    <div className="mt-3 p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 transition">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="flex h-3 w-3 relative">
            {isPlaying && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isPlaying ? 'bg-teal-600' : 'bg-slate-300'
              }`}
            ></span>
          </span>
          <span className="text-xs font-semibold text-slate-800">{title}</span>
          {speechMode === 'mp3' && isPlaying && (
            <span className="text-[10px] font-medium text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
              HD Voice
            </span>
          )}
          {speechMode === 'speech-api' && isPlaying && (
            <span className="text-[10px] font-medium text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
              Web Voice
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleTogglePlay}
          className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm ${
            isPlaying
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-teal-700 hover:bg-teal-800 text-white'
          }`}
        >
          {isPlaying ? (
            <>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span>रोकें (Stop Audio)</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
              <span>🔊 आवाज में सुनें (Listen in Hindi)</span>
            </>
          )}
        </button>
      </div>

      {audioBase64 && audioBase64.length > 500 && (
        <audio
          controls
          src={`data:audio/mp3;base64,${audioBase64}`}
          className="w-full h-8 mt-2.5 rounded"
          onPlay={() => {
            setIsPlaying(true);
            setSpeechMode('mp3');
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setSpeechMode(null);
          }}
        />
      )}
    </div>
  );
}
