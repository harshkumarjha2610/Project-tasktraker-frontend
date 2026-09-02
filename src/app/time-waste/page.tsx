'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  History, Play, Square, RotateCcw, AlertTriangle, Clock, 
  Flame, Calendar, Plus, Trash2, Tag, ShieldAlert, Sparkles 
} from 'lucide-react';
import { getPomodoroData, updateStandaloneWasteState } from '@/lib/api';

interface WasteSession {
  id: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  reason: string;
}

const getLocalDateKey = (d: Date | string | number) => {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TimeWastePage() {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState<number>(0);
  const [displayMs, setDisplayMs] = useState<number>(0);
  const [sessions, setSessions] = useState<WasteSession[]>([]);
  const [reasonInput, setReasonInput] = useState<string>('Procrastination');
  const [customNote, setCustomNote] = useState<string>('');

  const initializedRef = useRef<boolean>(false);

  // Sync waste data with backend & migrate local storage on initial mount
  const syncWasteDataFromBackend = useCallback(async () => {
    try {
      const data = await getPomodoroData();
      const remote = data.standaloneWasteState;

      if (typeof window !== 'undefined') {
        const storedRunning = localStorage.getItem('tw_timer_running');
        const storedStartedAt = localStorage.getItem('tw_timer_started_at');
        const storedAccumulated = localStorage.getItem('tw_accumulated_ms');
        const storedSessions = localStorage.getItem('tw_history_sessions');

        if (storedRunning !== null || storedSessions !== null) {
          let localAccumulated = storedAccumulated ? parseInt(storedAccumulated, 10) : 0;
          if (isNaN(localAccumulated)) localAccumulated = 0;
          let localSessions: WasteSession[] = [];
          if (storedSessions) {
            try { localSessions = JSON.parse(storedSessions); } catch (e) {}
          }
          const localRunning = storedRunning !== 'false';
          const localStartedAt = storedStartedAt ? parseInt(storedStartedAt, 10) : (localRunning ? Date.now() : null);

          const mergedSessionsMap = new Map<string, WasteSession>();
          (remote?.sessions || []).forEach(s => mergedSessionsMap.set(s.id, s as WasteSession));
          localSessions.forEach(s => mergedSessionsMap.set(s.id, s));
          const mergedSessions = Array.from(mergedSessionsMap.values());

          const finalAccumulated = Math.max(localAccumulated, remote?.accumulatedMs || 0);
          const finalRunning = remote?.isRunning !== undefined ? remote.isRunning : localRunning;
          const finalStartedAt = remote?.startedAt ?? localStartedAt;

          await updateStandaloneWasteState({
            isRunning: finalRunning,
            startedAt: finalStartedAt,
            accumulatedMs: finalAccumulated,
            sessions: mergedSessions,
          });

          localStorage.removeItem('tw_timer_running');
          localStorage.removeItem('tw_timer_started_at');
          localStorage.removeItem('tw_accumulated_ms');
          localStorage.removeItem('tw_history_sessions');

          setIsRunning(finalRunning);
          setStartedAt(finalStartedAt);
          setAccumulatedMs(finalAccumulated);
          setSessions(mergedSessions);
          if (finalRunning && finalStartedAt) {
            setDisplayMs(finalAccumulated + (Date.now() - finalStartedAt));
          } else {
            setDisplayMs(finalAccumulated);
          }
          return;
        }
      }

      if (remote) {
        setIsRunning(remote.isRunning);
        setStartedAt(remote.startedAt);
        setAccumulatedMs(remote.accumulatedMs || 0);
        if (Array.isArray(remote.sessions)) {
          setSessions(remote.sessions as WasteSession[]);
        }
        if (remote.isRunning && remote.startedAt) {
          setDisplayMs((remote.accumulatedMs || 0) + (Date.now() - remote.startedAt));
        } else {
          setDisplayMs(remote.accumulatedMs || 0);
        }
      }
    } catch (err) {
      console.error('[TimeWaste] Failed to sync backend waste data:', err);
    }
  }, []);

  useEffect(() => {
    syncWasteDataFromBackend();
    initializedRef.current = true;

    // Cross-device continuous polling every 6 seconds
    const pollInterval = setInterval(() => {
      syncWasteDataFromBackend();
    }, 6000);

    const handleFocus = () => {
      syncWasteDataFromBackend();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      window.addEventListener('visibilitychange', handleFocus);
    }

    return () => {
      clearInterval(pollInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('visibilitychange', handleFocus);
      }
    };
  }, [syncWasteDataFromBackend]);

  // Interval loop for live ticking
  useEffect(() => {
    if (!isRunning || !startedAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const currentElapsed = accumulatedMs + (now - startedAt);
      setDisplayMs(currentElapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startedAt, accumulatedMs]);

  // Handle Stop Timer
  const handleStop = () => {
    if (!isRunning || !startedAt) return;

    const now = Date.now();
    const currentSessionMs = now - startedAt;
    const newAccumulated = accumulatedMs + currentSessionMs;

    // Log session to history
    const newSession: WasteSession = {
      id: Date.now().toString(),
      startTime: new Date(startedAt).toISOString(),
      endTime: new Date(now).toISOString(),
      durationMs: currentSessionMs,
      reason: customNote.trim() || reasonInput,
    };

    const updatedSessions = [newSession, ...sessions];

    setIsRunning(false);
    setStartedAt(null);
    setAccumulatedMs(newAccumulated);
    setDisplayMs(newAccumulated);
    setSessions(updatedSessions);
    setCustomNote('');

    updateStandaloneWasteState({
      isRunning: false,
      startedAt: null,
      accumulatedMs: newAccumulated,
      sessions: updatedSessions,
    }).catch(err => console.error('[TimeWaste] Failed to save stop state:', err));
  };

  // Handle Start Timer
  const handleStart = () => {
    if (isRunning) return;

    const now = Date.now();
    setIsRunning(true);
    setStartedAt(now);

    updateStandaloneWasteState({
      isRunning: true,
      startedAt: now,
      accumulatedMs,
      sessions,
    }).catch(err => console.error('[TimeWaste] Failed to save start state:', err));
  };

  // Handle Reset Timer
  const handleReset = () => {
    if (!confirm('Are you sure you want to reset the time waste counter?')) return;

    const now = Date.now();
    setAccumulatedMs(0);
    const newStarted = isRunning ? now : null;

    if (isRunning) {
      setStartedAt(now);
      setDisplayMs(0);
    } else {
      setStartedAt(null);
      setDisplayMs(0);
    }

    updateStandaloneWasteState({
      isRunning,
      startedAt: newStarted,
      accumulatedMs: 0,
      sessions,
    }).catch(err => console.error('[TimeWaste] Failed to save reset state:', err));
  };

  // Delete a session log
  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);

    updateStandaloneWasteState({
      isRunning,
      startedAt,
      accumulatedMs,
      sessions: updated,
    }).catch(err => console.error('[TimeWaste] Failed to save delete session state:', err));
  };

  // Format MS into days, hours, mins, secs
  const formatTimeDetails = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / (3600 * 24));
    const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (n: number) => String(n).padStart(2, '0');

    return {
      days,
      hours: pad(hours),
      mins: pad(mins),
      secs: pad(secs),
      totalHours: (ms / (1000 * 3600)).toFixed(1),
    };
  };

  const timeInfo = useMemo(() => formatTimeDetails(displayMs), [displayMs]);

  // Today's total wasted time calculation
  const todayWastedMs = useMemo(() => {
    const todayStr = getLocalDateKey(new Date());
    let total = 0;

    sessions.forEach(s => {
      if (getLocalDateKey(s.endTime) === todayStr) {
        total += s.durationMs;
      }
    });

    if (isRunning && startedAt && getLocalDateKey(startedAt) === todayStr) {
      total += (Date.now() - startedAt);
    }

    return total;
  }, [sessions, isRunning, startedAt, displayMs]);

  const todayInfo = useMemo(() => formatTimeDetails(todayWastedMs), [todayWastedMs]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      
      {/* Header */}
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Time Waste Tracker
            </h1>
            <span style={{
              fontSize: 12, fontWeight: 700,
              padding: '3px 10px', borderRadius: 20,
              background: isRunning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isRunning ? '#ef4444' : '#10b981',
              border: `1px solid ${isRunning ? '#ef444440' : '#10b98140'}`,
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: isRunning ? '#ef4444' : '#10b981',
                boxShadow: isRunning ? '0 0 8px #ef4444' : 'none',
                animation: isRunning ? 'pulse 1.5s infinite' : 'none'
              }} />
              {isRunning ? 'AUTOMATICALLY RUNNING' : 'STOPPED / PAUSED'}
            </span>
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Tracks continuous wasted time automatically (even when the site is closed). Press Stop to record your session.
          </p>
        </div>
      </header>

      {/* Main Digital Clock Card */}
      <div 
        className="glass" 
        style={{ 
          padding: '36px 24px', 
          borderRadius: 20, 
          marginBottom: 28,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: isRunning 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(245, 158, 11, 0.05), var(--bg-card))' 
            : 'var(--bg-card)',
          border: isRunning ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
          boxShadow: isRunning ? '0 8px 32px rgba(239, 68, 68, 0.15)' : 'var(--shadow)',
        }}
      >
        {/* Pulsing Status Bar */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ShieldAlert size={18} style={{ color: isRunning ? '#ef4444' : '#10b981' }} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: isRunning ? '#ef4444' : 'var(--text-secondary)' }}>
            {isRunning ? 'Continuous Time Waste Running' : 'Clock Is Currently Paused'}
          </span>
        </div>

        {/* Digital Counter */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', margin: '10px 0 24px' }}>
          {timeInfo.days > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>
                {timeInfo.days}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Days</span>
            </div>
          )}
          {timeInfo.days > 0 && <span style={{ fontSize: 40, fontWeight: 300, color: 'var(--text-muted)' }}>:</span>}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 'clamp(44px, 10vw, 84px)', fontWeight: 900, fontFamily: 'monospace', color: isRunning ? '#ef4444' : 'var(--text-primary)', lineHeight: 1 }}>
              {timeInfo.hours}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hours</span>
          </div>

          <span style={{ fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: 300, color: isRunning ? '#ef444499' : 'var(--text-muted)' }}>:</span>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 'clamp(44px, 10vw, 84px)', fontWeight: 900, fontFamily: 'monospace', color: isRunning ? '#ef4444' : 'var(--text-primary)', lineHeight: 1 }}>
              {timeInfo.mins}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mins</span>
          </div>

          <span style={{ fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: 300, color: isRunning ? '#ef444499' : 'var(--text-muted)' }}>:</span>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 'clamp(44px, 10vw, 84px)', fontWeight: 900, fontFamily: 'monospace', color: isRunning ? '#f59e0b' : 'var(--text-primary)', lineHeight: 1 }}>
              {timeInfo.secs}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Secs</span>
          </div>
        </div>

        {/* Reason / Tag selector (when stopping) */}
        {isRunning && (
          <div style={{ maxWidth: 460, margin: '0 auto 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Procrastination', 'Social Media', 'Doomscrolling', 'YouTube', 'Gaming', 'Other'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setReasonInput(r); setCustomNote(''); }}
                  style={{
                    padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500,
                    border: reasonInput === r && !customNote ? '1.5px solid #ef4444' : '1px solid var(--border)',
                    background: reasonInput === r && !customNote ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                    color: reasonInput === r && !customNote ? '#ef4444' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or add custom note (e.g. Browsing reels)..."
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              className="input"
              style={{ fontSize: 13, height: 38, textAlign: 'center', borderRadius: 10 }}
            />
          </div>
        )}

        {/* Control Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          {isRunning ? (
            <button 
              onClick={handleStop} 
              className="btn" 
              style={{ 
                padding: '12px 28px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)'
              }}
            >
              <Square size={18} fill="#fff" /> Stop Timer & Save
            </button>
          ) : (
            <button 
              onClick={handleStart} 
              className="btn btn-primary" 
              style={{ 
                padding: '12px 28px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Play size={18} fill="#fff" /> Resume / Start Timer
            </button>
          )}

          <button 
            onClick={handleReset} 
            className="btn btn-secondary" 
            style={{ padding: '12px 20px', borderRadius: 14, fontSize: 14 }}
          >
            <RotateCcw size={16} /> Reset Counter
          </button>
        </div>
      </div>

      {/* Analytics Mini Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="stat-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Clock size={18} color="#ef4444" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Today Wasted</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            {todayInfo.hours}h {todayInfo.mins}m {todayInfo.secs}s
          </div>
        </div>

        <div className="stat-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Flame size={18} color="#f59e0b" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Tracked</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            {timeInfo.totalHours} Hours
          </div>
        </div>

        <div className="stat-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Sparkles size={18} color="#8b5cf6" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Stopped Sessions</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            {sessions.length} Saved
          </div>
        </div>
      </div>

      {/* Session History Table */}
      <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} style={{ color: 'var(--accent)' }} /> Time Waste History Log
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sessions.length} sessions logged</span>
        </div>

        {sessions.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No sessions stopped yet. When you stop the timer, your session will be saved here!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Reason / Note</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Duration</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const dInfo = formatTimeDetails(s.durationMs);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444', fontSize: 12
                        }}>
                          <Tag size={12} /> {s.reason}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#f59e0b', fontWeight: 700 }}>
                        {dInfo.hours}h {dInfo.mins}m {dInfo.secs}s
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(s.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(s.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', padding: 4
                          }}
                          title="Delete Log"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
}
