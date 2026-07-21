'use client';

import { useState } from 'react';
import { Bell, Moon, Globe, Shield, Trash2, Save } from 'lucide-react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearData = () => {
    if (confirm('This will delete ALL your tasks. Are you sure?')) {
      localStorage.removeItem('dt_tasks');
      window.location.reload();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Customize your DailyTask experience.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
        {/* Notifications */}
        <SettingSection title="🔔 Notifications" icon={<Bell size={18} />}>
          <ToggleRow label="Task reminders" sub="Get notified before tasks are due" value={notifications} onChange={setNotifications} />
          <ToggleRow label="Sound alerts" sub="Play sound for due tasks" value={sound} onChange={setSound} />
        </SettingSection>

        {/* Appearance */}
        <SettingSection title="🌙 Appearance" icon={<Moon size={18} />}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Theme</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Currently using dark mode</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm">🌙 Dark</button>
              <button className="btn btn-secondary btn-sm" style={{ opacity: 0.5 }}>☀️ Light</button>
            </div>
          </div>
        </SettingSection>

        {/* Region */}
        <SettingSection title="🌍 Region" icon={<Globe size={18} />}>
          <div style={{ padding: '12px 0' }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Timezone</label>
            <select className="input select" value={timezone} onChange={e => setTimezone(e.target.value)}>
              <option value="Asia/Kolkata" style={{ background: '#16161f' }}>Asia/Kolkata (IST)</option>
              <option value="America/New_York" style={{ background: '#16161f' }}>America/New_York (EST)</option>
              <option value="Europe/London" style={{ background: '#16161f' }}>Europe/London (GMT)</option>
              <option value="Asia/Tokyo" style={{ background: '#16161f' }}>Asia/Tokyo (JST)</option>
              <option value="America/Los_Angeles" style={{ background: '#16161f' }}>America/Los_Angeles (PST)</option>
            </select>
          </div>
        </SettingSection>

        {/* Privacy */}
        <SettingSection title="🔐 Data & Privacy" icon={<Shield size={18} />}>
          <div style={{ padding: '12px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
              All your tasks are stored locally in your browser. No data is sent to any server.
              You can clear all data at any time.
            </p>
            <button className="btn btn-danger" onClick={clearData}>
              <Trash2 size={14} /> Clear All Data
            </button>
          </div>
        </SettingSection>

        {/* Save */}
        <div>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={15} />
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="stat-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <span style={{ color: '#a78bfa' }}>{icon}</span>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 48, height: 26, borderRadius: 13,
          background: value ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s ease',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 3,
            left: value ? 26 : 4,
            width: 20, height: 20, borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  );
}
