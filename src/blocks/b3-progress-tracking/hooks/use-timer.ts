'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { StudySession } from '@/lib/types';
import {
  startTimerSession,
  autoSaveTimerProgress,
  finalizeTimerSession,
  recoverTimerSession,
} from '../actions/timer-actions';

const STORAGE_KEY = 'b3_timer_state';
const AUTO_SAVE_INTERVAL = 60_000; // 60 seconds

interface TimerLocalStorage {
  sessionId: string;
  courseId: string;
  status: 'running' | 'paused';
  startedAt: number;
  pausedAt: number | null;
  totalPausedMs: number;
  lastSavedAt: number;
}

export interface TimerState {
  status: 'idle' | 'running' | 'paused';
  courseId: string | null;
  sessionId: string | null;
  elapsedSeconds: number;
  startedAt: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
}

export interface UseTimerReturn {
  state: TimerState;
  start: (courseId: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: (
    notes?: string,
    modulesCompleted?: number
  ) => Promise<StudySession | null>;
  reset: () => void;
  recoverySession: StudySession | null;
  dismissRecovery: () => void;
}

const initialState: TimerState = {
  status: 'idle',
  courseId: null,
  sessionId: null,
  elapsedSeconds: 0,
  startedAt: null,
  pausedAt: null,
  totalPausedMs: 0,
};

export function useTimer(): UseTimerReturn {
  const [state, setState] = useState<TimerState>(initialState);
  const [recoverySession, setRecoverySession] = useState<StudySession | null>(
    null
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<TimerState>(initialState);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Save state to localStorage
  const saveToStorage = useCallback((s: TimerState) => {
    if (s.status === 'idle' || !s.sessionId || !s.courseId || !s.startedAt) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const stored: TimerLocalStorage = {
      sessionId: s.sessionId,
      courseId: s.courseId,
      status: s.status as 'running' | 'paused',
      startedAt: s.startedAt,
      pausedAt: s.pausedAt,
      totalPausedMs: s.totalPausedMs,
      lastSavedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, []);

  // Calculate elapsed seconds from timestamps
  const calcElapsed = useCallback(
    (startedAt: number, totalPausedMs: number, pausedAt: number | null) => {
      const now = pausedAt ?? Date.now();
      return Math.floor((now - startedAt - totalPausedMs) / 1000);
    },
    []
  );

  // Start tick interval
  const startTick = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.status !== 'running' || !prev.startedAt) return prev;
        return {
          ...prev,
          elapsedSeconds: calcElapsed(
            prev.startedAt,
            prev.totalPausedMs,
            null
          ),
        };
      });
    }, 1000);
  }, [calcElapsed]);

  // Start auto-save interval
  const startAutoSave = useCallback(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    autoSaveRef.current = setInterval(() => {
      const s = stateRef.current;
      if (s.status === 'running' && s.sessionId) {
        const minutes = Math.round(s.elapsedSeconds / 60);
        autoSaveTimerProgress(s.sessionId, minutes).catch(() => {
          // Retry once after 10s, with cleanup tracking
          retryTimeoutRef.current = setTimeout(() => {
            const retry = stateRef.current;
            if (retry.status === 'running' && retry.sessionId) {
              autoSaveTimerProgress(
                retry.sessionId,
                Math.round(retry.elapsedSeconds / 60)
              ).catch(() => { /* exhausted retries */ });
            }
            retryTimeoutRef.current = null;
          }, 10000);
        });
        saveToStorage(s);
      }
    }, AUTO_SAVE_INTERVAL);
  }, [saveToStorage]);

  // Cleanup intervals and pending retries
  const clearIntervals = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoSaveRef.current) {
      clearInterval(autoSaveRef.current);
      autoSaveRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Recovery on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed: TimerLocalStorage = JSON.parse(stored);
      if (!parsed.sessionId) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Check if session still exists in DB
      recoverTimerSession(parsed.sessionId).then((result) => {
        if (!result.data) {
          // Session already finalized
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        // Session still active - show recovery prompt
        setRecoverySession(result.data);

        // Account for the time gap since the browser was closed.
        // If the timer was running, the gap between lastSavedAt and now is untracked
        // pause time that must be added to totalPausedMs.
        const now = Date.now();
        let adjustedTotalPausedMs = parsed.totalPausedMs;
        if (parsed.status === 'running') {
          // Timer was running when browser closed -- treat the gap as paused time
          const gapMs = now - parsed.lastSavedAt;
          adjustedTotalPausedMs += gapMs;
        } else if (parsed.status === 'paused' && parsed.pausedAt) {
          // Timer was already paused -- pausedAt is still valid, no adjustment needed
        }

        const elapsed = calcElapsed(
          parsed.startedAt,
          adjustedTotalPausedMs,
          parsed.status === 'paused' ? parsed.pausedAt : now
        );

        const recoveredState: TimerState = {
          status: 'paused', // Always start paused for recovery
          courseId: parsed.courseId,
          sessionId: parsed.sessionId,
          elapsedSeconds: Math.max(0, elapsed),
          startedAt: parsed.startedAt,
          pausedAt: parsed.status === 'paused' ? (parsed.pausedAt ?? now) : now,
          totalPausedMs: adjustedTotalPausedMs,
        };

        setState(recoveredState);
      });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // beforeunload handler
  useEffect(() => {
    const handler = () => {
      saveToStorage(stateRef.current);
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveToStorage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearIntervals();
  }, [clearIntervals]);

  const start = useCallback(
    async (courseId: string) => {
      const result = await startTimerSession(courseId);
      if (result.error || !result.data) {
        throw new Error(result.error ?? 'Failed to start session');
      }

      const now = Date.now();
      const newState: TimerState = {
        status: 'running',
        courseId,
        sessionId: result.data.sessionId,
        elapsedSeconds: 0,
        startedAt: now,
        pausedAt: null,
        totalPausedMs: 0,
      };

      setState(newState);
      saveToStorage(newState);
      startTick();
      startAutoSave();
    },
    [saveToStorage, startTick, startAutoSave]
  );

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'running') return prev;
      clearIntervals();
      const pausedState: TimerState = {
        ...prev,
        status: 'paused',
        pausedAt: Date.now(),
      };
      saveToStorage(pausedState);
      return pausedState;
    });
  }, [clearIntervals, saveToStorage]);

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'paused' || !prev.pausedAt) return prev;
      const additionalPausedMs = Date.now() - prev.pausedAt;
      const resumedState: TimerState = {
        ...prev,
        status: 'running',
        pausedAt: null,
        totalPausedMs: prev.totalPausedMs + additionalPausedMs,
      };
      saveToStorage(resumedState);
      startTick();
      startAutoSave();
      return resumedState;
    });
  }, [saveToStorage, startTick, startAutoSave]);

  const stop = useCallback(
    async (
      notes?: string,
      modulesCompleted?: number
    ): Promise<StudySession | null> => {
      const s = stateRef.current;
      if (!s.sessionId) return null;

      clearIntervals();

      const durationMinutes = Math.max(1, Math.round(s.elapsedSeconds / 60));
      const result = await finalizeTimerSession(
        s.sessionId,
        durationMinutes,
        notes,
        modulesCompleted
      );

      setState(initialState);
      localStorage.removeItem(STORAGE_KEY);
      setRecoverySession(null);

      if (result.error || !result.data) return null;
      return result.data;
    },
    [clearIntervals]
  );

  const reset = useCallback(() => {
    clearIntervals();
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
    setRecoverySession(null);
  }, [clearIntervals]);

  const dismissRecovery = useCallback(() => {
    setRecoverySession(null);
  }, []);

  return {
    state,
    start,
    pause,
    resume,
    stop,
    reset,
    recoverySession,
    dismissRecovery,
  };
}
