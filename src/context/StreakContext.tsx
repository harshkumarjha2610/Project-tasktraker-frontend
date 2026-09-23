'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { StreakData, DayActivity, StreakMilestone } from '@/types/streak';
import { getStreakData, recordStreakVisit, syncStreakData } from '@/lib/api';
import { format, addDays, startOfWeek } from 'date-fns';

interface StreakContextType {
  streakData: StreakData;
  loading: boolean;
  hasVisitedToday: boolean;
  weeklyActivity: DayActivity[];
  milestones: StreakMilestone[];
  recordVisit: () => Promise<void>;
  resetStreak: () => Promise<void>;
}

const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  activeDates: [],
  totalDaysActive: 0,
};

const StreakContext = createContext<StreakContextType | undefined>(undefined);

const MILESTONES_CONFIG = [
  { title: 'First Spark', requiredDays: 1, icon: '⚡', description: 'Log in and begin your productive journey.' },
  { title: '3-Day Fire', requiredDays: 3, icon: '🔥', description: 'Maintain momentum for 3 consecutive days.' },
  { title: '7-Day Warrior', requiredDays: 7, icon: '🛡️', description: 'Complete a full 7-day week streak!' },
  { title: '14-Day Champion', requiredDays: 14, icon: '🏆', description: 'Stay active for 2 full weeks.' },
  { title: '30-Day Legend', requiredDays: 30, icon: '👑', description: 'Unstoppable! 30 days of continuous productivity.' },
  { title: '100-Day Titan', requiredDays: 100, icon: '🚀', description: 'Mastery achieved! 100 consecutive active days.' },
];

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [streakData, setStreakData] = useState<StreakData>(DEFAULT_STREAK_DATA);
  const [loading, setLoading] = useState(true);

  const getTodayStr = () => format(new Date(), 'yyyy-MM-dd');

  // Trigger visit recording whenever web app opens
  const checkAndRecordVisit = useCallback(async () => {
    const todayStr = getTodayStr();
    try {
      // First fetch current state (from backend or local)
      const initial = await getStreakData();
      
      // Calculate locally if date is different to ensure instant UI update
      if (initial.lastActiveDate !== todayStr) {
        const updated = await recordStreakVisit(todayStr);
        setStreakData(updated);
        localStorage.setItem('dt_app_daily_streak', JSON.stringify(updated));
      } else {
        setStreakData(initial);
      }
    } catch (err) {
      console.error('[StreakContext] Error checking/recording visit:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAndRecordVisit();
  }, [checkAndRecordVisit]);

  const hasVisitedToday = useMemo(() => {
    return streakData.lastActiveDate === getTodayStr();
  }, [streakData.lastActiveDate]);

  // Compute 7-day Monday -> Sunday activity for current week
  const weeklyActivity = useMemo(() => {
    const today = new Date();
    const todayStr = getTodayStr();
    // Get Monday of current week
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday

    const days: DayActivity[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayName = format(d, 'EEE'); // Mon, Tue, Wed, etc.
      
      const isTodayDate = dateStr === todayStr;
      const isFuture = d > today && !isTodayDate;
      const isActive = streakData.activeDates.includes(dateStr);

      days.push({
        dayName,
        dateStr,
        isActive,
        isToday: isTodayDate,
        isFuture,
      });
    }
    return days;
  }, [streakData.activeDates]);

  // Compute milestone unlock status
  const milestones = useMemo(() => {
    return MILESTONES_CONFIG.map(m => ({
      ...m,
      unlocked: streakData.longestStreak >= m.requiredDays || streakData.currentStreak >= m.requiredDays,
    }));
  }, [streakData.currentStreak, streakData.longestStreak]);

  const recordVisit = async () => {
    const todayStr = getTodayStr();
    const updated = await recordStreakVisit(todayStr);
    setStreakData(updated);
  };

  const resetStreak = async () => {
    const fresh: StreakData = {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: getTodayStr(),
      activeDates: [getTodayStr()],
      totalDaysActive: 1,
    };
    await syncStreakData(fresh);
    setStreakData(fresh);
  };

  return (
    <StreakContext.Provider
      value={{
        streakData,
        loading,
        hasVisitedToday,
        weeklyActivity,
        milestones,
        recordVisit,
        resetStreak,
      }}
    >
      {children}
    </StreakContext.Provider>
  );
};

export const useStreakContext = () => {
  const context = useContext(StreakContext);
  if (!context) {
    throw new Error('useStreakContext must be used within a StreakProvider');
  }
  return context;
};
