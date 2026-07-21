'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { TaskProvider } from '@/context/TaskContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { Menu, Sun, Moon, Zap, Gamepad2 } from 'lucide-react';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 9,
        background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
        cursor: 'pointer', color: 'var(--text-secondary)',
        fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif',
        transition: 'all 0.2s ease',
      }}
    >
      {theme === 'dark' && <Sun size={15} color="#f59e0b" />}
      {theme === 'light' && <Gamepad2 size={15} color="#10b981" />}
      {theme === 'gaming' && <Moon size={15} color="#7c3aed" />}
      {theme === 'dark' ? 'Light' : theme === 'light' ? 'Gaming' : 'Dark'}
    </button>
  );
}

function InnerLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen]         = useState(false);   // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // desktop icon rail — collapsed by default

  // Restore user's saved preference (if they explicitly expanded it before)
  useEffect(() => {
    const saved = localStorage.getItem('dt_sidebar_collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
    // If no saved preference → stays true (collapsed default)
  }, []);

  const toggleCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('dt_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <>
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={toggleCollapse}
      />

      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile topbar */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={14} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>DailyTask</span>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Main content — margin adapts to sidebar width */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TaskProvider>
        <InnerLayout>{children}</InnerLayout>
      </TaskProvider>
    </ThemeProvider>
  );
}

export { ThemeToggle };
