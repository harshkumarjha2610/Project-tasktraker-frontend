'use client';

import { useTaskContext } from '@/context/TaskContext';
import { useMemo } from 'react';
import { Briefcase, User, Heart, BookOpen, MoreHorizontal } from 'lucide-react';
import type { Category } from '@/types/task';

const CATEGORY_INFO: Record<Category, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  work:     { label: 'Work',     icon: <Briefcase size={20} />, color: '#8b5cf6', desc: 'Professional tasks, meetings, and projects' },
  personal: { label: 'Personal', icon: <User size={20} />,      color: '#06b6d4', desc: 'Personal errands and life admin' },
  health:   { label: 'Health',   icon: <Heart size={20} />,     color: '#10b981', desc: 'Fitness, wellness, and self-care' },
  learning: { label: 'Learning', icon: <BookOpen size={20} />,  color: '#f59e0b', desc: 'Study, courses, and skill building' },
  other:    { label: 'Other',    icon: <MoreHorizontal size={20} />, color: '#6b7280', desc: 'Miscellaneous tasks' },
};

export default function CategoriesPage() {
  const { tasks, setFilterCategory } = useTaskContext();

  const byCat = useMemo(() => {
    const map: Record<string, { total: number; done: number; inProgress: number }> = {};
    tasks.forEach(t => {
      if (!map[t.category]) map[t.category] = { total: 0, done: 0, inProgress: 0 };
      map[t.category].total++;
      if (t.status === 'done') map[t.category].done++;
      if (t.status === 'inprogress') map[t.category].inProgress++;
    });
    return map;
  }, [tasks]);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Categories</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Organize and filter your tasks by life area.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        {(Object.keys(CATEGORY_INFO) as Category[]).map(cat => {
          const info = CATEGORY_INFO[cat];
          const stats = byCat[cat] ?? { total: 0, done: 0, inProgress: 0 };
          const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

          return (
            <a
              key={cat}
              href="/tasks"
              onClick={() => setFilterCategory(cat)}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="stat-card glass-hover" style={{ padding: 24 }}>
                {/* Icon header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: `${info.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: info.color,
                    }}
                  >
                    {info.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{info.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats.total} tasks</div>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                  {info.desc}
                </p>

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Completion</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${info.color}, ${info.color}99)`,
                      }}
                    />
                  </div>
                </div>

                {/* Mini stats */}
                <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                  <span style={{ fontSize: 12, color: '#34d399' }}>✓ {stats.done} done</span>
                  <span style={{ fontSize: 12, color: '#22d3ee' }}>⟳ {stats.inProgress} active</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>◦ {stats.total - stats.done - stats.inProgress} todo</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
