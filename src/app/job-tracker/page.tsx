'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Briefcase, Plus, Target, TrendingUp, DollarSign, Calendar, Search, X,
  Pencil, Trash2, ExternalLink, Flame, Star, MapPin, Building, Clock,
  CheckCircle2, AlertCircle, LayoutGrid, List, UserCheck, Award
} from 'lucide-react';
import { JobRecord, JobPlatform, JobType, WorkMode, JobStatus } from '@/types/jobTracker';
import { getJobs, createJob, updateJob, deleteJob } from '@/lib/api';
import { format, isPast } from 'date-fns';

const PLATFORMS: { value: JobPlatform; label: string; color: string; emoji: string }[] = [
  { value: 'linkedin',  label: 'LinkedIn',  color: '#0077b5', emoji: '💼' },
  { value: 'upwork',    label: 'Upwork',    color: '#14a800', emoji: '🟢' },
  { value: 'indeed',    label: 'Indeed',    color: '#003a9b', emoji: '🔵' },
  { value: 'glassdoor', label: 'Glassdoor', color: '#0caa41', emoji: '🟩' },
  { value: 'wellfound', label: 'Wellfound', color: '#ff2d55', emoji: '✌️' },
  { value: 'remoteok',  label: 'RemoteOK',  color: '#ff4742', emoji: '🌐' },
  { value: 'email',     label: 'Direct Email', color: '#ea4335', emoji: '📧' },
  { value: 'referral',  label: 'Referral',  color: '#8b5cf6', emoji: '🤝' },
  { value: 'other',     label: 'Other',     color: '#6b7280', emoji: '📌' },
];

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'full_time', label: '⚡ Full-Time' },
  { value: 'part_time', label: '⏱️ Part-Time' },
  { value: 'contract', label: '📜 Contract' },
  { value: 'freelance', label: '💻 Freelance' },
  { value: 'internship', label: '🎓 Internship' },
];

const WORK_MODES: { value: WorkMode; label: string; emoji: string }[] = [
  { value: 'remote', label: 'Remote', emoji: '🏠' },
  { value: 'hybrid', label: 'Hybrid', emoji: '🏢' },
  { value: 'onsite', label: 'Onsite', emoji: '📍' },
];

const STATUSES: { value: JobStatus; label: string; color: string; bg: string }[] = [
  { value: 'wishlist',  label: 'Wishlist',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { value: 'applied',   label: 'Applied',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { value: 'screening', label: 'Screening', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { value: 'interview', label: 'Interview', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { value: 'offered',   label: 'Offered',   color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  { value: 'accepted',  label: 'Accepted',  color: '#22c55e', bg: 'rgba(34,197,94,0.2)' },
  { value: 'rejected',  label: 'Rejected',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const KANBAN_COLUMNS: { id: string; title: string; statuses: JobStatus[]; color: string }[] = [
  { id: 'wishlist',  title: '⭐ Wishlist',           statuses: ['wishlist'],  color: '#8b5cf6' },
  { id: 'applied',   title: '🚀 Applied',            statuses: ['applied'],   color: '#3b82f6' },
  { id: 'pipeline',  title: '💬 Screening & Interview', statuses: ['screening', 'interview'], color: '#f59e0b' },
  { id: 'offered',   title: '🎉 Offer Received',     statuses: ['offered'],   color: '#10b981' },
  { id: 'accepted',  title: '🏆 Accepted / Hired',   statuses: ['accepted'],  color: '#22c55e' },
];

export default function JobTrackerPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [activeStatus, setActiveStatus] = useState<JobStatus | 'all'>('all');
  const [activePlatform, setActivePlatform] = useState<JobPlatform | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Daily target setting
  const dailyTargetGoal = 5;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<JobRecord | null>(null);

  // Form state
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [platform, setPlatform] = useState<JobPlatform>('linkedin');
  const [jobType, setJobType] = useState<JobType>('full_time');
  const [workMode, setWorkMode] = useState<WorkMode>('remote');
  const [salary, setSalary] = useState('');
  const [status, setStatus] = useState<JobStatus>('applied');
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().slice(0, 10));
  const [jobUrl, setJobUrl] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [rating, setRating] = useState(3);

  useEffect(() => {
    getJobs()
      .then(data => setJobs(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Compute Metrics
  const todayAppliedCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return jobs.filter(j => 
      (j.status === 'applied' || j.status === 'screening' || j.status === 'interview') && 
      new Date(j.appliedDate).toDateString() === todayStr
    ).length;
  }, [jobs]);

  const activePipelineCount = useMemo(() => {
    return jobs.filter(j => j.status === 'screening' || j.status === 'interview').length;
  }, [jobs]);

  const totalJobs = jobs.length;

  const interviewRate = useMemo(() => {
    if (totalJobs === 0) return 0;
    const interviewCount = jobs.filter(j => j.status === 'screening' || j.status === 'interview' || j.status === 'offered' || j.status === 'accepted').length;
    return Math.round((interviewCount / totalJobs) * 100);
  }, [jobs, totalJobs]);

  const offersCount = useMemo(() => {
    return jobs.filter(j => j.status === 'offered' || j.status === 'accepted').length;
  }, [jobs]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (activeStatus !== 'all' && j.status !== activeStatus) return false;
      if (activePlatform !== 'all' && j.platform !== activePlatform) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCompany = j.company.toLowerCase().includes(q);
        const matchPosition = j.position.toLowerCase().includes(q);
        const matchLocation = j.location?.toLowerCase().includes(q);
        const matchNotes = j.notes?.toLowerCase().includes(q);
        return matchCompany || matchPosition || matchLocation || matchNotes;
      }
      return true;
    });
  }, [jobs, activeStatus, activePlatform, searchQuery]);

  const openCreateModal = (defaultStatus: JobStatus = 'applied') => {
    setEditingItem(null);
    setCompany('');
    setPosition('');
    setPlatform('linkedin');
    setJobType('full_time');
    setWorkMode('remote');
    setSalary('');
    setStatus(defaultStatus);
    setAppliedDate(new Date().toISOString().slice(0, 10));
    setJobUrl('');
    setContactInfo('');
    setLocation('');
    setNotes('');
    setFollowUpDate('');
    setRating(3);
    setShowModal(true);
  };

  const openEditModal = (item: JobRecord) => {
    setEditingItem(item);
    setCompany(item.company);
    setPosition(item.position);
    setPlatform(item.platform);
    setJobType(item.jobType);
    setWorkMode(item.workMode);
    setSalary(item.salary || '');
    setStatus(item.status);
    setAppliedDate(item.appliedDate ? item.appliedDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setJobUrl(item.jobUrl || '');
    setContactInfo(item.contactInfo || '');
    setLocation(item.location || '');
    setNotes(item.notes || '');
    setFollowUpDate(item.followUpDate ? item.followUpDate.slice(0, 10) : '');
    setRating(item.rating || 3);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim()) return;

    if (editingItem) {
      const updated = await updateJob(editingItem.id, {
        company: company.trim(),
        position: position.trim(),
        platform,
        jobType,
        workMode,
        salary: salary.trim(),
        status,
        appliedDate: appliedDate ? new Date(appliedDate).toISOString() : new Date().toISOString(),
        jobUrl: jobUrl.trim(),
        contactInfo: contactInfo.trim(),
        location: location.trim(),
        notes: notes.trim(),
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
        rating,
      });
      setJobs(prev => prev.map(j => j.id === editingItem.id ? updated : j));
    } else {
      const newItem = await createJob({
        company: company.trim(),
        position: position.trim(),
        platform,
        jobType,
        workMode,
        salary: salary.trim(),
        status,
        appliedDate: appliedDate ? new Date(appliedDate).toISOString() : new Date().toISOString(),
        jobUrl: jobUrl.trim(),
        contactInfo: contactInfo.trim(),
        location: location.trim(),
        notes: notes.trim(),
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
        rating,
      });
      setJobs(prev => [newItem, ...prev]);
    }

    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this job application entry?')) {
      await deleteJob(id);
      setJobs(prev => prev.filter(j => j.id !== id));
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: JobStatus) => {
    const updated = await updateJob(id, { status: newStatus });
    setJobs(prev => prev.map(j => j.id === id ? updated : j));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Briefcase size={26} color="#3b82f6" /> Daily Job Application Tracker
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Track daily job applications, interviews, recruiters, salary offers, and follow-ups.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-card-hover)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
            <button
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : ''}`}
              style={{ background: viewMode === 'list' ? undefined : 'transparent', border: 'none', padding: '6px 12px' }}
              onClick={() => setViewMode('list')}
            >
              <List size={15} /> Feed View
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : ''}`}
              style={{ background: viewMode === 'kanban' ? undefined : 'transparent', border: 'none', padding: '6px 12px' }}
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid size={15} /> Kanban Board
            </button>
          </div>

          <button className="btn btn-primary" onClick={() => openCreateModal('applied')}>
            <Plus size={16} /> Log Job Application
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 14 }}>
        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3b82f6', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Target size={16} /> APPLIED TODAY ({todayAppliedCount}/{dailyTargetGoal})
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {todayAppliedCount} <span style={{ fontSize: 13, color: todayAppliedCount >= dailyTargetGoal ? '#10b981' : 'var(--text-muted)' }}>
              {todayAppliedCount >= dailyTargetGoal ? '🎯 Target Hit!' : `${dailyTargetGoal - todayAppliedCount} left today`}
            </span>
          </div>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, Math.round((todayAppliedCount / dailyTargetGoal) * 100))}%`, background: '#3b82f6' }} />
          </div>
        </div>

        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <UserCheck size={16} /> ACTIVE PIPELINE
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {activePipelineCount} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>interviews ongoing</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8b5cf6', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Flame size={16} /> TOTAL APPLICATIONS
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalJobs} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>tracked</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#06b6d4', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <TrendingUp size={16} /> INTERVIEW RATE
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {interviewRate}%
          </div>
        </div>

        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Award size={16} /> OFFERS RECEIVED
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {offersCount} <span style={{ fontSize: 13, fontWeight: 500, color: '#10b981' }}>{offersCount > 0 ? '🎉 Congratulations!' : ''}</span>
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
            All ({totalJobs})
          </button>
          {STATUSES.map(s => {
            const count = jobs.filter(j => j.status === s.value).length;
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

          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 32, fontSize: 13 }}
              placeholder="Search company, title, notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading job applications...</div>
      ) : filteredJobs.length === 0 && viewMode === 'list' ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px', borderRadius: 16,
          border: '2px dashed var(--border)', background: 'var(--bg-card)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💼</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No job applications found</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {searchQuery ? 'No matching records for your search filters.' : 'Log your first job application to start tracking daily progress!'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => openCreateModal('applied')}>
            <Plus size={14} /> Log Job Application
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, alignItems: 'start' }}>
          {KANBAN_COLUMNS.map(col => {
            const colJobs = filteredJobs.filter(j => col.statuses.includes(j.status));

            return (
              <div key={col.id} style={{
                background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)',
                padding: 14, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 320
              }}>
                {/* Column Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: col.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {col.title}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--bg-card-hover)', padding: '2px 8px', borderRadius: 10, color: 'var(--text-secondary)' }}>
                    {colJobs.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {colJobs.map(item => {
                    const platformObj = PLATFORMS.find(p => p.value === item.platform) || PLATFORMS[0];
                    const statusObj = STATUSES.find(s => s.value === item.status) || STATUSES[0];
                    const workModeObj = WORK_MODES.find(w => w.value === item.workMode);

                    return (
                      <div key={item.id} className="stat-card" style={{ padding: 14, background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {item.position}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Building size={13} color="var(--text-muted)" /> {item.company}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-secondary btn-sm" style={{ padding: 4 }} onClick={() => openEditModal(item)}>
                              <Pencil size={12} />
                            </button>
                            <button className="btn btn-secondary btn-sm" style={{ padding: 4, color: '#ef4444' }} onClick={() => handleDelete(item.id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                          <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: 11, background: `${platformObj.color}20`, color: platformObj.color, fontWeight: 600 }}>
                            {platformObj.emoji} {platformObj.label}
                          </span>
                          <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: 11, background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {workModeObj?.emoji} {workModeObj?.label}
                          </span>
                          {item.salary && (
                            <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: 11, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>
                              💵 {item.salary}
                            </span>
                          )}
                        </div>

                        {/* Dates & Link */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                          <span>📅 {format(new Date(item.appliedDate), 'MMM d')}</span>
                          {item.jobUrl && (
                            <a href={item.jobUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none', fontWeight: 600 }}>
                              Link <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => openCreateModal(col.statuses[0])}
                    style={{
                      padding: 8, borderRadius: 8, border: '1px dashed var(--border)',
                      background: 'transparent', color: 'var(--text-muted)', fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 6, transition: 'all 0.2s ease'
                    }}
                  >
                    <Plus size={14} /> Add to {col.title.split(' ')[1] || 'Column'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST / FEED VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredJobs.map(item => {
            const platformObj = PLATFORMS.find(p => p.value === item.platform) || PLATFORMS[0];
            const statusObj = STATUSES.find(s => s.value === item.status) || STATUSES[0];
            const workModeObj = WORK_MODES.find(w => w.value === item.workMode);
            const jobTypeObj = JOB_TYPES.find(j => j.value === item.jobType);

            return (
              <div key={item.id} className="stat-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 12,
                      background: `${platformObj.color}20`, color: platformObj.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, flexShrink: 0
                    }}>
                      {platformObj.emoji}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                          {item.position}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building size={14} color="var(--text-muted)" /> {item.company}
                        </span>
                        <span style={{
                          padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: statusObj.bg, color: statusObj.color, border: `1px solid ${statusObj.color}40`
                        }}>
                          {statusObj.label}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                        <span>📅 Applied: <strong>{format(new Date(item.appliedDate), 'MMM d, yyyy')}</strong></span>
                        <span>{platformObj.label}</span>
                        <span>{jobTypeObj?.label}</span>
                        <span>{workModeObj?.emoji} {workModeObj?.label}</span>
                        {item.location && <span>📍 {item.location}</span>}
                        {item.salary && <span style={{ color: '#10b981', fontWeight: 700 }}>💵 {item.salary}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {item.jobUrl && (
                      <a href={item.jobUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        View Job <ExternalLink size={13} />
                      </a>
                    )}
                    <button className="btn btn-secondary btn-sm" style={{ padding: 6 }} onClick={() => openEditModal(item)}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ padding: 6, color: '#ef4444' }} onClick={() => handleDelete(item.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Additional Info / Notes */}
                {(item.notes || item.contactInfo) && (
                  <div style={{ background: 'var(--bg-main)', padding: '12px 14px', borderRadius: 8, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {item.contactInfo && (
                      <div style={{ fontSize: 12, color: '#06b6d4', fontWeight: 600 }}>
                        👤 Recruiter / Contact: {item.contactInfo}
                      </div>
                    )}
                    {item.notes && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        {item.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Status Quick Update Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {item.followUpDate && (
                      <span style={{ color: isPast(new Date(item.followUpDate)) ? '#ef4444' : '#3b82f6', fontWeight: 600 }}>
                        ⏰ Follow-up: {format(new Date(item.followUpDate), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <div className="modal-box" style={{ maxWidth: 580 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>
                {editingItem ? '✏️ Edit Job Application' : '💼 Log Job Application'}
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Company & Position */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Company Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Google, Stripe, Acme Corp"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Position / Job Title *</label>
                  <input
                    className="input"
                    placeholder="e.g. Senior Full Stack Engineer"
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Platform & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Platform / Source</label>
                  <select
                    className="input select"
                    value={platform}
                    onChange={e => setPlatform(e.target.value as JobPlatform)}
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Current Status</label>
                  <select
                    className="input select"
                    value={status}
                    onChange={e => setStatus(e.target.value as JobStatus)}
                  >
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Job Type & Work Mode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Job Type</label>
                  <select
                    className="input select"
                    value={jobType}
                    onChange={e => setJobType(e.target.value as JobType)}
                  >
                    {JOB_TYPES.map(j => (
                      <option key={j.value} value={j.value}>{j.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Work Mode</label>
                  <select
                    className="input select"
                    value={workMode}
                    onChange={e => setWorkMode(e.target.value as WorkMode)}
                  >
                    {WORK_MODES.map(w => (
                      <option key={w.value} value={w.value}>{w.emoji} {w.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Salary & Location */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Salary / Compensation Range</label>
                  <input
                    className="input"
                    placeholder="e.g. $120k - $150k or $60/hr"
                    value={salary}
                    onChange={e => setSalary(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Location / Timezone</label>
                  <input
                    className="input"
                    placeholder="e.g. Remote / New York, NY"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </div>
              </div>

              {/* Applied Date & Follow Up Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Applied Date</label>
                  <input
                    type="date"
                    className="input"
                    value={appliedDate}
                    onChange={e => setAppliedDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Follow-Up Reminder Date</label>
                  <input
                    type="date"
                    className="input"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Job URL & Recruiter Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Job Posting URL</label>
                  <input
                    className="input"
                    placeholder="https://..."
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Recruiter / Contact Person</label>
                  <input
                    className="input"
                    placeholder="e.g. Sarah (HM) / sarah@company.com"
                    value={contactInfo}
                    onChange={e => setContactInfo(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Application Notes & Interview Prep</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Details about cover letter, tech stack required, interview questions, or follow-up logs..."
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
                  {editingItem ? 'Save Changes' : '+ Save Application Log'}
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
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5,
};
