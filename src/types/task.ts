// Types for the daily task manager
export type Priority = 'super high' | 'high' | 'medium' | 'low';
export type Status = 'todo' | 'inprogress' | 'done';
export type Category = 'work' | 'personal' | 'health' | 'learning' | 'other';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  category: Category;
  dueDate?: string; // ISO date string
  createdAt: string;
  completedAt?: string;
  isDeleted?: boolean;
  tags?: string[];
  estimatedMinutes?: number;
}

export interface DetailedStats {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  overdue: number;
  completedOnTime: number;
  completedBeforeTime: number;
  completedAfterTime: number;
  deletedWithoutCompletion: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  dayWise: { day: string; completed: number; added: number }[];
}
