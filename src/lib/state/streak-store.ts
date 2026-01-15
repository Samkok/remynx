import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDate } from './life-store';
import { Work } from './works-store';

export interface StreakDay {
  date: string;
  completed: boolean;
}

export interface WeeklyQuest {
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: StreakDay[];
  isComplete: boolean;
}

interface StreakState {
  // Current streak count
  currentStreak: number;
  longestStreak: number;

  // Track which days have been celebrated
  celebratedDates: string[];

  // Last celebrated date to prevent duplicate celebrations
  lastCelebratedDate: string | null;

  // Track when wasted popup was shown (by date)
  wastedDaysShownDates: string[]; // Track dates when wasted popup was shown

  // Track when yesterday completed popup was shown (by date)
  yesterdayCompletedShownDates: string[]; // Track dates when yesterday completed popup was shown

  // Registration date - the day user started using the app (for streak calculations)
  registrationDate: string | null;

  // Track when welcome first day popup was shown
  welcomeFirstDayShownDates: string[];

  // Actions
  markDayCelebrated: (date: string) => void;
  updateStreakFromWorks: (works: Work[]) => void;
  markWastedDaysShown: (date: string) => void;
  markYesterdayCompletedShown: (date: string) => void;
  checkForWastedDays: (works: Work[]) => { shouldShow: boolean; daysWasted: number };
  checkForYesterdayCompleted: (works: Work[]) => { shouldShow: boolean };
  setRegistrationDate: (date: string) => void;
  checkForWelcomeFirstDay: () => { shouldShow: boolean };
  markWelcomeFirstDayShown: (date: string) => void;
}

// Helper to check if any work has achievements on a given date
function hasAnyWorkAchievement(works: Work[], dateStr: string): boolean {
  return works.some((work) => {
    const achievements = work.achievements[dateStr] || [];
    return achievements.length > 0;
  });
}

// Helper to get consecutive streak days ending at a specific date
export function calculateCurrentStreak(
  works: Work[],
  endDate: Date = new Date()
): number {
  let streak = 0;
  const currentDate = new Date(endDate);
  currentDate.setHours(0, 0, 0, 0);

  while (true) {
    const dateStr = formatDate(currentDate);

    if (hasAnyWorkAchievement(works, dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// Helper to check if today's streak is complete
export function isTodayStreakComplete(works: Work[]): boolean {
  const today = formatDate(new Date());
  return hasAnyWorkAchievement(works, today);
}

// Helper to generate weekly quest data
export function generateWeeklyQuests(
  works: Work[],
  weeksToShow: number = 4
): WeeklyQuest[] {
  const quests: WeeklyQuest[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the start of the current week (Sunday)
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());

  for (let weekIndex = 0; weekIndex < weeksToShow; weekIndex++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - (weekIndex * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const days: StreakDay[] = [];
    let completedDays = 0;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayIndex);
      const dateStr = formatDate(dayDate);

      const isCompleted = hasAnyWorkAchievement(works, dateStr);

      if (isCompleted) {
        completedDays++;
      }

      days.push({
        date: dateStr,
        completed: isCompleted,
      });
    }

    quests.push({
      weekNumber: weekIndex + 1,
      startDate: formatDate(weekStart),
      endDate: formatDate(weekEnd),
      days,
      isComplete: completedDays === 7,
    });
  }

  return quests.reverse(); // Oldest first
}

// Helper to get future week quest
export function generateFutureWeekQuest(
  works: Work[],
  weeksAhead: number = 1
): WeeklyQuest {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the start of the current week (Sunday)
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());

  const weekStart = new Date(currentWeekStart);
  weekStart.setDate(currentWeekStart.getDate() + (weeksAhead * 7));

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const days: StreakDay[] = [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayIndex);

    days.push({
      date: formatDate(dayDate),
      completed: false,
    });
  }

  return {
    weekNumber: weeksAhead,
    startDate: formatDate(weekStart),
    endDate: formatDate(weekEnd),
    days,
    isComplete: false,
  };
}

// Calculate longest streak from all work achievements
function calculateLongestStreak(works: Work[]): number {
  // Get all unique dates that have at least one work achievement
  const datesSet = new Set<string>();

  works.forEach((work) => {
    Object.keys(work.achievements).forEach((dateStr) => {
      if (work.achievements[dateStr].length > 0) {
        datesSet.add(dateStr);
      }
    });
  });

  const dates = Array.from(datesSet).sort();

  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);

    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      celebratedDates: [],
      lastCelebratedDate: null,
      wastedDaysShownDates: [],
      yesterdayCompletedShownDates: [],
      registrationDate: null,
      welcomeFirstDayShownDates: [],

      markDayCelebrated: (date) => {
        const { celebratedDates } = get();
        if (!celebratedDates.includes(date)) {
          set({
            celebratedDates: [...celebratedDates, date],
            lastCelebratedDate: date,
          });
        }
      },

      updateStreakFromWorks: (works) => {
        const currentStreak = calculateCurrentStreak(works);
        const longestStreak = Math.max(
          get().longestStreak,
          calculateLongestStreak(works)
        );

        set({ currentStreak, longestStreak });
      },

      markWastedDaysShown: (date) => {
        const { wastedDaysShownDates } = get();
        if (!wastedDaysShownDates.includes(date)) {
          set({
            wastedDaysShownDates: [...wastedDaysShownDates, date],
          });
        }
      },

      markYesterdayCompletedShown: (date) => {
        const { yesterdayCompletedShownDates } = get();
        if (!yesterdayCompletedShownDates.includes(date)) {
          set({
            yesterdayCompletedShownDates: [...yesterdayCompletedShownDates, date],
          });
        }
      },

      setRegistrationDate: (date) => {
        const { registrationDate } = get();
        // Only set if not already set
        if (!registrationDate) {
          set({ registrationDate: date });
        }
      },

      checkForWelcomeFirstDay: () => {
        const today = formatDate(new Date());
        const { registrationDate, welcomeFirstDayShownDates } = get();

        // If already shown, don't show again
        if (welcomeFirstDayShownDates.includes(today)) {
          return { shouldShow: false };
        }

        // If no registration date set, can't determine
        if (!registrationDate) {
          return { shouldShow: false };
        }

        // Calculate yesterday's date
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        yesterdayDate.setHours(0, 0, 0, 0);
        const yesterday = formatDate(yesterdayDate);

        // IMPORTANT: Show welcome popup when yesterday is BEFORE registration date
        // This means yesterday was blank (user hadn't registered yet)
        // So today is their first real day to track
        if (yesterday < registrationDate) {
          return { shouldShow: true };
        }

        return { shouldShow: false };
      },

      markWelcomeFirstDayShown: (date) => {
        const { welcomeFirstDayShownDates } = get();
        if (!welcomeFirstDayShownDates.includes(date)) {
          set({
            welcomeFirstDayShownDates: [...welcomeFirstDayShownDates, date],
          });
        }
      },

      checkForWastedDays: (works) => {
        const today = formatDate(new Date());
        const { wastedDaysShownDates, registrationDate } = get();

        // If already shown today, don't show again
        if (wastedDaysShownDates.includes(today)) {
          return { shouldShow: false, daysWasted: 0 };
        }

        // Calculate yesterday's date
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        yesterdayDate.setHours(0, 0, 0, 0);
        const yesterday = formatDate(yesterdayDate);

        // IMPORTANT: If yesterday is before registration date, treat as blank (not wasted)
        // This prevents showing "wasted day" popup for days before user registered
        if (registrationDate && yesterday < registrationDate) {
          return { shouldShow: false, daysWasted: 0 };
        }

        // If registration date is today, yesterday is blank (user just registered)
        if (registrationDate === today) {
          return { shouldShow: false, daysWasted: 0 };
        }

        // Check if yesterday had any work achievements
        const yesterdayHadAchievements = hasAnyWorkAchievement(works, yesterday);

        // If yesterday had no achievements, it was wasted
        if (!yesterdayHadAchievements) {
          return {
            shouldShow: true,
            daysWasted: 1,
          };
        }

        return { shouldShow: false, daysWasted: 0 };
      },

      checkForYesterdayCompleted: (works) => {
        const today = formatDate(new Date());
        const { yesterdayCompletedShownDates, registrationDate } = get();

        // If already shown today, don't show again
        if (yesterdayCompletedShownDates.includes(today)) {
          return { shouldShow: false };
        }

        // Calculate yesterday's date
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        yesterdayDate.setHours(0, 0, 0, 0);
        const yesterday = formatDate(yesterdayDate);

        // IMPORTANT: If yesterday is before registration date, treat as blank
        // Don't show yesterday completed for days before user registered
        if (registrationDate && yesterday < registrationDate) {
          return { shouldShow: false };
        }

        // If registration date is today, yesterday is blank (user just registered)
        if (registrationDate === today) {
          return { shouldShow: false };
        }

        // Check if yesterday had any work achievements
        const yesterdayHadAchievements = hasAnyWorkAchievement(works, yesterday);

        // If yesterday had achievements, show congratulations
        return { shouldShow: yesterdayHadAchievements };
      },
    }),
    {
      name: 'streak-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
