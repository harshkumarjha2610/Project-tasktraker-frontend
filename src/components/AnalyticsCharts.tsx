'use client';

import { useTaskContext } from '@/context/TaskContext';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Target, Flame, Clock, CheckCircle2, AlertTriangle, Trash2, Hourglass, History, Zap } from 'lucide-react';
import { Priority } from '@/types/task';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
const CATEGORY_COLORS: Record<string, string> = {
  work: '#8b5cf6', personal: '#06b6d4', health: '#10b981', learning: '#f59e0b', other: '#6b7280',
};

const customTooltipStyle = {
  background: '#1c1c28', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 10, padding: '10px 14px', color: '#f0f0ff', fontSize: 13,
};

export default function AnalyticsCharts() {
  const { stats, tasks } = useTaskContext();

  // Priority On-Time vs After-Time performance calculation
  const priorityAnalysis = useMemo(() => {
    const priorities: { key: Priority; label: string; badgeClass: string; color: string }[] = [
      { key: 'super high', label: '🔥 Super High', badgeClass: 'badge-super-high', color: '#ff0000' },
      { key: 'high', label: '🟠 High', badgeClass: 'badge-high', color: '#ea580c' },
      { key: 'medium', label: '🟡 Medium', badgeClass: 'badge-medium', color: '#ca8a04' },
      { key: 'low', label: '🟢 Low', badgeClass: 'badge-low', color: '#16a34a' },
    ];

    return priorities.map(({ key, label, badgeClass, color }) => {
      const pTasks = tasks.filter(t => t.priority === key);
      const total = pTasks.length;
      const done = pTasks.filter(t => t.status === 'done');
      
      let beforeTime = 0;
      let onTime = 0;
      let afterTime = 0;
      let noDueDateDone = 0;

      done.forEach(t => {
        if (t.dueDate && t.completedAt) {
          const compDate = new Date(t.completedAt).getTime();
          const dueDate = new Date(t.dueDate).getTime();
          const diffMs = dueDate - compDate;

          if (diffMs < 0) {
            afterTime++;
          } else if (diffMs >= 4 * 60 * 60 * 1000) {
            beforeTime++;
          } else {
            onTime++;
          }
        } else {
          noDueDateDone++;
        }
      });

      const onTimeOrBeforeTotal = beforeTime + onTime + noDueDateDone;
      const doneCount = done.length;
      const successRate = doneCount > 0 ? Math.round((onTimeOrBeforeTotal / doneCount) * 100) : 0;
      const onTimePercent = doneCount > 0 ? Math.round((onTimeOrBeforeTotal / doneCount) * 100) : 0;
      const afterTimePercent = doneCount > 0 ? (100 - onTimePercent) : 0;

      return {
        key,
        label,
        badgeClass,
        color,
        total,
        doneCount,
        beforeTime,
        onTime,
        afterTime,
        onTimeOrBeforeTotal,
        successRate,
        onTimePercent,
        afterTimePercent,
      };
    });
  }, [tasks]);

  // Chart data for priority performance
  const priorityChartData = useMemo(() => {
    return priorityAnalysis.map(p => ({
      name: p.key === 'super high' ? 'Super High' : p.key.charAt(0).toUpperCase() + p.key.slice(1),
      'On/Before Time': p.onTimeOrBeforeTotal,
      'After Time (Late)': p.afterTime,
    }));
  }, [priorityAnalysis]);

  if (!stats) {
    return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading analytics...</div>;
  }

  const byCategory = Object.entries(stats.byCategory).map(([name, value]) => ({ name, value }));
  const byPriority = [
    { name: 'Super High', value: tasks.filter(t => t.priority === 'super high').length, color: '#ff0000' },
    { name: 'High', value: stats.byPriority.high ?? 0, color: '#ea580c' },
    { name: 'Medium', value: stats.byPriority.medium ?? 0, color: '#ca8a04' },
    { name: 'Low', value: stats.byPriority.low ?? 0, color: '#16a34a' },
  ];

  const completionRate = stats.total
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  const totalEstimated = tasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);
  const chartData = [...stats.dayWise].reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mini stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 14 }}>
        {[
          { icon: Target, label: 'Completion Rate', value: `${completionRate}%`, color: '#8b5cf6' },
          { icon: Flame, label: 'Total Tasks', value: stats.total, color: '#ef4444' },
          { icon: TrendingUp, label: 'Active Tasks', value: (stats.inProgress || 0) + (stats.todo || 0), color: '#06b6d4' },
          { icon: Clock, label: 'Est. Hours', value: `${Math.round(totalEstimated / 60)}h`, color: '#f59e0b' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Advanced Timing Metrics */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>⏱️ Overall Performance Metrics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14 }}>
          {[
            { icon: CheckCircle2, label: 'On Time', value: stats.completedOnTime, color: '#10b981' },
            { icon: Zap, label: 'Before Time', value: stats.completedBeforeTime, color: '#3b82f6' },
            { icon: AlertTriangle, label: 'After Time', value: stats.completedAfterTime, color: '#f59e0b' },
            { icon: Trash2, label: 'Deleted Incomplete', value: stats.deletedWithoutCompletion, color: '#ef4444' },
            { icon: Hourglass, label: 'Time Saved', value: `${stats.totalTimeSaved || 0}h`, color: '#8b5cf6' },
            { icon: History, label: 'Time Wasted', value: `${stats.totalTimeWasted || 0}h`, color: '#f43f5e' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="stat-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={18} color={color} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 🎯 Priority Timing Breakdown (On Time vs Late per Priority) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '6px 0 0' }}>
          🎯 Priority Performance Breakdown (On Time / Before Time vs Late)
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 14 }}>
          {priorityAnalysis.map((item) => (
            <div key={item.label} className="stat-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`badge ${item.badgeClass}`}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.doneCount > 0 ? (item.successRate >= 80 ? '#10b981' : item.successRate >= 50 ? '#f59e0b' : '#ef4444') : 'var(--text-muted)' }}>
                  {item.doneCount > 0 ? `${item.successRate}% On Time` : 'No tasks done'}
                </span>
              </div>

              {/* Progress ratio bar */}
              <div style={{ height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${item.onTimePercent}%`, background: '#10b981', transition: 'width 0.5s ease' }} title={`On/Before Time: ${item.onTimeOrBeforeTotal}`} />
                <div style={{ width: `${item.afterTimePercent}%`, background: '#ef4444', transition: 'width 0.5s ease' }} title={`After Time (Late): ${item.afterTime}`} />
              </div>

              {/* Detailed metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px 10px', borderRadius: 8 }}>
                  <div style={{ color: '#10b981', fontWeight: 600, marginBottom: 2 }}>⚡ On/Before Time</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.onTimeOrBeforeTotal} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>/ {item.doneCount} done</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px 10px', borderRadius: 8 }}>
                  <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 2 }}>⚠️ After Time</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.afterTime} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>late</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Timing Bar Chart */}
      <div className="stat-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>📊 Priority Completion Analysis (On-Time vs Late)</h3>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={priorityChartData} barCategoryGap="25%">
            <XAxis dataKey="name" tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'rgba(139,92,246,0.05)' }} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#8888aa' }} />
            <Bar dataKey="On/Before Time" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="After Time (Late)" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly bar chart */}
      <div className="stat-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>📅 Day-wise Completion Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%">
            <XAxis dataKey="day" tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'rgba(139,92,246,0.05)' }} />
            <Bar dataKey="completed" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Completed Tasks" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie charts side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
        {/* Category breakdown */}
        <div className="stat-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>🏷 By Category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={byCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {byCategory.map((entry, idx) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: '#8888aa' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Priority breakdown */}
        <div className="stat-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>🎯 By Priority</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={byPriority} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {byPriority.map(entry => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: '#8888aa' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
