import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDate } from './life-store';

export interface WorkAchievement {
  id: string;
  text: string;
  createdAt: string;
}

export type SkipType = 'tomorrow' | 'indefinite';

export interface Work {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  createdAt: string;
  // Achievements keyed by date (YYYY-MM-DD)
  achievements: Record<string, WorkAchievement[]>;
  // Skip status
  skipType?: SkipType | null;
  // Date when skip was set (for 'today' skip to know when to reset)
  skipDate?: string;
}

interface WorksState {
  // All works
  works: Work[];

  // Track dates when all-works celebration was shown
  allWorksCelebratedDates: string[];

  // Actions
  addWork: (name: string, description?: string, color?: string) => void;
  removeWork: (workId: string) => void;
  updateWork: (workId: string, updates: Partial<Pick<Work, 'name' | 'description' | 'color'>>) => void;

  // Skip actions
  skipWork: (workId: string, skipType: SkipType) => void;
  unskipWork: (workId: string) => void;

  // Work achievements
  addWorkAchievement: (workId: string, date: string, text: string) => void;
  removeWorkAchievement: (workId: string, date: string, achievementId: string) => void;

  // All-works celebration tracking
  markAllWorksCelebrated: (date: string) => void;
  hasAllWorksCelebratedToday: () => boolean;

  // Helpers
  getWorkById: (workId: string) => Work | undefined;
  getWorkAchievementsForDate: (workId: string, date: string) => WorkAchievement[];
  isWorkFulfilledForDate: (workId: string, date: string) => boolean;
  isWorkActiveForDate: (workId: string, date: string) => boolean;
  getActiveWorks: (date?: string) => Work[];
  getSkippedWorks: (date?: string) => Work[];
  getTodayFulfillmentStats: () => { fulfilled: number; total: number; percentage: number };
  areAllActiveWorksFulfilled: () => boolean;
  // Get all achievements for a specific date across all works
  getAllAchievementsForDate: (date: string) => { workName: string; workColor: string; achievements: WorkAchievement[] }[];
  // Check if date has any work fulfilled (for streak/calendar)
  hasAnyWorkFulfilledForDate: (date: string) => boolean;
}

// Color palette for works
export const WORK_COLORS = [
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useWorksStore = create<WorksState>()(
  persist(
    (set, get) => ({
      works: [],
      allWorksCelebratedDates: [],

      addWork: (name, description, color) => {
        const newWork: Work = {
          id: generateId(),
          name,
          description,
          color: color || WORK_COLORS[get().works.length % WORK_COLORS.length],
          createdAt: new Date().toISOString(),
          achievements: {},
          skipType: null,
          skipDate: undefined,
        };

        set((state) => ({
          works: [...state.works, newWork],
        }));
      },

      removeWork: (workId) => {
        set((state) => ({
          works: state.works.filter((w) => w.id !== workId),
        }));
      },

      updateWork: (workId, updates) => {
        set((state) => ({
          works: state.works.map((w) =>
            w.id === workId ? { ...w, ...updates } : w
          ),
        }));
      },

      skipWork: (workId, skipType) => {
        const tomorrow = formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
        set((state) => ({
          works: state.works.map((w) =>
            w.id === workId
              ? { ...w, skipType, skipDate: tomorrow }
              : w
          ),
        }));
      },

      unskipWork: (workId) => {
        set((state) => ({
          works: state.works.map((w) =>
            w.id === workId
              ? { ...w, skipType: null, skipDate: undefined }
              : w
          ),
        }));
      },

      addWorkAchievement: (workId, date, text) => {
        const newAchievement: WorkAchievement = {
          id: generateId(),
          text,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          works: state.works.map((w) => {
            if (w.id !== workId) return w;

            const existingAchievements = w.achievements[date] || [];
            return {
              ...w,
              achievements: {
                ...w.achievements,
                [date]: [...existingAchievements, newAchievement],
              },
            };
          }),
        }));
      },

      removeWorkAchievement: (workId, date, achievementId) => {
        set((state) => ({
          works: state.works.map((w) => {
            if (w.id !== workId) return w;

            const existingAchievements = w.achievements[date] || [];
            return {
              ...w,
              achievements: {
                ...w.achievements,
                [date]: existingAchievements.filter((a) => a.id !== achievementId),
              },
            };
          }),
        }));
      },

      markAllWorksCelebrated: (date) => {
        set((state) => ({
          allWorksCelebratedDates: [...state.allWorksCelebratedDates, date],
        }));
      },

      hasAllWorksCelebratedToday: () => {
        const today = formatDate(new Date());
        return get().allWorksCelebratedDates.includes(today);
      },

      getWorkById: (workId) => {
        return get().works.find((w) => w.id === workId);
      },

      getWorkAchievementsForDate: (workId, date) => {
        const work = get().works.find((w) => w.id === workId);
        return work?.achievements[date] || [];
      },

      isWorkFulfilledForDate: (workId, date) => {
        const work = get().works.find((w) => w.id === workId);
        if (!work) return false;
        const achievements = work.achievements[date] || [];
        return achievements.length > 0;
      },

      isWorkActiveForDate: (workId, date) => {
        const work = get().works.find((w) => w.id === workId);
        if (!work) return false;

        // No skip set
        if (!work.skipType) return true;

        // Indefinite skip - always inactive
        if (work.skipType === 'indefinite') return false;

        // Tomorrow skip - work is active today, inactive from tomorrow onward
        if (work.skipType === 'tomorrow' && work.skipDate) {
          const today = formatDate(new Date());
          // If checking for today, always active (can't skip today)
          if (date === today) return true;
          // If skip date is in the past, the skip has expired
          if (work.skipDate < today) return true;
          // If checking for a date that is >= skip date (tomorrow or later), it's inactive
          if (date >= work.skipDate) return false;
        }

        return true;
      },

      getActiveWorks: (date) => {
        const checkDate = date || formatDate(new Date());
        const { works } = get();
        const today = formatDate(new Date());

        return works.filter((w) => {
          // No skip set
          if (!w.skipType) return true;

          // Indefinite skip - always inactive
          if (w.skipType === 'indefinite') return false;

          // Tomorrow skip - work is active today, inactive from tomorrow onward
          if (w.skipType === 'tomorrow' && w.skipDate) {
            // If checking for today, always active (can't skip today)
            if (checkDate === today) return true;
            // If skip date is in the past, the skip has expired
            if (w.skipDate < today) return true;
            // If checking for a date that is >= skip date (tomorrow or later), it's inactive
            if (checkDate >= w.skipDate) return false;
          }

          return true;
        });
      },

      getSkippedWorks: (date) => {
        const checkDate = date || formatDate(new Date());
        const { works } = get();
        const today = formatDate(new Date());

        return works.filter((w) => {
          // No skip set
          if (!w.skipType) return false;

          // Indefinite skip - always skipped
          if (w.skipType === 'indefinite') return true;

          // Tomorrow skip - work is never skipped today, skipped from tomorrow onward
          if (w.skipType === 'tomorrow' && w.skipDate) {
            // If checking for today, never skipped (can't skip today)
            if (checkDate === today) return false;
            // If skip date is in the past, the skip has expired
            if (w.skipDate < today) return false;
            // If checking for a date that is >= skip date (tomorrow or later), it's skipped
            if (checkDate >= w.skipDate) return true;
          }

          return false;
        });
      },

      getTodayFulfillmentStats: () => {
        const today = formatDate(new Date());
        const activeWorks = get().getActiveWorks(today);

        if (activeWorks.length === 0) {
          return { fulfilled: 0, total: 0, percentage: 0 };
        }

        const fulfilled = activeWorks.filter((w) => {
          const achievements = w.achievements[today] || [];
          return achievements.length > 0;
        }).length;

        return {
          fulfilled,
          total: activeWorks.length,
          percentage: (fulfilled / activeWorks.length) * 100,
        };
      },

      areAllActiveWorksFulfilled: () => {
        const today = formatDate(new Date());
        const activeWorks = get().getActiveWorks(today);

        if (activeWorks.length === 0) return false;

        return activeWorks.every((w) => {
          const achievements = w.achievements[today] || [];
          return achievements.length > 0;
        });
      },

      getAllAchievementsForDate: (date) => {
        const { works } = get();
        return works
          .filter((w) => {
            const achievements = w.achievements[date] || [];
            return achievements.length > 0;
          })
          .map((w) => ({
            workName: w.name,
            workColor: w.color,
            achievements: w.achievements[date] || [],
          }));
      },

      hasAnyWorkFulfilledForDate: (date) => {
        const { works } = get();
        return works.some((w) => {
          const achievements = w.achievements[date] || [];
          return achievements.length > 0;
        });
      },
    }),
    {
      name: 'works-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper to check if any work has achievements today (for streak integration)
export function hasAnyWorkAchievementToday(works: Work[]): boolean {
  const today = formatDate(new Date());
  return works.some((w) => {
    const achievements = w.achievements[today] || [];
    return achievements.length > 0;
  });
}

// Helper to check if any active work is fulfilled for a date (for streak)
export function hasAnyActiveWorkFulfilledForDate(works: Work[], date: string): boolean {
  const today = formatDate(new Date());

  return works.some((w) => {
    // Check if work is active for this date
    let isActive = true;
    if (w.skipType === 'indefinite') {
      isActive = false;
    } else if (w.skipType === 'tomorrow' && w.skipDate) {
      // If checking for today, always active (can't skip today)
      if (date === today) {
        isActive = true;
      } else if (w.skipDate < today) {
        isActive = true; // Skip expired
      } else if (date >= w.skipDate) {
        isActive = false; // Skip is active for this date
      }
    }

    if (!isActive) return false;

    const achievements = w.achievements[date] || [];
    return achievements.length > 0;
  });
}
