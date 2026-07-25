'use client';

import { useTaskContext } from '@/context/TaskContext';
import { useState, useMemo } from 'react';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import { Task } from '@/types/task';
import { Plus, Search, SlidersHorizontal, X, Calendar, CheckCircle2, History } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

export default function TasksPage() {
  const {
    filteredTasks, addTask, editTask, removeTask, toggleComplete,
    filterStatus, filterPriority, filterCategory, searchQuery,
    setFilterStatus, setFilterPriority, setFilterCategory, setSearchQuery,
  } = useTaskContext();

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');

  const now = new Date();

  // Filter tasks based on active / history mode
  const displayTasks = useMemo(() => {
    return filteredTasks.filter(task => {
      if (viewMode === 'history') {
        return task.status === 'done';
      } else {
        if (task.isDeleted) return false;
        // Hide done tasks completed > 5 hours ago from active view
        if (task.status === 'done' && task.completedAt) {
          const compDate = new Date(task.completedAt);
          const hours = (now.getTime() - compDate.getTime()) / (1000 * 60 * 60);
          return hours <= 5;
        }
        return true;
      }
    });
  }, [filteredTasks, viewMode]);

  // Group completed tasks day-wise for History View
  const groupedHistory = useMemo(() => {
    if (viewMode !== 'history') return [];

    const groups: { [dateKey: string]: { dateKey: string; dateLabel: string; tasks: Task[] } } = {};

    displayTasks.forEach(task => {
      const timestamp = task.completedAt || task.createdAt || new Date().toISOString();
      const dateObj = new Date(timestamp);
      const dateKey = format(dateObj, 'yyyy-MM-dd');

      if (!groups[dateKey]) {
        let dateLabel = format(dateObj, 'EEEE, MMMM d, yyyy');
        if (isToday(dateObj)) {
          dateLabel = `Today — ${format(dateObj, 'EEEE, MMM d')}`;
        } else if (isYesterday(dateObj)) {
          dateLabel = `Yesterday — ${format(dateObj, 'EEEE, MMM d')}`;
        }

        groups[dateKey] = {
          dateKey,
          dateLabel,
          tasks: [],
        };
      }

      groups[dateKey].tasks.push(task);
    });

    // Sort dates descending (latest day first)
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(key => groups[key]);
  }, [displayTasks, viewMode]);

  const hasActiveFilter = filterStatus !== 'all' || filterPriority !== 'all' || filterCategory !== 'all';

  const handleSave = async (data: Omit<Task, 'id' | 'createdAt'>) => {
    if (editingTask) await editTask(editingTask.id, data);
    else await addTask(data);
    setShowModal(false);
    setEditingTask(null);
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterCategory('all');
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20,
        flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h1 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}>
              {viewMode === 'history' ? 'Task History' : 'All Tasks'}
            </h1>
            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
              <button
                className={`btn btn-sm ${viewMode === 'active' ? 'btn-primary' : ''}`}
                onClick={() => { setViewMode('active'); setFilterStatus('all'); }}
                style={{ padding: '5px 12px', fontSize: 13, background: viewMode === 'active' ? undefined : 'transparent', color: viewMode === 'active' ? '#fff' : 'var(--text-secondary)' }}
              >
                Active
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'history' ? 'btn-primary' : ''}`}
                onClick={() => { setViewMode('history'); setFilterStatus('all'); }}
                style={{ padding: '5px 12px', fontSize: 13, background: viewMode === 'history' ? undefined : 'transparent', color: viewMode === 'history' ? '#fff' : 'var(--text-secondary)' }}
              >
                History
              </button>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
            {viewMode === 'history' 
              ? `${displayTasks.length} completed task${displayTasks.length !== 1 ? 's' : ''} across ${groupedHistory.length} day${groupedHistory.length !== 1 ? 's' : ''}`
              : `${displayTasks.length} task${displayTasks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-secondary btn-sm ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(f => !f)}
            style={{ borderColor: hasActiveFilter ? 'var(--accent)' : undefined, color: hasActiveFilter ? 'var(--accent)' : undefined }}
          >
            <SlidersHorizontal size={14} />
            Filters
            {hasActiveFilter && <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--accent)', display: 'inline-block',
            }} />}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setShowModal(true); }}>
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={15} style={{
          position: 'absolute', left: 13, top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
        }} />
        <input
          className="input"
          style={{ paddingLeft: 38 }}
          placeholder="Search tasks…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', padding: 4,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: 10, padding: 14, borderRadius: 12,
          border: '1px solid var(--border)', background: 'var(--bg-card)',
          marginBottom: 14,
        }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select className="input select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
              <option value="all">All Statuses</option>
              <option value="todo">Todo</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <select className="input select" value={filterPriority} onChange={e => setFilterPriority(e.target.value as any)}>
              <option value="all">All Priorities</option>
              <option value="super high">Super High</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select className="input select" value={filterCategory} onChange={e => setFilterCategory(e.target.value as any)}>
              <option value="all">All Categories</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="health">Health</option>
              <option value="learning">Learning</option>
              <option value="other">Other</option>
            </select>
          </div>
          {hasActiveFilter && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={clearFilters}>
                <X size={13} /> Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Task List / Day-Wise History View */}
      {viewMode === 'history' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupedHistory.length === 0 ? (
            <div style={{
              padding: '52px 24px', textAlign: 'center',
              borderRadius: 14, border: '2px dashed var(--border)',
              color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📜</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5, color: 'var(--text-secondary)' }}>
                No task history found
              </div>
              <div style={{ fontSize: 13 }}>
                {hasActiveFilter ? 'Try clearing filters' : 'Completed tasks will be grouped here day by day'}
              </div>
            </div>
          ) : (
            groupedHistory.map((group) => (
              <div key={group.dateKey} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Sticky Day Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={16} style={{ color: 'var(--accent)' }} />
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {group.dateLabel}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 12,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <CheckCircle2 size={13} />
                    {group.tasks.length} {group.tasks.length === 1 ? 'completed' : 'completed'}
                  </span>
                </div>

                {/* Day Tasks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 4 }}>
                  {group.tasks.map(task => (
                    <TaskCard
                      key={task.id} task={task}
                      onToggle={toggleComplete}
                      onEdit={t => { setEditingTask(t); setShowModal(true); }}
                      onDelete={removeTask}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Active Tasks View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayTasks.length === 0 ? (
            <div style={{
              padding: '52px 24px', textAlign: 'center',
              borderRadius: 14, border: '2px dashed var(--border)',
              color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5, color: 'var(--text-secondary)' }}>
                No active tasks found
              </div>
              <div style={{ fontSize: 13 }}>
                {hasActiveFilter ? 'Try clearing filters' : 'Create your first task!'}
              </div>
            </div>
          ) : (
            displayTasks.map(task => (
              <TaskCard
                key={task.id} task={task}
                onToggle={toggleComplete}
                onEdit={t => { setEditingTask(t); setShowModal(true); }}
                onDelete={removeTask}
              />
            ))
          )}
        </div>
      )}

      {/* Floating add button on mobile */}
      <button
        className="btn btn-primary"
        onClick={() => { setEditingTask(null); setShowModal(true); }}
        style={{
          position: 'fixed', bottom: 24, right: 20,
          borderRadius: '50%', width: 52, height: 52,
          padding: 0, justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(139,92,246,0.5)',
          display: 'none',
        }}
        id="fab-add"
        aria-label="Add task"
      >
        <Plus size={22} />
      </button>

      {showModal && (
        <TaskModal
          task={editingTask}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingTask(null); }}
        />
      )}

      {/* FAB show via CSS */}
      <style>{`
        @media (max-width: 768px) { #fab-add { display: flex !important; } }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5,
};
