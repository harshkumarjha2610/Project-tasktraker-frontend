'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CheckSquare, BarChart3, Tag, Settings,
  Zap, X, Sun, Moon, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const NAV_ITEMS = [
  { href: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/tasks',      icon: CheckSquare,     label: 'Tasks' },
  { href: '/analytics',  icon: BarChart3,       label: 'Analytics' },
  { href: '/categories', icon: Tag,             label: 'Categories' },
  { href: '/settings',   icon: Settings,        label: 'Settings' },
];

interface SidebarProps {
  open?: boolean;          // mobile drawer open state
  collapsed?: boolean;     // desktop collapse state
  onClose?: () => void;    // mobile close
  onToggleCollapse?: () => void; // desktop collapse toggle
}

export default function Sidebar({ open, collapsed, onClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>

      {/* ── Logo row ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        marginBottom: 24,
        gap: 8,
        overflow: 'hidden',
      }}>
        {/* Logo icon — always visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="#fff" fill="#fff" />
          </div>

          {/* Text — hidden when collapsed */}
          <div className="sidebar-logo-text" style={{ overflow: 'hidden', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>DailyTask</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Productivity Suite</div>
          </div>
        </div>

        {/* Desktop: collapse toggle button (hidden when collapsed — shown separately) */}
        {!collapsed && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {/* Desktop collapse button */}
            <button
              onClick={onToggleCollapse}
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 7px', display: 'none' }}
              id="sidebar-collapse-btn"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={15} />
            </button>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 7px' }}
              title="Close menu"
              aria-label="Close menu"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Collapsed: expand button centered ─────────────────── */}
      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="btn btn-secondary"
          style={{
            width: '100%', padding: '8px', marginBottom: 16,
            justifyContent: 'center', borderRadius: 9,
          }}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen size={17} />
        </button>
      )}

      {/* ── Nav label ─────────────────────────────────────────── */}
      {!collapsed && (
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '0 13px', marginBottom: 6,
        }} className="nav-label">
          Menu
        </div>
      )}

      {/* ── Navigation links ──────────────────────────────────── */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${pathname === href ? 'active' : ''}`}
            data-label={label}
            onClick={onClose}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span className="sidebar-label">{label}</span>
          </Link>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Desktop collapse button (bottom, always visible) */}
        <button
          onClick={onToggleCollapse}
          className="btn btn-secondary"
          style={{
            width: '100%',
            padding: collapsed ? '8px' : '9px 13px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 10,
            borderRadius: 9, fontSize: 13, fontWeight: 500,
            fontFamily: 'Inter, sans-serif', color: 'var(--text-secondary)',
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          id="sidebar-toggle-footer"
        >
          {collapsed
            ? <PanelLeftOpen size={17} />
            : <><PanelLeftClose size={16} /><span className="sidebar-label">Collapse</span></>
          }
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 10,
            padding: collapsed ? '8px' : '10px 13px', borderRadius: 9,
            background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 500, fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s ease', width: '100%',
          }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark
            ? <Sun size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            : <Moon size={16} color="#7c3aed" style={{ flexShrink: 0 }} />}
          <span className="sidebar-footer-text">
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        {/* Motivational card — hidden when collapsed */}
        {!collapsed && (
          <div className="sidebar-footer-text" style={{
            padding: '13px',
            borderRadius: 11,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.06))',
            border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>✨ Stay Consistent</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Small daily progress compounds into extraordinary results.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
