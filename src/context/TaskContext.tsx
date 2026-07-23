'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Task, Priority, Status, Category, DetailedStats } from '@/types/task';
import { getTasks, createTask, updateTask, deleteTask, toggleTask, getStats } from '@/lib/api';

// MongoDB ObjectId is a 24-char hex string — filter out any stale numeric IDs
const isValidMongoId = (id: string) => /^[a-f\d]{24}$/i.test(id);

// Clear any stale localStorage data left from the previous localStorage-based implementation
const clearStaleLocalStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dt_tasks');
  }
};

interface TaskContextValue {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filterStatus: Status | 'all';
  filterPriority: Priority | 'all';
  filterCategory: Category | 'all';
  searchQuery: string;
  setFilterStatus: (v: Status | 'all') => void;
  setFilterPriority: (v: Priority | 'all') => void;
  setFilterCategory: (v: Category | 'all') => void;
  setSearchQuery: (v: string) => void;
  addTask: (payload: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  editTask: (id: string, updates: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  filteredTasks: Task[];
  stats: DetailedStats | null;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<DetailedStats | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      clearStaleLocalStorage();
      const [data, statsData] = await Promise.all([getTasks(), getStats()]);
      // Only keep tasks with valid MongoDB ObjectIds — guards against stale numeric IDs
      setTasks(data.filter(t => isValidMongoId(t.id)));
      setStats(statsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(msg);
      console.error('[TaskContext] getTasks error:', msg);
      setTasks([]); // ensure no stale data is shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const capFirst = (str?: string) => {
    if (!str) return str;
    const trimmed = str.trimStart();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const addTask = async (payload: Omit<Task, 'id' | 'createdAt'>) => {
    const formattedPayload = {
      ...payload,
      title: capFirst(payload.title) || payload.title,
    };
    const task = await createTask(formattedPayload);
    setTasks(prev => [task, ...prev]);
  };

  const editTask = async (id: string, updates: Partial<Task>) => {
    if (!isValidMongoId(id)) {
      console.warn('[TaskContext] editTask: invalid id skipped:', id);
      return;
    }
    const formattedUpdates = {
      ...updates,
      ...(updates.title ? { title: capFirst(updates.title) } : {}),
    };
    const updated = await updateTask(id, formattedUpdates);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const removeTask = async (id: string) => {
    if (!isValidMongoId(id)) {
      // Stale numeric ID — just remove it from local state without calling backend
      console.warn('[TaskContext] removeTask: stale numeric id removed from state only:', id);
      setTasks(prev => prev.filter(t => t.id !== id));
      return;
    }
    await deleteTask(id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isDeleted: true } : t));
  };

  const toggleComplete = async (id: string) => {
    if (!isValidMongoId(id)) {
      console.warn('[TaskContext] toggleComplete: invalid id skipped:', id);
      return;
    }
    const updated = await toggleTask(id);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const priorityWeight: Record<Priority, number> = { 'super high': 4, high: 3, medium: 2, low: 1 };

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (searchQuery &&
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

  return (
    <TaskContext.Provider value={{
      tasks, loading, error,
      filterStatus, filterPriority, filterCategory, searchQuery,
      setFilterStatus, setFilterPriority, setFilterCategory, setSearchQuery,
      addTask, editTask, removeTask, toggleComplete, refetch, filteredTasks,
      stats,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be used inside TaskProvider');
  return ctx;
}
