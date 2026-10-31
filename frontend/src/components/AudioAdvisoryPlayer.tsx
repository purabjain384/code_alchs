'use client';

import React, { useState, useEffect } from 'react';

interface AudioAdvisoryPlayerProps {
  senderName?: string;
  timestamp?: string;
  hindiMessage: string;
  englishTranslation: string;
  onScheduleReminder?: () => void;
}

export const AudioAdvisoryPlayer: React.FC<AudioAdvisoryPlayerProps> = ({
  senderName = 'सुनीता दीदी (ASHA Sunita B.)',
  timestamp = 'Today, 10:15 AM',
  hindiMessage,
  englishTranslation,
  onScheduleReminder,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 5;
        });
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (progress >= 100) setProgress(0);
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        {/* Left icon & text */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-tertiary-fixed text-primary-container flex items-center justify-center shadow-xs shrink-0 mt-1">
            <span className="material-symbols-outlined text-[28px]">record_voice_over</span>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary font-bold">
                आशा दीदी का ऑडियो संदेश (Voice Advisory)
              </span>
              <span className="text-xs text-on-surface-variant font-medium">{timestamp}</span>
            </div>

            <h3 className="text-base font-bold text-primary-container">
              {senderName} का विशेष संदेश आपके लिए
            </h3>

            {/* Audio Speech Box */}
            <div className="mt-2 p-4 rounded-xl bg-surface-container-low text-on-surface shadow-inner border border-outline-variant/20">
              <p className="text-base leading-relaxed italic text-on-surface font-medium">
                “{hindiMessage}”
              </p>
              {showTranslation && (
                <p className="text-xs text-on-surface-variant mt-2 border-t border-outline-variant/20 pt-2">
                  <strong className="text-secondary">English:</strong> {englishTranslation}
                </p>
              )}

              {/* Simulated Audio Waveform Bar */}
              <div className="mt-3 flex items-center gap-1.5">
                {[40, 65, 80, 45, 90, 75, 60, 85, 95, 70, 50, 60, 80, 40, 70, 90, 85, 60, 75, 50].map(
                  (height, idx) => {
                    const activeBar = (idx / 20) * 100 <= progress;
                    return (
                      <div
                        key={idx}
                        className={`w-1 rounded-full transition-all duration-200 ${
                          activeBar
                            ? 'bg-secondary'
                            : 'bg-outline-variant/50'
                        } ${isPlaying ? 'animate-pulse' : ''}`}
                        style={{ height: `${height}%`, minHeight: '8px', maxHeight: '28px' }}
                      />
                    );
                  }
                )}
                <span className="text-[11px] font-mono text-on-surface-variant ml-2 font-bold">
                  {isPlaying ? `0:${Math.floor((progress / 100) * 35).toString().padStart(2, '0')}` : '0:35'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="px-5 py-3 rounded-xl bg-secondary text-on-secondary text-sm font-bold shadow-md hover:bg-secondary/90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isPlaying ? 'pause_circle' : 'play_circle'}
            </span>
            <span>{isPlaying ? 'रोकें (Pause)' : 'सुनें (Listen Audio)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTranslation(!showTranslation)}
            className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">translate</span>
            <span>{showTranslation ? 'Hide Translation' : 'View Translation'}</span>
          </button>

          <button
            type="button"
            onClick={onScheduleReminder}
            className="px-4 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface text-xs font-medium text-center hover:bg-surface-container-low transition-colors"
          >
            बाद में याद दिलाएँ (Remind Later)
          </button>
        </div>
      </div>
    </div>
  );
};

