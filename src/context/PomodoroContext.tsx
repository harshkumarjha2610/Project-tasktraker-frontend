'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import {
  getPomodoroData,
  updatePomodoroSettings,
  addPomodoroSession,
  addWasteSession,
  syncPomodoroData,
  updateActiveTimerState,
  type PomodoroBackendData,
} from '@/lib/api';

const getLocalDateKey = (d: Date | string | number) => {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export type TimerMode = 'work' | 'shortBreak' | 'longBreak';
export type AmbientSoundType = 'none' | 'rain' | 'waves' | 'space' | 'cafe' | 'clock';
export type PomodoroThemeColor = 'purple' | 'emerald' | 'amber' | 'cyberpunk' | 'indigo' | 'rose';
export type PomodoroBgStyle = 'default' | 'oled' | 'gradient' | 'glass';
export type ClockSoundStyle = 'classic' | 'grandfather' | 'digital' | 'metronome' | 'vintage';

export interface TimerSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  tickingEnabled: boolean;
  bellEnabled: boolean;
  clockStyle: ClockSoundStyle;
}

export interface PomodoroSession {
  id: string;
  mode: TimerMode;
  durationMinutes: number;
  taskTitle?: string;
  completedAt: string;
}

export interface WastedSessionRecord {
  id: string;
  mode: TimerMode;
  taskTitle?: string;
  durationSeconds: number;
  interruptedAt: string;
  isOverdueDelay?: boolean;
}

export const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
  tickingEnabled: true,
  bellEnabled: true,
  clockStyle: 'classic',
};

export const CLOCK_STYLES: Record<ClockSoundStyle, { name: string; description: string }> = {
  classic: { name: 'Classic Wristwatch', description: 'Crisp mechanical tick-tock' },
  grandfather: { name: 'Grandfather Clock', description: 'Deep wooden pendulum rhythm' },
  digital: { name: 'Digital Pulse', description: 'Modern soft electronic pulse' },
  metronome: { name: 'Acoustic Metronome', description: 'Warm wooden studio click' },
  vintage: { name: 'Vintage Wall Clock', description: 'Heavy brass gear clock' }
};

export const THEME_PALETTES: Record<PomodoroThemeColor, { name: string; primary: string; secondary: string; glow: string; gradient: string }> = {
  purple: {
    name: 'Cyber Violet',
    primary: '#8b5cf6',
    secondary: '#ec4899',
    glow: 'rgba(139, 92, 246, 0.4)',
    gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)'
  },
  emerald: {
    name: 'Emerald Matrix',
    primary: '#06b6d4',
    secondary: '#10b981',
    glow: 'rgba(6, 186, 212, 0.4)',
    gradient: 'linear-gradient(135deg, #06b6d4, #10b981)'
  },
  amber: {
    name: 'Solar Flame',
    primary: '#f59e0b',
    secondary: '#ef4444',
    glow: 'rgba(245, 158, 11, 0.4)',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)'
  },
  cyberpunk: {
    name: 'Neon Cyberpunk',
    primary: '#00ffcc',
    secondary: '#ff0055',
    glow: 'rgba(0, 255, 204, 0.4)',
    gradient: 'linear-gradient(135deg, #00ffcc, #ff0055)'
  },
  indigo: {
    name: 'Midnight Indigo',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    glow: 'rgba(59, 130, 246, 0.4)',
    gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
  },
  rose: {
    name: 'Rose Quartz',
    primary: '#f43f5e',
    secondary: '#a855f7',
    glow: 'rgba(244, 63, 94, 0.4)',
    gradient: 'linear-gradient(135deg, #f43f5e, #a855f7)'
  }
};

export const BG_STYLES: Record<PomodoroBgStyle, { name: string; background: string; border: string; backdropFilter?: string }> = {
  default: {
    name: 'Standard Card',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)'
  },
  oled: {
    name: 'OLED Black',
    background: '#040407',
    border: '1px solid rgba(255, 255, 255, 0.12)'
  },
  gradient: {
    name: 'Gradient Aura',
    background: 'linear-gradient(135deg, rgba(22, 22, 35, 0.95), rgba(12, 12, 20, 0.95))',
    border: '1px solid rgba(139, 92, 246, 0.25)'
  },
  glass: {
    name: 'Frosted Glass',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)'
  }
};

export const MOTIVATIONAL_QUOTES = [
  "Focus on being productive instead of busy.",
  "Your future self will thank you for this session.",
  "Deep work is the superpower of the 21st century.",
  "One session at a time, extraordinary results compound.",
  "Discipline is choosing between what you want now and what you want most.",
  "Small daily improvements over time lead to stunning results.",
  "Turn off distraction. Turn on flow state."
];

// Web Audio API Clock Ticking Synthesizer
export const playClockTickStyle = (style: ClockSoundStyle, isTock: boolean, volume = 0.08) => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (style === 'grandfather') {
      const freq = isTock ? 780 : 1250;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(volume * 1.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } else if (style === 'digital') {
      const freq = isTock ? 1200 : 1600;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume * 0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } else if (style === 'metronome') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isTock ? 1700 : 2200, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      osc.type = 'square';
      osc.frequency.setValueAtTime(isTock ? 400 : 600, ctx.currentTime);

      gain.gain.setValueAtTime(volume * 0.9, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.025);
    } else if (style === 'vintage') {
      const freq = isTock ? 2400 : 3400;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.02);

      gain.gain.setValueAtTime(volume * 0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } else {
      const freq = isTock ? 2800 : 3800;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.015);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.015);
    }
  } catch {
    // Ignore audio context errors
  }
};

// Web Audio Resonant Zen Temple Bell Ring Synthesizer
export const playTransitionBell = (transition: 'focus_to_break' | 'break_to_focus') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const baseFreq = transition === 'focus_to_break' ? 528 : 432;
    const harmonics = [baseFreq, baseFreq * 2, baseFreq * 3.01, baseFreq * 4.2];

    harmonics.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const initialGain = 0.22 / (i + 1);
      gain.gain.setValueAtTime(initialGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 2.2);
    });
  } catch {
    // Ignore audio context errors
  }
};

export const playAudioChime = (type: 'start' | 'pause' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'start') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'pause') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'complete') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.12;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    }
  } catch {
    // Ignore audio context errors
  }
};

interface PomodoroContextType {
  mode: TimerMode;
  setMode: (m: TimerMode) => void;
  switchMode: (newMode: TimerMode, autoStart?: boolean) => void;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  togglePlay: () => void;
  handleReset: () => void;
  handleSkip: () => void;
  adjustTime: (deltaMinutes: number) => void;
  selectedTaskId: string;
  setSelectedTaskId: (id: string) => void;
  completedSessionsCount: number;
  history: PomodoroSession[];
  wasteHistory: WastedSessionRecord[];
  isInterrupted: boolean;
  wastedSeconds: number;
  totalWastedSecondsToday: number;
  overdueBreakMode: TimerMode | null;
  settings: TimerSettings;
  saveSettings: (newSettings: TimerSettings) => void;
  colorTheme: PomodoroThemeColor;
  changeColorTheme: (t: PomodoroThemeColor) => void;
  bgStyle: PomodoroBgStyle;
  changeBgStyle: (b: PomodoroBgStyle) => void;
  zenMode: boolean;
  setZenMode: (zen: boolean) => void;
  ambientSound: AmbientSoundType;
  setAmbientSound: (sound: AmbientSoundType) => void;
  ambientVolume: number;
  setAmbientVolume: (vol: number) => void;
  quoteIndex: number;
  setQuoteIndex: React.Dispatch<React.SetStateAction<number>>;
  formatSecsToMMSS: (sec: number) => string;
  formatSecsToHoursMins: (sec: number) => string;
  formatSecsToHHMMSS: (sec: number) => string;
  getModeTitle: (m: TimerMode) => string;
  getModeDurationSeconds: (m: TimerMode, customSettings?: TimerSettings) => number;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { filteredTasks } = useTaskContext();

  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [colorTheme, setColorTheme] = useState<PomodoroThemeColor>('purple');
  const [bgStyle, setBgStyle] = useState<PomodoroBgStyle>('default');

  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_SETTINGS.workDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [completedSessionsCount, setCompletedSessionsCount] = useState<number>(0);
  const [history, setHistory] = useState<PomodoroSession[]>([]);

  const [hasSessionStarted, setHasSessionStarted] = useState<boolean>(false);
  const [isInterrupted, setIsInterrupted] = useState<boolean>(false);
  const [overdueBreakMode, setOverdueBreakMode] = useState<TimerMode | null>(null);
  const [wastedSeconds, setWastedSeconds] = useState<number>(0);
  const [totalWastedSecondsToday, setTotalWastedSecondsToday] = useState<number>(0);
  const [wasteHistory, setWasteHistory] = useState<WastedSessionRecord[]>([]);

  const [zenMode, setZenMode] = useState<boolean>(false);
  const [ambientSound, setAmbientSound] = useState<AmbientSoundType>('none');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.3);
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientGainNodeRef = useRef<GainNode | null>(null);
  const ambientNodesRef = useRef<AudioNode[]>([]);

  // Target timestamp ref to calculate exact countdown regardless of component unmounting
  const targetEndTimestampRef = useRef<number | null>(null);
  const lastLocalActionTimeRef = useRef<number>(0);
  const interruptedStartedAtRef = useRef<number | null>(null);

  // Mode durations in seconds
  const getModeDurationSeconds = useCallback((m: TimerMode, customSettings = settings) => {
    switch (m) {
      case 'work': return customSettings.workDuration * 60;
      case 'shortBreak': return customSettings.shortBreakDuration * 60;
      case 'longBreak': return customSettings.longBreakDuration * 60;
    }
  }, [settings]);

  // Automatic Midnight (12:00 AM) Rollover Check & Daily Stats Calculation
  const recalculateDailyStats = useCallback((allHistory: PomodoroSession[], allWaste: WastedSessionRecord[]) => {
    const todayStr = getLocalDateKey(new Date());
    
    // Count today's completed work pomodoros
    const todayWorkCount = allHistory.filter(s =>
      s.mode === 'work' && getLocalDateKey(s.completedAt) === todayStr
    ).length;
    setCompletedSessionsCount(todayWorkCount);

    // Sum today's wasted seconds
    const todayWasteTotal = allWaste
      .filter(w => getLocalDateKey(w.interruptedAt) === todayStr)
      .reduce((acc, w) => acc + w.durationSeconds, 0);
    setTotalWastedSecondsToday(todayWasteTotal);
  }, []);

  // Periodic Midnight Check interval (runs every 10 seconds to auto-refresh at midnight 12:00 AM)
  useEffect(() => {
    const checkRollover = () => {
      recalculateDailyStats(history, wasteHistory);
    };

    checkRollover();
    const midnightInterval = setInterval(checkRollover, 10000);
    return () => clearInterval(midnightInterval);
  }, [history, wasteHistory, recalculateDailyStats]);

  // Sync backend Pomodoro data & migrate local storage if needed
  const syncBackendData = useCallback(async () => {
    try {
      const backendData = await getPomodoroData();

      if (typeof window !== 'undefined') {
        const savedSettings = localStorage.getItem('dt_pomodoro_settings');
        const savedHistory = localStorage.getItem('dt_pomodoro_history');
        const savedWaste = localStorage.getItem('dt_pomodoro_waste_history');
        const savedColorTheme = localStorage.getItem('dt_pomodoro_color_theme');
        const savedBgStyle = localStorage.getItem('dt_pomodoro_bg_style');

        let parsedHistory: PomodoroSession[] = [];
        let parsedWaste: WastedSessionRecord[] = [];
        let parsedSettings: Partial<TimerSettings> | null = null;

        if (savedHistory) {
          try { parsedHistory = JSON.parse(savedHistory); } catch (e) {}
        }
        if (savedWaste) {
          try { parsedWaste = JSON.parse(savedWaste); } catch (e) {}
        }
        if (savedSettings) {
          try { parsedSettings = JSON.parse(savedSettings); } catch (e) {}
        }

        const hasLocalToMigrate = parsedHistory.length > 0 || parsedWaste.length > 0 || !!parsedSettings || !!savedColorTheme || !!savedBgStyle;

        if (hasLocalToMigrate) {
          const synced = await syncPomodoroData({
            settings: parsedSettings ? ({ ...DEFAULT_SETTINGS, ...parsedSettings } as unknown as PomodoroBackendData['settings']) : backendData.settings,
            colorTheme: savedColorTheme || backendData.colorTheme,
            bgStyle: savedBgStyle || backendData.bgStyle,
            history: parsedHistory as unknown as PomodoroBackendData['history'],
            wasteHistory: parsedWaste as unknown as PomodoroBackendData['wasteHistory'],
          });

          // Clean local storage after successful backend migration
          localStorage.removeItem('dt_pomodoro_settings');
          localStorage.removeItem('dt_pomodoro_history');
          localStorage.removeItem('dt_pomodoro_waste_history');
          localStorage.removeItem('dt_pomodoro_color_theme');
          localStorage.removeItem('dt_pomodoro_bg_style');

          if (synced.settings) setSettings({ ...DEFAULT_SETTINGS, ...synced.settings } as TimerSettings);
          if (synced.colorTheme && THEME_PALETTES[synced.colorTheme as PomodoroThemeColor]) {
            setColorTheme(synced.colorTheme as PomodoroThemeColor);
          }
          if (synced.bgStyle && BG_STYLES[synced.bgStyle as PomodoroBgStyle]) {
            setBgStyle(synced.bgStyle as PomodoroBgStyle);
          }
          if (Array.isArray(synced.history)) setHistory(synced.history as PomodoroSession[]);
          if (Array.isArray(synced.wasteHistory)) setWasteHistory(synced.wasteHistory as WastedSessionRecord[]);
          recalculateDailyStats((synced.history || []) as PomodoroSession[], (synced.wasteHistory || []) as WastedSessionRecord[]);
          return;
        }
      }

      // Normal application of backend data
      if (backendData.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...backendData.settings } as TimerSettings);
      }
      if (backendData.colorTheme && THEME_PALETTES[backendData.colorTheme as PomodoroThemeColor]) {
        setColorTheme(syncedTheme => syncedTheme || backendData.colorTheme as PomodoroThemeColor);
      }
      if (backendData.bgStyle && BG_STYLES[backendData.bgStyle as PomodoroBgStyle]) {
        setBgStyle(syncedBg => syncedBg || backendData.bgStyle as PomodoroBgStyle);
      }
      if (Array.isArray(backendData.history)) {
        setHistory(backendData.history as PomodoroSession[]);
      }
      if (Array.isArray(backendData.wasteHistory)) {
        setWasteHistory(backendData.wasteHistory as WastedSessionRecord[]);
      }
      recalculateDailyStats((backendData.history || []) as PomodoroSession[], (backendData.wasteHistory || []) as WastedSessionRecord[]);

      // Real-time active timer synchronization across devices & browsers
      if (backendData.activeTimer && Date.now() - lastLocalActionTimeRef.current > 2500) {
        const at = backendData.activeTimer;

        if (at.mode && ['work', 'shortBreak', 'longBreak'].includes(at.mode)) {
          setMode(at.mode as TimerMode);
        }
        if (at.selectedTaskId !== undefined && at.selectedTaskId !== null) {
          setSelectedTaskId(at.selectedTaskId);
        }

        // Interrupted state sync across devices
        if (at.isInterrupted) {
          setIsInterrupted(true);
          setOverdueBreakMode((at.overdueBreakMode as TimerMode) || null);
          if (at.interruptedStartedAt) {
            interruptedStartedAtRef.current = at.interruptedStartedAt;
            const elapsedWasted = Math.max(0, Math.floor((Date.now() - at.interruptedStartedAt) / 1000));
            setWastedSeconds(elapsedWasted);
          } else if (typeof at.wastedSeconds === 'number') {
            setWastedSeconds(at.wastedSeconds);
          }
        } else {
          setIsInterrupted(false);
          setWastedSeconds(0);
          setOverdueBreakMode(null);
          interruptedStartedAtRef.current = null;
        }

        if (at.isRunning && at.targetEndTimestamp) {
          const now = Date.now();
          const remainingMs = at.targetEndTimestamp - now;
          const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

          if (remainingSecs > 0) {
            setTimeLeft(remainingSecs);
            targetEndTimestampRef.current = at.targetEndTimestamp;
            setIsRunning(true);
          } else {
            setTimeLeft(0);
            targetEndTimestampRef.current = null;
            setIsRunning(false);
          }
        } else {
          targetEndTimestampRef.current = null;
          setIsRunning(false);
          if (typeof at.timeLeft === 'number' && at.timeLeft >= 0) {
            setTimeLeft(at.timeLeft);
          }
        }
      }
    } catch (e) {
      console.error('[PomodoroContext] Failed to sync data with backend server:', e);
    }
  }, [recalculateDailyStats]);

  // Initial load & continuous cross-device sync interval + visibility listener
  useEffect(() => {
    syncBackendData();
    setQuoteIndex(Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));

    // Poll every 2.5 seconds to keep all devices & browsers in real-time sync
    const pollInterval = setInterval(() => {
      syncBackendData();
    }, 2500);

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncBackendData();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleVisibilityOrFocus);
      window.addEventListener('focus', handleVisibilityOrFocus);
    }

    return () => {
      clearInterval(pollInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        window.removeEventListener('focus', handleVisibilityOrFocus);
      }
    };
  }, [syncBackendData]);

  const changeColorTheme = (t: PomodoroThemeColor) => {
    setColorTheme(t);
    updatePomodoroSettings({ colorTheme: t }).catch(err => {
      console.error('[PomodoroContext] Failed to sync color theme to backend', err);
    });
  };

  const changeBgStyle = (b: PomodoroBgStyle) => {
    setBgStyle(b);
    updatePomodoroSettings({ bgStyle: b }).catch(err => {
      console.error('[PomodoroContext] Failed to sync bg style to backend', err);
    });
  };

  // Commit Wasted Time Session
  const activeTask = filteredTasks.find(t => t.id === selectedTaskId);

  const saveInterruptedWasteSession = useCallback((durationSecs: number, currentMode: TimerMode, taskTitle?: string, overdueFromMode?: TimerMode | null) => {
    if (durationSecs < 2) return;
    const now = Date.now();
    const startTimeISO = new Date(now - durationSecs * 1000).toISOString();
    const endTimeISO = new Date(now).toISOString();

    const modeLabel = overdueFromMode
      ? `Overdue Focus Start (Delayed return after ${overdueFromMode === 'shortBreak' ? 'Short Break' : 'Long Break'})`
      : currentMode === 'work'
      ? (taskTitle ? `Interrupted Pomodoro ("${taskTitle}")` : `Interrupted Pomodoro Focus Session`)
      : currentMode === 'shortBreak'
      ? `Interrupted Short Break Session`
      : `Interrupted Long Break Session`;

    const newRecord: WastedSessionRecord = {
      id: Math.random().toString(36).substring(2, 9),
      mode: currentMode,
      taskTitle: currentMode === 'work' ? taskTitle : undefined,
      durationSeconds: durationSecs,
      interruptedAt: endTimeISO,
      isOverdueDelay: !!overdueFromMode
    };

    setWasteHistory(prev => {
      const updated = [newRecord, ...prev];
      return updated;
    });

    addWasteSession(newRecord as unknown as Record<string, unknown>).catch(err => {
      console.error('[PomodoroContext] Failed to sync waste session to backend', err);
    });

    setTotalWastedSecondsToday(prev => {
      const newTotal = prev + durationSecs;
      return newTotal;
    });

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('tw_history_sessions');
        const existingSessions = stored ? JSON.parse(stored) : [];
        const newWasteSession = {
          id: Date.now().toString(),
          startTime: startTimeISO,
          endTime: endTimeISO,
          durationMs: durationSecs * 1000,
          reason: modeLabel
        };
        localStorage.setItem('tw_history_sessions', JSON.stringify([newWasteSession, ...existingSessions]));
      } catch (e) {
        console.error('Failed to sync to tw_history_sessions', e);
      }
    }
  }, []);

  // Interrupted / Overdue Wasted Time Ticker Interval
  useEffect(() => {
    let wasteInterval: NodeJS.Timeout | null = null;
    if (isInterrupted) {
      wasteInterval = setInterval(() => {
        if (interruptedStartedAtRef.current) {
          const elapsed = Math.max(0, Math.floor((Date.now() - interruptedStartedAtRef.current) / 1000));
          setWastedSeconds(elapsed);
        } else {
          setWastedSeconds(prev => prev + 1);
        }
      }, 1000);
    } else if (wasteInterval) {
      clearInterval(wasteInterval);
    }
    return () => {
      if (wasteInterval) clearInterval(wasteInterval);
    };
  }, [isInterrupted]);

  // Request Notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Switch mode helper
  const switchMode = useCallback((newMode: TimerMode, autoStart = false) => {
    lastLocalActionTimeRef.current = Date.now();
    if (isInterrupted && wastedSeconds > 0) {
      saveInterruptedWasteSession(wastedSeconds, mode, activeTask?.title, overdueBreakMode);
      setWastedSeconds(0);
      setIsInterrupted(false);
      setOverdueBreakMode(null);
    }
    setHasSessionStarted(false);
    setMode(newMode);
    const newSecs = getModeDurationSeconds(newMode);
    setTimeLeft(newSecs);

    if (autoStart) {
      const targetEnd = Date.now() + newSecs * 1000;
      targetEndTimestampRef.current = targetEnd;
      setIsRunning(true);
      interruptedStartedAtRef.current = null;
      updateActiveTimerState({
        isRunning: true,
        mode: newMode,
        targetEndTimestamp: targetEnd,
        timeLeft: newSecs,
        selectedTaskId,
        isInterrupted: false,
        wastedSeconds: 0,
        interruptedStartedAt: null,
        overdueBreakMode: null,
      }).catch(() => {});
    } else {
      targetEndTimestampRef.current = null;
      setIsRunning(false);
      interruptedStartedAtRef.current = null;
      updateActiveTimerState({
        isRunning: false,
        mode: newMode,
        targetEndTimestamp: null,
        timeLeft: newSecs,
        selectedTaskId,
        isInterrupted: false,
        wastedSeconds: 0,
        interruptedStartedAt: null,
        overdueBreakMode: null,
      }).catch(() => {});
    }
    setQuoteIndex(prev => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  }, [isInterrupted, wastedSeconds, mode, activeTask, overdueBreakMode, saveInterruptedWasteSession, getModeDurationSeconds, selectedTaskId]);

  // Handle Session Completion
  const handleSessionComplete = useCallback(() => {
    if (isInterrupted && wastedSeconds > 0) {
      saveInterruptedWasteSession(wastedSeconds, mode, activeTask?.title, overdueBreakMode);
      setWastedSeconds(0);
      setIsInterrupted(false);
      setOverdueBreakMode(null);
    }
    setHasSessionStarted(false);

    if (settings.soundEnabled && settings.bellEnabled) {
      const bellType = mode === 'work' ? 'focus_to_break' : 'break_to_focus';
      playTransitionBell(bellType);
    } else if (settings.soundEnabled) {
      playAudioChime('complete');
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const title = mode === 'work' ? '🔔 Focus Session Bell Ring! +50 XP' : '🔔 Break Over Bell Ring!';
      const body = mode === 'work'
        ? 'Great work! Take a break to recharge.'
        : 'Break is over! Time to jump back into your focus flow!';
      new Notification(title, { body, icon: '/favicon.ico' });
    }

    const linkedTask = filteredTasks.find(t => t.id === selectedTaskId);
    const newSession: PomodoroSession = {
      id: Math.random().toString(36).substring(2, 9),
      mode,
      durationMinutes: mode === 'work' ? settings.workDuration : mode === 'shortBreak' ? settings.shortBreakDuration : settings.longBreakDuration,
      taskTitle: linkedTask ? linkedTask.title : undefined,
      completedAt: new Date().toISOString(),
    };

    setHistory(prev => {
      const updated = [newSession, ...prev];
      return updated;
    });

    addPomodoroSession(newSession as unknown as Record<string, unknown>).catch(err => {
      console.error('[PomodoroContext] Failed to sync completed pomodoro session to backend', err);
    });

    if (mode === 'work') {
      const newCount = completedSessionsCount + 1;
      setCompletedSessionsCount(newCount);

      const isLongBreak = newCount % settings.longBreakInterval === 0;
      const nextMode: TimerMode = isLongBreak ? 'longBreak' : 'shortBreak';
      switchMode(nextMode, settings.autoStartBreaks);
    } else {
      const finishedBreak = mode;
      switchMode('work', settings.autoStartPomodoros);

      if (!settings.autoStartPomodoros) {
        const now = Date.now();
        setIsInterrupted(true);
        setOverdueBreakMode(finishedBreak);
        interruptedStartedAtRef.current = now;
        updateActiveTimerState({
          isRunning: false,
          mode: 'work',
          targetEndTimestamp: null,
          timeLeft: getModeDurationSeconds('work'),
          selectedTaskId,
          isInterrupted: true,
          wastedSeconds: 0,
          interruptedStartedAt: now,
          overdueBreakMode: finishedBreak,
        }).catch(() => {});
      }
    }
  }, [isInterrupted, wastedSeconds, mode, activeTask, overdueBreakMode, saveInterruptedWasteSession, settings, filteredTasks, selectedTaskId, completedSessionsCount, switchMode, getModeDurationSeconds]);

  // Global Timer Tick Interval
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      if (!targetEndTimestampRef.current) {
        targetEndTimestampRef.current = Date.now() + timeLeft * 1000;
      }

      timerRef.current = setInterval(() => {
        if (!targetEndTimestampRef.current) return;
        const remainingMs = targetEndTimestampRef.current - Date.now();
        const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

        setTimeLeft(remainingSecs);

        if (remainingSecs <= 0) {
          clearInterval(timerRef.current as NodeJS.Timeout);
          targetEndTimestampRef.current = null;
          handleSessionComplete();
        } else {
          if (settings.soundEnabled && (settings.tickingEnabled || ambientSound === 'clock')) {
            playClockTickStyle(settings.clockStyle || 'classic', remainingSecs % 2 === 0, 0.08);
          }
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, handleSessionComplete, settings.soundEnabled, settings.tickingEnabled, settings.clockStyle, ambientSound]);

  // Update Document Title Globally
  useEffect(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const modeName = mode === 'work' ? 'Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break';

    if (isInterrupted) {
      const wHours = Math.floor(wastedSeconds / 3600);
      const wMins = Math.floor((wastedSeconds % 3600) / 60);
      const wSecs = wastedSeconds % 60;
      const wFormatted = wHours > 0
        ? `${wHours}h ${wMins}m ${wSecs}s`
        : `${wMins.toString().padStart(2, '0')}:${wSecs.toString().padStart(2, '0')}`;

      if (overdueBreakMode) {
        document.title = `🚨 (${wFormatted} Wasted) Overdue Focus Return - DailyTask`;
      } else {
        document.title = `⚠️ (${wFormatted} Wasted) ${modeName} Interrupted - DailyTask`;
      }
    } else {
      document.title = isRunning ? `(${formatted}) ${modeName} - DailyTask` : 'Pomodoro Timer - DailyTask';
    }
  }, [timeLeft, mode, isRunning, isInterrupted, wastedSeconds, overdueBreakMode]);

  // Ambient Sound Engine
  const stopAmbientSound = useCallback(() => {
    ambientNodesRef.current.forEach(node => {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // ignore
      }
    });
    ambientNodesRef.current = [];
  }, []);

  const startAmbientSound = useCallback((type: AmbientSoundType) => {
    stopAmbientSound();
    if (type === 'none' || type === 'clock' || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(ambientVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      ambientGainNodeRef.current = masterGain;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      if (type === 'rain') {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();
        ambientNodesRef.current.push(whiteNoise, filter);
      } else if (type === 'waves') {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(300, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        lfo.start();
        whiteNoise.start();
        ambientNodesRef.current.push(whiteNoise, filter, lfo, lfoGain);
      } else if (type === 'space') {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, ctx.currentTime);
        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();
        ambientNodesRef.current.push(whiteNoise, filter);
      } else if (type === 'cafe') {
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);
        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();
        ambientNodesRef.current.push(whiteNoise, filter);
      }
    } catch (e) {
      console.error('Failed to start ambient audio', e);
    }
  }, [ambientVolume, stopAmbientSound]);

  useEffect(() => {
    if (isRunning && settings.soundEnabled && ambientSound !== 'none' && ambientSound !== 'clock') {
      startAmbientSound(ambientSound);
    } else {
      stopAmbientSound();
    }
    return () => stopAmbientSound();
  }, [isRunning, settings.soundEnabled, ambientSound, startAmbientSound, stopAmbientSound]);

  useEffect(() => {
    if (ambientGainNodeRef.current && audioCtxRef.current) {
      ambientGainNodeRef.current.gain.setValueAtTime(ambientVolume, audioCtxRef.current.currentTime);
    }
  }, [ambientVolume]);

  const togglePlay = () => {
    lastLocalActionTimeRef.current = Date.now();
    if (!isRunning) {
      if (settings.soundEnabled) playAudioChime('start');
      setHasSessionStarted(true);

      if (isInterrupted && wastedSeconds > 0) {
        saveInterruptedWasteSession(wastedSeconds, mode, activeTask?.title, overdueBreakMode);
        setWastedSeconds(0);
        setIsInterrupted(false);
        setOverdueBreakMode(null);
        interruptedStartedAtRef.current = null;
      }
      const targetEnd = Date.now() + timeLeft * 1000;
      targetEndTimestampRef.current = targetEnd;
      setIsRunning(true);
      updateActiveTimerState({
        isRunning: true,
        mode,
        targetEndTimestamp: targetEnd,
        timeLeft,
        selectedTaskId,
        isInterrupted: false,
        wastedSeconds: 0,
        interruptedStartedAt: null,
        overdueBreakMode: null,
      }).catch(() => {});
    } else {
      if (settings.soundEnabled) playAudioChime('pause');
      targetEndTimestampRef.current = null;
      setIsRunning(false);

      const now = Date.now();
      const newInterrupted = hasSessionStarted;
      if (newInterrupted) {
        setIsInterrupted(true);
        interruptedStartedAtRef.current = now;
      }

      updateActiveTimerState({
        isRunning: false,
        mode,
        targetEndTimestamp: null,
        timeLeft,
        selectedTaskId,
        isInterrupted: newInterrupted,
        wastedSeconds: 0,
        interruptedStartedAt: newInterrupted ? now : null,
        overdueBreakMode: null,
      }).catch(() => {});
    }
  };

  const handleReset = () => {
    lastLocalActionTimeRef.current = Date.now();
    if (isInterrupted && wastedSeconds > 0) {
      saveInterruptedWasteSession(wastedSeconds, mode, activeTask?.title, overdueBreakMode);
      setWastedSeconds(0);
      setIsInterrupted(false);
      setOverdueBreakMode(null);
      interruptedStartedAtRef.current = null;
    }
    targetEndTimestampRef.current = null;
    setHasSessionStarted(false);
    setIsRunning(false);
    const resetTime = getModeDurationSeconds(mode);
    setTimeLeft(resetTime);
    updateActiveTimerState({
      isRunning: false,
      mode,
      targetEndTimestamp: null,
      timeLeft: resetTime,
      selectedTaskId,
      isInterrupted: false,
      wastedSeconds: 0,
      interruptedStartedAt: null,
      overdueBreakMode: null,
    }).catch(() => {});
  };

  const handleSkip = () => {
    lastLocalActionTimeRef.current = Date.now();
    if (isInterrupted && wastedSeconds > 0) {
      saveInterruptedWasteSession(wastedSeconds, mode, activeTask?.title, overdueBreakMode);
      setWastedSeconds(0);
      setIsInterrupted(false);
      setOverdueBreakMode(null);
      interruptedStartedAtRef.current = null;
    }
    targetEndTimestampRef.current = null;
    setHasSessionStarted(false);
    setIsRunning(false);
    const nextMode: TimerMode = mode === 'work' ? 'shortBreak' : 'work';
    const nextTime = getModeDurationSeconds(nextMode);
    setMode(nextMode);
    setTimeLeft(nextTime);
    updateActiveTimerState({
      isRunning: false,
      mode: nextMode,
      targetEndTimestamp: null,
      timeLeft: nextTime,
      selectedTaskId,
      isInterrupted: false,
      wastedSeconds: 0,
      interruptedStartedAt: null,
      overdueBreakMode: null,
    }).catch(() => {});
  };

  const adjustTime = (deltaMinutes: number) => {
    lastLocalActionTimeRef.current = Date.now();
    setTimeLeft(prev => {
      const updated = Math.max(60, prev + deltaMinutes * 60);
      if (isRunning) {
        const targetEnd = Date.now() + updated * 1000;
        targetEndTimestampRef.current = targetEnd;
        updateActiveTimerState({ isRunning: true, mode, targetEndTimestamp: targetEnd, timeLeft: updated, selectedTaskId }).catch(() => {});
      } else {
        updateActiveTimerState({ isRunning: false, mode, targetEndTimestamp: null, timeLeft: updated, selectedTaskId }).catch(() => {});
      }
      return updated;
    });
  };

  const saveSettings = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    if (!isRunning) {
      setTimeLeft(getModeDurationSeconds(mode, newSettings));
    }
    updatePomodoroSettings({ settings: newSettings as unknown as Record<string, unknown> }).catch(err => {
      console.error('[PomodoroContext] Failed to sync settings to backend', err);
    });
  };

  const formatSecsToMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatSecsToHoursMins = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatSecsToHHMMSS = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeTitle = (m: TimerMode) => {
    switch (m) {
      case 'work': return 'Focus Session';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
    }
  };

  return (
    <PomodoroContext.Provider value={{
      mode, setMode, switchMode,
      timeLeft, setTimeLeft,
      isRunning, setIsRunning, togglePlay,
      handleReset, handleSkip, adjustTime,
      selectedTaskId, setSelectedTaskId,
      completedSessionsCount,
      history, wasteHistory,
      isInterrupted, wastedSeconds, totalWastedSecondsToday, overdueBreakMode,
      settings, saveSettings,
      colorTheme, changeColorTheme,
      bgStyle, changeBgStyle,
      zenMode, setZenMode,
      ambientSound, setAmbientSound,
      ambientVolume, setAmbientVolume,
      quoteIndex, setQuoteIndex,
      formatSecsToMMSS, formatSecsToHoursMins, formatSecsToHHMMSS,
      getModeTitle, getModeDurationSeconds
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoroContext() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoroContext must be used within a PomodoroProvider');
  }
  return context;
}
