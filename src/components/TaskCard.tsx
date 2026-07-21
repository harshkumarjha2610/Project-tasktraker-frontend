'use client';

import { Task, Priority, Status, Category } from '@/types/task';
import { format } from 'date-fns';
import { Check, Pencil, Trash2, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const PRIORITY_MAP: Record<Priority, { cls: string; label: string }> = {
  'super high': { cls: 'badge-super-high', label: '🔥 Super High' },
  high:   { cls: 'badge-high',   label: '🟠 High' },
  medium: { cls: 'badge-medium', label: '🟡 Med' },
  low:    { cls: 'badge-low',    label: '🟢 Low' },
};

const STATUS_MAP: Record<Status, { cls: string; label: string }> = {
  todo:       { cls: 'badge-todo',       label: 'Todo' },
  inprogress: { cls: 'badge-inprogress', label: 'Active' },
  done:       { cls: 'badge-done',       label: 'Done' },
};

const CATEGORY_COLORS: Record<Category, string> = {
  work: '#8b5cf6', personal: '#06b6d4', health: '#10b981', learning: '#f59e0b', other: '#6b7280',
};

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({ task, onToggle, onEdit, onDelete }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDone = task.status === 'done';
  
  const now = new Date();
  const created = new Date(task.createdAt);
  
  let hoursLeft: number | null = null;
  let progressPercent = 0;
  let isOverdue = false;

  if (task.dueDate && !isDone) {
    const due = new Date(task.dueDate);
    
    const msLeft = due.getTime() - now.getTime();
    if (msLeft < 0) {
      isOverdue = true;
      hoursLeft = null;
      progressPercent = 100;
    } else {
      hoursLeft = msLeft / (1000 * 60 * 60);
      const totalMs = due.getTime() - created.getTime();
      const elapsedMs = now.getTime() - created.getTime();
      progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
    }
  }

  let completionStatus: { label: string; color: string; bg: string } | null = null;
  if (isDone && task.completedAt && task.dueDate) {
    const compDate = new Date(task.completedAt);
    const dueDate = new Date(task.dueDate);
    const timeDiffHours = (dueDate.getTime() - compDate.getTime()) / (1000 * 60 * 60);
    if (timeDiffHours >= 4) {
      completionStatus = { label: '⚡ Before Time', color: '#3b82f6', bg: '#3b82f620' };
    } else if (timeDiffHours < 0) {
      completionStatus = { label: '⚠ After Time', color: '#f59e0b', bg: '#f59e0b20' };
    } else {
      completionStatus = { label: '✓ On Time', color: '#10b981', bg: '#10b98120' };
    }
  }

  return (
    <div className={`task-row priority-${task.priority.replace(' ', '-')} ${isDone ? 'completed' : ''}`} style={{ flexDirection: 'column' }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
        {/* Status Checkbox */}
        <button
          onClick={() => !task.isDeleted && onToggle(task.id)}
          style={{
            width: 20, height: 20, borderRadius: 6,
            border: `2px solid ${isDone ? 'var(--accent)' : 'var(--border)'}`,
            background: isDone ? 'var(--accent)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: task.isDeleted ? 'not-allowed' : 'pointer', flexShrink: 0,
            transition: 'all 0.2s', opacity: task.isDeleted ? 0.5 : 1,
          }}
        >
          {isDone && <Check size={14} color="#fff" strokeWidth={3} />}
        </button>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            {/* Category dot */}
            <span style={{
              width: 7, height: 7, borderRadius: '50%', marginTop: 6, flexShrink: 0,
              background: CATEGORY_COLORS[task.category],
              display: 'inline-block',
            }} />
            <span className="task-title" style={{
              fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
              flex: 1, lineHeight: 1.4, wordBreak: 'break-word',
            }}>
              {task.title}
            </span>
          </div>

          {/* Badges + meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className={`badge ${PRIORITY_MAP[task.priority].cls}`}>{PRIORITY_MAP[task.priority].label}</span>
            <span className={`badge ${STATUS_MAP[task.status].cls}`}>{STATUS_MAP[task.status].label}</span>
            {completionStatus && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                letterSpacing: '0.5px', textTransform: 'uppercase',
                background: completionStatus.bg, color: completionStatus.color
              }}>
                {completionStatus.label}
              </span>
            )}
            {task.dueDate && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 11, color: isOverdue ? '#dc2626' : 'var(--text-muted)',
                fontWeight: isOverdue ? 600 : 400,
              }}>
                <Calendar size={11} />
                {isOverdue ? '⚠ ' : ''}{format(new Date(task.dueDate), 'MMM d, h:mm a')}
              </span>
            )}
            {task.estimatedMinutes && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-muted)' }}>
                <Clock size={11} />{task.estimatedMinutes}m
              </span>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
              {task.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          )}

          {/* Time Progress Bar */}
          {task.dueDate && !isDone && (
            <div style={{ marginTop: 10, marginBottom: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 500 }}>
                <span>Time Elapsed</span>
                <span style={{ color: isOverdue ? '#dc2626' : 'var(--text-secondary)' }}>
                  {isOverdue ? 'Overdue' : `${hoursLeft?.toFixed(2)} hours left`}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: isOverdue ? '#dc2626' : (progressPercent > 85 ? '#f59e0b' : 'linear-gradient(90deg, #8b5cf6, #06b6d4)'), 
                  width: `${progressPercent}%`,
                  transition: 'width 0.5s ease',
                  borderRadius: 4
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!task.isDeleted ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onEdit(task)}
              style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              style={{ padding: 6, background: 'var(--bg-card)', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#ef4444' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <div style={{
            fontSize: 10, fontWeight: 700, padding: '4px 8px',
            background: '#ef444420', color: '#ef4444', borderRadius: 6,
            letterSpacing: '0.5px', textTransform: 'uppercase'
          }}>
            Deleted
          </div>
        )}
      </div>

      {/* Expanded description */}
      {expanded && task.description && (
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 9,
          background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          {task.description}
        </div>
      )}
    </div>
  );
}
