import { Task, DetailedStats } from '@/types/task';
import { Note } from '@/types/note';
import { StreakData } from '@/types/streak';
import { FinanceTransaction, CommittedIncomeRecord, MoneyLentRecord, FinanceSummary } from '@/types/finance';

// ─── Base URL ──────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://project-tasktraker-backend.vercel.app/api' 
    : 'http://localhost:5000/api');

// ─── Helper ────────────────────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `API error: ${res.status}`);
  }
  return json;
}

// ─── Map MongoDB _id → id for frontend compatibility ──────────
function normalizeTask(raw: Record<string, unknown>): Task {
  return {
    id: String(raw._id ?? raw.id),
    title: raw.title as string,
    description: raw.description as string | undefined,
    priority: raw.priority as Task['priority'],
    status: raw.status as Task['status'],
    category: raw.category as Task['category'],
    dueDate: raw.dueDate as string | undefined,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    completedAt: raw.completedAt as string | undefined,
    isDeleted: raw.isDeleted as boolean | undefined,
    tags: (raw.tags as string[]) ?? [],
    estimatedMinutes: raw.estimatedMinutes as number | undefined,
  };
}

// ─── Tasks API ─────────────────────────────────────────────────

export async function getTasks(params?: {
  status?: string; priority?: string; category?: string; search?: string;
}): Promise<Task[]> {
  const qs = params
    ? '?' + new URLSearchParams(
      Object.entries(params).filter(([, v]) => v && v !== 'all') as [string, string][]
    ).toString()
    : '';

  const res = await request<{ data: Record<string, unknown>[] }>(`/tasks${qs}`);
  return res.data.map(normalizeTask);
}

export async function createTask(payload: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const res = await request<{ data: Record<string, unknown> }>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeTask(res.data);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const res = await request<{ data: Record<string, unknown> }>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return normalizeTask(res.data);
}

export async function toggleTask(id: string): Promise<Task> {
  const res = await request<{ data: Record<string, unknown> }>(`/tasks/${id}/toggle`, {
    method: 'PATCH',
  });
  return normalizeTask(res.data);
}

export async function deleteTask(id: string): Promise<void> {
  await request(`/tasks/${id}`, { method: 'DELETE' });
}

// ─── Stats ─────────────────────────────────────────────────────
export async function getStats(): Promise<DetailedStats> {
  const res = await request<{ data: DetailedStats }>('/tasks/stats');
  return res.data;
}

// ─── Map MongoDB _id → id for Notes ───────────────────────────
function normalizeNote(raw: Record<string, unknown>): Note {
  return {
    id: String(raw._id ?? raw.id),
    title: raw.title as string,
    content: raw.content as string,
    color: raw.color as string,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  };
}

// ─── Notes API ─────────────────────────────────────────────────
export async function getNotes(): Promise<Note[]> {
  const res = await request<{ data: Record<string, unknown>[] }>('/notes');
  return res.data.map(normalizeNote);
}

export async function createNote(payload: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
  const res = await request<{ data: Record<string, unknown> }>('/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeNote(res.data);
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<Note> {
  const res = await request<{ data: Record<string, unknown> }>(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return normalizeNote(res.data);
}

export async function deleteNote(id: string): Promise<void> {
  await request(`/notes/${id}`, { method: 'DELETE' });
}

// ─── Pomodoro API ──────────────────────────────────────────────
export interface PomodoroBackendData {
  settings: {
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    longBreakInterval: number;
    autoStartBreaks: boolean;
    autoStartPomodoros: boolean;
    soundEnabled: boolean;
    tickingEnabled: boolean;
    bellEnabled: boolean;
    clockStyle: string;
  };
  colorTheme: string;
  bgStyle: string;
  history: Array<{
    id: string;
    mode: 'work' | 'shortBreak' | 'longBreak';
    durationMinutes: number;
    taskTitle?: string;
    completedAt: string;
  }>;
  wasteHistory: Array<{
    id: string;
    mode: 'work' | 'shortBreak' | 'longBreak';
    taskTitle?: string;
    durationSeconds: number;
    interruptedAt: string;
    isOverdueDelay?: boolean;
  }>;
  activeTimer?: {
    isRunning: boolean;
    mode: 'work' | 'shortBreak' | 'longBreak';
    targetEndTimestamp: number | null;
    timeLeft: number;
    selectedTaskId?: string;
    isInterrupted?: boolean;
    wastedSeconds?: number;
    interruptedStartedAt?: number | null;
    overdueBreakMode?: 'work' | 'shortBreak' | 'longBreak' | null;
    updatedAt?: number;
  };
  standaloneWasteState?: {
    isRunning: boolean;
    startedAt: number | null;
    accumulatedMs: number;
    sessions: Array<{
      id: string;
      startTime: string;
      endTime: string;
      durationMs: number;
      reason: string;
    }>;
    updatedAt?: number;
  };
}

export async function getPomodoroData(): Promise<PomodoroBackendData> {
  const res = await request<{ data: PomodoroBackendData }>('/pomodoro');
  return res.data;
}

export async function updatePomodoroSettings(payload: {
  settings?: Record<string, unknown>;
  colorTheme?: string;
  bgStyle?: string;
}): Promise<PomodoroBackendData> {
  const res = await request<{ data: PomodoroBackendData }>('/pomodoro/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function addPomodoroSession(session: Record<string, unknown>): Promise<PomodoroBackendData> {
  const res = await request<{ data: PomodoroBackendData }>('/pomodoro/session', {
    method: 'POST',
    body: JSON.stringify({ session }),
  });
  return res.data;
}

export async function addWasteSession(wasteRecord: Record<string, unknown>): Promise<PomodoroBackendData> {
  const res = await request<{ data: PomodoroBackendData }>('/pomodoro/waste', {
    method: 'POST',
    body: JSON.stringify({ wasteRecord }),
  });
  return res.data;
}

export async function syncPomodoroData(payload: Partial<PomodoroBackendData>): Promise<PomodoroBackendData> {
  const res = await request<{ data: PomodoroBackendData }>('/pomodoro/sync', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateActiveTimerState(activeTimer: Record<string, unknown>): Promise<PomodoroBackendData> {
  const res = await request<{ data: PomodoroBackendData }>('/pomodoro/active-timer', {
    method: 'PUT',
    body: JSON.stringify({ activeTimer }),
  });
  return res.data;
}

export async function updateStandaloneWasteState(standaloneWasteState: Record<string, unknown>): Promise<PomodoroBackendData> {
  const res = await request<{ data: PomodoroBackendData }>('/pomodoro/standalone-waste', {
    method: 'PUT',
    body: JSON.stringify({ standaloneWasteState }),
  });
  return res.data;
}

// ─── English Practice API ──────────────────────────────────────
import { EnglishPracticeLog } from '@/types/englishPractice';
import { ClientApproachRecord } from '@/types/clientApproach';

function normalizeEnglishLog(raw: Record<string, unknown>): EnglishPracticeLog {
  return {
    id: String(raw._id ?? raw.id),
    date: (raw.date as string) ?? new Date().toISOString(),
    practiceType: raw.practiceType as EnglishPracticeLog['practiceType'],
    durationMinutes: Number(raw.durationMinutes || 0),
    topic: raw.topic as string,
    notes: raw.notes as string | undefined,
    rating: Number(raw.rating || 5),
    vocabulary: (raw.vocabulary as EnglishPracticeLog['vocabulary']) || [],
    createdAt: raw.createdAt as string | undefined,
  };
}

export async function getEnglishPracticeLogs(): Promise<EnglishPracticeLog[]> {
  try {
    const res = await request<{ data: Record<string, unknown>[] }>('/english-practice');
    return res.data.map(normalizeEnglishLog);
  } catch (err) {
    console.warn('[API] English Practice backend offline, loading from localStorage fallback');
    const local = localStorage.getItem('dt_english_practice_logs');
    return local ? JSON.parse(local) : [];
  }
}

export async function createEnglishPracticeLog(payload: Omit<EnglishPracticeLog, 'id'>): Promise<EnglishPracticeLog> {
  try {
    const res = await request<{ data: Record<string, unknown> }>('/english-practice', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeEnglishLog(res.data);
  } catch (err) {
    console.warn('[API] English Practice backend error, saving to localStorage');
    const local = localStorage.getItem('dt_english_practice_logs');
    const logs: EnglishPracticeLog[] = local ? JSON.parse(local) : [];
    const newLog: EnglishPracticeLog = { ...payload, id: 'loc_' + Date.now() };
    logs.unshift(newLog);
    localStorage.setItem('dt_english_practice_logs', JSON.stringify(logs));
    return newLog;
  }
}

export async function updateEnglishPracticeLog(id: string, updates: Partial<EnglishPracticeLog>): Promise<EnglishPracticeLog> {
  try {
    const res = await request<{ data: Record<string, unknown> }>(`/english-practice/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return normalizeEnglishLog(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_english_practice_logs');
    let logs: EnglishPracticeLog[] = local ? JSON.parse(local) : [];
    let updated: EnglishPracticeLog | null = null;
    logs = logs.map(item => {
      if (item.id === id) {
        updated = { ...item, ...updates };
        return updated;
      }
      return item;
    });
    localStorage.setItem('dt_english_practice_logs', JSON.stringify(logs));
    return updated || ({ ...updates, id } as EnglishPracticeLog);
  }
}

export async function deleteEnglishPracticeLog(id: string): Promise<void> {
  try {
    await request(`/english-practice/${id}`, { method: 'DELETE' });
  } catch (err) {
    const local = localStorage.getItem('dt_english_practice_logs');
    if (local) {
      const logs: EnglishPracticeLog[] = JSON.parse(local);
      localStorage.setItem('dt_english_practice_logs', JSON.stringify(logs.filter(l => l.id !== id)));
    }
  }
}

// ─── Client Approach API ───────────────────────────────────────
function normalizeClientApproach(raw: Record<string, unknown>): ClientApproachRecord {
  return {
    id: String(raw._id ?? raw.id),
    date: (raw.date as string) ?? new Date().toISOString(),
    clientName: raw.clientName as string,
    platform: raw.platform as ClientApproachRecord['platform'],
    approachType: raw.approachType as ClientApproachRecord['approachType'],
    status: raw.status as ClientApproachRecord['status'],
    dealValue: Number(raw.dealValue || 0),
    notes: raw.notes as string | undefined,
    followUpDate: raw.followUpDate as string | undefined,
    createdAt: raw.createdAt as string | undefined,
  };
}

export async function getClientApproaches(): Promise<ClientApproachRecord[]> {
  try {
    const res = await request<{ data: Record<string, unknown>[] }>('/client-approaches');
    return res.data.map(normalizeClientApproach);
  } catch (err) {
    console.warn('[API] Client Approaches backend offline, loading from localStorage fallback');
    const local = localStorage.getItem('dt_client_approaches');
    return local ? JSON.parse(local) : [];
  }
}

export async function createClientApproach(payload: Omit<ClientApproachRecord, 'id'>): Promise<ClientApproachRecord> {
  try {
    const res = await request<{ data: Record<string, unknown> }>('/client-approaches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeClientApproach(res.data);
  } catch (err) {
    console.warn('[API] Client Approach backend error, saving to localStorage');
    const local = localStorage.getItem('dt_client_approaches');
    const items: ClientApproachRecord[] = local ? JSON.parse(local) : [];
    const newItem: ClientApproachRecord = { ...payload, id: 'loc_' + Date.now() };
    items.unshift(newItem);
    localStorage.setItem('dt_client_approaches', JSON.stringify(items));
    return newItem;
  }
}

export async function updateClientApproach(id: string, updates: Partial<ClientApproachRecord>): Promise<ClientApproachRecord> {
  try {
    const res = await request<{ data: Record<string, unknown> }>(`/client-approaches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return normalizeClientApproach(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_client_approaches');
    let items: ClientApproachRecord[] = local ? JSON.parse(local) : [];
    let updated: ClientApproachRecord | null = null;
    items = items.map(item => {
      if (item.id === id) {
        updated = { ...item, ...updates };
        return updated;
      }
      return item;
    });
    localStorage.setItem('dt_client_approaches', JSON.stringify(items));
    return updated || ({ ...updates, id } as ClientApproachRecord);
  }
}

export async function deleteClientApproach(id: string): Promise<void> {
  try {
    await request(`/client-approaches/${id}`, { method: 'DELETE' });
  } catch (err) {
    const local = localStorage.getItem('dt_client_approaches');
    if (local) {
      const items: ClientApproachRecord[] = JSON.parse(local);
      localStorage.setItem('dt_client_approaches', JSON.stringify(items.filter(i => i.id !== id)));
    }
  }
}

// ─── Daily Job Tracker API ─────────────────────────────────────
import { JobRecord } from '@/types/jobTracker';

function normalizeJobRecord(raw: Record<string, unknown>): JobRecord {
  return {
    id: String(raw._id ?? raw.id),
    company: (raw.company as string) || '',
    position: (raw.position as string) || '',
    platform: (raw.platform as JobRecord['platform']) || 'linkedin',
    jobType: (raw.jobType as JobRecord['jobType']) || 'full_time',
    workMode: (raw.workMode as JobRecord['workMode']) || 'remote',
    salary: (raw.salary as string) || '',
    status: (raw.status as JobRecord['status']) || 'applied',
    appliedDate: (raw.appliedDate as string) ?? new Date().toISOString(),
    jobUrl: (raw.jobUrl as string) || '',
    contactInfo: (raw.contactInfo as string) || '',
    location: (raw.location as string) || '',
    notes: (raw.notes as string) || '',
    followUpDate: raw.followUpDate as string | undefined,
    rating: Number(raw.rating || 3),
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

export async function getJobs(params?: { status?: string; platform?: string; search?: string }): Promise<JobRecord[]> {
  try {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v && v !== 'all') as [string, string][]
        ).toString()
      : '';
    const res = await request<{ data: Record<string, unknown>[] }>(`/jobs${qs}`);
    return res.data.map(normalizeJobRecord);
  } catch (err) {
    console.warn('[API] Jobs backend offline, loading from localStorage fallback');
    const local = localStorage.getItem('dt_job_tracker_items');
    let items: JobRecord[] = local ? JSON.parse(local) : [];
    if (params) {
      if (params.status && params.status !== 'all') {
        items = items.filter(i => i.status === params.status);
      }
      if (params.platform && params.platform !== 'all') {
        items = items.filter(i => i.platform === params.platform);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter(i => 
          i.company.toLowerCase().includes(q) || 
          i.position.toLowerCase().includes(q) || 
          i.notes?.toLowerCase().includes(q)
        );
      }
    }
    return items;
  }
}

export async function createJob(payload: Omit<JobRecord, 'id'>): Promise<JobRecord> {
  try {
    const res = await request<{ data: Record<string, unknown> }>('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeJobRecord(res.data);
  } catch (err) {
    console.warn('[API] Jobs backend error, saving to localStorage');
    const local = localStorage.getItem('dt_job_tracker_items');
    const items: JobRecord[] = local ? JSON.parse(local) : [];
    const newItem: JobRecord = { ...payload, id: 'job_loc_' + Date.now() };
    items.unshift(newItem);
    localStorage.setItem('dt_job_tracker_items', JSON.stringify(items));
    return newItem;
  }
}

export async function updateJob(id: string, updates: Partial<JobRecord>): Promise<JobRecord> {
  try {
    const res = await request<{ data: Record<string, unknown> }>(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return normalizeJobRecord(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_job_tracker_items');
    let items: JobRecord[] = local ? JSON.parse(local) : [];
    let updated: JobRecord | null = null;
    items = items.map(item => {
      if (item.id === id) {
        updated = { ...item, ...updates };
        return updated;
      }
      return item;
    });
    localStorage.setItem('dt_job_tracker_items', JSON.stringify(items));
    return updated || ({ ...updates, id } as JobRecord);
  }
}

export async function deleteJob(id: string): Promise<void> {
  try {
    await request(`/jobs/${id}`, { method: 'DELETE' });
  } catch (err) {
    const local = localStorage.getItem('dt_job_tracker_items');
    if (local) {
      const items: JobRecord[] = JSON.parse(local);
      localStorage.setItem('dt_job_tracker_items', JSON.stringify(items.filter(i => i.id !== id)));
    }
  }
}

// ─── Daily Streak API ──────────────────────────────────────────
export async function getStreakData(): Promise<StreakData> {
  try {
    const res = await request<{ data: StreakData }>('/streak');
    return res.data;
  } catch (err) {
    console.warn('[API] Streak backend offline, loading from localStorage fallback');
    const local = localStorage.getItem('dt_app_daily_streak');
    if (local) return JSON.parse(local);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      activeDates: [],
      totalDaysActive: 0,
    };
  }
}

export async function recordStreakVisit(dateStr: string): Promise<StreakData> {
  try {
    const res = await request<{ data: StreakData }>('/streak/record-visit', {
      method: 'POST',
      body: JSON.stringify({ dateStr }),
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Streak backend error, recording locally');
    const local = localStorage.getItem('dt_app_daily_streak');
    let data: StreakData = local
      ? JSON.parse(local)
      : { currentStreak: 0, longestStreak: 0, lastActiveDate: '', activeDates: [], totalDaysActive: 0 };

    if (data.lastActiveDate === dateStr) {
      return data;
    }

    const getDaysDiff = (d1: string, d2: string) => {
      if (!d1 || !d2) return Infinity;
      const t1 = new Date(d1 + 'T00:00:00').getTime();
      const t2 = new Date(d2 + 'T00:00:00').getTime();
      return Math.round((t2 - t1) / (1000 * 3600 * 24));
    };

    const diff = getDaysDiff(data.lastActiveDate, dateStr);
    if (!data.lastActiveDate || diff > 1 || diff < 0) {
      data.currentStreak = 1;
    } else if (diff === 1) {
      data.currentStreak += 1;
    }

    if (data.currentStreak > data.longestStreak) {
      data.longestStreak = data.currentStreak;
    }

    data.lastActiveDate = dateStr;
    if (!data.activeDates.includes(dateStr)) {
      data.activeDates.push(dateStr);
      data.totalDaysActive = data.activeDates.length;
    }

    localStorage.setItem('dt_app_daily_streak', JSON.stringify(data));
    return data;
  }
}

export async function syncStreakData(payload: Partial<StreakData>): Promise<StreakData> {
  try {
    const res = await request<{ data: StreakData }>('/streak/sync', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  } catch (err) {
    const local = localStorage.getItem('dt_app_daily_streak');
    const current: StreakData = local
      ? JSON.parse(local)
      : { currentStreak: 0, longestStreak: 0, lastActiveDate: '', activeDates: [], totalDaysActive: 0 };
    const updated = { ...current, ...payload };
    localStorage.setItem('dt_app_daily_streak', JSON.stringify(updated));
    return updated;
  }
}

// ─── Finance API ───────────────────────────────────────────────
function normalizeTransaction(raw: Record<string, unknown>): FinanceTransaction {
  return {
    id: String(raw._id ?? raw.id),
    type: (raw.type as FinanceTransaction['type']) || 'income',
    amount: Number(raw.amount || 0),
    category: (raw.category as string) || 'Other',
    date: (raw.date as string) ?? new Date().toISOString(),
    description: (raw.description as string) || '',
    paymentMethod: (raw.paymentMethod as FinanceTransaction['paymentMethod']) || 'bank_transfer',
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

function normalizeCommittedIncome(raw: Record<string, unknown>): CommittedIncomeRecord {
  return {
    id: String(raw._id ?? raw.id),
    clientName: (raw.clientName as string) || '',
    projectTitle: (raw.projectTitle as string) || '',
    amount: Number(raw.amount || 0),
    dueDate: (raw.dueDate as string) ?? new Date().toISOString(),
    status: (raw.status as CommittedIncomeRecord['status']) || 'pending',
    notes: (raw.notes as string) || '',
    receivedDate: raw.receivedDate as string | undefined,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

function normalizeMoneyLent(raw: Record<string, unknown>): MoneyLentRecord {
  return {
    id: String(raw._id ?? raw.id),
    borrowerName: (raw.borrowerName as string) || '',
    amount: Number(raw.amount || 0),
    dateLent: (raw.dateLent as string) ?? new Date().toISOString(),
    expectedReturnDate: raw.expectedReturnDate as string | undefined,
    repaidAmount: Number(raw.repaidAmount || 0),
    status: (raw.status as MoneyLentRecord['status']) || 'pending',
    notes: (raw.notes as string) || '',
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

// --- Transactions ---
export async function getFinanceTransactions(params?: { type?: string; category?: string }): Promise<FinanceTransaction[]> {
  try {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params).filter(([, v]) => v && v !== 'all') as [string, string][]
        ).toString()
      : '';
    const res = await request<{ data: Record<string, unknown>[] }>(`/finance/transactions${qs}`);
    return res.data.map(normalizeTransaction);
  } catch (err) {
    const local = localStorage.getItem('dt_finance_transactions');
    let items: FinanceTransaction[] = local ? JSON.parse(local) : [];
    if (params) {
      if (params.type && params.type !== 'all') {
        items = items.filter(i => i.type === params.type);
      }
      if (params.category && params.category !== 'all') {
        items = items.filter(i => i.category === params.category);
      }
    }
    return items;
  }
}

export async function createFinanceTransaction(payload: Omit<FinanceTransaction, 'id'>): Promise<FinanceTransaction> {
  try {
    const res = await request<{ data: Record<string, unknown> }>('/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeTransaction(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_finance_transactions');
    const items: FinanceTransaction[] = local ? JSON.parse(local) : [];
    const newItem: FinanceTransaction = { ...payload, id: 'tx_loc_' + Date.now() };
    items.unshift(newItem);
    localStorage.setItem('dt_finance_transactions', JSON.stringify(items));
    return newItem;
  }
}

export async function updateFinanceTransaction(id: string, updates: Partial<FinanceTransaction>): Promise<FinanceTransaction> {
  try {
    const res = await request<{ data: Record<string, unknown> }>(`/finance/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return normalizeTransaction(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_finance_transactions');
    let items: FinanceTransaction[] = local ? JSON.parse(local) : [];
    let updated: FinanceTransaction | null = null;
    items = items.map(item => {
      if (item.id === id) {
        updated = { ...item, ...updates };
        return updated;
      }
      return item;
    });
    localStorage.setItem('dt_finance_transactions', JSON.stringify(items));
    return updated || ({ ...updates, id } as FinanceTransaction);
  }
}

export async function deleteFinanceTransaction(id: string): Promise<void> {
  try {
    await request(`/finance/transactions/${id}`, { method: 'DELETE' });
  } catch (err) {
    const local = localStorage.getItem('dt_finance_transactions');
    if (local) {
      const items: FinanceTransaction[] = JSON.parse(local);
      localStorage.setItem('dt_finance_transactions', JSON.stringify(items.filter(i => i.id !== id)));
    }
  }
}

// --- Committed Client Income ---
export async function getCommittedIncomes(): Promise<CommittedIncomeRecord[]> {
  try {
    const res = await request<{ data: Record<string, unknown>[] }>('/finance/committed-income');
    return res.data.map(normalizeCommittedIncome);
  } catch (err) {
    const local = localStorage.getItem('dt_committed_incomes');
    return local ? JSON.parse(local) : [];
  }
}

export async function createCommittedIncome(payload: Omit<CommittedIncomeRecord, 'id'>): Promise<CommittedIncomeRecord> {
  try {
    const res = await request<{ data: Record<string, unknown> }>('/finance/committed-income', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeCommittedIncome(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_committed_incomes');
    const items: CommittedIncomeRecord[] = local ? JSON.parse(local) : [];
    const newItem: CommittedIncomeRecord = { ...payload, id: 'ci_loc_' + Date.now() };
    items.unshift(newItem);
    localStorage.setItem('dt_committed_incomes', JSON.stringify(items));
    return newItem;
  }
}

export async function updateCommittedIncome(id: string, updates: Partial<CommittedIncomeRecord>): Promise<CommittedIncomeRecord> {
  try {
    const res = await request<{ data: Record<string, unknown> }>(`/finance/committed-income/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return normalizeCommittedIncome(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_committed_incomes');
    let items: CommittedIncomeRecord[] = local ? JSON.parse(local) : [];
    let updated: CommittedIncomeRecord | null = null;
    items = items.map(item => {
      if (item.id === id) {
        updated = { ...item, ...updates };
        return updated;
      }
      return item;
    });
    localStorage.setItem('dt_committed_incomes', JSON.stringify(items));
    return updated || ({ ...updates, id } as CommittedIncomeRecord);
  }
}

export async function deleteCommittedIncome(id: string): Promise<void> {
  try {
    await request(`/finance/committed-income/${id}`, { method: 'DELETE' });
  } catch (err) {
    const local = localStorage.getItem('dt_committed_incomes');
    if (local) {
      const items: CommittedIncomeRecord[] = JSON.parse(local);
      localStorage.setItem('dt_committed_incomes', JSON.stringify(items.filter(i => i.id !== id)));
    }
  }
}

export async function markCommittedIncomeReceived(id: string): Promise<CommittedIncomeRecord> {
  try {
    const res = await request<{ data: Record<string, unknown> }>(`/finance/committed-income/${id}/mark-received`, {
      method: 'PATCH',
    });
    return normalizeCommittedIncome(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_committed_incomes');
    let items: CommittedIncomeRecord[] = local ? JSON.parse(local) : [];
    let target: CommittedIncomeRecord | null = null;
    items = items.map(item => {
      if (item.id === id) {
        target = { ...item, status: 'received', receivedDate: new Date().toISOString() };
        return target;
      }
      return item;
    });
    localStorage.setItem('dt_committed_incomes', JSON.stringify(items));

    // Create local Income Transaction
    if (target) {
      await createFinanceTransaction({
        type: 'income',
        amount: (target as CommittedIncomeRecord).amount,
        category: 'Client Work',
        date: new Date().toISOString(),
        description: `Payment received from client ${(target as CommittedIncomeRecord).clientName} (${(target as CommittedIncomeRecord).projectTitle})`,
        paymentMethod: 'bank_transfer',
      });
    }

    return target || ({ id, status: 'received' } as CommittedIncomeRecord);
  }
}

// --- Money Lent ---
export async function getMoneyLentRecords(): Promise<MoneyLentRecord[]> {
  try {
    const res = await request<{ data: Record<string, unknown>[] }>('/finance/money-lent');
    return res.data.map(normalizeMoneyLent);
  } catch (err) {
    const local = localStorage.getItem('dt_money_lent');
    return local ? JSON.parse(local) : [];
  }
}

export async function createMoneyLentRecord(payload: Omit<MoneyLentRecord, 'id'>): Promise<MoneyLentRecord> {
  try {
    const res = await request<{ data: Record<string, unknown> }>('/finance/money-lent', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeMoneyLent(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_money_lent');
    const items: MoneyLentRecord[] = local ? JSON.parse(local) : [];
    const newItem: MoneyLentRecord = { ...payload, id: 'ml_loc_' + Date.now() };
    items.unshift(newItem);
    localStorage.setItem('dt_money_lent', JSON.stringify(items));
    return newItem;
  }
}

export async function updateMoneyLentRecord(id: string, updates: Partial<MoneyLentRecord>): Promise<MoneyLentRecord> {
  try {
    const res = await request<{ data: Record<string, unknown> }>(`/finance/money-lent/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return normalizeMoneyLent(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_money_lent');
    let items: MoneyLentRecord[] = local ? JSON.parse(local) : [];
    let updated: MoneyLentRecord | null = null;
    items = items.map(item => {
      if (item.id === id) {
        updated = { ...item, ...updates };
        return updated;
      }
      return item;
    });
    localStorage.setItem('dt_money_lent', JSON.stringify(items));
    return updated || ({ ...updates, id } as MoneyLentRecord);
  }
}

export async function deleteMoneyLentRecord(id: string): Promise<void> {
  try {
    await request(`/finance/money-lent/${id}`, { method: 'DELETE' });
  } catch (err) {
    const local = localStorage.getItem('dt_money_lent');
    if (local) {
      const items: MoneyLentRecord[] = JSON.parse(local);
      localStorage.setItem('dt_money_lent', JSON.stringify(items.filter(i => i.id !== id)));
    }
  }
}

export async function recordLendRepayment(id: string, amountPaid: number): Promise<MoneyLentRecord> {
  try {
    const res = await request<{ data: Record<string, unknown> }>(`/finance/money-lent/${id}/repay`, {
      method: 'PATCH',
      body: JSON.stringify({ amountPaid }),
    });
    return normalizeMoneyLent(res.data);
  } catch (err) {
    const local = localStorage.getItem('dt_money_lent');
    let items: MoneyLentRecord[] = local ? JSON.parse(local) : [];
    let target: MoneyLentRecord | null = null;
    items = items.map(item => {
      if (item.id === id) {
        const newRepaid = Math.min(item.amount, (item.repaidAmount || 0) + Number(amountPaid || 0));
        let newStatus: MoneyLentRecord['status'] = 'pending';
        if (newRepaid >= item.amount) newStatus = 'repaid';
        else if (newRepaid > 0) newStatus = 'partially_paid';

        target = { ...item, repaidAmount: newRepaid, status: newStatus };
        return target;
      }
      return item;
    });
    localStorage.setItem('dt_money_lent', JSON.stringify(items));
    return target || ({ id, repaidAmount: amountPaid } as MoneyLentRecord);
  }
}

// --- Overall Finance Summary ---
export async function getFinanceSummary(): Promise<FinanceSummary> {
  try {
    const res = await request<{ data: FinanceSummary }>('/finance/summary');
    return res.data;
  } catch (err) {
    const txs = await getFinanceTransactions();
    const committed = await getCommittedIncomes();
    const lent = await getMoneyLentRecords();

    let totalIncome = 0;
    let totalExpense = 0;
    txs.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'expense') totalExpense += t.amount;
    });

    const netBalance = totalIncome - totalExpense;
    const pendingCommitted = committed.filter(c => c.status === 'pending');
    const totalCommittedIncome = pendingCommitted.reduce((acc, c) => acc + c.amount, 0);

    const pendingLent = lent.filter(m => m.status !== 'repaid');
    const totalMoneyLentOutstanding = pendingLent.reduce((acc, m) => acc + (m.amount - (m.repaidAmount || 0)), 0);

    const projectedWealth = netBalance + totalCommittedIncome + totalMoneyLentOutstanding;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      totalCommittedIncome,
      totalMoneyLentOutstanding,
      projectedWealth,
      pendingCommittedCount: pendingCommitted.length,
      outstandingLentCount: pendingLent.length,
    };
  }
}






