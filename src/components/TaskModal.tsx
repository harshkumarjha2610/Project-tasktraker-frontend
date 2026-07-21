'use client';

import { useState } from 'react';
import { Task, Priority, Category } from '@/types/task';
import { X, Flag, Tag } from 'lucide-react';

interface TaskModalProps {
  task?: Task | null;
  onSave: (data: Omit<Task, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'super high', label: '🔥 Super High', color: '#ff0000' },
  { value: 'high',   label: '🟠 High',   color: '#ea580c' },
  { value: 'medium', label: '🟡 Medium', color: '#ca8a04' },
  { value: 'low',    label: '🟢 Low',    color: '#16a34a' },
];

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'work',     label: 'Work',     emoji: '💼' },
  { value: 'personal', label: 'Personal', emoji: '👤' },
  { value: 'health',   label: 'Health',   emoji: '❤️' },
  { value: 'learning', label: 'Learning', emoji: '📚' },
  { value: 'other',    label: 'Other',    emoji: '📌' },
];

export default function TaskModal({ task, onSave, onClose }: TaskModalProps) {
  const isEdit = !!task;

  const [title, setTitle]       = useState(task?.title ?? '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [category, setCategory] = useState<Category>(task?.category ?? 'work');

  const getInitialDateTime = () => {
    if (task?.dueDate) {
      const d = new Date(task.dueDate);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
  };

  const [dueDate, setDueDate]   = useState(getInitialDateTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      priority,
      category,
      status: task?.status ?? 'todo',
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEdit ? '✏️ Edit Task' : '✅ New Task'}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Task title */}
          <div>
            <label style={labelStyle}>What needs to be done?</label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Review project proposal"
              required
              autoFocus
              style={{ fontSize: 15 }}
            />
          </div>

          {/* Priority selector — pill buttons */}
          <div>
            <label style={labelStyle}><Flag size={13} style={{ display: 'inline', marginRight: 5 }} />Priority</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  style={{
                    padding: '7px 16px', borderRadius: 9, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, border: '1.5px solid',
                    fontFamily: 'Inter, sans-serif',
                    background: priority === p.value ? `${p.color}18` : 'var(--input-bg)',
                    borderColor: priority === p.value ? p.color : 'var(--border)',
                    color: priority === p.value ? p.color : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category selector — pill buttons */}
          <div>
            <label style={labelStyle}><Tag size={13} style={{ display: 'inline', marginRight: 5 }} />Category</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  style={{
                    padding: '7px 14px', borderRadius: 9, cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, border: '1.5px solid',
                    fontFamily: 'Inter, sans-serif',
                    background: category === c.value ? 'rgba(139,92,246,0.12)' : 'var(--input-bg)',
                    borderColor: category === c.value ? 'var(--accent)' : 'var(--border)',
                    color: category === c.value ? 'var(--accent)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label style={labelStyle}>📅 Due Date & Time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input
              type="datetime-local"
              className="input"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
              {isEdit ? 'Save Changes' : '+ Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
  display: 'block', marginBottom: 8,
};
