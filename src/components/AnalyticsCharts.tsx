'use client';

import { useTaskContext } from '@/context/TaskContext';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Target, Flame, Clock, CheckCircle2, AlertTriangle, AlertCircle, Trash2, Hourglass, History } from 'lucide-react';

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

  if (!stats) {
    return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading analytics...</div>;
  }

  const byCategory = Object.entries(stats.byCategory).map(([name, value]) => ({ name, value }));
  const byPriority = [
    { name: 'High', value: stats.byPriority.high ?? 0, color: '#ef4444' },
    { name: 'Medium', value: stats.byPriority.medium ?? 0, color: '#f59e0b' },
    { name: 'Low', value: stats.byPriority.low ?? 0, color: '#10b981' },
  ];

  const completionRate = stats.total
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  // We can still use local tasks for total estimated time as it's not in stats yet,
  // or we could just skip it. Let's compute from local tasks.
  const totalEstimated = tasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);
  
  // Day wise chart needs to be in chronological order (Sun, Mon, Tue etc. based on today)
  // The backend returns it in last 7 days order, let's reverse it to show oldest to newest
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
      <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 10, marginBottom: 6 }}>⏱️ Performance Metrics</h3>
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

// Ensure Zap is imported properly for Before Time metric
import { Zap } from 'lucide-react';
