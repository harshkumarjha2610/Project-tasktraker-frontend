import { Task, DetailedStats } from '@/types/task';
import { Note } from '@/types/note';

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



