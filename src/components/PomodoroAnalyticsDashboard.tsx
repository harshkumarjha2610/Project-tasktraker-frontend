'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, Clock, Award, AlertTriangle, Calendar, ChevronLeft, ChevronRight,
  CheckCircle2, Target, Zap, Sparkles, BrainCircuit, Flame, ShieldAlert,
  PieChart as PieChartIcon, BarChart3, RotateCcw, Filter, Activity, CheckSquare,
  Trophy, Sliders, ArrowUpRight, ArrowDownRight, Compass, SkipBack, SkipForward
} from 'lucide-react';
import { PomodoroSession, WastedSessionRecord } from '@/context/PomodoroContext';

interface PomodoroAnalyticsDashboardProps {
  history: PomodoroSession[];
  wasteHistory: WastedSessionRecord[];
  tasks?: any[];
  formatSecsToHoursMins: (secs: number) => string;
}

type DatePreset = 'today' | 'yesterday' | 'past7' | 'past30' | 'custom' | 'all';

const getLocalDateKey = (dStrOrObj: string | Date | number): string => {
  const d = new Date(dStrOrObj);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateHumanReadable = (dateKey: string): string => {
  if (!dateKey) return '';
  const d = new Date(dateKey + 'T00:00:00');
  if (isNaN(d.getTime())) return dateKey;
  
  const todayKey = getLocalDateKey(new Date());
  const yestKey = getLocalDateKey(Date.now() - 86400000);
  
  if (dateKey === todayKey) return `Today (${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })})`;
  if (dateKey === yestKey) return `Yesterday (${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })})`;
  
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
};

const PIE_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#f43f5e', '#a855f7'];

export default function PomodoroAnalyticsDashboard({
  history,
  wasteHistory,
  tasks = [],
  formatSecsToHoursMins,
}: PomodoroAnalyticsDashboardProps) {
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('today');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getLocalDateKey(new Date()));
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = Current Week, -1 = Previous Week, -2 = 2 Weeks Ago, etc.

  const handleSelectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    const todayKey = getLocalDateKey(new Date());
    const yestKey = getLocalDateKey(Date.now() - 86400000);
    
    if (dateKey === todayKey) setSelectedPreset('today');
    else if (dateKey === yestKey) setSelectedPreset('yesterday');
    else setSelectedPreset('custom');
  };

  const handlePresetClick = (preset: DatePreset) => {
    setSelectedPreset(preset);
    const today = new Date();
    if (preset === 'today') {
      setSelectedDateKey(getLocalDateKey(today));
      setWeekOffset(0);
    } else if (preset === 'yesterday') {
      setSelectedDateKey(getLocalDateKey(Date.now() - 86400000));
    }
  };

  const handleStepDay = (deltaDays: number) => {
    const current = new Date((selectedDateKey || getLocalDateKey(new Date())) + 'T00:00:00');
    current.setDate(current.getDate() + deltaDays);
    handleSelectDate(getLocalDateKey(current));
  };

  // 1. Single Selected Day Analysis
  const dayAnalysis = useMemo(() => {
    const daySessions = history.filter(s => getLocalDateKey(s.completedAt) === selectedDateKey && s.mode === 'work');
    const dayBreaks = history.filter(s => getLocalDateKey(s.completedAt) === selectedDateKey && s.mode !== 'work');
    const dayWaste = wasteHistory.filter(w => getLocalDateKey(w.interruptedAt) === selectedDateKey);

    const totalFocusMins = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalWastedSecs = dayWaste.reduce((acc, w) => acc + w.durationSeconds, 0);
    const totalWastedMins = Math.round(totalWastedSecs / 60);

    const totalFocusSecs = totalFocusMins * 60;
    const totalSecs = totalFocusSecs + totalWastedSecs;
    
    let efficiencyScore = 100;
    if (totalSecs > 0) {
      efficiencyScore = Math.round((totalFocusSecs / totalSecs) * 100);
    } else if (daySessions.length === 0 && dayWaste.length === 0) {
      efficiencyScore = 0;
    }

    // Task breakdown for selected day
    const taskMap: Record<string, { title: string; count: number; minutes: number }> = {};
    daySessions.forEach(s => {
      const title = s.taskTitle || 'General Focus Work';
      if (!taskMap[title]) {
        taskMap[title] = { title, count: 0, minutes: 0 };
      }
      taskMap[title].count += 1;
      taskMap[title].minutes += s.durationMinutes;
    });

    const taskBreakdown = Object.values(taskMap).sort((a, b) => b.minutes - a.minutes);

    // Hourly peak breakdown for selected day (0 to 23 hours)
    const hourlyDistribution = Array.from({ length: 24 }, (_, h) => {
      const label = `${String(h).padStart(2, '0')}:00`;
      const hSessions = daySessions.filter(s => new Date(s.completedAt).getHours() === h);
      const hMins = hSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      return { hour: label, focusMins: hMins, sessions: hSessions.length };
    });

    // Timeline of all activity on this day
    const timeline = [
      ...daySessions.map(s => ({
        id: s.id,
        type: 'session' as const,
        mode: s.mode,
        title: s.taskTitle || 'Focus Session',
        durationSecs: s.durationMinutes * 60,
        timestamp: s.completedAt,
      })),
      ...dayBreaks.map(b => ({
        id: b.id,
        type: 'break' as const,
        mode: b.mode,
        title: b.mode === 'shortBreak' ? 'Short Break' : 'Long Break',
        durationSecs: b.durationMinutes * 60,
        timestamp: b.completedAt,
      })),
      ...dayWaste.map(w => ({
        id: w.id,
        type: 'waste' as const,
        mode: w.mode,
        title: w.isOverdueDelay ? 'Overdue Return Delay' : (w.taskTitle ? `Interrupted: "${w.taskTitle}"` : 'Interrupted Session'),
        durationSecs: w.durationSeconds,
        timestamp: w.interruptedAt,
      })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      daySessions,
      dayBreaks,
      dayWaste,
      totalFocusMins,
      totalWastedSecs,
      totalWastedMins,
      efficiencyScore,
      taskBreakdown,
      hourlyDistribution,
      timeline,
    };
  }, [history, wasteHistory, selectedDateKey]);

  // 2. Week Slider & Combined Whole Week Analysis (supports sliding back to previous weeks)
  const selectedWeekDetails = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const distToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMonday + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);

    const days = [];
    let maxFocusMins = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = getLocalDateKey(d);

      const dSessions = history.filter(s => getLocalDateKey(s.completedAt) === key && s.mode === 'work');
      const dWaste = wasteHistory.filter(w => getLocalDateKey(w.interruptedAt) === key);

      const focusMins = dSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const wasteSecs = dWaste.reduce((acc, w) => acc + w.durationSeconds, 0);
      const wasteMins = Math.round(wasteSecs / 60);

      const totalSecs = (focusMins * 60) + wasteSecs;
      const score = totalSecs > 0 ? Math.round(((focusMins * 60) / totalSecs) * 100) : (dSessions.length > 0 ? 100 : 0);

      const dayName = d.toLocaleDateString([], { weekday: 'long' });
      const dayShort = d.toLocaleDateString([], { weekday: 'short' });
      const dateFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

      if (focusMins > maxFocusMins) maxFocusMins = focusMins;

      days.push({
        dateKey: key,
        dayName,
        dayShort,
        dateFormatted,
        dayLabel: `${dayShort} (${dateFormatted})`,
        focusMins,
        wasteMins,
        'Focus (mins)': focusMins,
        'Wasted (mins)': wasteMins,
        pomodoros: dSessions.length,
        'Pomodoros': dSessions.length,
        'Efficiency %': score,
        efficiencyScore: score,
      });
    }

    const daysWithRatio = days.map(item => ({
      ...item,
      ratioToPeak: maxFocusMins > 0 ? Math.round((item.focusMins / maxFocusMins) * 100) : 0,
    }));

    // Combined Whole Week Statistics
    const totalWeeklyFocusMins = days.reduce((sum, d) => sum + d.focusMins, 0);
    const totalWeeklyWasteMins = days.reduce((sum, d) => sum + d.wasteMins, 0);
    const totalWeeklyPomodoros = days.reduce((sum, d) => sum + d.pomodoros, 0);

    const weeklyHours = Math.floor(totalWeeklyFocusMins / 60);
    const weeklyMins = totalWeeklyFocusMins % 60;
    const formattedWeeklyTime = weeklyHours > 0 
      ? `${weeklyHours} hrs ${weeklyMins} mins` 
      : `${weeklyMins} mins`;

    const totalWeeklySecs = (totalWeeklyFocusMins * 60) + (totalWeeklyWasteMins * 60);
    const weeklyEfficiency = totalWeeklySecs > 0 
      ? Math.round(((totalWeeklyFocusMins * 60) / totalWeeklySecs) * 100) 
      : (totalWeeklyFocusMins > 0 ? 100 : 0);

    const sunday = days[6];
    const startDateStr = monday.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const endDateStr = new Date(sunday.dateKey + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    let weekLabel = `${startDateStr} — ${endDateStr}`;
    if (weekOffset === 0) weekLabel += ' (Current Week)';
    else if (weekOffset === -1) weekLabel += ' (Previous Week)';
    else if (weekOffset < -1) weekLabel += ` (${Math.abs(weekOffset)} Weeks Ago)`;

    return {
      monday,
      sunday,
      weekDays: daysWithRatio,
      totalWeeklyFocusMins,
      totalWeeklyWasteMins,
      totalWeeklyPomodoros,
      formattedWeeklyTime,
      weeklyEfficiency,
      weekLabel,
    };
  }, [history, wasteHistory, weekOffset]);

  // 3. Most Productive Day vs Least Productive Day & Weekday Patterns
  const patternAnalysis = useMemo(() => {
    // Map all recorded date keys to daily metrics
    const dateMap: Record<string, { dateKey: string; focusMins: number; wasteMins: number; pomodoros: number; score: number }> = {};

    history.filter(s => s.mode === 'work').forEach(s => {
      const key = getLocalDateKey(s.completedAt);
      if (!key) return;
      if (!dateMap[key]) {
        dateMap[key] = { dateKey: key, focusMins: 0, wasteMins: 0, pomodoros: 0, score: 0 };
      }
      dateMap[key].focusMins += s.durationMinutes;
      dateMap[key].pomodoros += 1;
    });

    wasteHistory.forEach(w => {
      const key = getLocalDateKey(w.interruptedAt);
      if (!key) return;
      if (!dateMap[key]) {
        dateMap[key] = { dateKey: key, focusMins: 0, wasteMins: 0, pomodoros: 0, score: 0 };
      }
      dateMap[key].wasteMins += Math.round(w.durationSeconds / 60);
    });

    const allDays = Object.values(dateMap).map(d => {
      const totalSecs = (d.focusMins * 60) + (d.wasteMins * 60);
      const score = totalSecs > 0 ? Math.round(((d.focusMins * 60) / totalSecs) * 100) : (d.focusMins > 0 ? 100 : 0);
      return { ...d, score };
    }).sort((a, b) => b.focusMins - a.focusMins);

    // Most productive day (highest focusMins)
    const mostProductiveDay = allDays.length > 0 ? allDays[0] : null;

    // Least productive day among active focus days (lowest focusMins > 0)
    const activeDaysAsc = [...allDays].filter(d => d.focusMins > 0).sort((a, b) => a.focusMins - b.focusMins);
    const leastProductiveDay = activeDaysAsc.length > 0 ? activeDaysAsc[0] : (allDays.length > 0 ? allDays[allDays.length - 1] : null);

    const totalFocusAllDays = allDays.reduce((sum, d) => sum + d.focusMins, 0);
    const avgFocusMinsPerDay = allDays.length > 0 ? Math.round(totalFocusAllDays / allDays.length) : 0;

    // Weekday averages (Sunday = 0, Monday = 1, ..., Saturday = 6)
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayStats = weekdayNames.map((name, idx) => {
      const matchingDays = allDays.filter(d => new Date(d.dateKey + 'T00:00:00').getDay() === idx);
      const totalMins = matchingDays.reduce((sum, d) => sum + d.focusMins, 0);
      const avgMins = matchingDays.length > 0 ? Math.round(totalMins / matchingDays.length) : 0;
      const totalPoms = matchingDays.reduce((sum, d) => sum + d.pomodoros, 0);
      return { day: name, shortDay: name.slice(0, 3), avgMins, totalMins, daysLogged: matchingDays.length, totalPoms };
    });

    const bestWeekday = [...weekdayStats].sort((a, b) => b.avgMins - a.avgMins)[0];

    return {
      allDays,
      mostProductiveDay,
      leastProductiveDay,
      avgFocusMinsPerDay,
      weekdayStats,
      bestWeekday,
    };
  }, [history, wasteHistory]);

  // 4. Task Distribution Pie Chart Data
  const taskPieData = useMemo(() => {
    if (selectedPreset === 'all' || selectedPreset === 'past7' || selectedPreset === 'past30') {
      const filteredHist = history.filter(s => s.mode === 'work');
      const map: Record<string, number> = {};
      filteredHist.forEach(s => {
        const title = s.taskTitle || 'General Focus Work';
        map[title] = (map[title] || 0) + s.durationMinutes;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
    }
    return dayAnalysis.taskBreakdown.map(t => ({ name: t.title, value: t.minutes }));
  }, [history, selectedPreset, dayAnalysis]);

  // Human Narrative Generator for Past-Day Experience
  const generateExperienceNarrative = () => {
    const { daySessions, totalFocusMins, totalWastedMins, efficiencyScore, taskBreakdown } = dayAnalysis;
    const dateFormatted = formatDateHumanReadable(selectedDateKey);

    if (daySessions.length === 0 && totalWastedMins === 0) {
      return `On ${dateFormatted}, no Pomodoro focus sessions were logged. Take rest or pick a past day from the selector above to explore your productivity archive!`;
    }

    const focusHoursStr = totalFocusMins >= 60
      ? `${(totalFocusMins / 60).toFixed(1)} hours (${totalFocusMins} mins)`
      : `${totalFocusMins} minutes`;

    const topTask = taskBreakdown[0] ? `"${taskBreakdown[0].title}" (${taskBreakdown[0].minutes} mins)` : 'general tasks';

    let moodPrefix = '🌟 Exceptional Flow!';
    if (efficiencyScore >= 85) moodPrefix = '🔥 Peak Productivity & Flow State!';
    else if (efficiencyScore >= 70) moodPrefix = '⚡ Solid Productive Performance!';
    else if (efficiencyScore >= 50) moodPrefix = '⚖️ Balanced Session with Minor Interruptions.';
    else moodPrefix = '🚨 High Distraction Day.';

    return `${moodPrefix} On ${dateFormatted}, you completed ${daySessions.length} Focus Session${daySessions.length === 1 ? '' : 's'} totaling ${focusHoursStr} of deep work. Most of your time was dedicated to ${topTask}. You had ${totalWastedMins} mins of logged interruptions, achieving a ${efficiencyScore}% focus efficiency ratio.`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 12 }}>

      {/* ── Top Header Bar & Interactive Date Picker ──────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: '20px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)'
          }}>
            <Activity size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
              Pomodoro Graphical Analytics &amp; Daily Experience
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Track past days productivity, visual charts, efficiency scores &amp; detailed task logs
            </p>
          </div>
        </div>

        {/* Date Selector Quick Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--bg-secondary)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'past7', label: 'Past 7 Days' },
              { id: 'past30', label: 'Past 30 Days' },
              { id: 'all', label: 'All Time' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetClick(p.id as DatePreset)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  background: selectedPreset === p.id ? 'var(--accent)' : 'transparent',
                  color: selectedPreset === p.id ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Interactive Date Picker Input & Steppers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <button
              onClick={() => handleStepDay(-1)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>

            <input
              type="date"
              value={selectedDateKey}
              onChange={e => handleSelectDate(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                padding: '4px 6px'
              }}
              title="Select Specific Date to view past productivity experience"
            />

            <button
              onClick={() => handleStepDay(1)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 🏆 Most Productive Day vs 😴 Least Productive Day Highlights Banner ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16
      }}>
        {/* Most Productive Day Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(234, 88, 12, 0.08))',
          borderRadius: 20,
          border: '1px solid rgba(245, 158, 11, 0.4)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
              }}>
                <Trophy size={20} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#f59e0b', letterSpacing: 0.5 }}>
                  🏆 Most Productive Day
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {patternAnalysis.mostProductiveDay
                    ? formatDateHumanReadable(patternAnalysis.mostProductiveDay.dateKey)
                    : 'No sessions logged yet'}
                </div>
              </div>
            </div>
            {patternAnalysis.mostProductiveDay && (
              <button
                onClick={() => handleSelectDate(patternAnalysis.mostProductiveDay!.dateKey)}
                style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#f59e0b', cursor: 'pointer'
                }}
                title="Jump to this date"
              >
                View Date →
              </button>
            )}
          </div>

          {patternAnalysis.mostProductiveDay ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(245,158,11,0.2)' }}>
              <div>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#f59e0b' }}>
                  {patternAnalysis.mostProductiveDay.focusMins >= 60
                    ? `${(patternAnalysis.mostProductiveDay.focusMins / 60).toFixed(1)} hrs`
                    : `${patternAnalysis.mostProductiveDay.focusMins} mins`}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>
                  ({patternAnalysis.mostProductiveDay.focusMins} focus mins)
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                <div>🍅 {patternAnalysis.mostProductiveDay.pomodoros} Pomodoros</div>
                <div style={{ color: '#10b981', fontWeight: 700 }}>{patternAnalysis.mostProductiveDay.score}% Efficiency</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Complete Pomodoro sessions to unlock your peak productive day!</div>
          )}
        </div>

        {/* Least Productive Day Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(245, 158, 11, 0.05))',
          borderRadius: 20,
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ShieldAlert size={20} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#ef4444', letterSpacing: 0.5 }}>
                  😴 Lowest Focus Active Day
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {patternAnalysis.leastProductiveDay
                    ? formatDateHumanReadable(patternAnalysis.leastProductiveDay.dateKey)
                    : 'No sessions logged'}
                </div>
              </div>
            </div>
            {patternAnalysis.leastProductiveDay && (
              <button
                onClick={() => handleSelectDate(patternAnalysis.leastProductiveDay!.dateKey)}
                style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444', cursor: 'pointer'
                }}
                title="Jump to this date"
              >
                View Date →
              </button>
            )}
          </div>

          {patternAnalysis.leastProductiveDay ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(239,68,68,0.2)' }}>
              <div>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#ef4444' }}>
                  {patternAnalysis.leastProductiveDay.focusMins >= 60
                    ? `${(patternAnalysis.leastProductiveDay.focusMins / 60).toFixed(1)} hrs`
                    : `${patternAnalysis.leastProductiveDay.focusMins} mins`}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>
                  ({patternAnalysis.leastProductiveDay.focusMins} focus mins)
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                <div>🍅 {patternAnalysis.leastProductiveDay.pomodoros} Pomodoro</div>
                <div style={{ color: '#ef4444' }}>-{patternAnalysis.leastProductiveDay.wasteMins} mins waste</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No low activity days recorded.</div>
          )}
        </div>

        {/* Daily Focus Average Card */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(6, 186, 212, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Compass size={20} color="#06b6d4" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#06b6d4', letterSpacing: 0.5 }}>
                📊 Daily Average Focus
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                Across {patternAnalysis.allDays.length} Active Logged Days
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#06b6d4' }}>
                {patternAnalysis.avgFocusMinsPerDay >= 60
                  ? `${(patternAnalysis.avgFocusMinsPerDay / 60).toFixed(1)} hrs`
                  : `${patternAnalysis.avgFocusMinsPerDay} mins`}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>
                / day avg
              </span>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              <div>Best Weekday:</div>
              <div style={{ color: 'var(--accent)', fontWeight: 700 }}>
                {patternAnalysis.bestWeekday?.day} ({patternAnalysis.bestWeekday?.avgMins} mins)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 🗓️ WEEK SLIDER & COMBINED WHOLE WEEK SUMMARY BANNER ───────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.14), rgba(16, 185, 129, 0.1))',
        borderRadius: 22,
        border: '1px solid rgba(139, 92, 246, 0.35)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
      }}>
        {/* Week Slider Stepper Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={22} color="#8b5cf6" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8b5cf6', letterSpacing: 0.5 }}>
                Week-by-Week Focus History
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedWeekDetails.weekLabel}
              </div>
            </div>
          </div>

          {/* Week Stepper Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              style={{
                padding: '7px 14px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease'
              }}
              title="Slide to Previous Week"
            >
              <ChevronLeft size={16} />
              <span>Previous Week</span>
            </button>

            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  color: '#8b5cf6',
                  cursor: 'pointer'
                }}
                title="Reset to Current Week"
              >
                Current Week
              </button>
            )}

            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              disabled={weekOffset >= 0}
              style={{
                padding: '7px 14px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: weekOffset >= 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: weekOffset >= 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: weekOffset >= 0 ? 0.4 : 1,
                transition: 'all 0.2s ease'
              }}
              title="Slide to Next Week"
            >
              <span>Next Week</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* COMBINED WHOLE WEEK METRICS HIGHLIGHT GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          background: 'var(--bg-card)',
          padding: '16px 20px',
          borderRadius: 16,
          border: '1px solid var(--border)'
        }}>
          {/* Total Combined Focus Time for Whole Week */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              ⏱️ Combined Weekly Focus Time
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6' }}>
              {selectedWeekDetails.formattedWeeklyTime}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ({selectedWeekDetails.totalWeeklyFocusMins} focus mins total)
            </span>
          </div>

          {/* Weekly Completed Sessions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              🍅 Weekly Pomodoro Count
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#06b6d4' }}>
              {selectedWeekDetails.totalWeeklyPomodoros} Sessions
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Completed in this week
            </span>
          </div>

          {/* Weekly Wasted Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              🚨 Weekly Interrupted Time
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>
              {selectedWeekDetails.totalWeeklyWasteMins >= 60
                ? `${(selectedWeekDetails.totalWeeklyWasteMins / 60).toFixed(1)} hrs`
                : `${selectedWeekDetails.totalWeeklyWasteMins} mins`}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Logged delay &amp; waste
            </span>
          </div>

          {/* Weekly Flow Efficiency */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              ⚡ Combined Weekly Efficiency
            </span>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>
              {selectedWeekDetails.weeklyEfficiency}%
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Weekly Focus vs Waste ratio
            </span>
          </div>
        </div>

        {/* 📅 DAY-WISE PATTERN CARDS FOR THE SELECTED WEEK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Day-Wise Patterns for {selectedWeekDetails.weekLabel}:
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12
          }}>
            {selectedWeekDetails.weekDays.map(day => {
              const isSelected = selectedDateKey === day.dateKey;
              let statusBadge = '☕ Light';
              let badgeColor = 'var(--text-muted)';
              let badgeBg = 'rgba(255,255,255,0.06)';

              if (day.focusMins >= 180) {
                statusBadge = '🏆 Peak Day';
                badgeColor = '#f59e0b';
                badgeBg = 'rgba(245, 158, 11, 0.15)';
              } else if (day.focusMins >= 90) {
                statusBadge = '⚡ High Flow';
                badgeColor = '#8b5cf6';
                badgeBg = 'rgba(139, 92, 246, 0.15)';
              } else if (day.focusMins >= 30) {
                statusBadge = '⚖️ Moderate';
                badgeColor = '#06b6d4';
                badgeBg = 'rgba(6, 186, 212, 0.15)';
              }

              return (
                <button
                  key={day.dateKey}
                  onClick={() => handleSelectDate(day.dateKey)}
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(6,186,212,0.15))' : 'var(--bg-secondary)',
                    borderRadius: 16,
                    border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    padding: '14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                    boxShadow: isSelected ? '0 8px 20px rgba(139, 92, 246, 0.25)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {day.dayShort}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {day.dateFormatted}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {day.focusMins} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>mins</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      🍅 {day.pomodoros} Pomodoro{day.pomodoros === 1 ? '' : 's'}
                    </div>
                  </div>

                  {/* Focus Intensity Bar */}
                  <div style={{ height: 5, width: '100%', borderRadius: 10, background: 'var(--bg-card)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${day.ratioToPeak}%`,
                      background: isSelected ? 'var(--accent)' : day.focusMins >= 180 ? '#f59e0b' : day.focusMins >= 90 ? '#8b5cf6' : '#06b6d4',
                      borderRadius: 10,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: badgeBg,
                    color: badgeColor,
                    alignSelf: 'flex-start'
                  }}>
                    {statusBadge}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Active Day Banner & AI Narrative Summary ──────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(6, 186, 212, 0.08))',
        borderRadius: 20,
        border: '1px solid rgba(139, 92, 246, 0.3)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={20} color="#8b5cf6" />
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Selected Day: {formatDateHumanReadable(selectedDateKey)}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              background: dayAnalysis.efficiencyScore >= 80 ? 'rgba(16, 185, 129, 0.15)' : dayAnalysis.efficiencyScore >= 50 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${dayAnalysis.efficiencyScore >= 80 ? 'rgba(16, 185, 129, 0.4)' : dayAnalysis.efficiencyScore >= 50 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: dayAnalysis.efficiencyScore >= 80 ? '#10b981' : dayAnalysis.efficiencyScore >= 50 ? '#f59e0b' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Zap size={14} />
              <span>{dayAnalysis.efficiencyScore}% Efficiency Score</span>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 14,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--text-primary)'
        }}>
          <Sparkles size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>{generateExperienceNarrative()}</div>
        </div>
      </div>

      {/* ── Key Metrics Overview Cards ────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16
      }}>
        {/* Total Focus Time */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(139, 92, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={22} color="#8b5cf6" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              {dayAnalysis.totalFocusMins >= 60
                ? `${(dayAnalysis.totalFocusMins / 60).toFixed(1)} hrs`
                : `${dayAnalysis.totalFocusMins} mins`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Total Focus Time
            </div>
          </div>
        </div>

        {/* Pomodoro Sessions */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(6, 186, 212, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Award size={22} color="#06b6d4" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              {dayAnalysis.daySessions.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Completed Sessions
            </div>
          </div>
        </div>

        {/* Wasted / Interrupted Time */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 18,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={22} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>
              {formatSecsToHoursMins(dayAnalysis.totalWastedSecs)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Wasted / Delays ({dayAnalysis.dayWaste.length} logs)
            </div>
          </div>
        </div>

        {/* Tasks Accomplished */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Target size={22} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              {dayAnalysis.taskBreakdown.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Tasks Worked On
            </div>
          </div>
        </div>
      </div>

      {/* ── Graphical Charts Section ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>

        {/* Chart 1: Week Focus vs Wasted Minutes Trend */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingUp size={18} color="#8b5cf6" />
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Weekly Focus &amp; Waste Trend ({selectedWeekDetails.weekLabel})
              </h4>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Focus vs Waste</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selectedWeekDetails.weekDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="wasteGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="dayLabel" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1c1c28',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    color: '#f0f0ff',
                    fontSize: 12
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area type="monotone" dataKey="Focus (mins)" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#focusGradient)" />
                <Area type="monotone" dataKey="Wasted (mins)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#wasteGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Weekday Historical Focus Averages (Mon - Sun Pattern) */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BarChart3 size={18} color="#06b6d4" />
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Weekday Productivity Patterns (Avg Minutes)
              </h4>
            </div>
            <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600 }}>
              Best: {patternAnalysis.bestWeekday?.day} ({patternAnalysis.bestWeekday?.avgMins}m avg)
            </span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patternAnalysis.weekdayStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="shortDay" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1c1c28',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    color: '#f0f0ff',
                    fontSize: 12
                  }}
                  formatter={(val: any) => [`${val} mins avg`, 'Focus Time']}
                />
                <Bar dataKey="avgMins" fill="#06b6d4" radius={[6, 6, 0, 0]}>
                  {patternAnalysis.weekdayStats.map((entry, index) => (
                    <Cell
                      key={`cell-w-${index}`}
                      fill={entry.day === patternAnalysis.bestWeekday?.day ? '#f59e0b' : '#06b6d4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Task Focus Time Allocation (Donut Chart) */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <PieChartIcon size={18} color="#ec4899" />
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Task Focus Distribution (Minutes)
              </h4>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Focus duration by task</span>
          </div>

          {taskPieData.length === 0 ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No focus data logged for this selection.
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {taskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1c1c28',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      color: '#f0f0ff',
                      fontSize: 12
                    }}
                    formatter={(val: any) => [`${val} mins`, 'Focus Duration']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 4: 24-Hour Peak Productivity Heatmap / Bar Chart */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BarChart3 size={18} color="#f59e0b" />
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Hourly Focus Distribution ({formatDateHumanReadable(selectedDateKey)})
              </h4>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>24h breakdown</span>
          </div>

          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayAnalysis.hourlyDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={10} interval={2} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1c1c28',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    color: '#f0f0ff',
                    fontSize: 12
                  }}
                  formatter={(val: any) => [`${val} mins`, 'Focused']}
                />
                <Bar dataKey="focusMins" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Week Efficiency Score Trend */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Zap size={18} color="#10b981" />
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Weekly Efficiency % Trend ({selectedWeekDetails.weekLabel})
              </h4>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target: 80%+</span>
          </div>

          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedWeekDetails.weekDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="dayLabel" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1c1c28',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    color: '#f0f0ff',
                    fontSize: 12
                  }}
                  formatter={(val: any) => [`${val}%`, 'Efficiency Score']}
                />
                <Line type="monotone" dataKey="Efficiency %" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Detailed Tasks Breakdown Table for Selected Day ─────── */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckSquare size={18} color="var(--accent)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Tasks Worked On ({formatDateHumanReadable(selectedDateKey)})
            </h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {dayAnalysis.taskBreakdown.length} task{dayAnalysis.taskBreakdown.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        {dayAnalysis.taskBreakdown.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No task focus sessions logged for this day.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dayAnalysis.taskBreakdown.map((t, idx) => {
              const pct = dayAnalysis.totalFocusMins > 0 ? Math.round((t.minutes / dayAnalysis.totalFocusMins) * 100) : 0;
              return (
                <div
                  key={t.title}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 14,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: PIE_COLORS[idx % PIE_COLORS.length] + '25',
                      color: PIE_COLORS[idx % PIE_COLORS.length],
                      fontWeight: 800, fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {t.count} Pomodoro Session{t.count === 1 ? '' : 's'} ({pct}% of day's focus)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Mini progress bar */}
                    <div style={{ width: 100, height: 6, borderRadius: 10, background: 'var(--bg-card)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: PIE_COLORS[idx % PIE_COLORS.length], borderRadius: 10 }} />
                    </div>

                    <div style={{
                      fontSize: 13,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: PIE_COLORS[idx % PIE_COLORS.length] + '20',
                      color: PIE_COLORS[idx % PIE_COLORS.length],
                      whiteSpace: 'nowrap'
                    }}>
                      {t.minutes} mins
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Day Activity Timeline Log ────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={18} color="#8b5cf6" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Chronological Activity Timeline ({formatDateHumanReadable(selectedDateKey)})
            </h3>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {dayAnalysis.timeline.length} timeline entries
          </span>
        </div>

        {dayAnalysis.timeline.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No activity timeline recorded for this day.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dayAnalysis.timeline.map((item) => {
              const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isSession = item.type === 'session';
              const isBreak = item.type === 'break';
              const isWaste = item.type === 'waste';

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 14,
                    background: isWaste ? 'rgba(239, 68, 68, 0.06)' : isBreak ? 'rgba(6, 186, 212, 0.05)' : 'var(--bg-secondary)',
                    border: isWaste ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: isSession ? 'rgba(139, 92, 246, 0.15)' : isBreak ? 'rgba(6, 186, 212, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isSession && <CheckCircle2 size={18} color="#8b5cf6" />}
                      {isBreak && <Clock size={18} color="#06b6d4" />}
                      {isWaste && <ShieldAlert size={18} color="#ef4444" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {timeStr} • {isSession ? 'Focus Session' : isBreak ? 'Break Session' : 'Interrupted / Delay'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: isWaste ? 'rgba(239,68,68,0.15)' : isBreak ? 'rgba(6,186,212,0.15)' : 'rgba(139,92,246,0.15)',
                    color: isWaste ? '#ef4444' : isBreak ? '#06b6d4' : '#8b5cf6'
                  }}>
                    {isWaste ? `-${formatSecsToHoursMins(item.durationSecs)}` : `+${Math.round(item.durationSecs / 60)} mins`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
