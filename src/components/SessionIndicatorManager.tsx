import React, { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { useSessionIndicatorStore } from '@/lib/state/session-indicator-store';
import SessionIndicatorModule from '@/lib/modules/SessionIndicatorModule';

/**
 * SessionIndicatorManager
 *
 * This component manages the lifecycle of platform-specific persistent session indicators:
 * - iOS: Live Activities (ActivityKit) with Lock Screen and Dynamic Island
 * - Android: Foreground Service with ongoing notification
 *
 * Features:
 * - User-initiated and time-bound sessions
 * - Auto-termination when time expires
 * - Platform-specific opt-out toggles
 * - Syncs with Zustand state
 * - Handles app state changes (background/foreground)
 */
export function SessionIndicatorManager() {
  const session = useSessionIndicatorStore((s) => s.session);
  const settings = useSessionIndicatorStore((s) => s.settings);
  const endSession = useSessionIndicatorStore((s) => s.endSession);
  const updateSession = useSessionIndicatorStore((s) => s.updateSession);

  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Check if the current platform's indicator is enabled
   */
  const isPlatformEnabled = useCallback(() => {
    if (Platform.OS === 'ios') {
      return settings.iosLiveActivityEnabled;
    } else if (Platform.OS === 'android') {
      return settings.androidForegroundServiceEnabled;
    }
    return false;
  }, [settings]);

  /**
   * Calculate progress percentage based on elapsed time
   */
  const calculateProgress = useCallback(() => {
    if (!session.startTime || !session.endTime) return 0;

    const now = Date.now();
    const total = session.endTime - session.startTime;
    const elapsed = now - session.startTime;

    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }, [session.startTime, session.endTime]);

  /**
   * Update the native session indicator
   */
  const updateNativeIndicator = useCallback(async () => {
    if (!session.isActive || !isPlatformEnabled()) return;

    try {
      const progress = calculateProgress();
      await SessionIndicatorModule.update(session.message, progress);

      // Update local state
      updateSession({ progress });

      // Check if session should end
      if (session.endTime && Date.now() >= session.endTime) {
        await SessionIndicatorModule.stop();
        endSession();
      }
    } catch (error) {
      console.error('Failed to update session indicator:', error);
    }
  }, [
    session.isActive,
    session.message,
    session.endTime,
    isPlatformEnabled,
    calculateProgress,
    updateSession,
    endSession,
  ]);

  /**
   * Start the native session indicator
   */
  const startNativeIndicator = useCallback(async () => {
    if (!session.isActive || !session.endTime || !isPlatformEnabled()) return;

    try {
      await SessionIndicatorModule.start(session.message, session.endTime);

      // Set up periodic updates (every 10 seconds)
      updateIntervalRef.current = setInterval(updateNativeIndicator, 10000);

      // Set up auto-termination
      const timeUntilEnd = session.endTime - Date.now();
      if (timeUntilEnd > 0) {
        endTimeoutRef.current = setTimeout(async () => {
          try {
            await SessionIndicatorModule.stop();
            endSession();
          } catch (error) {
            console.error('Failed to stop session indicator:', error);
          }
        }, timeUntilEnd);
      }
    } catch (error) {
      console.error('Failed to start session indicator:', error);
    }
  }, [
    session.isActive,
    session.message,
    session.endTime,
    isPlatformEnabled,
    updateNativeIndicator,
    endSession,
  ]);

  /**
   * Stop the native session indicator
   */
  const stopNativeIndicator = useCallback(async () => {
    try {
      // Clear intervals and timeouts
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (endTimeoutRef.current) {
        clearTimeout(endTimeoutRef.current);
        endTimeoutRef.current = null;
      }

      // Stop native indicator
      await SessionIndicatorModule.stop();
    } catch (error) {
      console.error('Failed to stop session indicator:', error);
    }
  }, []);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && session.isActive) {
        // When app comes to foreground, update the indicator
        updateNativeIndicator();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [session.isActive, updateNativeIndicator]);

  /**
   * Handle session state changes
   */
  useEffect(() => {
    if (session.isActive && isPlatformEnabled()) {
      startNativeIndicator();
    } else {
      stopNativeIndicator();
    }

    return () => {
      stopNativeIndicator();
    };
  }, [session.isActive, isPlatformEnabled, startNativeIndicator, stopNativeIndicator]);

  /**
   * Listen for native events
   */
  useEffect(() => {
    const onSessionEndListener = SessionIndicatorModule.addListener(
      'onSessionEnd',
      () => {
        endSession();
      }
    );

    const onSessionInteractionListener = SessionIndicatorModule.addListener(
      'onSessionInteraction',
      (event) => {
        console.log('Session interaction:', event);
        // Handle user interaction with the indicator (e.g., tap on notification)
      }
    );

    return () => {
      onSessionEndListener.remove();
      onSessionInteractionListener.remove();
    };
  }, [endSession]);

  /**
   * Check if platform supports session indicators
   */
  useEffect(() => {
    SessionIndicatorModule.isSupported().then((supported) => {
      if (!supported) {
        console.log(
          'Session indicators are not supported on this platform or configuration'
        );
      }
    });
  }, []);

  // This is a headless component - it doesn't render anything
  return null;
}
