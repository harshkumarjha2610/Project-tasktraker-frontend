'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles, X, Activity, Award } from 'lucide-react';

export function calculateExactAge(now: Date) {
  // Birth Date: 26 October 2002 at 8:00 PM (20:00 local time)
  const birth = new Date(2002, 9, 26, 20, 0, 0);

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  let hours = now.getHours() - birth.getHours();
  let minutes = now.getMinutes() - birth.getMinutes();
  let seconds = now.getSeconds() - birth.getSeconds();

  if (seconds < 0) {
    seconds += 60;
    minutes -= 1;
  }
  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
    days -= 1;
  }
  if (days < 0) {
    // Days in previous month
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  const diffMs = Math.max(0, now.getTime() - birth.getTime());
  const fractionalYears = (diffMs / (1000 * 60 * 60 * 24 * 365.2425)).toFixed(8);
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalSeconds = Math.floor(diffMs / 1000);

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    fractionalYears,
    totalDays,
    totalHours,
    totalMinutes,
    totalSeconds,
  };
}

export default function DynamicAgeWidget({ showDetailsModal = false }: { showDetailsModal?: boolean }) {
  const [age, setAge] = useState(() => calculateExactAge(new Date()));
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAge(calculateExactAge(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        title="Your Exact Live Dynamic Age (Born 26 Oct 2002, 8:00 PM)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 9,
          background: 'linear-gradient(135deg, rgba(236,72,153,0.14), rgba(139,92,246,0.1))',
          border: '1px solid rgba(236,72,153,0.3)',
          color: '#ec4899',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'Inter, sans-serif',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 14 }}>🎂</span>
        <span>{age.years}y {age.months}m {age.days}d</span>
        <span style={{ fontSize: 11, opacity: 0.8, fontWeight: 500 }}>
          ({age.hours}h {age.minutes}m {age.seconds}s)
        </span>
      </button>

      {/* Detailed Modal Popup */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="modal-box"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 440, borderRadius: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                }}>
                  🎂
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Live Dynamic Age Counter</h3>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Born: October 26, 2002 at 8:00 PM</span>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: 6 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Big Live Highlight */}
            <div style={{
              padding: '16px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(139,92,246,0.06))',
              border: '1px solid rgba(236,72,153,0.3)', textAlign: 'center', marginBottom: 16
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ec4899', letterSpacing: '0.05em' }}>EXACT CURRENT AGE</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {age.years} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>years old</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#ec4899', marginTop: 2 }}>
                {age.months} months, {age.days} days, {age.hours}h {age.minutes}m {age.seconds}s
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
                Precise Fractional: {age.fractionalYears} years
              </div>
            </div>

            {/* Lifetime Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL DAYS LIVED</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6', marginTop: 2 }}>
                  {age.totalDays.toLocaleString()} days
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL HOURS LIVED</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#06b6d4', marginTop: 2 }}>
                  {age.totalHours.toLocaleString()} hours
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL MINUTES</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                  {age.totalMinutes.toLocaleString()} m
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>LIVE SECONDS TICKER</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', marginTop: 2, fontFamily: 'monospace' }}>
                  {age.totalSeconds.toLocaleString()} s
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => setModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
