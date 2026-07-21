'use client';

import { useEffect } from 'react';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import { useTaskContext } from '@/context/TaskContext';

export default function AnalyticsPage() {
  const { refetch } = useTaskContext();

  useEffect(() => {
    refetch();
  }, [refetch]);
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Analytics</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Track your productivity and task completion trends.
        </p>
      </div>
      <AnalyticsCharts />
    </div>
  );
}
