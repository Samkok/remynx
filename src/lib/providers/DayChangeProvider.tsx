import React, { useEffect, useRef, useCallback, createContext, useContext, useState, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useWorksStore } from '@/lib/state/works-store';
import { useStreakStore } from '@/lib/state/streak-store';
import { useLifeStore, formatDate } from '@/lib/state/life-store';
import { profileKeys, worksKeys } from '@/lib/hooks/useApiData';
import { DayWastedPopup } from '@/components/DayWastedPopup';
import { YesterdayCompletedPopup } from '@/components/YesterdayCompletedPopup';
import { WelcomeFirstDayPopup } from '@/components/WelcomeFirstDayPopup';

// Background refresh threshold: 10 minutes in milliseconds
const BACKGROUND_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;

interface DayChangeContextValue {
  currentDate: string;
  isAppActive: boolean;
  refreshData: () => Promise<void>;
  getCurrentDate: () => string;
}

const DayChangeContext = createContext<DayChangeContextValue>({
  currentDate: formatDate(new Date()),
  isAppActive: true,
  refreshData: async () => {},
  getCurrentDate: () => formatDate(new Date()),
});

export function useDayChange() {
  return useContext(DayChangeContext);
}

interface DayChangeProviderProps {
  children: React.ReactNode;
}

export function DayChangeProvider({ children }: DayChangeProviderProps) {
  const [currentDate, setCurrentDate] = useState(() => formatDate(new Date()));
  const [isAppActive, setIsAppActive] = useState(true);
  const [isStoreHydrated, setIsStoreHydrated] = useState(false);
  const queryClient = useQueryClient();

  // Popup states
  const [showWastedDaysPopup, setShowWastedDaysPopup] = useState(false);
  const [showYesterdayCompletedPopup, setShowYesterdayCompletedPopup] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [wastedDaysCount, setWastedDaysCount] = useState(0);

  // Refs to prevent duplicate checks
  const lastCheckedDate = useRef<string>('');
  const pendingCheck = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Track when app went to background for 10-minute refresh logic
  const backgroundStartTime = useRef<number | null>(null);

  // Store selectors
  const works = useWorksStore((s) => s.works);
  const registrationDate = useStreakStore((s) => s.registrationDate);
  const setRegistrationDate = useStreakStore((s) => s.setRegistrationDate);
  const checkForWastedDays = useStreakStore((s) => s.checkForWastedDays);
  const markWastedDaysShown = useStreakStore((s) => s.markWastedDaysShown);
  const checkForYesterdayCompleted = useStreakStore((s) => s.checkForYesterdayCompleted);
  const markYesterdayCompletedShown = useStreakStore((s) => s.markYesterdayCompletedShown);
  const checkForWelcomeFirstDay = useStreakStore((s) => s.checkForWelcomeFirstDay);
  const markWelcomeFirstDayShown = useStreakStore((s) => s.markWelcomeFirstDayShown);
  const updateStreakFromWorks = useStreakStore((s) => s.updateStreakFromWorks);
  const profile = useLifeStore((s) => s.profile);

  // Wait for store hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStoreHydrated(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Set registration date if not set and profile exists
  useEffect(() => {
    if (isStoreHydrated && profile?.onboardingComplete && !registrationDate) {
      // Set today as registration date for new users
      const today = formatDate(new Date());
      setRegistrationDate(today);
    }
  }, [isStoreHydrated, profile?.onboardingComplete, registrationDate, setRegistrationDate]);

  // Helper to get fresh current date - always returns actual current date
  const getCurrentDate = useCallback(() => {
    return formatDate(new Date());
  }, []);

  // Function to refresh all data from the backend
  const refreshData = useCallback(async () => {
    console.log('[DayChange] 🔄 Refreshing all data...');

    try {
      // Update the current date first
      const today = formatDate(new Date());
      if (today !== currentDate) {
        console.log('[DayChange] 📅 Date changed from', currentDate, 'to', today);
        setCurrentDate(today);
      }

      // Invalidate and refetch all queries
      await queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      await queryClient.invalidateQueries({ queryKey: worksKeys.all });
      await queryClient.refetchQueries({ queryKey: profileKeys.detail() });

      console.log('[DayChange] ✅ Data refresh completed');
    } catch (error) {
      console.error('[DayChange] ❌ Error refreshing data:', error);
    }
  }, [queryClient, currentDate]);

  // Function to perform daily checks
  const performDailyChecks = useCallback(async () => {
    if (!isStoreHydrated || !profile?.onboardingComplete) return;

    const today = formatDate(new Date());

    // Prevent duplicate checks for the same date in the same session
    if (lastCheckedDate.current === today && !pendingCheck.current) {
      return;
    }

    lastCheckedDate.current = today;
    pendingCheck.current = false;

    console.log('[DayChange] 📅 Day changed to:', today, '- Refetching data...');

    // Force refetch profile data to get fresh achievements for the new day
    try {
      await queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      await queryClient.invalidateQueries({ queryKey: worksKeys.all });
      await queryClient.refetchQueries({ queryKey: profileKeys.detail() });
      console.log('[DayChange] ✅ Data refetched for new day');
    } catch (error) {
      console.error('[DayChange] ❌ Error refetching data:', error);
    }

    // Update streaks first
    updateStreakFromWorks(works);

    // Check for welcome first day popup (highest priority for new users)
    const { shouldShow: shouldShowWelcome } = checkForWelcomeFirstDay();

    if (shouldShowWelcome) {
      setTimeout(() => {
        setShowWelcomePopup(true);
        markWelcomeFirstDayShown(today);
      }, 300);
      return; // Don't show other popups on the first day
    }

    // Check for wasted days
    const { shouldShow: shouldShowWasted, daysWasted } = checkForWastedDays(works);

    if (shouldShowWasted) {
      setWastedDaysCount(daysWasted);
      setTimeout(() => {
        setShowWastedDaysPopup(true);
        markWastedDaysShown(today);
      }, 300);
      return; // Don't show yesterday completed if showing wasted
    }

    // Check for yesterday completed
    const { shouldShow: shouldShowCompleted } = checkForYesterdayCompleted(works);

    if (shouldShowCompleted) {
      setTimeout(() => {
        setShowYesterdayCompletedPopup(true);
        markYesterdayCompletedShown(today);
      }, 300);
    }
  }, [
    isStoreHydrated,
    profile?.onboardingComplete,
    works,
    queryClient,
    updateStreakFromWorks,
    checkForWelcomeFirstDay,
    markWelcomeFirstDayShown,
    checkForWastedDays,
    markWastedDaysShown,
    checkForYesterdayCompleted,
    markYesterdayCompletedShown,
  ]);

  // Check for day changes periodically
  useEffect(() => {
    const checkForDayChange = () => {
      const today = formatDate(new Date());

      if (today !== currentDate) {
        console.log('[DayChange] 📅 Periodic check detected day change:', currentDate, '->', today);
        setCurrentDate(today);

        // Mark that we need to perform checks when app becomes active
        if (isAppActive) {
          pendingCheck.current = true;
          performDailyChecks();
        } else {
          pendingCheck.current = true;
        }
      }
    };

    // Check every minute for day changes
    const interval = setInterval(checkForDayChange, 60000);

    // Also check immediately
    checkForDayChange();

    return () => clearInterval(interval);
  }, [currentDate, isAppActive, performDailyChecks]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasInBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';
      const isGoingToBackground = nextAppState.match(/inactive|background/);

      // Track when app goes to background
      if (isGoingToBackground && !wasInBackground) {
        backgroundStartTime.current = Date.now();
        console.log('[DayChange] 📱 App going to background at:', new Date().toISOString());
      }

      appStateRef.current = nextAppState;
      setIsAppActive(isNowActive);

      // When app comes to foreground from background
      if (wasInBackground && isNowActive) {
        const today = formatDate(new Date());
        const timeInBackground = backgroundStartTime.current
          ? Date.now() - backgroundStartTime.current
          : 0;

        console.log('[DayChange] 📱 App coming to foreground after', Math.round(timeInBackground / 1000), 'seconds');

        // Check if day changed while in background
        if (today !== currentDate) {
          console.log('[DayChange] 📅 Date changed while in background:', currentDate, '->', today);
          setCurrentDate(today);
          pendingCheck.current = true;
        }

        // Refresh data if app was in background for 10+ minutes
        if (timeInBackground >= BACKGROUND_REFRESH_THRESHOLD_MS) {
          console.log('[DayChange] 🔄 App was in background for 10+ minutes, refreshing data...');
          refreshData();
        }

        // Clear background start time
        backgroundStartTime.current = null;

        // Perform daily checks if we have pending ones or it's a new day
        if (pendingCheck.current || today !== lastCheckedDate.current) {
          performDailyChecks();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [currentDate, performDailyChecks, refreshData]);

  // Initial checks when store is hydrated
  useEffect(() => {
    if (isStoreHydrated && profile?.onboardingComplete) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        performDailyChecks();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isStoreHydrated, profile?.onboardingComplete, performDailyChecks]);

  // Popup dismiss handlers
  const handleWastedDaysPopupDismiss = useCallback(() => {
    setShowWastedDaysPopup(false);
  }, []);

  const handleYesterdayCompletedPopupDismiss = useCallback(() => {
    setShowYesterdayCompletedPopup(false);
  }, []);

  const handleWelcomePopupDismiss = useCallback(() => {
    setShowWelcomePopup(false);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<DayChangeContextValue>(() => ({
    currentDate,
    isAppActive,
    refreshData,
    getCurrentDate,
  }), [currentDate, isAppActive, refreshData, getCurrentDate]);

  return (
    <DayChangeContext.Provider value={contextValue}>
      {children}

      {/* Day Wasted Popup */}
      <DayWastedPopup
        visible={showWastedDaysPopup}
        onDismiss={handleWastedDaysPopupDismiss}
        daysWasted={wastedDaysCount}
      />

      {/* Yesterday Completed Popup */}
      <YesterdayCompletedPopup
        visible={showYesterdayCompletedPopup}
        onDismiss={handleYesterdayCompletedPopupDismiss}
      />

      {/* Welcome First Day Popup */}
      <WelcomeFirstDayPopup
        visible={showWelcomePopup}
        onDismiss={handleWelcomePopupDismiss}
        userName={profile?.name ?? 'Friend'}
      />
    </DayChangeContext.Provider>
  );
}
