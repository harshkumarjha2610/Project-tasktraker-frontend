'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, Clock, Award, AlertTriangle, Calendar, ChevronLeft, ChevronRight,
  CheckCircle2, Target, Zap, Sparkles, BrainCircuit, Flame, ShieldAlert,
  PieChart as PieChartIcon, BarChart3, RotateCcw, Filter, Activity, CheckSquare
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

  // 2. Past 7 Days Trend Data for Charts
  const past7DaysData = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);

      const dSessions = history.filter(s => getLocalDateKey(s.completedAt) === key && s.mode === 'work');
      const dWaste = wasteHistory.filter(w => getLocalDateKey(w.interruptedAt) === key);

      const focusMins = dSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const wasteSecs = dWaste.reduce((acc, w) => acc + w.durationSeconds, 0);
      const wasteMins = Math.round(wasteSecs / 60);

      const totalSecs = (focusMins * 60) + wasteSecs;
      const score = totalSecs > 0 ? Math.round(((focusMins * 60) / totalSecs) * 100) : (dSessions.length > 0 ? 100 : 0);

      const dayLabel = d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });

      list.push({
        dateKey: key,
        dayLabel,
        'Focus (mins)': focusMins,
        'Wasted (mins)': wasteMins,
        'Pomodoros': dSessions.length,
        'Efficiency %': score,
      });
    }
    return list;
  }, [history, wasteHistory]);

  // 3. Task Distribution Pie Chart Data
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
              {formatDateHumanReadable(selectedDateKey)}
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

        {/* Chart 1: 7-Day Focus vs Wasted Minutes Trend */}
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
                Past 7 Days Focus &amp; Waste Trend
              </h4>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Minutes per day</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={past7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

        {/* Chart 2: Task Focus Time Allocation (Donut Chart) */}
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
              <PieChartIcon size={18} color="#06b6d4" />
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Task Focus Distribution
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

        {/* Chart 3: 24-Hour Peak Productivity Heatmap / Bar Chart */}
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

        {/* Chart 4: Past 7 Days Efficiency Score Trend */}
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
                Daily Productivity Efficiency % Trend
              </h4>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target: 80%+</span>
          </div>

          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={past7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
