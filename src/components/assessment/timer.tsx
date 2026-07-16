'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Timer as TimerIcon, AlertTriangle } from 'lucide-react';

interface TimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  onTick?: (remaining: number) => void;
  warningThreshold?: number; // seconds before warning (default 5 minutes = 300)
  className?: string;
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const parts = [];
  if (hours > 0) {
    parts.push(hours.toString().padStart(2, '0'));
  }
  parts.push(minutes.toString().padStart(2, '0'));
  parts.push(seconds.toString().padStart(2, '0'));
  
  return parts.join(':');
}

const STORAGE_KEY_PREFIX = 'assessment_timer_';

export function Timer({
  initialSeconds,
  onTimeUp,
  onTick,
  warningThreshold = 300, // 5 minutes
  className,
}: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);
  const hasTriggeredTimeUp = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
    onTickRef.current = onTick;
  }, [onTimeUp, onTick]);

  // Initialize from localStorage if available (for recovery)
  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${window.location.pathname}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const { remaining, timestamp } = JSON.parse(stored);
        const elapsed = Math.floor((Date.now() - timestamp) / 1000);
        const recovered = Math.max(0, remaining - elapsed);
        if (recovered > 0 && recovered < initialSeconds) {
          setTimeRemaining(recovered);
        }
      } catch {
        // Ignore parse errors, use initial value
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer countdown logic
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time is up
          if (!hasTriggeredTimeUp.current) {
            hasTriggeredTimeUp.current = true;
            setTimeout(() => onTimeUpRef.current?.(), 0);
          }
          return 0;
        }
        const next = prev - 1;
        onTickRef.current?.(next);
        
        // Persist to localStorage
        const storageKey = `${STORAGE_KEY_PREFIX}${window.location.pathname}`;
        localStorage.setItem(storageKey, JSON.stringify({
          remaining: next,
          timestamp: Date.now(),
        }));
        
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Update warning states
  useEffect(() => {
    setIsWarning(timeRemaining <= warningThreshold && timeRemaining > 60);
    setIsCritical(timeRemaining <= 60);
  }, [timeRemaining, warningThreshold]);

  // Cleanup localStorage on unmount (if time is up)
  useEffect(() => {
    return () => {
      if (timeRemaining <= 0) {
        const storageKey = `${STORAGE_KEY_PREFIX}${window.location.pathname}`;
        localStorage.removeItem(storageKey);
      }
    };
  }, [timeRemaining]);

  const getTimerColor = () => {
    if (isCritical) return 'text-red-600 dark:text-red-400';
    if (isWarning) return 'text-amber-600 dark:text-amber-400';
    return 'text-slate-700 dark:text-slate-300';
  };

  const getBorderColor = () => {
    if (isCritical) return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (isWarning) return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
    return 'border-slate-200 bg-white dark:bg-slate-800';
  };

  const percentageRemaining = (timeRemaining / initialSeconds) * 100;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 px-4 py-2 rounded-lg border shadow-sm transition-colors duration-300',
        getBorderColor(),
        className
      )}
    >
      {/* Progress ring */}
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-slate-200 dark:text-slate-700"
          />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 14}`}
            strokeDashoffset={`${2 * Math.PI * 14 * (1 - percentageRemaining / 100)}`}
            strokeLinecap="round"
            className={cn(
              'transition-all duration-1000',
              isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'
            )}
          />
        </svg>
        {(isWarning || isCritical) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className={cn(
              'w-3.5 h-3.5',
              isCritical ? 'text-red-600' : 'text-amber-600'
            )} />
          </div>
        )}
      </div>

      {/* Timer display */}
      <div className="flex flex-col">
        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Time Remaining
        </span>
        <span
          className={cn(
            'text-lg font-mono font-bold leading-tight tabular-nums transition-colors duration-300',
            getTimerColor(),
            isCritical && 'animate-pulse'
          )}
        >
          {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Hidden live region for accessibility */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {isCritical
          ? `Critical warning: ${formatTime(timeRemaining)} remaining`
          : `Time remaining: ${formatTime(timeRemaining)}`}
      </span>
    </div>
  );
}

export function useTimer(initialSeconds: number, onTimeUp: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    setIsWarning(timeRemaining <= 300 && timeRemaining > 0);
  }, [timeRemaining]);

  return {
    timeRemaining,
    isWarning,
    isCritical: timeRemaining <= 60,
    TimerComponent: (props: Omit<TimerProps, 'initialSeconds' | 'onTimeUp' | 'onTick'>) => (
      <Timer
        initialSeconds={initialSeconds}
        onTimeUp={onTimeUp}
        onTick={setTimeRemaining}
        {...props}
      />
    ),
  };
}

export default Timer;
