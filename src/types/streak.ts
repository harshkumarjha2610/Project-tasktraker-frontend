export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  activeDates: string[];  // Array of YYYY-MM-DD strings
  totalDaysActive: number;
}

export interface DayActivity {
  dayName: string;      // Mon, Tue, etc.
  dateStr: string;      // YYYY-MM-DD
  isActive: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface StreakMilestone {
  title: string;
  requiredDays: number;
  icon: string;
  description: string;
  unlocked: boolean;
}
