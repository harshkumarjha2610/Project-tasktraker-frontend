'use client';

import { useTaskContext } from '@/context/TaskContext';
import { usePomodoroContext } from '@/context/PomodoroContext';
import { useStreakContext } from '@/context/StreakContext';
import { getNotes, getEnglishPracticeLogs, getJobs, getClientApproaches, getFinanceSummary } from '@/lib/api';
import { Note } from '@/types/note';
import { Task, Priority, Category } from '@/types/task';
import { EnglishPracticeLog } from '@/types/englishPractice';
import { JobRecord } from '@/types/jobTracker';
import { ClientApproachRecord } from '@/types/clientApproach';
import { FinanceSummary } from '@/types/finance';
import { useState, useMemo, useEffect } from 'react';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import FormattedPracticeNotes from '@/components/FormattedPracticeNotes';
import Link from 'next/link';
import {
  Plus, CheckCircle, Circle, Loader, AlertTriangle, TrendingUp, Flame,
  Clock, Target, StickyNote, Zap, ShieldAlert, BarChart3, PieChart,
  ArrowUpRight, Award, CheckCircle2, ChevronRight, Layers, FileText,
  Activity, Sparkles, Database, HardDrive, Languages, Briefcase, UserPlus,
  DollarSign, Mic, Headphones, Book, BookOpen, Star, Building, UserCheck, Wallet
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

const CATEGORY_COLORS: Record<Category, string> = {
  work: '#8b5cf6',
  'company project': '#ec4899',
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

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function DashboardPage() {
  const { tasks, addTask, editTask, removeTask, toggleComplete, loading: tasksLoading, error: tasksError } = useTaskContext();
  const { history: pomodoroHistory, wasteHistory, totalWastedSecondsToday, completedSessionsCount, formatSecsToHoursMins } = usePomodoroContext();
  const { streakData, weeklyActivity, milestones, hasVisitedToday } = useStreakContext();

  const [notes, setNotes] = useState<Note[]>([]);
  const [englishLogs, setEnglishLogs] = useState<EnglishPracticeLog[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [clientApproaches, setClientApproaches] = useState<ClientApproachRecord[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Fetch website-wide data (Notes, English Practice, Jobs, Client Approaches, Finance)
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getNotes().catch(err => { console.error('[Dashboard] getNotes error:', err); return []; }),
      getEnglishPracticeLogs().catch(err => { console.error('[Dashboard] getEnglishPracticeLogs error:', err); return []; }),
      getJobs().catch(err => { console.error('[Dashboard] getJobs error:', err); return []; }),
      getClientApproaches().catch(err => { console.error('[Dashboard] getClientApproaches error:', err); return []; }),
      getFinanceSummary().catch(err => { console.error('[Dashboard] getFinanceSummary error:', err); return null; }),
    ]).then(([notesData, englishData, jobsData, approachesData, financeData]) => {
      if (isMounted) {
        setNotes(notesData || []);
        setEnglishLogs(englishData || []);
        setJobs(jobsData || []);
        setClientApproaches(approachesData || []);
        setFinanceSummary(financeData);
        setDashboardLoading(false);
      }
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

    const byCategory: Record<Category, number> = { work: 0, 'company project': 0, personal: 0, health: 0, learning: 0, other: 0 };
    const byPriority: Record<Priority, number> = { 'super high': 0, high: 0, medium: 0, low: 0 };

    tasks.forEach(t => {
      if (byCategory[t.category] !== undefined) byCategory[t.category]++;
      if (byPriority[t.priority] !== undefined) byPriority[t.priority]++;
    });

    return { total, done, inProgress, todo, overdue, completionRate, totalEstMins, totalActualMins, byCategory, byPriority };
  }, [tasks]);

  // ─── 2. Pomodoro & Productive Day Metrics ─────────────────────────
  const pomodoroStats = useMemo(() => {
    const PRODUCTIVE_DAY_TARGET_MINS = 600; // 10 pomodoros of 60 mins = 600 mins (10 hours)

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

    // Group work focus minutes by date (YYYY-MM-DD)
    const dailyFocusMap: Record<string, number> = {};
    pomodoroHistory.forEach(s => {
      if (s.mode === 'work' && s.completedAt) {
        const dStr = format(new Date(s.completedAt), 'yyyy-MM-dd');
        dailyFocusMap[dStr] = (dailyFocusMap[dStr] || 0) + (s.durationMinutes || 0);
      }
    });

    let totalProductiveDays = 0;
    let totalNonProductiveDays = 0;
    const dateEntries = Object.entries(dailyFocusMap);

    dateEntries.forEach(([, mins]) => {
      if (mins >= PRODUCTIVE_DAY_TARGET_MINS) {
        totalProductiveDays++;
      } else {
        totalNonProductiveDays++;
      }
    });

    const isTodayProductive = todayFocusMinutes >= PRODUCTIVE_DAY_TARGET_MINS;
    const todayProgressPct = Math.min(100, Math.round((todayFocusMinutes / PRODUCTIVE_DAY_TARGET_MINS) * 100));
    const minsRemainingToday = Math.max(0, PRODUCTIVE_DAY_TARGET_MINS - todayFocusMinutes);
    const todayPomodoroCount60m = (todayFocusMinutes / 60).toFixed(1);
    const totalDaysTracked = dateEntries.length;
    const productivityRate = totalDaysTracked > 0 ? Math.round((totalProductiveDays / totalDaysTracked) * 100) : 0;

    return {
      totalWorkSessions,
      totalFocusMinutes,
      todayFocusMinutes,
      totalBreakMinutes,
      PRODUCTIVE_DAY_TARGET_MINS,
      isTodayProductive,
      todayProgressPct,
      minsRemainingToday,
      todayPomodoroCount60m,
      totalProductiveDays,
      totalNonProductiveDays,
      productivityRate,
    };
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

  // ─── 5. English Practice Metrics ───────────────────────────────
  const englishStats = useMemo(() => {
    const total = englishLogs.length;
    const totalMinutes = englishLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
    const totalVocabCount = englishLogs.reduce((acc, l) => acc + (l.vocabulary?.length || 0), 0);

    const todayStr = new Date().toDateString();
    const todayMinutes = englishLogs
      .filter(l => new Date(l.date).toDateString() === todayStr)
      .reduce((acc, l) => acc + (l.durationMinutes || 0), 0);

    // Compute Streak
    let streak = 0;
    if (englishLogs.length > 0) {
      const sortedDates = [...new Set(englishLogs.map(l => new Date(l.date).toDateString()))]
        .map(d => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());

      const today = new Date();
      const checkDate = sortedDates[0];
      const diffDays = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 1) {
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = sortedDates[i - 1];
          const currDate = sortedDates[i];
          const diff = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 3600 * 24));
          if (diff === 1) streak++;
          else break;
        }
      }
    }

    const byType: Record<string, number> = { speaking: 0, listening: 0, reading: 0, writing: 0, vocabulary: 0 };
    englishLogs.forEach(l => {
      if (byType[l.practiceType] !== undefined) byType[l.practiceType]++;
    });

    const recentLogs = [...englishLogs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return { total, totalMinutes, todayMinutes, dailyGoal: 30, totalVocabCount, streak, byType, recentLogs };
  }, [englishLogs]);

  // ─── 6. Job Tracker Metrics ────────────────────────────────────
  const jobStats = useMemo(() => {
    const total = jobs.length;
    const todayStr = new Date().toDateString();
    const todayAppliedCount = jobs.filter(j => 
      (j.status === 'applied' || j.status === 'screening' || j.status === 'interview') && 
      new Date(j.appliedDate).toDateString() === todayStr
    ).length;

    const activePipelineCount = jobs.filter(j => j.status === 'screening' || j.status === 'interview').length;
    const interviewCount = jobs.filter(j => j.status === 'screening' || j.status === 'interview' || j.status === 'offered' || j.status === 'accepted').length;
    const interviewRate = total > 0 ? Math.round((interviewCount / total) * 100) : 0;
    const offersCount = jobs.filter(j => j.status === 'offered' || j.status === 'accepted').length;

    const byStatus: Record<string, number> = { wishlist: 0, applied: 0, screening: 0, interview: 0, offered: 0, accepted: 0, rejected: 0 };
    jobs.forEach(j => {
      if (byStatus[j.status] !== undefined) byStatus[j.status]++;
    });

    const recentJobs = [...jobs]
      .sort((a, b) => new Date(b.appliedDate || b.createdAt || 0).getTime() - new Date(a.appliedDate || a.createdAt || 0).getTime())
      .slice(0, 3);

    return { total, todayAppliedCount, dailyGoal: 5, activePipelineCount, interviewRate, offersCount, byStatus, recentJobs };
  }, [jobs]);

  // ─── 7. Client Approach Metrics ────────────────────────────────
  const clientStats = useMemo(() => {
    const total = clientApproaches.length;
    const todayStr = new Date().toDateString();
    const todayApproachesCount = clientApproaches.filter(a => new Date(a.date).toDateString() === todayStr).length;

    const respondedCount = clientApproaches.filter(a => a.status !== 'pending').length;
    const responseRate = total > 0 ? Math.round((respondedCount / total) * 100) : 0;
    const totalPipelineValue = clientApproaches.reduce((acc, a) => acc + (a.dealValue || 0), 0);

    const byStatus: Record<string, number> = { pending: 0, replied: 0, meeting: 0, converted: 0, rejected: 0 };
    clientApproaches.forEach(a => {
      if (byStatus[a.status] !== undefined) byStatus[a.status]++;
    });

    const recentApproaches = [...clientApproaches]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return { total, todayApproachesCount, dailyGoal: 10, responseRate, totalPipelineValue, byStatus, recentApproaches };
  }, [clientApproaches]);

  // ─── 8. Data Storage Metrics ─────────────────────────────────────
  const storageStats = useMemo(() => {
    const notesBytes = notes.length > 0 ? new Blob([JSON.stringify(notes)]).size : 0;
    const tasksBytes = tasks.length > 0 ? new Blob([JSON.stringify(tasks)]).size : 0;
    const pomodoroBytes = (pomodoroHistory.length > 0 || wasteHistory.length > 0)
      ? new Blob([JSON.stringify({ pomodoroHistory, wasteHistory })]).size
      : 0;

    const totalBytes = notesBytes + tasksBytes + pomodoroBytes;

    const notesPct = totalBytes > 0 ? Math.round((notesBytes / totalBytes) * 100) : 0;
    const tasksPct = totalBytes > 0 ? Math.round((tasksBytes / totalBytes) * 100) : 0;
    const pomodoroPct = totalBytes > 0 ? Math.round((pomodoroBytes / totalBytes) * 100) : 0;

    return {
      notesBytes,
      tasksBytes,
      pomodoroBytes,
      totalBytes,
      notesPct,
      tasksPct,
      pomodoroPct,
      formattedNotes: formatBytes(notesBytes),
      formattedTasks: formatBytes(tasksBytes),
      formattedPomodoro: formatBytes(pomodoroBytes),
      formattedTotal: formatBytes(totalBytes),
    };
  }, [notes, tasks, pomodoroHistory, wasteHistory]);

  // Task Lists
  const todayTasks = useMemo(() =>
    tasks.filter(t => t.dueDate && (isToday(new Date(t.dueDate)) || isTomorrow(new Date(t.dueDate)))).slice(0, 5),
    [tasks]
  );

  const recentTasks = useMemo(() =>
    [...tasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(0, 5),
    [tasks]
  );

  const handleSave = async (data: Omit<Task, 'id' | 'createdAt'>) => {
    if (editingTask) await editTask(editingTask.id, data);
    else await addTask(data);
    setShowModal(false);
    setEditingTask(null);
  };

  if (tasksLoading || dashboardLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
        <Loader size={22} style={{ color: '#8b5cf6' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Loading Dashboard & Productive Analytics…</span>
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
          <Link href="/finance" className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            💳 Finance Tracker
          </Link>
          <Link href="/english-practice" className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            🗣️ English Practice
          </Link>
          <Link href="/job-tracker" className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            💼 Job Tracker
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setShowModal(true); }} style={{ gap: 6 }}>
            <Plus size={15} /> New Task
          </button>
        </div>
      </div>

      {/* ── WEBSITE-WIDE CORE KPI GRID ────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
        gap: 16,
      }}>
        {/* KPI: Finance & Projected Net Worth */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.03))', border: '1px solid rgba(16,185,129,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.18)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '3px 8px', borderRadius: 6 }}>
              ₹{financeSummary?.netBalance.toLocaleString() || 0} Net
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            ₹{financeSummary?.projectedWealth.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Projected Total Wealth</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Committed: ₹{financeSummary?.totalCommittedIncome.toLocaleString() || 0} • Lent: ₹{financeSummary?.totalMoneyLentOutstanding.toLocaleString() || 0}
          </div>
        </div>

        {/* KPI 0: App Daily Streak */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.05))', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={22} color="#f59e0b" fill="#f59e0b" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.18)', padding: '3px 8px', borderRadius: 6 }}>
              {hasVisitedToday ? 'Active Today 🔥' : 'Open Daily'}
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            {streakData.currentStreak} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{streakData.currentStreak === 1 ? 'day streak' : 'days streak'}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>App Daily Streak</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Best: {streakData.longestStreak} days • {streakData.totalDaysActive} total active days
          </div>
        </div>

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

        {/* KPI 2: English Practice Streak */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.04))', border: '1px solid rgba(139,92,246,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.18)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Languages size={20} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', background: 'rgba(139,92,246,0.15)', padding: '3px 8px', borderRadius: 6 }}>
              {englishStats.todayMinutes}m Today
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            {englishStats.streak} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>days streak</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>English Practice</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {Math.floor(englishStats.totalMinutes / 60)}h {englishStats.totalMinutes % 60}m total • {englishStats.totalVocabCount} vocab
          </div>
        </div>

        {/* KPI 3: Job Application Pipeline */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.03))', border: '1px solid rgba(59,130,246,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.18)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={20} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.15)', padding: '3px 8px', borderRadius: 6 }}>
              {jobStats.todayAppliedCount}/{jobStats.dailyGoal} Today
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            {jobStats.activePipelineCount} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>interviews</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Daily Job Applications</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {jobStats.total} applications • {jobStats.interviewRate}% interview rate
          </div>
        </div>

        {/* KPI 4: Client Approaches */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(6,186,212,0.1), rgba(6,186,212,0.03))', border: '1px solid rgba(6,186,212,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(6,186,212,0.18)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={20} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#06b6d4', background: 'rgba(6,186,212,0.15)', padding: '3px 8px', borderRadius: 6 }}>
              {clientStats.todayApproachesCount}/{clientStats.dailyGoal} Today
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            ₹{clientStats.totalPipelineValue.toLocaleString()}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Client Pipeline Value</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {clientStats.total} leads reached • {clientStats.responseRate}% response rate
          </div>
        </div>

        {/* KPI 5: Pomodoro Focus Time */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))', border: '1px solid rgba(16,185,129,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.18)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '3px 8px', borderRadius: 6 }}>
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

        {/* KPI 6: Daily Productive Status (10 Pomodoros x 60m = 600m Target) */}
        <div className="stat-card" style={{
          background: pomodoroStats.isTodayProductive
            ? 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(245,158,11,0.06))'
            : 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.03))',
          border: `1px solid ${pomodoroStats.isTodayProductive ? 'rgba(16,185,129,0.4)' : 'rgba(139,92,246,0.25)'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: pomodoroStats.isTodayProductive ? 'rgba(16,185,129,0.22)' : 'rgba(139,92,246,0.18)',
              color: pomodoroStats.isTodayProductive ? '#10b981' : '#8b5cf6',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Award size={22} />
            </div>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: pomodoroStats.isTodayProductive ? '#10b981' : '#f59e0b',
              background: pomodoroStats.isTodayProductive ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              padding: '3px 8px', borderRadius: 6
            }}>
              {pomodoroStats.isTodayProductive ? '🌟 Productive Day' : '⚡ Non-Productive'}
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            {pomodoroStats.todayFocusMinutes} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>/ 600 mins</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Daily Productive Status</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {pomodoroStats.todayPomodoroCount60m} / 10 Pomodoros (60m) • {pomodoroStats.totalProductiveDays} productive days
          </div>
        </div>
      </div>

      {/* ── DETAILED ANALYTICS SECTIONS ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: 20 }}>
        
        {/* ── ANALYTICS CARD: Finance & Committed Client Revenue ── */}
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
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16,185,129,0.18)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Finance & Committed Revenue</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Net Balance, Client Commitments & Money Lent</span>
              </div>
            </div>
            <Link href="/finance" style={{ fontSize: 12, fontWeight: 600, color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open Finance Tracker <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>NET BALANCE</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: (financeSummary?.netBalance || 0) >= 0 ? '#10b981' : '#ef4444', marginTop: 4 }}>
                ₹{financeSummary?.netBalance.toLocaleString() || 0}
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>PROJECTED WEALTH</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                ₹{financeSummary?.projectedWealth.toLocaleString() || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6' }}>COMMITTED CLIENT REVENUE</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                ₹{financeSummary?.totalCommittedIncome.toLocaleString() || 0}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{financeSummary?.pendingCommittedCount || 0} pending contracts</span>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#06b6d4' }}>OUTSTANDING MONEY LENT</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                ₹{financeSummary?.totalMoneyLentOutstanding.toLocaleString() || 0}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{financeSummary?.outstandingLentCount || 0} active borrowers</span>
            </div>
          </div>
        </div>

        {/* ── ANALYTICS CARD: Daily Productive Day Tracker (10 Pomodoros x 60m = 600m Goal) ── */}
        <div style={{
          padding: '22px 24px',
          borderRadius: 20,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          gridColumn: '1 / -1',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: pomodoroStats.isTodayProductive
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(245,158,11,0.15))'
                  : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,186,212,0.1))',
                color: pomodoroStats.isTodayProductive ? '#10b981' : '#8b5cf6',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Award size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Daily Productive Day Tracker</h3>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: pomodoroStats.isTodayProductive ? '#10b981' : '#f59e0b',
                    background: pomodoroStats.isTodayProductive ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    padding: '2px 8px', borderRadius: 12, border: `1px solid ${pomodoroStats.isTodayProductive ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                  }}>
                    {pomodoroStats.isTodayProductive ? '🌟 Productive Day Achieved!' : '⚡ Non-Productive Day'}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Rule: 10 Pomodoros of 60 minutes (600 minutes / 10 hours focus) required per day</span>
              </div>
            </div>
            <Link href="/pomodoro" className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
              <Clock size={14} /> Open Pomodoro Timer <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Today's Goal Progress Bar */}
          <div style={{ padding: '16px 18px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Today's Focus Goal Progress</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                  ({pomodoroStats.todayFocusMinutes} / 600 mins)
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: pomodoroStats.isTodayProductive ? '#10b981' : '#8b5cf6' }}>
                {pomodoroStats.todayProgressPct}% ({pomodoroStats.todayPomodoroCount60m} / 10 Pomodoros)
              </span>
            </div>

            {/* Progress Track */}
            <div style={{ width: '100%', height: 12, borderRadius: 6, background: 'var(--bg-secondary)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{
                width: `${pomodoroStats.todayProgressPct}%`,
                height: '100%',
                background: pomodoroStats.isTodayProductive
                  ? 'linear-gradient(90deg, #10b981, #f59e0b)'
                  : 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                borderRadius: 6,
                transition: 'width 0.4s ease',
              }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {pomodoroStats.isTodayProductive
                  ? '🎉 Outstanding achievement! You reached 10 hours (600 mins) of focus time today!'
                  : `⚡ Need ${pomodoroStats.minsRemainingToday} more minutes (${(pomodoroStats.minsRemainingToday / 60).toFixed(1)} hrs) today to qualify as a Productive Day.`}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Target: 600m</span>
            </div>
          </div>

          {/* Productive vs Non-Productive Days Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
            <div style={{ padding: '16px 18px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: '0.05em' }}>PRODUCTIVE DAYS</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                🌟 {pomodoroStats.totalProductiveDays} {pomodoroStats.totalProductiveDays === 1 ? 'Day' : 'Days'}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>Days with ≥ 10 Pomodoros (600 mins)</span>
            </div>

            <div style={{ padding: '16px 18px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: '0.05em' }}>NON-PRODUCTIVE DAYS</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚡ {pomodoroStats.totalNonProductiveDays} {pomodoroStats.totalNonProductiveDays === 1 ? 'Day' : 'Days'}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>Days with &lt; 10 Pomodoros (600 mins)</span>
            </div>

            <div style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PRODUCTIVITY RATE</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                📈 {pomodoroStats.productivityRate}%
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>Ratio of productive active days</span>
            </div>
          </div>
        </div>
        
        {/* ── ANALYTICS CARD 0: App Daily Streak & Habit Tracker ── */}
        <div style={{
          padding: '22px 24px',
          borderRadius: 20,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          gridColumn: '1 / -1',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(234,88,12,0.15))', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={24} color="#f59e0b" fill="#f59e0b" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>App Daily Streak & Habit Consistency</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)' }}>
                    🔥 Live Tracker
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Automatically counts every day you visit DailyTask!</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: hasVisitedToday ? '#10b981' : '#f59e0b', background: hasVisitedToday ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', padding: '5px 10px', borderRadius: 8, border: `1px solid ${hasVisitedToday ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                {hasVisitedToday ? '✓ Checked in Today!' : '🔥 Keep the flame burning!'}
              </span>
            </div>
          </div>

          {/* Core Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12 }}>
            <div style={{ padding: '16px 18px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>CURRENT STREAK</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={20} fill="#f59e0b" />
                {streakData.currentStreak} {streakData.currentStreak === 1 ? 'Day' : 'Days'}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>Consecutive active days</span>
            </div>

            <div style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>LONGEST RECORD</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                🏆 {streakData.longestStreak} {streakData.longestStreak === 1 ? 'Day' : 'Days'}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>All-time best record</span>
            </div>

            <div style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>TOTAL DAYS ACTIVE</span>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#06b6d4', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                📅 {streakData.totalDaysActive} {streakData.totalDaysActive === 1 ? 'Day' : 'Days'}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>Lifetime check-ins logged</span>
            </div>
          </div>

          {/* 7-Day Visual Weekly Activity Tracker */}
          <div style={{ padding: '16px 18px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>This Week's Activity (Mon - Sun)</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Opens logged automatically</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {weeklyActivity.map((day, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 6px',
                    borderRadius: 12,
                    textAlign: 'center',
                    background: day.isActive
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(234,88,12,0.15))'
                      : day.isToday
                      ? 'rgba(139,92,246,0.1)'
                      : 'var(--bg-secondary)',
                    border: day.isToday
                      ? '2px solid #f59e0b'
                      : day.isActive
                      ? '1px solid rgba(245,158,11,0.4)'
                      : '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: day.isToday ? '#f59e0b' : 'var(--text-muted)' }}>
                    {day.dayName}
                  </span>

                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: day.isActive
                      ? '#f59e0b'
                      : day.isFuture
                      ? 'transparent'
                      : 'var(--border)',
                    color: day.isActive ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800,
                  }}>
                    {day.isActive ? (
                      <Flame size={16} fill="#fff" color="#fff" />
                    ) : day.isToday ? (
                      '⚡'
                    ) : day.isFuture ? (
                      '•'
                    ) : (
                      '✕'
                    )}
                  </div>

                  <span style={{ fontSize: 10, fontWeight: 600, color: day.isActive ? '#f59e0b' : 'var(--text-muted)' }}>
                    {day.isActive ? 'Logged' : day.isToday ? 'Today' : day.isFuture ? 'Upcoming' : 'Missed'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Milestone Badges Row */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
              Streak Milestone Badges
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10 }}>
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: m.unlocked
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(139,92,246,0.05))'
                      : 'var(--bg-card)',
                    border: m.unlocked
                      ? '1px solid rgba(245,158,11,0.35)'
                      : '1px solid var(--border)',
                    opacity: m.unlocked ? 1 : 0.55,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: m.unlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: 10, color: m.unlocked ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600 }}>
                      {m.requiredDays} {m.requiredDays === 1 ? 'day' : 'days'} {m.unlocked ? '✓ Unlocked' : 'Locked'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* ── ANALYTICS CARD 1: English Practice Analytics & Formatted Notes ── */}
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
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(139,92,246,0.18)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Languages size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>English Practice & Notes</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Daily fluency, streak & practice notes</span>
              </div>
            </div>
            <Link href="/english-practice" style={{ fontSize: 12, fontWeight: 600, color: '#8b5cf6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open Sessions <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>PRACTICE STREAK</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                🔥 {englishStats.streak} <span style={{ fontSize: 13, fontWeight: 500 }}>days</span>
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>TODAY'S TARGET ({englishStats.todayMinutes}/{englishStats.dailyGoal}m)</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6', marginTop: 4 }}>
                {englishStats.todayMinutes}m <span style={{ fontSize: 12, color: englishStats.todayMinutes >= englishStats.dailyGoal ? '#10b981' : 'var(--text-muted)' }}>
                  {englishStats.todayMinutes >= englishStats.dailyGoal ? '✓ Goal Met!' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Skill Breakdown */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Practice Categories Logged
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {[
                { type: 'speaking', label: 'Speaking', color: '#8b5cf6' },
                { type: 'listening', label: 'Listening', color: '#06b6d4' },
                { type: 'reading', label: 'Reading', color: '#10b981' },
                { type: 'writing', label: 'Writing', color: '#f59e0b' },
                { type: 'vocabulary', label: 'Vocab', color: '#ec4899' },
              ].map(cat => {
                const count = englishStats.byType[cat.type] || 0;
                return (
                  <div key={cat.type} style={{
                    padding: '8px 4px', borderRadius: 10, background: `${cat.color}12`,
                    border: `1px solid ${cat.color}30`, textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: cat.color }}>{count}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: cat.color, marginTop: 2 }}>{cat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Practice Log preview with Formatted Notes */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Recent Practice Session Notes
            </span>
            {englishStats.recentLogs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                No practice sessions logged yet. Log your first session to track progress!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {englishStats.recentLogs.map(log => (
                  <div key={log.id} style={{
                    padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card)',
                    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{log.topic}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>⏱️ {log.durationMinutes}m</span>
                    </div>
                    {/* Render rich formatted notes preview */}
                    <FormattedPracticeNotes notes={log.notes} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ANALYTICS CARD 2: Daily Job Application Tracker Analytics ── */}
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
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,0.18)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Daily Job Applications</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Interview pipeline & application status</span>
              </div>
            </div>
            <Link href="/job-tracker" style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open Tracker <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>INTERVIEW RATE</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#06b6d4', marginTop: 4 }}>
                {jobStats.interviewRate}%
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>OFFERS RECEIVED</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                🎉 {jobStats.offersCount}
              </div>
            </div>
          </div>

          {/* Status Pipeline Funnel */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Application Funnel Pipeline
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {[
                { key: 'applied', label: 'Applied', color: '#3b82f6' },
                { key: 'screening', label: 'Screening', color: '#06b6d4' },
                { key: 'interview', label: 'Interview', color: '#f59e0b' },
                { key: 'offered', label: 'Offered', color: '#10b981' },
                { key: 'rejected', label: 'Rejected', color: '#ef4444' },
              ].map(st => {
                const count = jobStats.byStatus[st.key] || 0;
                return (
                  <div key={st.key} style={{
                    padding: '8px 4px', borderRadius: 10, background: `${st.color}12`,
                    border: `1px solid ${st.color}30`, textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: st.color }}>{count}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: st.color, marginTop: 2 }}>{st.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Applications list */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Recent Applications
            </span>
            {jobStats.recentJobs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                No job applications logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {jobStats.recentJobs.map(j => (
                  <div key={j.id} style={{
                    padding: '8px 12px', borderRadius: 10, background: 'var(--bg-card)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', fontSize: 12
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{j.position}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>at {j.company}</span>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      textTransform: 'capitalize', background: 'rgba(59,130,246,0.15)', color: '#3b82f6'
                    }}>
                      {j.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ANALYTICS CARD 3: Daily Client Approaches Analytics ── */}
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
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(6,186,212,0.18)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Daily Client Approaches</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Outreach conversion & pipeline revenue</span>
              </div>
            </div>
            <Link href="/client-approaches" style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open Pipeline <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>RESPONSE RATE</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                {clientStats.responseRate}%
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>PIPELINE VALUE</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                ₹{clientStats.totalPipelineValue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Client Status Funnel */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Outreach Conversion Funnel
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {[
                { key: 'pending', label: 'Pending', color: '#f59e0b' },
                { key: 'replied', label: 'Replied', color: '#06b6d4' },
                { key: 'meeting', label: 'Meeting', color: '#8b5cf6' },
                { key: 'converted', label: 'Converted', color: '#10b981' },
                { key: 'rejected', label: 'Rejected', color: '#ef4444' },
              ].map(st => {
                const count = clientStats.byStatus[st.key] || 0;
                return (
                  <div key={st.key} style={{
                    padding: '8px 4px', borderRadius: 10, background: `${st.color}12`,
                    border: `1px solid ${st.color}30`, textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: st.color }}>{count}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: st.color, marginTop: 2 }}>{st.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Client Approaches snapshot */}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Recent Client Outreach Activity
            </span>
            {clientStats.recentApproaches.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                No client approaches logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {clientStats.recentApproaches.map(a => (
                  <div key={a.id} style={{
                    padding: '8px 12px', borderRadius: 10, background: 'var(--bg-card)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', fontSize: 12
                  }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.clientName}</span>
                      {a.dealValue ? <span style={{ color: '#10b981', fontWeight: 600, marginLeft: 6 }}>(₹{a.dealValue.toLocaleString()})</span> : null}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      textTransform: 'capitalize', background: 'rgba(6,186,212,0.15)', color: '#06b6d4'
                    }}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ANALYTICS CARD 4: Pomodoro & Focus Time Performance ── */}
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
          </div>
        </div>

        {/* ── ANALYTICS CARD 5: Tasks & Category Breakdown ── */}
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
                    padding: '10px 8px', borderRadius: 12, background: `${pColor}12`,
                    border: `1px solid ${pColor}30`, textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: pColor }}>{count}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: pColor, textTransform: 'capitalize', marginTop: 2 }}>{p}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── ANALYTICS CARD 6: Notes & Knowledge Hub ──────────── */}
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
        </div>

        {/* ── ANALYTICS CARD 7: Data Storage & Space Filled ── */}
        <div style={{
          gridColumn: '1 / -1',
          padding: '22px 24px',
          borderRadius: 20,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.18)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HardDrive size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Data Storage & Space Filled</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Memory payload distribution across Notes, Tasks, and Pomodoro</span>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(16,185,129,0.3)' }}>
              💾 {storageStats.formattedTotal} Total Filled
            </span>
          </div>

          <div style={{ height: 10, background: 'var(--bg-card)', borderRadius: 5, overflow: 'hidden', display: 'flex', border: '1px solid var(--border)' }}>
            <div style={{ height: '100%', width: `${storageStats.notesPct}%`, background: '#f59e0b' }} title={`Notes: ${storageStats.formattedNotes}`} />
            <div style={{ height: '100%', width: `${storageStats.tasksPct}%`, background: '#8b5cf6' }} title={`Tasks: ${storageStats.formattedTasks}`} />
            <div style={{ height: '100%', width: `${storageStats.pomodoroPct}%`, background: '#06b6d4' }} title={`Pomodoro: ${storageStats.formattedPomodoro}`} />
          </div>
        </div>
      </div>

      {/* ── TASKS ACTION FEED ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: 20 }}>
        {/* Due Soon / Today */}
        <div>
          <SectionHeader title="📌 Due Today & Tomorrow" badge={`${todayTasks.length} pending`} link={{ href: '/tasks', label: 'View all →' }} />
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
