'use client';

import { useState, useEffect } from 'react';
import {
  Play, Pause, RotateCcw, SkipForward, Settings, Volume2, VolumeX,
  CheckCircle2, Flame, Award, Clock, Sparkles, Target, X, Check,
  Maximize2, Minimize2, Plus, Minus, Zap, CloudRain, Waves, Wind,
  Coffee, Music, RefreshCw, Trophy, Quote, AlertTriangle, ShieldAlert,
  Palette, BellRing, Sliders, Calendar, Filter
} from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';
import {
  usePomodoroContext,
  THEME_PALETTES,
  BG_STYLES,
  CLOCK_STYLES,
  MOTIVATIONAL_QUOTES,
  TimerMode,
  AmbientSoundType,
  PomodoroThemeColor,
  PomodoroBgStyle,
  ClockSoundStyle,
  TimerSettings
} from '@/context/PomodoroContext';

type HistoryDateFilter = 'today' | 'yesterday' | 'week' | 'custom' | 'all';

export default function PomodoroPage() {
  const { filteredTasks, tasks, toggleComplete } = useTaskContext();
  const {
    mode, switchMode,
    timeLeft, isRunning, togglePlay, handleReset, handleSkip, adjustTime,
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
    formatSecsToMMSS, formatSecsToHoursMins, getModeTitle, getModeDurationSeconds
  } = usePomodoroContext();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryDateFilter>('today');
  const [customDate, setCustomDate] = useState<string>('');

  // Auto-select task if passed via URL parameter e.g. /pomodoro?taskId=123
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTaskId = params.get('taskId');
      if (urlTaskId) {
        setSelectedTaskId(urlTaskId);
      }
    }
  }, [setSelectedTaskId]);

  // Date Filter Logic
  const filterByDate = <T extends { completedAt?: string; interruptedAt?: string }>(items: T[]) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    return items.filter(item => {
      const dateStr = item.completedAt || item.interruptedAt;
      if (!dateStr) return true;
      const itemDate = new Date(dateStr);
      const itemDateStr = itemDate.toDateString();

      if (historyFilter === 'today') return itemDateStr === today;
      if (historyFilter === 'yesterday') return itemDateStr === yesterday;
      if (historyFilter === 'week') return itemDate.getTime() >= sevenDaysAgo;
      if (historyFilter === 'custom' && customDate) {
        const customDateObj = new Date(customDate + 'T00:00:00');
        return itemDateStr === customDateObj.toDateString();
      }
      return true;
    });
  };

  const filteredHistory = filterByDate(history);
  const filteredWasteHistory = filterByDate(wasteHistory);

  // Dynamic Date-Wise Statistics Computation
  const selectedFocusMins = filteredHistory
    .filter(s => s.mode === 'work')
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  const selectedPomodoroCount = filteredHistory.filter(s => s.mode === 'work').length;

  const selectedWastedSecs = filteredWasteHistory.reduce((acc, w) => acc + w.durationSeconds, 0)
    + (historyFilter === 'today' ? wastedSeconds : 0);

  const getFilterLabel = () => {
    switch (historyFilter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'Past 7 Days';
      case 'custom': return customDate ? new Date(customDate + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Custom Date';
      case 'all': return 'All Time Archives';
    }
  };

  const activeTask = tasks.find(t => t.id === selectedTaskId) || filteredTasks.find(t => t.id === selectedTaskId);

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

  const formatItemTimestamp = (isoStr: string) => {
    const d = new Date(isoStr);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (historyFilter === 'today') return timeStr;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
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
                  Live date-wise statistics &amp; archives • Auto-resets daily at midnight • Continuous timer flow
                </p>
              </div>
            </div>
          </div>

          {/* Controls Bar Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Master Sound Toggle */}
            <button
              onClick={() => {
                const newSound = !settings.soundEnabled;
                saveSettings({ ...settings, soundEnabled: newSound });
              }}
              className="btn btn-secondary"
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: settings.soundEnabled ? 'rgba(139,92,246,0.15)' : 'rgba(239,68,68,0.12)',
                borderColor: settings.soundEnabled ? 'rgba(139,92,246,0.4)' : 'rgba(239,68,68,0.3)',
                color: settings.soundEnabled ? '#8b5cf6' : '#ef4444'
              }}
              title={settings.soundEnabled ? 'Mute All Sounds' : 'Unmute All Sounds'}
            >
              {settings.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
              <span style={{ fontSize: 13 }}>{settings.soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </button>

            {/* Clock Ticking Toggle */}
            <button
              onClick={() => {
                const newTick = !settings.tickingEnabled;
                saveSettings({ ...settings, tickingEnabled: newTick });
              }}
              className="btn btn-secondary"
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: settings.soundEnabled && settings.tickingEnabled ? 'rgba(245,158,11,0.15)' : undefined,
                borderColor: settings.soundEnabled && settings.tickingEnabled ? 'rgba(245,158,11,0.4)' : undefined,
                color: settings.soundEnabled && settings.tickingEnabled ? '#f59e0b' : 'var(--text-secondary)'
              }}
              title={settings.tickingEnabled ? 'Disable Clock Ticking' : 'Enable Clock Ticking'}
            >
              <Clock size={17} />
              <span style={{ fontSize: 13 }}>{settings.soundEnabled && settings.tickingEnabled ? 'Tick-Tock On' : 'Tick Off'}</span>
            </button>

            {/* Bell Ring Toggle */}
            <button
              onClick={() => {
                const newBell = !settings.bellEnabled;
                saveSettings({ ...settings, bellEnabled: newBell });
              }}
              className="btn btn-secondary"
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: settings.soundEnabled && settings.bellEnabled ? 'rgba(6,186,212,0.15)' : undefined,
                borderColor: settings.soundEnabled && settings.bellEnabled ? 'rgba(6,186,212,0.4)' : undefined,
                color: settings.soundEnabled && settings.bellEnabled ? '#06b6d4' : 'var(--text-secondary)'
              }}
              title={settings.bellEnabled ? 'Disable Transition Bell' : 'Enable Transition Bell'}
            >
              <BellRing size={17} />
              <span style={{ fontSize: 13 }}>{settings.soundEnabled && settings.bellEnabled ? 'Zen Bell On' : 'Bell Off'}</span>
            </button>

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
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Settings size={17} color="var(--text-secondary)" />
              <span style={{ fontSize: 13 }}>Settings</span>
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
                {formatSecsToHoursMins(wastedSeconds)}
              </span>
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>WASTED</span>
            </div>
          </div>
        )}

        {/* ── Ambient & Clock Sound Synthesizer Bar ──────────────── */}
        {!zenMode && (
          <div style={{
            marginTop: 32,
            padding: '14px 18px',
            borderRadius: 16,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}>
            {/* Ambient Sound Selector */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music size={17} color="var(--accent-2)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Focus Audio Engine:
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { key: 'none', label: 'Off', icon: VolumeX },
                  { key: 'clock', label: 'Clock Ticking', icon: Clock },
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

                {ambientSound !== 'none' && ambientSound !== 'clock' && (
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

            {/* ── Clock Sound Style Selector Bar ────────────────────── */}
            {(settings.tickingEnabled || ambientSound === 'clock') && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                paddingTop: 10,
                borderTop: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <Sliders size={14} color="#f59e0b" />
                  <span>Clock Ticking Style:</span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(Object.keys(CLOCK_STYLES) as ClockSoundStyle[]).map(styleKey => {
                    const info = CLOCK_STYLES[styleKey];
                    const isSelected = (settings.clockStyle || 'classic') === styleKey;
                    return (
                      <button
                        key={styleKey}
                        onClick={() => saveSettings({ ...settings, clockStyle: styleKey })}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          border: '1px solid',
                          borderColor: isSelected ? '#f59e0b' : 'var(--border)',
                          background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                          color: isSelected ? '#f59e0b' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                        title={info.description}
                      >
                        {info.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{
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
                  {(tasks.length > 0 ? tasks : filteredTasks)
                    .filter(t => !t.isDeleted && t.status !== 'done')
                    .map(t => {
                      const actual = t.actualMinutes || 0;
                      const est = t.estimatedMinutes;
                      const timeStr = est ? `${actual}/${est}m` : `${actual}m`;
                      return (
                        <option key={t.id} value={t.id}>
                          [{t.priority.toUpperCase()}] {t.title} ({timeStr} • {t.pomodorosCompleted || 0} 🍅)
                        </option>
                      );
                    })}
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

            {/* Detailed task tracking stats bar */}
            {activeTask && (
              <div style={{
                paddingTop: 10,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    ⏱️ Focus Time: <strong style={{ color: 'var(--accent)', fontWeight: 700 }}>{activeTask.actualMinutes || 0} mins</strong>
                    {activeTask.estimatedMinutes ? ` / ${activeTask.estimatedMinutes} mins target` : ''}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    🍅 Pomodoros: <strong style={{ color: '#ef4444', fontWeight: 700 }}>{activeTask.pomodorosCompleted || 0}</strong>
                  </span>
                </div>

                {activeTask.estimatedMinutes && (
                  <div style={{ flex: 1, minWidth: 160, maxWidth: 280, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.round(((activeTask.actualMinutes || 0) / activeTask.estimatedMinutes) * 100))}%`,
                        background: 'var(--accent)',
                        borderRadius: 3,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {Math.min(100, Math.round(((activeTask.actualMinutes || 0) / activeTask.estimatedMinutes) * 100))}%
                    </span>
                  </div>
                )}
              </div>
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

      {/* ── Date-Wise Filter Control Bar ────────────────────────── */}
      {!zenMode && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 18,
          border: '1px solid var(--border)',
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={18} color="var(--accent)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Date-Wise Statistics Filter:
            </span>
            <span style={{
              fontSize: 12,
              padding: '2px 10px',
              borderRadius: 20,
              background: 'rgba(139, 92, 246, 0.15)',
              color: 'var(--accent)',
              fontWeight: 700
            }}>
              {getFilterLabel()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'week', label: 'Past 7 Days' },
              { key: 'all', label: 'All Time' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setHistoryFilter(f.key as HistoryDateFilter)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: historyFilter === f.key ? 'var(--accent)' : 'var(--border)',
                  background: historyFilter === f.key ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                  color: historyFilter === f.key ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {f.label}
              </button>
            ))}

            {/* Custom Date Picker Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="date"
                value={customDate}
                onChange={e => {
                  setCustomDate(e.target.value);
                  if (e.target.value) setHistoryFilter('custom');
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  background: historyFilter === 'custom' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                  border: historyFilter === 'custom' ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: historyFilter === 'custom' ? 'var(--accent)' : 'var(--text-secondary)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                title="Select Custom Date"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Overview Stats Cards (Dynamic Date-Wise Statistics) ─── */}
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
                {selectedPomodoroCount}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Pomodoros ({getFilterLabel()})
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
                {selectedFocusMins >= 60
                  ? `${(selectedFocusMins / 60).toFixed(1)} hrs`
                  : `${selectedFocusMins} mins`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Focus Time ({getFilterLabel()})
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
                {selectedPomodoroCount} / {settings.longBreakInterval * 2}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Target Goal ({getFilterLabel()})
              </div>
            </div>
          </div>

          {/* Card 4: TIME WASTED STATS CARD 🚨 */}
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
                {formatSecsToHoursMins(selectedWastedSecs)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Time Wasted ({getFilterLabel()})
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
                {filteredHistory.length} recorded ({getFilterLabel()})
              </span>
            </div>

            {filteredHistory.length === 0 ? (
              <div style={{
                padding: '36px 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 14
              }}>
                No completed sessions found for {getFilterLabel()}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredHistory.slice(0, 10).map(s => (
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
                          {formatItemTimestamp(s.completedAt)}
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
                {filteredWasteHistory.length} logged ({getFilterLabel()})
              </span>
            </div>

            {filteredWasteHistory.length === 0 ? (
              <div style={{
                padding: '36px 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 14
              }}>
                🎉 Zero interruptions logged for {getFilterLabel()}!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredWasteHistory.slice(0, 10).map(w => (
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
                          {formatItemTimestamp(w.interruptedAt)}
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
                      -{formatSecsToHoursMins(w.durationSeconds)}
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
                  Timer &amp; Audio Settings
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
              {/* Audio Controls */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Audio &amp; Sounds
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Master Audio Sound Enabled</span>
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={e => saveSettings({ ...settings, soundEnabled: e.target.checked })}
                      style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', opacity: settings.soundEnabled ? 1 : 0.5 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Clock Ticking Sound</span>
                    <input
                      type="checkbox"
                      checked={settings.tickingEnabled}
                      disabled={!settings.soundEnabled}
                      onChange={e => saveSettings({ ...settings, tickingEnabled: e.target.checked })}
                      style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </label>

                  {/* Clock Ticking Style selector */}
                  {settings.tickingEnabled && (
                    <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Clock Ticking Sound Style:</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {(Object.keys(CLOCK_STYLES) as ClockSoundStyle[]).map(styleKey => {
                          const isSelected = (settings.clockStyle || 'classic') === styleKey;
                          return (
                            <button
                              key={styleKey}
                              onClick={() => saveSettings({ ...settings, clockStyle: styleKey })}
                              style={{
                                padding: '6px 8px',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 600,
                                background: 'var(--bg-secondary)',
                                border: '1px solid',
                                borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                                color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              {CLOCK_STYLES[styleKey].name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Transition Zen Bell Ringing</span>
                    <input
                      type="checkbox"
                      checked={settings.bellEnabled}
                      onChange={e => saveSettings({ ...settings, bellEnabled: e.target.checked })}
                      style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </label>
                </div>
              </div>

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
                    onChange={e => saveSettings({ ...settings, workDuration: parseInt(e.target.value) || 25 })}
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
                    onChange={e => saveSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) || 5 })}
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
                    onChange={e => saveSettings({ ...settings, longBreakDuration: parseInt(e.target.value) || 15 })}
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
                  onChange={e => saveSettings({ ...settings, longBreakInterval: parseInt(e.target.value) || 4 })}
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
                    onChange={e => saveSettings({ ...settings, autoStartBreaks: e.target.checked })}
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Auto-start Pomodoros</span>
                  <input
                    type="checkbox"
                    checked={settings.autoStartPomodoros}
                    onChange={e => saveSettings({ ...settings, autoStartPomodoros: e.target.checked })}
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, justifyContent: 'center' }}
                >
                  Save &amp; Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
