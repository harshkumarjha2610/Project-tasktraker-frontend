'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePomodoroContext, THEME_PALETTES } from '@/context/PomodoroContext';
import { Play, Pause, AlertTriangle, ShieldAlert, Timer } from 'lucide-react';

export default function FloatingPomodoroWidget() {
  const pathname = usePathname();
  const {
    isRunning,
    isInterrupted,
    mode,
    timeLeft,
    wastedSeconds,
    overdueBreakMode,
    togglePlay,
    colorTheme,
    formatSecsToMMSS,
    getModeTitle
  } = usePomodoroContext();

  // Hide widget if on the Pomodoro page itself, or if timer is idle and not interrupted
  if (pathname === '/pomodoro' || (!isRunning && !isInterrupted)) {
    return null;
  }

  const activePalette = THEME_PALETTES[colorTheme];
  const modeThemeColor = isInterrupted ? '#ef4444' : activePalette.primary;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 18px',
      borderRadius: 20,
      background: 'var(--bg-card)',
      border: isInterrupted ? '1px solid rgba(239, 68, 68, 0.5)' : `1px solid ${modeThemeColor}60`,
      boxShadow: isInterrupted ? '0 8px 24px rgba(239, 68, 68, 0.3)' : `0 8px 24px ${modeThemeColor}35`,
      backdropFilter: 'blur(12px)',
      animation: 'fadeInUp 0.3s ease-out'
    }}>
      <Link href="/pomodoro" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: isInterrupted ? '#ef4444' : activePalette.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 12px ${modeThemeColor}40`
        }}>
          {isInterrupted ? <ShieldAlert size={18} color="#fff" /> : <Timer size={18} color="#fff" />}
        </div>

        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: isInterrupted ? '#ef4444' : 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {overdueBreakMode
              ? 'Overdue Return!'
              : isInterrupted
              ? `${getModeTitle(mode)} Interrupted`
              : getModeTitle(mode)}
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            color: isInterrupted ? '#ef4444' : 'var(--text-primary)',
            fontFamily: 'Inter, monospace',
            lineHeight: 1.1
          }}>
            {isInterrupted ? formatSecsToMMSS(wastedSeconds) : formatSecsToMMSS(timeLeft)}
            <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 600, opacity: 0.8 }}>
              {isInterrupted ? 'WASTED' : 'LEFT'}
            </span>
          </div>
        </div>
      </Link>

      <button
        onClick={togglePlay}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: isInterrupted ? 'rgba(239,68,68,0.15)' : 'var(--bg-secondary)',
          border: isInterrupted ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border)',
          color: isInterrupted ? '#ef4444' : modeThemeColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginLeft: 4
        }}
        title={isRunning ? 'Pause Pomodoro' : 'Resume Pomodoro'}
      >
        {isRunning ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 1 }} />}
      </button>
    </div>
  );
}
