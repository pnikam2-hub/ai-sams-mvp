'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutosaveConfig {
  intervalMs?: number;
  storageKey: string;
  onSave: (data: Record<string, string>) => Promise<boolean>;
  onRecover?: (data: Record<string, string>) => void;
}

interface AutosaveState {
  status: SaveStatus;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;
  pendingRecovery: boolean;
  recoveredData: Record<string, string> | null;
}

export function useAutosave({
  intervalMs = 30000,
  storageKey,
  onSave,
  onRecover,
}: AutosaveConfig) {
  const [state, setState] = useState<AutosaveState>({
    status: 'idle',
    lastSavedAt: null,
    hasUnsavedChanges: false,
    pendingRecovery: false,
    recoveredData: null,
  });

  const answersRef = useRef<Record<string, string>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveInProgressRef = useRef(false);
  const lastSavedRef = useRef<Record<string, string>>({});
  const hasPendingChangesRef = useRef(false);

  // Check for unsaved data on mount (recovery)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`autosave_${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers && Object.keys(parsed.answers).length > 0) {
          // Check if there's data that differs from what was last saved to server
          const hasData = Object.values(parsed.answers).some(v => v && v.trim().length > 0);
          if (hasData) {
            setState(prev => ({
              ...prev,
              pendingRecovery: true,
              recoveredData: parsed.answers,
            }));
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey]);

  // Mark changes
  const markDirty = useCallback(() => {
    hasPendingChangesRef.current = true;
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));
  }, []);

  // Save to localStorage immediately
  const saveToLocal = useCallback((answers: Record<string, string>) => {
    try {
      localStorage.setItem(
        `autosave_${storageKey}`,
        JSON.stringify({
          answers,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [storageKey]);

  // Perform actual save
  const performSave = useCallback(async () => {
    if (saveInProgressRef.current) return;
    
    const currentAnswers = { ...answersRef.current };
    
    // Check if there are actual changes since last save
    const currentJson = JSON.stringify(currentAnswers);
    const lastJson = JSON.stringify(lastSavedRef.current);
    if (currentJson === lastJson) return;

    saveInProgressRef.current = true;
    setState(prev => ({ ...prev, status: 'saving' }));

    try {
      const success = await onSave(currentAnswers);
      
      if (success) {
        lastSavedRef.current = currentAnswers;
        hasPendingChangesRef.current = false;
        setState(prev => ({
          ...prev,
          status: 'saved',
          lastSavedAt: new Date(),
          hasUnsavedChanges: false,
        }));
      } else {
        setState(prev => ({ ...prev, status: 'error' }));
        toast.error('Failed to save. Changes stored locally.');
      }
    } catch {
      setState(prev => ({ ...prev, status: 'error' }));
      toast.error('Network error. Changes stored locally.');
    } finally {
      saveInProgressRef.current = false;
      // Always persist to localStorage as backup
      saveToLocal(currentAnswers);
    }
  }, [onSave, saveToLocal]);

  // Update answers
  const setAnswers = useCallback((answers: Record<string, string>) => {
    answersRef.current = answers;
    markDirty();
    saveToLocal(answers);
  }, [markDirty, saveToLocal]);

  // Update a single answer
  const setAnswer = useCallback((questionId: string, answerText: string) => {
    answersRef.current[questionId] = answerText;
    markDirty();
    saveToLocal(answersRef.current);
  }, [markDirty, saveToLocal]);

  // Recover data
  const recover = useCallback(() => {
    if (state.recoveredData) {
      answersRef.current = state.recoveredData;
      onRecover?.(state.recoveredData);
      setState(prev => ({
        ...prev,
        pendingRecovery: false,
        hasUnsavedChanges: true,
      }));
      toast.success('Previous answers recovered');
    }
  }, [state.recoveredData, onRecover]);

  // Discard recovery
  const discardRecovery = useCallback(() => {
    setState(prev => ({
      ...prev,
      pendingRecovery: false,
      recoveredData: null,
    }));
    localStorage.removeItem(`autosave_${storageKey}`);
  }, [storageKey]);

  // Manual save trigger
  const saveNow = useCallback(() => {
    return performSave();
  }, [performSave]);

  // Set up interval
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (hasPendingChangesRef.current) {
        performSave();
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [intervalMs, performSave]);

  // Reset saved status after 3 seconds
  useEffect(() => {
    if (state.status === 'saved') {
      const timeout = setTimeout(() => {
        setState(prev => ({ ...prev, status: 'idle' }));
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [state.status]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasPendingChangesRef.current) {
        saveToLocal(answersRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveToLocal]);

  return {
    status: state.status,
    lastSavedAt: state.lastSavedAt,
    hasUnsavedChanges: state.hasUnsavedChanges,
    pendingRecovery: state.pendingRecovery,
    setAnswers,
    setAnswer,
    saveNow,
    recover,
    discardRecovery,
  };
}

export default useAutosave;
