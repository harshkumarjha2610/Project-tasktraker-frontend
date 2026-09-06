'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  UserPlus, Plus, Target, TrendingUp, DollarSign, Calendar, Search, X,
  Pencil, Trash2, CheckCircle2, MessageSquare, Send, Phone, Briefcase, ExternalLink, Flame
} from 'lucide-react';
import { ClientApproachRecord, ApproachPlatform, ApproachType, ApproachStatus } from '@/types/clientApproach';
import {
  getClientApproaches, createClientApproach,
  updateClientApproach, deleteClientApproach
} from '@/lib/api';
import { format, isPast, isToday } from 'date-fns';

const PLATFORMS: { value: ApproachPlatform; label: string; color: string; emoji: string }[] = [
  { value: 'linkedin', label: 'LinkedIn', color: '#0077b5', emoji: '💼' },
  { value: 'upwork',   label: 'Upwork',   color: '#14a800', emoji: '🟢' },
  { value: 'email',    label: 'Cold Email', color: '#ea4335', emoji: '📧' },
  { value: 'twitter',  label: 'Twitter/X', color: '#1da1f2', emoji: '🐦' },
  { value: 'fiverr',   label: 'Fiverr',   color: '#1dbf73', emoji: '🟢' },
  { value: 'call',     label: 'Direct Call', color: '#8b5cf6', emoji: '📞' },
  { value: 'other',    label: 'Other',    color: '#6b7280', emoji: '📌' },
];

const APPROACH_TYPES: { value: ApproachType; label: string }[] = [
  { value: 'proposal', label: '📝 Proposal Sent' },
  { value: 'cold_pitch', label: '🎯 Cold Pitch' },
  { value: 'followup', label: '🔄 Follow-up' },
  { value: 'call', label: '📞 Discovery Call' },
  { value: 'other', label: '📌 Other' },
];

const STATUSES: { value: ApproachStatus; label: string; color: string; bg: string }[] = [
  { value: 'pending',   label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { value: 'replied',   label: 'Replied',   color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { value: 'meeting',   label: 'Meeting',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { value: 'converted', label: 'Converted', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  { value: 'rejected',  label: 'Rejected',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

export default function ClientApproachesPage() {
  const [approaches, setApproaches] = useState<ClientApproachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<ApproachStatus | 'all'>('all');
  const [activePlatform, setActivePlatform] = useState<ApproachPlatform | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Daily target setting
  const dailyTargetGoal = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ClientApproachRecord | null>(null);

  // Form inputs
  const [clientName, setClientName] = useState('');
  const [platform, setPlatform] = useState<ApproachPlatform>('linkedin');
  const [approachType, setApproachType] = useState<ApproachType>('cold_pitch');
  const [status, setStatus] = useState<ApproachStatus>('pending');
  const [dealValue, setDealValue] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    getClientApproaches()
      .then(data => setApproaches(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Compute Metrics
  const todayApproachesCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return approaches.filter(a => new Date(a.date).toDateString() === todayStr).length;
  }, [approaches]);

  const totalApproaches = approaches.length;

  const responseRate = useMemo(() => {
    if (totalApproaches === 0) return 0;
    const respondedCount = approaches.filter(a => a.status !== 'pending').length;
    return Math.round((respondedCount / totalApproaches) * 100);
  }, [approaches, totalApproaches]);

  const totalPipelineValue = useMemo(() => {
    return approaches.reduce((acc, a) => acc + (a.dealValue || 0), 0);
  }, [approaches]);

  // Filtered Approaches
  const filteredApproaches = useMemo(() => {
    return approaches.filter(a => {
      if (activeStatus !== 'all' && a.status !== activeStatus) return false;
      if (activePlatform !== 'all' && a.platform !== activePlatform) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = a.clientName.toLowerCase().includes(q);
        const matchNotes = a.notes?.toLowerCase().includes(q);
        return matchName || matchNotes;
      }
      return true;
    });
  }, [approaches, activeStatus, activePlatform, searchQuery]);

  const openCreateModal = () => {
    setEditingItem(null);
    setClientName('');
    setPlatform('linkedin');
    setApproachType('cold_pitch');
    setStatus('pending');
    setDealValue('0');
    setNotes('');
    setFollowUpDate('');
    setShowModal(true);
  };

  const openEditModal = (item: ClientApproachRecord) => {
    setEditingItem(item);
    setClientName(item.clientName);
    setPlatform(item.platform);
    setApproachType(item.approachType);
    setStatus(item.status);
    setDealValue(item.dealValue ? String(item.dealValue) : '0');
    setNotes(item.notes || '');
    setFollowUpDate(item.followUpDate ? item.followUpDate.slice(0, 10) : '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const val = parseFloat(dealValue) || 0;

    if (editingItem) {
      const updated = await updateClientApproach(editingItem.id, {
        clientName: clientName.trim(),
        platform,
        approachType,
        status,
        dealValue: val,
        notes: notes.trim() || undefined,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      });
      setApproaches(prev => prev.map(a => a.id === editingItem.id ? updated : a));
    } else {
      const newItem = await createClientApproach({
        date: new Date().toISOString(),
        clientName: clientName.trim(),
        platform,
        approachType,
        status,
        dealValue: val,
        notes: notes.trim() || undefined,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      });
      setApproaches(prev => [newItem, ...prev]);
    }

    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this client approach entry?')) {
      await deleteClientApproach(id);
      setApproaches(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: ApproachStatus) => {
    const updated = await updateClientApproach(id, { status: newStatus });
    setApproaches(prev => prev.map(a => a.id === id ? updated : a));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserPlus size={26} color="#06b6d4" /> Daily Client Approaches
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Track client outreach, proposal pitches, follow-ups, and deal conversions.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> New Approach
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 14 }}>
        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#06b6d4', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Target size={16} /> TODAY'S OUTREACH ({todayApproachesCount}/{dailyTargetGoal})
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {todayApproachesCount} <span style={{ fontSize: 13, color: todayApproachesCount >= dailyTargetGoal ? '#10b981' : 'var(--text-muted)' }}>
              {todayApproachesCount >= dailyTargetGoal ? '🎯 Target Hit!' : `${dailyTargetGoal - todayApproachesCount} left today`}
            </span>
          </div>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, Math.round((todayApproachesCount / dailyTargetGoal) * 100))}%`, background: '#06b6d4' }} />
          </div>
        </div>

        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8b5cf6', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Flame size={16} /> TOTAL APPROACHES
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalApproaches} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>leads reached</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <TrendingUp size={16} /> RESPONSE RATE
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {responseRate}%
          </div>
        </div>

        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <DollarSign size={16} /> PIPELINE VALUE
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            ${totalPipelineValue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Controls & Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Status Filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginRight: 4 }}>Status:</span>
          <button
            className={`btn btn-sm ${activeStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveStatus('all')}
          >
            All ({totalApproaches})
          </button>
          {STATUSES.map(s => {
            const count = approaches.filter(a => a.status === s.value).length;
            return (
              <button
                key={s.value}
                className={`btn btn-sm ${activeStatus === s.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveStatus(s.value)}
                style={{
                  borderColor: activeStatus === s.value ? s.color : undefined,
                  background: activeStatus === s.value ? s.color : undefined,
                }}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Platform Filter & Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginRight: 4 }}>Platform:</span>
            <button
              className={`btn btn-sm ${activePlatform === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActivePlatform('all')}
            >
              All Platforms
            </button>
            {PLATFORMS.map(p => (
              <button
                key={p.value}
                className={`btn btn-sm ${activePlatform === p.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActivePlatform(p.value)}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32, fontSize: 13 }}
              placeholder="Search client or notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Feed List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading client approaches...</div>
      ) : filteredApproaches.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px', borderRadius: 16,
          border: '2px dashed var(--border)', background: 'var(--bg-card)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No client approaches found</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {searchQuery ? 'No matching records for your search filters.' : 'Add your first outreach entry to start tracking daily approaches!'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <Plus size={14} /> Add Client Approach
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredApproaches.map(item => {
            const platformObj = PLATFORMS.find(p => p.value === item.platform) || PLATFORMS[0];
            const statusObj = STATUSES.find(s => s.value === item.status) || STATUSES[0];
            const approachTypeObj = APPROACH_TYPES.find(a => a.value === item.approachType);

            return (
              <div key={item.id} className="stat-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: `${platformObj.color}20`, color: platformObj.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0
                    }}>
                      {platformObj.emoji}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.clientName}
                        </span>
                        <span style={{
                          padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: statusObj.bg, color: statusObj.color, border: `1px solid ${statusObj.color}40`
                        }}>
                          {statusObj.label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {approachTypeObj?.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                        <span>📅 {format(new Date(item.date), 'MMM d, yyyy · h:mm a')}</span>
                        <span>Platform: <strong>{platformObj.label}</strong></span>
                        {item.dealValue && item.dealValue > 0 ? (
                          <span style={{ color: '#10b981', fontWeight: 700 }}>💵 ${item.dealValue.toLocaleString()}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" style={{ padding: 6 }} onClick={() => openEditModal(item)}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ padding: 6, color: '#ef4444' }} onClick={() => handleDelete(item.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {item.notes && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 8, lineHeight: 1.5, marginTop: 12 }}>
                    {item.notes}
                  </p>
                )}

                {/* Status Quick Update Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {item.followUpDate && (
                      <span style={{ color: isPast(new Date(item.followUpDate)) ? '#ef4444' : '#06b6d4', fontWeight: 600 }}>
                        ⏰ Follow-up: {format(new Date(item.followUpDate), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>Move status:</span>
                    {STATUSES.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => handleQuickStatusChange(item.id, s.value)}
                        style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', border: '1px solid var(--border)',
                          background: item.status === s.value ? s.color : 'transparent',
                          color: item.status === s.value ? '#fff' : 'var(--text-muted)',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>
                {editingItem ? '✏️ Edit Client Approach' : '🎯 Log Client Approach'}
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Client Name */}
              <div>
                <label style={labelStyle}>Client / Prospect Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Acme Corp / Alex - SaaS Founder"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  required
                />
              </div>

              {/* Platform & Approach Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Platform / Channel</label>
                  <select
                    className="input select"
                    value={platform}
                    onChange={e => setPlatform(e.target.value as ApproachPlatform)}
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Approach Type</label>
                  <select
                    className="input select"
                    value={approachType}
                    onChange={e => setApproachType(e.target.value as ApproachType)}
                  >
                    {APPROACH_TYPES.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status & Deal Value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Current Status</label>
                  <select
                    className="input select"
                    value={status}
                    onChange={e => setStatus(e.target.value as ApproachStatus)}
                  >
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Estimated Deal Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    placeholder="e.g. 500"
                    value={dealValue}
                    onChange={e => setDealValue(e.target.value)}
                  />
                </div>
              </div>

              {/* Follow up date */}
              <div>
                <label style={labelStyle}>Follow-Up Reminder Date (optional)</label>
                <input
                  type="date"
                  className="input"
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Notes / Pitch Summary */}
              <div>
                <label style={labelStyle}>Pitch Summary & Notes (optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Details about the pitch, offer proposed, or custom requirement..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  {editingItem ? 'Save Changes' : '+ Save Approach Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6,
};
