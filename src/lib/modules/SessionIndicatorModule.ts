import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'SessionIndicatorModule' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Type definitions for native module
interface SessionIndicatorModuleType {
  startLiveActivity(message: string, endTime: number): Promise<void>;
  updateLiveActivity(message: string, progress: number): Promise<void>;
  endLiveActivity(): Promise<void>;

  startForegroundService(message: string, endTime: number): Promise<void>;
  updateForegroundService(message: string, progress: number): Promise<void>;
  stopForegroundService(): Promise<void>;

  isSupported(): Promise<boolean>;
}

// Check if native module exists
const hasNativeModule = !!NativeModules.SessionIndicatorModule;

// Get the native module or create a fallback
const SessionIndicatorNative: SessionIndicatorModuleType = hasNativeModule
  ? (NativeModules.SessionIndicatorModule as SessionIndicatorModuleType)
  : {
      // Fallback implementation for when native code isn't available
      startLiveActivity: async () => {
        console.log('[SessionIndicator] Native module not available (iOS)');
      },
      updateLiveActivity: async () => {
        console.log('[SessionIndicator] Native module not available (iOS)');
      },
      endLiveActivity: async () => {
        console.log('[SessionIndicator] Native module not available (iOS)');
      },
      startForegroundService: async () => {
        console.log('[SessionIndicator] Native module not available (Android)');
      },
      updateForegroundService: async () => {
        console.log('[SessionIndicator] Native module not available (Android)');
      },
      stopForegroundService: async () => {
        console.log('[SessionIndicator] Native module not available (Android)');
      },
      isSupported: async () => false,
    };

/**
 * Platform-agnostic session indicator API
 * Automatically uses Live Activities on iOS and Foreground Service on Android
 */
export const SessionIndicatorModule = {
  /**
   * Check if the platform supports persistent session indicators
   */
  async isSupported(): Promise<boolean> {
    try {
      // In Expo Go or web, or without native code, this won't be supported
      if (!hasNativeModule) {
        return false;
      }
      return await SessionIndicatorNative.isSupported();
    } catch {
      return false;
    }
  },

  /**
   * Start a persistent session indicator
   * @param message - The message to display
   * @param endTime - Timestamp when the session should auto-terminate (in milliseconds)
   */
  async start(message: string, endTime: number): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await SessionIndicatorNative.startLiveActivity(message, endTime);
      } else if (Platform.OS === 'android') {
        await SessionIndicatorNative.startForegroundService(message, endTime);
      }
    } catch (error) {
      console.log('[SessionIndicator] Failed to start:', error);
    }
  },

  /**
   * Update the session indicator's message and progress
   * @param message - The new message to display
   * @param progress - Progress percentage (0-100)
   */
  async update(message: string, progress: number): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await SessionIndicatorNative.updateLiveActivity(message, progress);
      } else if (Platform.OS === 'android') {
        await SessionIndicatorNative.updateForegroundService(message, progress);
      }
    } catch (error) {
      console.log('[SessionIndicator] Failed to update:', error);
    }
  },

  /**
   * Stop the persistent session indicator
   */
  async stop(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await SessionIndicatorNative.endLiveActivity();
      } else if (Platform.OS === 'android') {
        await SessionIndicatorNative.stopForegroundService();
      }
    } catch (error) {
      console.log('[SessionIndicator] Failed to stop:', error);
    }
  },

  /**
   * Listen for native events (no-op if native module not available)
   */
  addListener(
    eventType: 'onSessionEnd' | 'onSessionInteraction',
    listener: (event: any) => void
  ) {
    // Return a no-op subscription if native module not available
    return {
      remove: () => {
        // No-op
      },
    };
  },

  /**
   * Remove event listeners (no-op if native module not available)
   */
  removeAllListeners(eventType: 'onSessionEnd' | 'onSessionInteraction') {
    // No-op if native module not available
  },
};

export default SessionIndicatorModule;
