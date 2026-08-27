'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, SkipForward, Settings, Volume2, VolumeX,
  CheckCircle2, Flame, Award, Clock, Sparkles, Target, X, Check,
  Maximize2, Minimize2, Plus, Minus, Zap, CloudRain, Waves, Wind,
  Coffee, Music, RefreshCw, Trophy, Quote, AlertTriangle, ShieldAlert,
  Palette, Sun, Moon, Sparkle
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';
type AmbientSoundType = 'none' | 'rain' | 'waves' | 'space' | 'cafe';
type PomodoroThemeColor = 'purple' | 'emerald' | 'amber' | 'cyberpunk' | 'indigo' | 'rose';
type PomodoroBgStyle = 'default' | 'oled' | 'gradient' | 'glass';

interface TimerSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
}

interface PomodoroSession {
  id: string;
  mode: TimerMode;
  durationMinutes: number;
  taskTitle?: string;
  completedAt: string;
}

interface WastedSessionRecord {
  id: string;
  mode: TimerMode;
  taskTitle?: string;
  durationSeconds: number;
  interruptedAt: string;
  isOverdueDelay?: boolean;
}

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
};

const THEME_PALETTES: Record<PomodoroThemeColor, { name: string; primary: string; secondary: string; glow: string; gradient: string }> = {
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

const BG_STYLES: Record<PomodoroBgStyle, { name: string; background: string; border: string; backdropFilter?: string }> = {
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

const MOTIVATIONAL_QUOTES = [
  "Focus on being productive instead of busy.",
  "Your future self will thank you for this session.",
  "Deep work is the superpower of the 21st century.",
  "One session at a time, extraordinary results compound.",
  "Discipline is choosing between what you want now and what you want most.",
  "Small daily improvements over time lead to stunning results.",
  "Turn off distraction. Turn on flow state."
];

// Web Audio Chime Synthesizer
const playAudioChime = (type: 'start' | 'pause' | 'complete') => {
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

export default function PomodoroPage() {
  const { filteredTasks, toggleComplete } = useTaskContext();

  // Settings State
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Theme & Background Customization State
  const [colorTheme, setColorTheme] = useState<PomodoroThemeColor>('purple');
  const [bgStyle, setBgStyle] = useState<PomodoroBgStyle>('default');

  // Timer Core State
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_SETTINGS.workDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [completedSessionsCount, setCompletedSessionsCount] = useState<number>(0);
  const [history, setHistory] = useState<PomodoroSession[]>([]);

  // Time Waste Tracker State
  const [hasSessionStarted, setHasSessionStarted] = useState<boolean>(false);
  const [isInterrupted, setIsInterrupted] = useState<boolean>(false);
  const [overdueBreakMode, setOverdueBreakMode] = useState<TimerMode | null>(null);
  const [wastedSeconds, setWastedSeconds] = useState<number>(0);
  const [totalWastedSecondsToday, setTotalWastedSecondsToday] = useState<number>(0);
  const [wasteHistory, setWasteHistory] = useState<WastedSessionRecord[]>([]);

  // Creative Features State
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [ambientSound, setAmbientSound] = useState<AmbientSoundType>('none');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.3);
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  // Web Audio Ambient Generator Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientGainNodeRef = useRef<GainNode | null>(null);
  const ambientNodesRef = useRef<AudioNode[]>([]);

  // Load saved data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('dt_pomodoro_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(parsed);
          setTimeLeft(parsed.workDuration * 60);
        } catch (e) {
          console.error('Failed to parse pomodoro settings', e);
        }
      }

      const savedColorTheme = localStorage.getItem('dt_pomodoro_color_theme') as PomodoroThemeColor;
      if (savedColorTheme && THEME_PALETTES[savedColorTheme]) {
        setColorTheme(savedColorTheme);
      }

      const savedBgStyle = localStorage.getItem('dt_pomodoro_bg_style') as PomodoroBgStyle;
      if (savedBgStyle && BG_STYLES[savedBgStyle]) {
        setBgStyle(savedBgStyle);
      }

      const savedHistory = localStorage.getItem('dt_pomodoro_history');
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          setHistory(parsedHistory);
          const todayStr = new Date().toDateString();
          const todayWorkCount = parsedHistory.filter((s: PomodoroSession) =>
            s.mode === 'work' && new Date(s.completedAt).toDateString() === todayStr
          ).length;
          setCompletedSessionsCount(todayWorkCount);
        } catch (e) {
          console.error('Failed to parse pomodoro history', e);
        }
      }

      const savedWasteHistory = localStorage.getItem('dt_pomodoro_waste_history');
      if (savedWasteHistory) {
        try {
          const parsedWaste = JSON.parse(savedWasteHistory);
          setWasteHistory(parsedWaste);
          const todayStr = new Date().toDateString();
          const todayWasteTotal = parsedWaste
            .filter((w: WastedSessionRecord) => new Date(w.interruptedAt).toDateString() === todayStr)
            .reduce((acc: number, w: WastedSessionRecord) => acc + w.durationSeconds, 0);
          setTotalWastedSecondsToday(todayWasteTotal);
        } catch (e) {
          console.error('Failed to parse waste history', e);
        }
      }

      setQuoteIndex(Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));
    }
  }, []);

  const changeColorTheme = (t: PomodoroThemeColor) => {
    setColorTheme(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dt_pomodoro_color_theme', t);
    }
  };

  const changeBgStyle = (b: PomodoroBgStyle) => {
    setBgStyle(b);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dt_pomodoro_bg_style', b);
    }
  };

  // Commit Wasted Time Session
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('dt_pomodoro_waste_history', JSON.stringify(updated));
      }
      return updated;
    });

    setTotalWastedSecondsToday(prev => {
      const newTotal = prev + durationSecs;
      if (typeof window !== 'undefined') {
        localStorage.setItem('dt_pomodoro_total_waste_secs', String(newTotal));
      }
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
        setWastedSeconds(prev => prev + 1);
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

  // Mode durations in seconds
  const getModeDurationSeconds = useCallback((m: TimerMode, customSettings = settings) => {
    switch (m) {
      case 'work': return customSettings.workDuration * 60;
      case 'shortBreak': return customSettings.shortBreakDuration * 60;
      case 'longBreak': return customSettings.longBreakDuration * 60;
    }
  }, [settings]);

  const activeTask = filteredTasks.find(t => t.id === selectedTaskId);

  // Switch mode helper
  const switchMode = useCallback((newMode: TimerMode, autoStart = false) => {
    if (isInterrupted && wastedSeconds > 0) {
      saveInterruptedWasteSession(wastedSeconds, mode, activeTask?.title, overdueBreakMode);
      setWastedSeconds(0);
      setIsInterrupted(false);
      setOverdueBreakMode(null);
    }
    setHasSessionStarted(false);
    setMode(newMode);
    setTimeLeft(getModeDurationSeconds(newMode));
    setIsRunning(autoStart);
    setQuoteIndex(prev => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  }, [isInterrupted, wastedSeconds, mode, activeTask, overdueBreakMode, saveInterruptedWasteSession, getModeDurationSeconds]);

  // Handle Session Completion
  const handleSessionComplete = useCallback(() => {
    if (isInterrupted && wastedSeconds > 0) {
      saveInterruptedWasteSession(wastedSeconds, mode, activeTask?.title, overdueBreakMode);
      setWastedSeconds(0);
      setIsInterrupted(false);
      setOverdueBreakMode(null);
    }
    setHasSessionStarted(false);

    if (settings.soundEnabled) {
      playAudioChime('complete');
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const title = mode === 'work' ? '🎉 Focus Session Completed! +50 XP' : '⚡ Break Time Over!';
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('dt_pomodoro_history', JSON.stringify(updated));
      }
      return updated;
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
        setIsInterrupted(true);
        setOverdueBreakMode(finishedBreak);
      }
    }
  }, [isInterrupted, wastedSeconds, mode, activeTask, overdueBreakMode, saveInterruptedWasteSession, settings, filteredTasks, selectedTaskId, completedSessionsCount, switchMode]);

  // Timer Tick Interval
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, handleSessionComplete]);

  // Update Document Title
  useEffect(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const modeName = mode === 'work' ? 'Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break';

    if (isInterrupted) {
      const wMins = Math.floor(wastedSeconds / 60);
      const wSecs = wastedSeconds % 60;
      const wFormatted = `${wMins.toString().padStart(2, '0')}:${wSecs.toString().padStart(2, '0')}`;
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
    if (type === 'none' || typeof window === 'undefined') return;

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
    if (isRunning && ambientSound !== 'none') {
      startAmbientSound(ambientSound);
    } else {
      stopAmbientSound();
    }
    return () => stopAmbientSound();
  }, [isRunning, ambientSound, startAmbientSound, stopAmbientSound]);

  useEffect(() => {
    if (ambientGainNodeRef.current && audioCtxRef.current) {
      ambientGainNodeRef.current.gain.setValueAtTime(ambientVolume, audioCtxRef.current.currentTime);
    }
  }, [ambientVolume]);

  // Play / Pause Toggle
  const togglePlay = () => {
    if (!isRunning) {
      if (settings.soundEnabled) playAudioChime('start');
      setHasSessionStarted(true);

      if (isInterrupted && wastedSeconds > 0) {
        saveInterruptedWasteSession(wastedSeconds, mode, activeTask?.title, overdueBreakMode);
        setWastedSeconds(0);
        setIsInterrupted(false);
        setOverdueBreakMode(null);
      }
      setIsRunning(true);
    } else {
      if (settings.soundEnabled) playAudioChime('pause');
      setIsRunning(false);

      if (hasSessionStarted) {
        setIsInterrupted(true);
      }
    }
  };

  const handleReset = () => {
    if (isInterrupted && wastedSeconds > 0) {
      saveInterruptedWasteSession(wastedSeconds, mode, activeTask?.title, overdueBreakMode);
      setWastedSeconds(0);
      setIsInterrupted(false);
      setOverdueBreakMode(null);
    }
    setHasSessionStarted(false);
    setIsRunning(false);
    setTimeLeft(getModeDurationSeconds(mode));
  };

  const handleSkip = () => {
    if (isInterrupted && wastedSeconds > 0) {
      saveInterruptedWasteSession(wastedSeconds, mode, activeTask?.title, overdueBreakMode);
      setWastedSeconds(0);
      setIsInterrupted(false);
      setOverdueBreakMode(null);
    }
    setHasSessionStarted(false);
    setIsRunning(false);
    if (mode === 'work') switchMode('shortBreak');
    else switchMode('work');
  };

  const adjustTime = (deltaMinutes: number) => {
    setTimeLeft(prev => Math.max(60, prev + deltaMinutes * 60));
  };

  // Save Settings
  const saveSettings = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dt_pomodoro_settings', JSON.stringify(newSettings));
    }
    if (!isRunning) {
      setTimeLeft(getModeDurationSeconds(mode, newSettings));
    }
    setIsSettingsOpen(false);
  };

  // Progress & Theme Computations
  const totalSeconds = getModeDurationSeconds(mode);
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

  const activePalette = THEME_PALETTES[colorTheme];
  const activeBgStyle = BG_STYLES[bgStyle];

  const modeThemeColor = isInterrupted
    ? '#ef4444'
    : mode === 'work' ? activePalette.primary : mode === 'shortBreak' ? '#06b6d4' : '#f59e0b';

  const modeGradient = isInterrupted
    ? 'linear-gradient(135deg, #ef4444, #f59e0b)'
    : mode === 'work'
    ? activePalette.gradient
    : mode === 'shortBreak'
    ? 'linear-gradient(135deg, #06b6d4, #10b981)'
    : 'linear-gradient(135deg, #f59e0b, #3b82f6)';

  // Gamification XP
  const xpEarned = completedSessionsCount * 50;
  const currentLevel = Math.floor(xpEarned / 200) + 1;
  const xpInCurrentLevel = xpEarned % 200;

  const todayStr = new Date().toDateString();
  const todaySessions = history.filter(s => new Date(s.completedAt).toDateString() === todayStr);
  const totalFocusMinsToday = todaySessions
    .filter(s => s.mode === 'work')
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  const formatSecsToMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getModeTitle = (m: TimerMode) => {
    switch (m) {
      case 'work': return 'Focus Session';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
    }
  };

  return (
    <div style={{
      maxWidth: zenMode ? '100%' : 1100,
      margin: '0 auto',
      paddingBottom: 60,
      transition: 'all 0.4s ease'
    }}>

      {/* ── Zen Mode Exit Button ──────────────────────────────────── */}
      {zenMode && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 100
        }}>
          <button
            onClick={() => setZenMode(false)}
            className="btn btn-secondary"
            style={{ padding: '10px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Minimize2 size={18} />
            <span>Exit Zen Mode</span>
          </button>
        </div>
      )}

      {/* ── Top Header ────────────────────────────────────────────── */}
      {!zenMode && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: modeGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 20px ${modeThemeColor}40`
              }}>
                <Flame size={24} color="#fff" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                    Pomodoro Timer
                  </h1>
                  <div style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.15))',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: '#f59e0b',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <Trophy size={13} />
                    <span>Lvl {currentLevel} Focus Master</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Customizable themes, background styles, focus sound engine &amp; time waste tracking
                </p>
              </div>
            </div>
          </div>

          {/* Controls Bar Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setZenMode(true)}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}
              title="Focus Zen Mode"
            >
              <Maximize2 size={17} color="var(--accent-2)" />
              <span style={{ fontSize: 13 }}>Zen Mode</span>
            </button>

            <button
              onClick={() => {
                const newSound = !settings.soundEnabled;
                saveSettings({ ...settings, soundEnabled: newSound });
              }}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}
              title={settings.soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            >
              {settings.soundEnabled ? <Volume2 size={17} color="var(--accent)" /> : <VolumeX size={17} color="var(--text-muted)" />}
              <span style={{ fontSize: 13 }}>{settings.soundEnabled ? 'Chime On' : 'Muted'}</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Settings size={17} color="var(--text-secondary)" />
              <span style={{ fontSize: 13 }}>Settings &amp; Themes</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Theme Palette & Background Quick Customizer Bar ─────── */}
      {!zenMode && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: '12px 18px',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          {/* Color Themes Swatches */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              <Palette size={16} color="var(--accent)" />
              <span>Theme Color:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {(Object.keys(THEME_PALETTES) as PomodoroThemeColor[]).map(key => {
                const p = THEME_PALETTES[key];
                const isSelected = colorTheme === key;
                return (
                  <button
                    key={key}
                    onClick={() => changeColorTheme(key)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: p.gradient,
                      border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                      boxShadow: isSelected ? `0 0 10px ${p.primary}` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                    }}
                    title={p.name}
                  />
                );
              })}
            </div>
          </div>

          {/* Background Style Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Card Style:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(Object.keys(BG_STYLES) as PomodoroBgStyle[]).map(key => {
                const isSelected = bgStyle === key;
                return (
                  <button
                    key={key}
                    onClick={() => changeBgStyle(key)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {BG_STYLES[key].name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Gamification Level Progress Banner ───────────────────── */}
      {!zenMode && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <Zap size={20} color="#f59e0b" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-primary)' }}>Level {currentLevel} Progress</span>
                <span style={{ color: '#f59e0b' }}>{xpInCurrentLevel} / 200 XP</span>
              </div>
              <div style={{
                height: 7,
                width: '100%',
                borderRadius: 10,
                background: 'var(--bg-secondary)',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(xpInCurrentLevel / 200) * 100}%`,
                  background: activePalette.gradient,
                  borderRadius: 10,
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 12,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444',
            fontSize: 13,
            fontWeight: 700
          }}>
            <Flame size={18} fill="#ef4444" />
            <span>{completedSessionsCount} Streak</span>
          </div>
        </div>
      )}

      {/* ── Main Timer Card (Uses Selected Theme & Background) ──── */}
      <div style={{
        background: activeBgStyle.background,
        backdropFilter: activeBgStyle.backdropFilter || 'none',
        borderRadius: 28,
        border: isInterrupted ? '1px solid rgba(239, 68, 68, 0.4)' : activeBgStyle.border,
        padding: zenMode ? '60px 24px' : '36px 24px',
        boxShadow: isInterrupted ? '0 8px 32px rgba(239, 68, 68, 0.25)' : 'var(--shadow)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 32,
        transition: 'all 0.3s ease'
      }}>
        {/* Ambient Backlight Glow */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: modeThemeColor,
          opacity: isRunning || isInterrupted ? 0.18 : 0.06,
          filter: 'blur(100px)',
          transition: 'all 0.5s ease',
          pointerEvents: 'none'
        }} />

        {/* Mode Selector Tabs & Presets */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          marginBottom: 32,
          position: 'relative',
          zIndex: 2
        }}>
          {/* Main Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { key: 'work', label: 'Focus Mode', minutes: settings.workDuration },
              { key: 'shortBreak', label: 'Short Break', minutes: settings.shortBreakDuration },
              { key: 'longBreak', label: 'Long Break', minutes: settings.longBreakDuration },
            ].map(tab => {
              const isActive = mode === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => switchMode(tab.key as TimerMode)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 16,
                    fontSize: 14,
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: isActive ? 'transparent' : 'var(--border)',
                    background: isActive ? modeGradient : 'var(--bg-secondary)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive ? `0 8px 22px ${modeThemeColor}40` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-card)',
                    color: isActive ? '#fff' : 'var(--text-muted)'
                  }}>
                    {tab.minutes}m
                  </span>
                </button>
              );
            })}
          </div>

          {/* Presets */}
          {!zenMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>Presets:</span>
              {[
                { label: '15m Sprint', mins: 15 },
                { label: '25m Classic', mins: 25 },
                { label: '45m Deep Work', mins: 45 },
                { label: '60m Marathon', mins: 60 },
              ].map(preset => (
                <button
                  key={preset.mins}
                  onClick={() => saveSettings({ ...settings, workDuration: preset.mins })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: settings.workDuration === preset.mins ? activePalette.primary : 'var(--text-secondary)',
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Circular Timer Display */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{
            position: 'relative',
            width: zenMode ? 320 : 280,
            height: zenMode ? 320 : 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            <svg
              width={zenMode ? 300 : 260}
              height={zenMode ? 300 : 260}
              viewBox="0 0 200 200"
              style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
            >
              <circle
                cx="100"
                cy="100"
                r="92"
                stroke="var(--border)"
                strokeWidth="4"
                strokeDasharray="4 4"
                fill="transparent"
              />
              <circle
                cx="100"
                cy="100"
                r="86"
                stroke="var(--border)"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="100"
                cy="100"
                r="86"
                stroke={modeThemeColor}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray="540.35"
                strokeDashoffset={540.35 - (540.35 * progressPercent) / 100}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease',
                  filter: isRunning || isInterrupted ? `drop-shadow(0 0 12px ${modeThemeColor})` : 'none'
                }}
              />
            </svg>

            {/* Inner Content */}
            <div style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <button
                  onClick={() => adjustTime(-5)}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    borderRadius: 8,
                    padding: '2px 6px',
                    fontSize: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                  title="Subtract 5 mins"
                >
                  <Minus size={10} />5m
                </button>

                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: modeThemeColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em'
                }}>
                  {overdueBreakMode
                    ? 'Break Overdue Delay'
                    : isInterrupted
                    ? `${getModeTitle(mode)} Interrupted`
                    : mode === 'work'
                    ? 'Focus State'
                    : mode === 'shortBreak'
                    ? 'Short Break'
                    : 'Rest Mode'}
                </span>

                <button
                  onClick={() => adjustTime(5)}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    borderRadius: 8,
                    padding: '2px 6px',
                    fontSize: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                  title="Add 5 mins"
                >
                  <Plus size={10} />5m
                </button>
              </div>

              {/* Digital Clock */}
              <div style={{
                fontSize: zenMode ? 66 : 58,
                fontWeight: 800,
                color: isInterrupted ? '#ef4444' : 'var(--text-primary)',
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'Inter, monospace',
                lineHeight: 1.1
              }}>
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}
                <span style={{ opacity: isRunning ? 1 : 0.6, transition: 'opacity 0.3s' }}>:</span>
                {(timeLeft % 60).toString().padStart(2, '0')}
              </div>

              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: isInterrupted ? '#ef4444' : 'var(--text-secondary)',
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                {isRunning ? (
                  <>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: modeThemeColor,
                      boxShadow: `0 0 12px ${modeThemeColor}`,
                      animation: 'pulse 1.5s infinite'
                    }} />
                    <span>{mode === 'work' ? 'Focusing...' : 'On Break...'}</span>
                  </>
                ) : isInterrupted ? (
                  <>
                    <AlertTriangle size={14} color="#ef4444" />
                    <span>{overdueBreakMode ? 'Overdue Return!' : 'Paused Mid-Session'}</span>
                  </>
                ) : (
                  <span>Click Start</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 36
          }}>
            <button
              onClick={handleReset}
              className="btn btn-secondary"
              style={{
                width: 50,
                height: 50,
                borderRadius: 16,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Reset Timer"
            >
              <RotateCcw size={19} color="var(--text-secondary)" />
            </button>

            {/* Play / Resume / Start Flow */}
            <button
              onClick={togglePlay}
              style={{
                padding: '16px 48px',
                borderRadius: 18,
                background: modeGradient,
                color: '#ffffff',
                fontSize: 17,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: `0 10px 28px ${modeThemeColor}50`,
                transition: 'all 0.25s ease',
                transform: isRunning ? 'scale(0.98)' : 'scale(1)'
              }}
            >
              {isRunning ? <Pause size={22} fill="#fff" /> : <Play size={22} fill="#fff" style={{ marginLeft: 2 }} />}
              <span>
                {isRunning
                  ? 'Pause Flow'
                  : overdueBreakMode
                  ? 'Resume Focus Now!'
                  : isInterrupted
                  ? 'Resume Flow'
                  : 'Start Flow'}
              </span>
            </button>

            <button
              onClick={handleSkip}
              className="btn btn-secondary"
              style={{
                width: 50,
                height: 50,
                borderRadius: 16,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Skip Session"
            >
              <SkipForward size={19} color="var(--text-secondary)" />
            </button>
          </div>
        </div>

        {/* ── 🚨 LIVE TIME WASTED INTERRUPTED / OVERDUE ALERT BANNER ─── */}
        {isInterrupted && (
          <div style={{
            marginTop: 30,
            padding: '16px 20px',
            borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.16), rgba(245, 158, 11, 0.08))',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 6px 20px rgba(239, 68, 68, 0.15)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            animation: 'pulse 2s infinite'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldAlert size={22} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>
                  {overdueBreakMode
                    ? `${(overdueBreakMode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK')} ENDED! OVERDUE FOCUS RETURN`
                    : `${getModeTitle(mode).toUpperCase()} INTERRUPTED! TIME WASTE TICKER ACTIVE`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '1px 0 0' }}>
                  {overdueBreakMode
                    ? 'Your break completed and you forgot to start the focus session. Time waste ticker is active until you click "Resume Focus Now!".'
                    : 'You stopped mid-session. Wasted time is being calculated and logged to Time Waste module.'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(0,0,0,0.3)',
              padding: '8px 16px',
              borderRadius: 12,
              border: '1px solid rgba(239,68,68,0.4)'
            }}>
              <AlertTriangle size={18} color="#ef4444" />
              <span style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#ef4444',
                fontFamily: 'Inter, monospace'
              }}>
                {formatSecsToMMSS(wastedSeconds)}
              </span>
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>WASTED</span>
            </div>
          </div>
        )}

        {/* ── Ambient Sound Synthesizer Bar ────────────────────────── */}
        {!zenMode && (
          <div style={{
            marginTop: 32,
            padding: '14px 18px',
            borderRadius: 16,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Music size={17} color="var(--accent-2)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Focus Ambient Generator:
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'none', label: 'Off', icon: VolumeX },
                { key: 'rain', label: 'Rain', icon: CloudRain },
                { key: 'waves', label: 'Ocean Waves', icon: Waves },
                { key: 'space', label: 'Deep Space', icon: Wind },
                { key: 'cafe', label: 'Coffee Shop', icon: Coffee },
              ].map(sound => {
                const Icon = sound.icon;
                const isActive = ambientSound === sound.key;
                return (
                  <button
                    key={sound.key}
                    onClick={() => setAmbientSound(sound.key as AmbientSoundType)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: isActive ? 'var(--accent-2)' : 'transparent',
                      background: isActive ? 'rgba(6, 186, 212, 0.15)' : 'var(--bg-card)',
                      color: isActive ? 'var(--accent-2)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Icon size={14} />
                    <span>{sound.label}</span>
                  </button>
                );
              })}

              {ambientSound !== 'none' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <Volume2 size={14} color="var(--text-muted)" />
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={ambientVolume}
                    onChange={e => setAmbientVolume(parseFloat(e.target.value))}
                    style={{ width: 70, accentColor: 'var(--accent-2)', cursor: 'pointer' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Linked Task Selection Bar ────────────────────────────── */}
        {!zenMode && (
          <div style={{
            marginTop: 16,
            padding: '16px 20px',
            borderRadius: 16,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240 }}>
              <Target size={18} color="var(--accent)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                Active Task:
              </span>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontSize: 13,
                  outline: 'none',
                  flex: 1,
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Select a task to focus on --</option>
                {filteredTasks.filter(t => t.status !== 'done').map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.priority.toUpperCase()}] {t.title}
                  </option>
                ))}
              </select>
            </div>

            {activeTask && (
              <button
                onClick={() => {
                  toggleComplete(activeTask.id);
                }}
                className="btn btn-sm"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '7px 14px',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Check size={14} />
                <span>Mark Completed</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Motivational Quote Banner ───────────────────────────── */}
      {!zenMode && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,186,212,0.06))',
          borderRadius: 18,
          border: '1px solid rgba(139,92,246,0.2)',
          padding: '16px 20px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Quote size={20} color="var(--accent)" />
            <span style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-primary)', fontWeight: 500 }}>
              &quot;{MOTIVATIONAL_QUOTES[quoteIndex]}&quot;
            </span>
          </div>

          <button
            onClick={() => setQuoteIndex((quoteIndex + 1) % MOTIVATIONAL_QUOTES.length)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4
            }}
            title="Next quote"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* ── Overview Stats Cards ──────────────────────────────────── */}
      {!zenMode && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 32
        }}>
          {/* Card 1: Completed Sessions */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(139, 92, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={24} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                {completedSessionsCount}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Pomodoros Today
              </div>
            </div>
          </div>

          {/* Card 2: Total Focus Time */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(6, 186, 212, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={24} color="#06b6d4" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                {totalFocusMinsToday >= 60
                  ? `${(totalFocusMinsToday / 60).toFixed(1)} hrs`
                  : `${totalFocusMinsToday} mins`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Focus Time Today
              </div>
            </div>
          </div>

          {/* Card 3: Target Goal */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={24} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                {completedSessionsCount} / {settings.longBreakInterval * 2}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Daily Target Goal
              </div>
            </div>
          </div>

          {/* Card 4: TIME WASTED TODAY CARD 🚨 */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 18,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>
                {Math.floor((totalWastedSecondsToday + wastedSeconds) / 60)}m {(totalWastedSecondsToday + wastedSeconds) % 60}s
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Time Wasted (Interrupted / Overdue)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sessions & Interruption History Log ────────────────────── */}
      {!zenMode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Completed Sessions Log */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 20,
            border: '1px solid var(--border)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Completed Sessions
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {history.length} recorded
              </span>
            </div>

            {history.length === 0 ? (
              <div style={{
                padding: '36px 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 14
              }}>
                No sessions completed yet today. Hit &quot;Start Flow&quot; above!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.slice(0, 8).map(s => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <CheckCircle2
                        size={18}
                        color={s.mode === 'work' ? '#8b5cf6' : s.mode === 'shortBreak' ? '#06b6d4' : '#f59e0b'}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {s.taskTitle ? s.taskTitle : (s.mode === 'work' ? 'Focus Session' : s.mode === 'shortBreak' ? 'Short Break' : 'Long Break')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: s.mode === 'work' ? 'rgba(139,92,246,0.15)' : 'rgba(6,186,212,0.15)',
                      color: s.mode === 'work' ? '#8b5cf6' : '#06b6d4'
                    }}>
                      +{s.durationMinutes} mins
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time Waste Interruptions Log */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 20,
            border: '1px solid rgba(239,68,68,0.25)',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#ef4444" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>
                  Time Waste Interruptions &amp; Delays
                </h3>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {wasteHistory.length} logged
              </span>
            </div>

            {wasteHistory.length === 0 ? (
              <div style={{
                padding: '36px 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 14
              }}>
                🎉 Zero interruptions logged! Keep up the continuous focus flow.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {wasteHistory.slice(0, 8).map(w => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ShieldAlert size={18} color="#ef4444" />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {w.isOverdueDelay
                            ? 'Overdue Return After Break'
                            : w.mode === 'work'
                            ? (w.taskTitle ? `Interrupted: "${w.taskTitle}"` : 'Interrupted Focus Session')
                            : w.mode === 'shortBreak'
                            ? 'Interrupted Short Break'
                            : 'Interrupted Long Break'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(w.interruptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444'
                    }}>
                      -{Math.floor(w.durationSeconds / 60)}m {w.durationSeconds % 60}s
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Settings & Theme Modal ───────────────────────────────── */}
      {isSettingsOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            width: '100%',
            maxWidth: 480,
            padding: 28,
            boxShadow: 'var(--shadow)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Settings size={20} color="var(--accent)" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Timer &amp; Theme Settings
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: 6, borderRadius: 8 }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Color Theme Selector */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Theme Color Palette
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {(Object.keys(THEME_PALETTES) as PomodoroThemeColor[]).map(key => {
                    const p = THEME_PALETTES[key];
                    const isSelected = colorTheme === key;
                    return (
                      <button
                        key={key}
                        onClick={() => changeColorTheme(key)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 600,
                          background: 'var(--bg-secondary)',
                          border: '1px solid',
                          borderColor: isSelected ? p.primary : 'var(--border)',
                          color: isSelected ? p.primary : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.gradient, display: 'inline-block' }} />
                        <span>{p.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card Style Selector */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Timer Card Background Style
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(Object.keys(BG_STYLES) as PomodoroBgStyle[]).map(key => {
                    const isSelected = bgStyle === key;
                    return (
                      <button
                        key={key}
                        onClick={() => changeBgStyle(key)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 600,
                          background: 'var(--bg-secondary)',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                          color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {BG_STYLES[key].name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Durations (Minutes)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Focus
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={settings.workDuration}
                    onChange={e => setSettings({ ...settings, workDuration: parseInt(e.target.value) || 25 })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: 14
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Short Break
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.shortBreakDuration}
                    onChange={e => setSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) || 5 })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: 14
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Long Break
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.longBreakDuration}
                    onChange={e => setSettings({ ...settings, longBreakDuration: parseInt(e.target.value) || 15 })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: 14
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Long Break Interval (Pomodoros)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={settings.longBreakInterval}
                  onChange={e => setSettings({ ...settings, longBreakInterval: parseInt(e.target.value) || 4 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Auto-start Breaks</span>
                  <input
                    type="checkbox"
                    checked={settings.autoStartBreaks}
                    onChange={e => setSettings({ ...settings, autoStartBreaks: e.target.checked })}
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Auto-start Pomodoros</span>
                  <input
                    type="checkbox"
                    checked={settings.autoStartPomodoros}
                    onChange={e => setSettings({ ...settings, autoStartPomodoros: e.target.checked })}
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  onClick={() => saveSettings(settings)}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, justifyContent: 'center' }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
