import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DayRecord {
  date: string; // YYYY-MM-DD format
  achievements: string[];
  isProductive: boolean;
}

export interface UserProfile {
  name: string;
  birthday: string; // YYYY-MM-DD format
  onboardingComplete: boolean;
}

interface LifeState {
  // User Profile
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;

  // Daily Records
  dayRecords: Record<string, DayRecord>;
  addAchievement: (date: string, achievement: string) => void;
  removeAchievement: (date: string, index: number) => void;
  markDayProductivity: (date: string, isProductive: boolean) => void;
  getDayRecord: (date: string) => DayRecord | undefined;

  // Utils
  reset: () => void;
}

const LIFE_EXPECTANCY_YEARS = 60;

export const useLifeStore = create<LifeState>()(
  persist(
    (set, get) => ({
      profile: null,
      dayRecords: {},

      setProfile: (profile) => set({ profile }),

      addAchievement: (date, achievement) => {
        const currentRecords = get().dayRecords;
        const existingRecord = currentRecords[date] || {
          date,
          achievements: [],
          isProductive: false,
        };

        set({
          dayRecords: {
            ...currentRecords,
            [date]: {
              ...existingRecord,
              achievements: [...existingRecord.achievements, achievement],
              isProductive: true, // Having achievements makes it productive
            },
          },
        });
      },

      removeAchievement: (date, index) => {
        const currentRecords = get().dayRecords;
        const existingRecord = currentRecords[date];

        if (!existingRecord) return;

        const newAchievements = existingRecord.achievements.filter((_, i) => i !== index);

        set({
          dayRecords: {
            ...currentRecords,
            [date]: {
              ...existingRecord,
              achievements: newAchievements,
              isProductive: newAchievements.length > 0,
            },
          },
        });
      },

      markDayProductivity: (date, isProductive) => {
        const currentRecords = get().dayRecords;
        const existingRecord = currentRecords[date] || {
          date,
          achievements: [],
          isProductive: false,
        };

        set({
          dayRecords: {
            ...currentRecords,
            [date]: {
              ...existingRecord,
              isProductive,
            },
          },
        });
      },

      getDayRecord: (date) => get().dayRecords[date],

      reset: () => set({ profile: null, dayRecords: {} }),
    }),
    {
      name: 'life-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper functions
export function calculateDaysRemaining(birthday: string): number {
  const birthDate = new Date(birthday);
  const today = new Date();

  // Calculate death date (birthday + LIFE_EXPECTANCY_YEARS years)
  const deathDate = new Date(birthDate);
  deathDate.setFullYear(deathDate.getFullYear() + LIFE_EXPECTANCY_YEARS);

  // Calculate days remaining
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil((deathDate.getTime() - today.getTime()) / msPerDay);

  return Math.max(0, daysRemaining);
}

export function calculateDaysLived(birthday: string): number {
  const birthDate = new Date(birthday);
  const today = new Date();

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLived = Math.floor((today.getTime() - birthDate.getTime()) / msPerDay);

  return Math.max(0, daysLived);
}

export function calculateTotalDays(): number {
  return LIFE_EXPECTANCY_YEARS * 365; // Approximate
}

export function getSecondsRemainingToday(): number {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
}

export function getTotalSecondsInDay(): number {
  return 24 * 60 * 60; // 86400
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAge(birthday: string): number {
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
