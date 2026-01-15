import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect, useState, useCallback } from 'react';
import { useLifeStore } from '@/lib/state/life-store';
import { NightlyReminder } from '@/components/NightlyReminder';
import { SessionIndicatorManager } from '@/components/SessionIndicatorManager';
import { authClient } from '@/lib/authClient';
import { api } from '@/lib/api';
import { type GetProfileResponse } from '@/shared/contracts';
import { DataSyncProvider } from '@/lib/providers/DataSyncProvider';
import { DayChangeProvider } from '@/lib/providers/DayChangeProvider';
import { SubscriptionProvider } from '@/lib/subscription-context';
import { RealtimeSyncProvider } from '@/lib/providers/RealtimeSyncProvider';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage?.includes('Unauthorized') ||
          errorMessage?.includes('Profile not found') ||
          errorMessage?.includes('Invalid Refresh Token')
        ) {
          return false;
        }
        // Retry network errors up to 2 times
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Custom dark theme matching our app
const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0D0D0D',
    card: '#1A1A1A',
    border: '#333',
    primary: '#F59E0B',
  },
};

function RootLayoutNav() {
  const profile = useLifeStore((s) => s.profile);
  const setProfile = useLifeStore((s) => s.setProfile);
  const [isReady, setIsReady] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const checkAuthAndProfile = useCallback(async () => {
    try {
      // Check if user has an active session
      const session = await authClient.getSession();

      if (session?.data?.user) {
        // User is logged in, try to fetch their profile
        try {
          const profileData = await api.get<GetProfileResponse>('/api/profile');

          if (profileData.profile) {
            // User has a profile, set it in local store
            setProfile({
              name: profileData.profile.name,
              birthday: profileData.profile.birthday,
              onboardingComplete: true,
            });
          } else {
            // No profile found, clear local store
            setProfile(null);
          }
        } catch (error) {
          console.log('Failed to fetch profile:', error);
          // Clear profile on error
          setProfile(null);
        }
      } else {
        // No valid session, clear local store
        console.log('No valid session, clearing profile');
        setProfile(null);
      }
    } catch (error) {
      console.log('Auth check error:', error);
      // Clear profile on error
      setProfile(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [setProfile]);

  useEffect(() => {
    checkAuthAndProfile();
  }, [checkAuthAndProfile]);

  useEffect(() => {
    // Wait for store to hydrate and auth check to complete
    if (!isCheckingAuth) {
      const timer = setTimeout(() => {
        setIsReady(true);
        SplashScreen.hideAsync();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isCheckingAuth]);

  // Don't render anything until we're ready
  if (!isReady) {
    return null;
  }

  const isOnboardingComplete = profile?.onboardingComplete;

  const stackContent = (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="streak"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="terms"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="debug-subscription"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
      {isOnboardingComplete && (
        <>
          <NightlyReminder />
          <SessionIndicatorManager />
        </>
      )}
    </>
  );

  return (
    <ThemeProvider value={customDarkTheme}>
      {isOnboardingComplete ? (
        <RealtimeSyncProvider>
          <DataSyncProvider>
            <DayChangeProvider>
              {stackContent}
            </DayChangeProvider>
          </DataSyncProvider>
        </RealtimeSyncProvider>
      ) : (
        stackContent
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <StatusBar style="light" />
            <RootLayoutNav />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SubscriptionProvider>
    </QueryClientProvider>
  );
}
