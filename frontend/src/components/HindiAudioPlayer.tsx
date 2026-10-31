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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [speechMode, setSpeechMode] = useState<'mp3' | 'speech-api' | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (initialAudioBase64 && initialAudioBase64.length > 500) {
      setAudioBase64(initialAudioBase64);
    }
  }, [initialAudioBase64]);

  // Clean up on unmount
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

    // Pick best Hindi voice if installed on system
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

    // 1. If we already have a valid high-fidelity MP3 base64
    let currentB64 = audioBase64;
    if (currentB64 && currentB64.length > 500) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(`data:audio/mp3;base64,${currentB64}`);
          audioRef.current.onended = () => {
            setIsPlaying(false);
            setSpeechMode(null);
          };
          audioRef.current.onerror = () => {
            // Audio tag error -> fallback to Web Speech
            playViaWebSpeech(text);
          };
        } else {
          audioRef.current.src = `data:audio/mp3;base64,${currentB64}`;
        }

        setSpeechMode('mp3');
        setIsPlaying(true);
        await audioRef.current.play();
        return;
      } catch (err) {
        console.warn('HTML5 Audio playback error, falling back:', err);
      }
    }

    // 2. If no valid MP3 base64 yet, try on-demand synthesis from backend
    setIsLoading(true);
    try {
      const res = await synthesizeSpeechApi(text);
      if (res && res.audio_base64 && res.audio_base64.length > 500) {
        setAudioBase64(res.audio_base64);
        setIsLoading(false);

        const newAudio = new Audio(`data:audio/mp3;base64,${res.audio_base64}`);
        audioRef.current = newAudio;
        newAudio.onended = () => {
          setIsPlaying(false);
          setSpeechMode(null);
        };
        newAudio.onerror = () => {
          playViaWebSpeech(text);
        };

        setSpeechMode('mp3');
        setIsPlaying(true);
        await newAudio.play();
        return;
      }
    } catch (err) {
      console.warn('Backend TTS request failed, using Web Speech API fallback:', err);
    } finally {
      setIsLoading(false);
    }

    // 3. Fallback: Native Browser SpeechSynthesis in Hindi
    playViaWebSpeech(text);
  };

  return (
    <div className="mt-3 p-3.5 rounded-xl bg-teal-50/70 border border-teal-200">
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
          disabled={isLoading}
          className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm ${
            isPlaying
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-teal-700 hover:bg-teal-800 text-white'
          }`}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white"
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
              <span>तैयार हो रहा है...</span>
            </>
          ) : isPlaying ? (
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

      {/* Standard HTML5 audio scrub player if MP3 is available */}
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
