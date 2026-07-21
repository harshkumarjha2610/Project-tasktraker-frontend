'use client';

import { useTaskContext } from '@/context/TaskContext';
import { useState, useMemo } from 'react';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import { Task } from '@/types/task';
import { Plus, CheckCircle, Circle, Loader, AlertTriangle, TrendingUp, Flame } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

export default function DashboardPage() {
  const { tasks, addTask, editTask, removeTask, toggleComplete, loading, error } = useTaskContext();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'inprogress').length;
    const overdue = tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'done').length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, overdue, pct };
  }, [tasks]);

  const todayTasks = useMemo(() =>
    tasks.filter(t => t.dueDate && (isToday(new Date(t.dueDate)) || isTomorrow(new Date(t.dueDate)))).slice(0, 5),
    [tasks]
  );

  const recentTasks = useMemo(() =>
    [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [tasks]
  );

  const handleSave = async (data: Omit<Task, 'id' | 'createdAt'>) => {
    if (editingTask) await editTask(editingTask.id, data);
    else await addTask(data);
    setShowModal(false);
    setEditingTask(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
        <Loader size={22} style={{ color: '#8b5cf6' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Loading your tasks…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Cannot reach the backend</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360 }}>
          Make sure the Node.js server is running on <code style={{ background: 'var(--bg-card-hover)', padding: '2px 6px', borderRadius: 5 }}>http://localhost:5000</code>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 24,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, marginBottom: 3 }}>
            Good {getGreeting()} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowModal(true); }}>
          <Plus size={15} /> New Task
        </button>
      </div>

      {/* ── Progress + stat cards ───────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        {/* Wide progress card */}
        <div className="stat-card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Today's Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{stats.pct}%</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 14 }}>
            <div className="progress-fill" style={{ width: `${stats.pct}%` }} />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <MiniStat icon={<CheckCircle size={13} />} label="Done" value={stats.done} color="#059669" />
            <MiniStat icon={<Circle size={13} />} label="In Progress" value={stats.inProgress} color="#0891b2" />
            <MiniStat icon={<Circle size={13} />} label="Todo" value={stats.total - stats.done - stats.inProgress} color="var(--text-muted)" />
            {stats.overdue > 0 && <MiniStat icon={<AlertTriangle size={13} />} label="Overdue" value={stats.overdue} color="#dc2626" />}
          </div>
        </div>

        <div className="stat-card">
          <StatBlock icon={<TrendingUp size={19} color="#8b5cf6" />} label="Total Tasks" value={stats.total} sub="All time" bg="#8b5cf620" />
        </div>

        <div className="stat-card">
          <StatBlock icon={<Flame size={19} color="#f59e0b" />} label="Streak" value="🔥 5d" sub="Keep going!" bg="#f59e0b20" />
        </div>
      </div>

      {/* ── Two-column sections ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: 20,
      }}>
        {/* Coming up */}
        <div>
          <SectionHeader title="📅 Coming Up" badge={`${todayTasks.length} tasks`} />
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

        {/* Recent */}
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

/* ── Small helpers ─────────────────────────────────────────────── */
function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}:</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function StatBlock({ icon, label, value, sub, bg }: { icon: React.ReactNode; label: string; value: string | number; sub: string; bg: string }) {
  return (
    <div>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        {icon}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

function SectionHeader({ title, badge, link }: { title: string; badge?: string; link?: { href: string; label: string } }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h2>
      {badge && <span className="badge badge-todo">{badge}</span>}
      {link && <a href={link.href} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>{link.label}</a>}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
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
