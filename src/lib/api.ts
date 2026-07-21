import { Task, DetailedStats } from '@/types/task';

// ─── Base URL ──────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
    id:                 String(raw._id ?? raw.id),
    title:              raw.title as string,
    description:        raw.description as string | undefined,
    priority:           raw.priority as Task['priority'],
    status:             raw.status as Task['status'],
    category:           raw.category as Task['category'],
    dueDate:            raw.dueDate as string | undefined,
    createdAt:          (raw.createdAt as string) ?? new Date().toISOString(),
    completedAt:        raw.completedAt as string | undefined,
    isDeleted:          raw.isDeleted as boolean | undefined,
    tags:               (raw.tags as string[]) ?? [],
    estimatedMinutes:   raw.estimatedMinutes as number | undefined,
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
