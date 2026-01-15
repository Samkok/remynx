import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionState {
  isActive: boolean;
  startTime: number | null;
  endTime: number | null;
  sessionType: 'nightly_reminder' | 'work_session' | 'custom' | null;
  message: string;
  progress: number; // 0-100
}

interface SessionIndicatorState {
  // Session state
  session: SessionState;

  // Settings
  settings: {
    iosLiveActivityEnabled: boolean;
    androidForegroundServiceEnabled: boolean;
  };

  // Actions
  startSession: (params: {
    sessionType: SessionState['sessionType'];
    message: string;
    durationMinutes: number;
  }) => void;
  updateSession: (updates: Partial<Pick<SessionState, 'message' | 'progress'>>) => void;
  endSession: () => void;

  // Settings actions
  setIOSLiveActivityEnabled: (enabled: boolean) => void;
  setAndroidForegroundServiceEnabled: (enabled: boolean) => void;
}

export const useSessionIndicatorStore = create<SessionIndicatorState>()(
  persist(
    (set) => ({
      session: {
        isActive: false,
        startTime: null,
        endTime: null,
        sessionType: null,
        message: '',
        progress: 0,
      },

      settings: {
        iosLiveActivityEnabled: true,
        androidForegroundServiceEnabled: true,
      },

      startSession: ({ sessionType, message, durationMinutes }) => {
        const startTime = Date.now();
        const endTime = startTime + durationMinutes * 60 * 1000;

        set({
          session: {
            isActive: true,
            startTime,
            endTime,
            sessionType,
            message,
            progress: 0,
          },
        });
      },

      updateSession: (updates) => {
        set((state) => ({
          session: {
            ...state.session,
            ...updates,
          },
        }));
      },

      endSession: () => {
        set({
          session: {
            isActive: false,
            startTime: null,
            endTime: null,
            sessionType: null,
            message: '',
            progress: 0,
          },
        });
      },

      setIOSLiveActivityEnabled: (enabled) => {
        set((state) => ({
          settings: {
            ...state.settings,
            iosLiveActivityEnabled: enabled,
          },
        }));
      },

      setAndroidForegroundServiceEnabled: (enabled) => {
        set((state) => ({
          settings: {
            ...state.settings,
            androidForegroundServiceEnabled: enabled,
          },
        }));
      },
    }),
    {
      name: 'session-indicator-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
