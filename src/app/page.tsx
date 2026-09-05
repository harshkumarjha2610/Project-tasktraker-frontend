'use client';

import { useTaskContext } from '@/context/TaskContext';
import { usePomodoroContext } from '@/context/PomodoroContext';
import { getNotes } from '@/lib/api';
import { Note } from '@/types/note';
import { Task, Priority, Category } from '@/types/task';
import { useState, useMemo, useEffect } from 'react';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import Link from 'next/link';
import {
  Plus, CheckCircle, Circle, Loader, AlertTriangle, TrendingUp, Flame,
  Clock, Target, StickyNote, Zap, ShieldAlert, BarChart3, PieChart,
  ArrowUpRight, Award, CheckCircle2, ChevronRight, Layers, FileText,
  Activity, Sparkles
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

const CATEGORY_COLORS: Record<Category, string> = {
  work: '#8b5cf6',
  personal: '#06b6d4',
  health: '#10b981',
  learning: '#f59e0b',
  other: '#6b7280',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  'super high': '#ff0000',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16a34a',
};

export default function DashboardPage() {
  const { tasks, addTask, editTask, removeTask, toggleComplete, loading: tasksLoading, error: tasksError } = useTaskContext();
  const { history: pomodoroHistory, wasteHistory, totalWastedSecondsToday, completedSessionsCount, formatSecsToHoursMins } = usePomodoroContext();

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Fetch Notes for website-wide analytics
  useEffect(() => {
    let isMounted = true;
    getNotes()
      .then(data => {
        if (isMounted) {
          setNotes(data || []);
          setNotesLoading(false);
        }
      })
      .catch(err => {
        console.error('[Dashboard] Failed to fetch notes for analytics:', err);
        if (isMounted) setNotesLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  // ─── 1. Task Metrics & Performance ───────────────────────────────
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'inprogress').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const overdue = tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'done').length;
    const completionRate = total ? Math.round((done / total) * 100) : 0;

    const totalEstMins = tasks.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0);
    const totalActualMins = tasks.reduce((acc, t) => acc + (t.actualMinutes || 0), 0);

    const byCategory: Record<Category, number> = { work: 0, personal: 0, health: 0, learning: 0, other: 0 };
    const byPriority: Record<Priority, number> = { 'super high': 0, high: 0, medium: 0, low: 0 };

    tasks.forEach(t => {
      if (byCategory[t.category] !== undefined) byCategory[t.category]++;
      if (byPriority[t.priority] !== undefined) byPriority[t.priority]++;
    });

    return { total, done, inProgress, todo, overdue, completionRate, totalEstMins, totalActualMins, byCategory, byPriority };
  }, [tasks]);

  // ─── 2. Pomodoro Metrics ─────────────────────────────────────────
  const pomodoroStats = useMemo(() => {
    const totalWorkSessions = pomodoroHistory.filter(s => s.mode === 'work').length;
    const totalFocusMinutes = pomodoroHistory
      .filter(s => s.mode === 'work')
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    const todayStr = new Date().toDateString();
    const todayFocusMinutes = pomodoroHistory
      .filter(s => s.mode === 'work' && s.completedAt && new Date(s.completedAt).toDateString() === todayStr)
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    const totalBreakMinutes = pomodoroHistory
      .filter(s => s.mode !== 'work')
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    return { totalWorkSessions, totalFocusMinutes, todayFocusMinutes, totalBreakMinutes };
  }, [pomodoroHistory]);

  // ─── 3. Notes Metrics ────────────────────────────────────────────
  const notesStats = useMemo(() => {
    const total = notes.length;
    const colorCounts: Record<string, number> = {};
    notes.forEach(n => {
      const c = n.color || '#8b5cf6';
      colorCounts[c] = (colorCounts[c] || 0) + 1;
    });

    const recentNotes = [...notes]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 3);

    return { total, colorCounts, recentNotes };
  }, [notes]);

  // ─── 4. Time Waste Metrics ──────────────────────────────────────
  const wasteStats = useMemo(() => {
    const totalWastedSessions = wasteHistory.length;
    const totalWastedSecondsAllTime = wasteHistory.reduce((acc, w) => acc + (w.durationSeconds || 0), 0);
    const overdueDelaySessions = wasteHistory.filter(w => w.isOverdueDelay).length;

    return { totalWastedSessions, totalWastedSecondsAllTime, overdueDelaySessions };
  }, [wasteHistory]);

  // Task Lists
  const todayTasks = useMemo(() =>
    tasks.filter(t => t.dueDate && (isToday(new Date(t.dueDate)) || isTomorrow(new Date(t.dueDate)))).slice(0, 5),
    [tasks]
  );

  const recentTasks = useMemo(() =>
    [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [tasks]
  );

  const handleSave = async (data: Omit<Task, 'id' | 'createdAt'>) => {
    if (editingTask) await editTask(editingTask.id, data);
    else await addTask(data);
    setShowModal(false);
    setEditingTask(null);
  };

  if (tasksLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
        <Loader size={22} style={{ color: '#8b5cf6' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Loading Dashboard & Analytics…</span>
      </div>
    );
  }

  if (tasksError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Cannot reach the backend</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360 }}>
          Make sure the backend server is running on <code style={{ background: 'var(--bg-card-hover)', padding: '2px 6px', borderRadius: 5 }}>http://localhost:5000</code>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px' }}>
          {tasksError}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>👋</span>
            <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800 }}>
              Good {getGreeting()}!
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Website Overview & Detailed Productive Analytics • {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/pomodoro" className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            🍅 Start Pomodoro
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setShowModal(true); }} style={{ gap: 6 }}>
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {/* ── WEBSITE-WIDE CORE KPI GRID ────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
        gap: 16,
      }}>
        {/* KPI 1: Tasks Completion Rate */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.03))', border: '1px solid rgba(139,92,246,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.18)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={20} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', background: 'rgba(139,92,246,0.15)', padding: '3px 8px', borderRadius: 6 }}>
              {taskStats.completionRate}% Done
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            {taskStats.done} / {taskStats.total}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Tasks Completed</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {taskStats.inProgress} active • {taskStats.overdue} overdue
          </div>
        </div>

        {/* KPI 2: Pomodoro Focus Time */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(6,186,212,0.1), rgba(6,186,212,0.03))', border: '1px solid rgba(6,186,212,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(6,186,212,0.18)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#06b6d4', background: 'rgba(6,186,212,0.15)', padding: '3px 8px', borderRadius: 6 }}>
              {pomodoroStats.todayFocusMinutes}m Today
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            {Math.floor(pomodoroStats.totalFocusMinutes / 60)}h {pomodoroStats.totalFocusMinutes % 60}m
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Total Focus Time</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {pomodoroStats.totalWorkSessions} completed sessions
          </div>
        </div>

        {/* KPI 3: Notes Knowledge Base */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))', border: '1px solid rgba(245,158,11,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.18)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StickyNote size={20} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '3px 8px', borderRadius: 6 }}>
              Knowledge Base
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            {notesStats.total}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Saved Notes</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {notesStats.recentNotes.length > 0 ? 'Active & updated' : 'No notes created yet'}
          </div>
        </div>

        {/* KPI 4: Time Waste & Distraction Tracker */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.18)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={20} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '3px 8px', borderRadius: 6 }}>
              {formatSecsToHoursMins(totalWastedSecondsToday)} Today
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            {wasteStats.totalWastedSessions}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Distraction Logs</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {wasteStats.overdueDelaySessions} overdue break delays
          </div>
        </div>
      </div>

      {/* ── DETAILED ANALYTICS SECTIONS ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: 20 }}>
        
        {/* ── ANALYTICS CARD 1: Pomodoro & Focus Time Performance ── */}
        <div style={{
          padding: '22px 24px',
          borderRadius: 20,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🍅</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Pomodoro & Focus Analytics</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Deep work sessions and time efficiency</span>
              </div>
            </div>
            <Link href="/pomodoro" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open Timer <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>TODAY'S FOCUS</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6', marginTop: 4 }}>
                {pomodoroStats.todayFocusMinutes} <span style={{ fontSize: 13, fontWeight: 500 }}>mins</span>
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>COMPLETED POMODOROS</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                {pomodoroStats.totalWorkSessions} <span style={{ fontSize: 13, fontWeight: 500 }}>sessions</span>
              </div>
            </div>
          </div>

          {/* Pomodoro Focus vs Break visual progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <span>Focus vs Break Ratio</span>
              <span>
                {pomodoroStats.totalFocusMinutes + pomodoroStats.totalBreakMinutes > 0
                  ? `${Math.round((pomodoroStats.totalFocusMinutes / (pomodoroStats.totalFocusMinutes + pomodoroStats.totalBreakMinutes)) * 100)}% Focus`
                  : 'No sessions yet'}
              </span>
            </div>
            <div style={{ height: 8, background: 'rgba(6,186,212,0.2)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
              <div style={{
                height: '100%',
                width: `${pomodoroStats.totalFocusMinutes + pomodoroStats.totalBreakMinutes > 0 ? (pomodoroStats.totalFocusMinutes / (pomodoroStats.totalFocusMinutes + pomodoroStats.totalBreakMinutes)) * 100 : 100}%`,
                background: '#8b5cf6',
                borderRadius: 4
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} /> Focus: {pomodoroStats.totalFocusMinutes}m
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} /> Break: {pomodoroStats.totalBreakMinutes}m
              </span>
            </div>
          </div>

          {/* Recent Pomodoro History */}
          <div style={{ paddingTop: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Recent Focus Sessions
            </span>
            {pomodoroHistory.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                No completed Pomodoro sessions recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pomodoroHistory.slice(0, 3).map(session => (
                  <div key={session.id} style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: session.mode === 'work' ? 'rgba(139,92,246,0.15)' : 'rgba(6,186,212,0.15)',
                        color: session.mode === 'work' ? '#8b5cf6' : '#06b6d4'
                      }}>
                        {session.mode}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {session.taskTitle || 'General Focus Session'}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {session.durationMinutes} mins
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ANALYTICS CARD 2: Task Distribution & Priority Performance ── */}
        <div style={{
          padding: '22px 24px',
          borderRadius: 20,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📊</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Tasks & Category Breakdown</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Priority status and estimation accuracy</span>
              </div>
            </div>
            <Link href="/tasks" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Manage Tasks <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Priority Breakdown */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
              Tasks by Priority Level
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(['super high', 'high', 'medium', 'low'] as Priority[]).map(p => {
                const count = taskStats.byPriority[p] || 0;
                const pColor = PRIORITY_COLORS[p];
                return (
                  <div key={p} style={{
                    padding: '10px 8px',
                    borderRadius: 12,
                    background: `${pColor}12`,
                    border: `1px solid ${pColor}30`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: pColor }}>{count}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: pColor, textTransform: 'capitalize', marginTop: 2 }}>{p}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Distribution */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Category Distribution
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['work', 'personal', 'health', 'learning', 'other'] as Category[]).map(cat => {
                const count = taskStats.byCategory[cat] || 0;
                const pct = taskStats.total > 0 ? Math.round((count / taskStats.total) * 100) : 0;
                const catColor = CATEGORY_COLORS[cat];
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <span style={{ width: 70, fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{cat}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: catColor, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', width: 35, textAlign: 'right' }}>{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Focus Estimation Accuracy */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12
          }}>
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Time Estimation Accuracy</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target: {taskStats.totalEstMins}m • Actual: {taskStats.totalActualMins}m</span>
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: 800,
              color: taskStats.totalActualMins > taskStats.totalEstMins && taskStats.totalEstMins > 0 ? '#ef4444' : '#10b981'
            }}>
              {taskStats.totalEstMins > 0
                ? `${Math.round((taskStats.totalActualMins / taskStats.totalEstMins) * 100)}% ratio`
                : 'No targets'}
            </span>
          </div>
        </div>

        {/* ── ANALYTICS CARD 3: Notes & Knowledge Base ──────────── */}
        <div style={{
          padding: '22px 24px',
          borderRadius: 20,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📝</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Notes & Knowledge Hub</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Saved ideas, documentation & quick notes</span>
              </div>
            </div>
            <Link href="/notes" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open Notes <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL NOTES STORED</span>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>{notesStats.total} Notes</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(notesStats.colorCounts).map(([color, cnt]) => (
                <div key={color} style={{ width: 14, height: 14, borderRadius: '50%', background: color, border: '1.5px solid var(--border)' }} title={`${cnt} notes`} />
              ))}
            </div>
          </div>

          {/* Recent Notes Preview */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Recently Updated Notes
            </span>
            {notesStats.recentNotes.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>
                No notes created yet. Click "Open Notes" to capture your ideas.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notesStats.recentNotes.map(n => (
                  <div key={n.id} style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderLeft: `4px solid ${n.color || 'var(--accent)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{n.title || 'Untitled Note'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {n.content ? n.content.substring(0, 80) : 'Empty note content...'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ANALYTICS CARD 4: Time Waste & Distraction Tracker ─── */}
        <div style={{
          padding: '22px 24px',
          borderRadius: 20,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>⏳</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Time-Waste & Leak Analytics</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Interruption logs & overdue break tracking</span>
              </div>
            </div>
            <Link href="/time-waste" style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Waste Log <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>WASTED TODAY</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>
                {formatSecsToHoursMins(totalWastedSecondsToday)}
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>TOTAL DISTRACTIONS</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                {wasteStats.totalWastedSessions} <span style={{ fontSize: 12, fontWeight: 500 }}>records</span>
              </div>
            </div>
          </div>

          {/* Recent Waste Records Snapshot */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Recent Distraction Records
            </span>
            {wasteHistory.length === 0 ? (
              <div style={{ fontSize: 12, color: '#10b981', padding: '16px 0', textAlign: 'center', fontWeight: 600 }}>
                🎉 Great job! No time waste or delay logs recorded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {wasteHistory.slice(0, 3).map(w => (
                  <div key={w.id} style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#ef4444' }}>⚠️</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {w.taskTitle || (w.isOverdueDelay ? 'Overdue Break Delay' : 'Interrupted Focus')}
                      </span>
                    </div>
                    <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 11 }}>
                      +{Math.round((w.durationSeconds || 0) / 60)}m waste
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── TWO-COLUMN TASK LISTS ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: 20,
        marginTop: 10
      }}>
        {/* Coming up */}
        <div>
          <SectionHeader title="📅 Upcoming Tasks" badge={`${todayTasks.length} tasks`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayTasks.length === 0
              ? <EmptyState msg="No tasks due today or tomorrow 🎉" />
              : todayTasks.map(task => (
                  <TaskCard key={task.id} task={task}
                    onToggle={toggleComplete}
                    onEdit={t => { setEditingTask(t); setShowModal(true); }}
                    onDelete={removeTask}
                  />
                ))
            }
          </div>
        </div>

        {/* Recent Tasks */}
        <div>
          <SectionHeader title="⚡ Recently Added" link={{ href: '/tasks', label: 'View all →' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentTasks.map(task => (
              <TaskCard key={task.id} task={task}
                onToggle={toggleComplete}
                onEdit={t => { setEditingTask(t); setShowModal(true); }}
                onDelete={removeTask}
              />
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <TaskModal task={editingTask} onSave={handleSave} onClose={() => { setShowModal(false); setEditingTask(null); }} />
      )}
    </div>
  );
}

/* ── Small UI helpers ─────────────────────────────────────────────── */
function SectionHeader({ title, badge, link }: { title: string; badge?: string; link?: { href: string; label: string } }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
      {badge && <span className="badge badge-todo">{badge}</span>}
      {link && <a href={link.href} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{link.label}</a>}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, background: 'var(--bg-secondary)', borderRadius: 14, border: '1px solid var(--border)' }}>
      {msg}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
