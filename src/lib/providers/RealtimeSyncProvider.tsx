/**
 * RealtimeSyncProvider
 *
 * Provides real-time synchronization with Supabase database changes.
 * Listens to INSERT, UPDATE, DELETE events on profile, work, and work_achievement tables
 * and automatically updates local state and React Query cache.
 *
 * Includes debouncing to prevent excessive API calls and proper reconnection handling.
 */

import React, { createContext, useContext, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useWorksStore, type Work as LocalWork, type WorkAchievement as LocalWorkAchievement } from '@/lib/state/works-store';
import { useStreakStore } from '@/lib/state/streak-store';
import { profileKeys, worksKeys } from '@/lib/hooks/useApiData';
import { supabaseApi } from '@/lib/api';
import { type Work as ApiWork } from '@/shared/contracts';

// Debounce delay for sync operations (ms)
const SYNC_DEBOUNCE_MS = 300;

// Transform API work format to local store format
function transformApiWorkToLocal(apiWork: ApiWork): LocalWork {
  const achievements: Record<string, LocalWorkAchievement[]> = {};

  for (const [date, dateAchievements] of Object.entries(apiWork.achievements)) {
    achievements[date] = dateAchievements.map((ach) => ({
      id: ach.id,
      text: ach.text,
      createdAt: ach.createdAt,
    }));
  }

  return {
    id: apiWork.id,
    name: apiWork.name,
    description: apiWork.description ?? undefined,
    color: apiWork.color,
    skipType: apiWork.skipType,
    skipDate: apiWork.skipDate ?? undefined,
    createdAt: apiWork.createdAt,
    achievements,
  };
}

// Context type
type RealtimeSyncContextType = {
  isConnected: boolean;
  forceSync: () => Promise<void>;
};

const RealtimeSyncContext = createContext<RealtimeSyncContextType | null>(null);

export function useRealtimeSync() {
  const context = useContext(RealtimeSyncContext);
  if (!context) {
    throw new Error('useRealtimeSync must be used within RealtimeSyncProvider');
  }
  return context;
}

interface RealtimeSyncProviderProps {
  children: ReactNode;
}

export function RealtimeSyncProvider({ children }: RealtimeSyncProviderProps) {
  const queryClient = useQueryClient();
  const updateStreakFromWorks = useStreakStore((s) => s.updateStreakFromWorks);
  const [isConnected, setIsConnected] = React.useState(false);

  // Refs for debouncing and tracking
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const profileIdRef = useRef<string | null>(null);
  const userWorkIdsRef = useRef<Set<string>>(new Set());
  const channelsRef = useRef<{
    profile: RealtimeChannel | null;
    work: RealtimeChannel | null;
    achievement: RealtimeChannel | null;
  }>({
    profile: null,
    work: null,
    achievement: null,
  });
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Sync function to refetch and update works from API (with debouncing)
  const syncWorksFromApi = useCallback(async (immediate = false) => {
    // If already syncing, skip
    if (isSyncingRef.current && !immediate) {
      console.log('[RealtimeSync] Sync already in progress, skipping...');
      return;
    }

    // Clear any pending debounced sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    const performSync = async () => {
      if (isSyncingRef.current) return;

      isSyncingRef.current = true;

      try {
        console.log('[RealtimeSync] 🔄 Starting sync from API...');
        const profileData = await supabaseApi.profile.get();

        if (profileData.works) {
          const transformedWorks = profileData.works.map(transformApiWorkToLocal);

          // Update the set of user work IDs for filtering achievements
          userWorkIdsRef.current = new Set(transformedWorks.map(w => w.id));

          // Update local store with API data
          useWorksStore.setState({ works: transformedWorks });

          // Update streak from works
          updateStreakFromWorks(transformedWorks);

          console.log('[RealtimeSync] ✅ Synced works from realtime update', {
            worksCount: transformedWorks.length,
            timestamp: new Date().toISOString(),
          });
        }

        // Invalidate queries to trigger UI refresh
        await queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
        await queryClient.invalidateQueries({ queryKey: worksKeys.all });
      } catch (error) {
        console.error('[RealtimeSync] ❌ Error syncing works:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    if (immediate) {
      await performSync();
    } else {
      // Debounce the sync to prevent rapid-fire API calls
      syncTimeoutRef.current = setTimeout(performSync, SYNC_DEBOUNCE_MS);
    }
  }, [queryClient, updateStreakFromWorks]);

  // Force sync function exposed via context
  const forceSync = useCallback(async () => {
    await syncWorksFromApi(true);
  }, [syncWorksFromApi]);

  // Setup realtime subscriptions
  const setupRealtimeSubscriptions = useCallback(async () => {
    try {
      // Clean up existing channels first
      if (channelsRef.current.profile) {
        await supabase.removeChannel(channelsRef.current.profile);
      }
      if (channelsRef.current.work) {
        await supabase.removeChannel(channelsRef.current.work);
      }
      if (channelsRef.current.achievement) {
        await supabase.removeChannel(channelsRef.current.achievement);
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('[RealtimeSync] No authenticated user, skipping subscriptions');
        setIsConnected(false);
        return;
      }

      console.log('[RealtimeSync] Setting up real-time subscriptions for user:', user.id);

      // Get user's profile ID for filtering
      const { data: profile } = await supabase
        .from('profile')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        console.log('[RealtimeSync] No profile found, skipping subscriptions');
        setIsConnected(false);
        return;
      }

      profileIdRef.current = profile.id;
      const profileId = profile.id;

      console.log('[RealtimeSync] Profile ID:', profileId, '- Setting up subscriptions...');

      // Also get initial work IDs for achievement filtering
      const { data: works } = await supabase
        .from('work')
        .select('id')
        .eq('profile_id', profileId);

      if (works) {
        userWorkIdsRef.current = new Set(works.map(w => w.id));
        console.log('[RealtimeSync] Loaded', userWorkIdsRef.current.size, 'work IDs for filtering');
      }

      // Subscribe to profile changes
      channelsRef.current.profile = supabase
        .channel(`profile-changes-${profileId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profile',
            filter: `id=eq.${profileId}`,
          },
          async (payload) => {
            console.log('[RealtimeSync] 📢 Profile changed:', payload.eventType);

            // Invalidate profile query to trigger refetch
            try {
              await queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
            } catch (error) {
              console.error('[RealtimeSync] Error syncing profile:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('[RealtimeSync] Profile channel status:', status);
          if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            setIsConnected(true);
          } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
            setIsConnected(false);
          }
        });

      // Subscribe to work changes (INSERT, UPDATE, DELETE)
      channelsRef.current.work = supabase
        .channel(`work-changes-${profileId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'work',
            filter: `profile_id=eq.${profileId}`,
          },
          async (payload) => {
            const workId = (payload.new as Record<string, unknown>)?.id as string;
            console.log('[RealtimeSync] 📢 Work INSERT:', workId);

            // Add new work ID to our set
            if (workId) {
              userWorkIdsRef.current.add(workId);
            }

            await syncWorksFromApi();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'work',
            filter: `profile_id=eq.${profileId}`,
          },
          async (payload) => {
            const workId = (payload.new as Record<string, unknown>)?.id as string;
            console.log('[RealtimeSync] 📢 Work UPDATE:', workId);
            await syncWorksFromApi();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'work',
            filter: `profile_id=eq.${profileId}`,
          },
          async (payload) => {
            const workId = (payload.old as Record<string, unknown>)?.id as string;
            console.log('[RealtimeSync] 📢 Work DELETE:', workId);

            // Remove deleted work ID from our set
            if (workId) {
              userWorkIdsRef.current.delete(workId);
            }

            await syncWorksFromApi();
          }
        )
        .subscribe((status) => {
          console.log('[RealtimeSync] Work channel status:', status);
        });

      // Subscribe to work_achievement changes (INSERT, UPDATE, DELETE)
      // Note: We listen to all achievements and filter client-side by work_id
      channelsRef.current.achievement = supabase
        .channel(`achievement-changes-${profileId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'work_achievement',
          },
          async (payload) => {
            const achievementWorkId = (payload.new as Record<string, unknown>)?.work_id as string;

            // Only sync if this achievement belongs to one of user's works
            if (!achievementWorkId || !userWorkIdsRef.current.has(achievementWorkId)) {
              return;
            }

            console.log('[RealtimeSync] 📢 Achievement INSERT for work:', achievementWorkId);
            await syncWorksFromApi();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'work_achievement',
          },
          async (payload) => {
            const achievementWorkId = (payload.new as Record<string, unknown>)?.work_id as string;

            // Only sync if this achievement belongs to one of user's works
            if (!achievementWorkId || !userWorkIdsRef.current.has(achievementWorkId)) {
              return;
            }

            console.log('[RealtimeSync] 📢 Achievement UPDATE for work:', achievementWorkId);
            await syncWorksFromApi();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'work_achievement',
          },
          async (payload) => {
            const achievementWorkId = (payload.old as Record<string, unknown>)?.work_id as string;

            // Only sync if this achievement belongs to one of user's works
            if (!achievementWorkId || !userWorkIdsRef.current.has(achievementWorkId)) {
              return;
            }

            console.log('[RealtimeSync] 📢 Achievement DELETE for work:', achievementWorkId);
            await syncWorksFromApi();
          }
        )
        .subscribe((status) => {
          console.log('[RealtimeSync] Achievement channel status:', status);
        });

      console.log('[RealtimeSync] ✅ All subscriptions set up successfully');

    } catch (error) {
      console.error('[RealtimeSync] Error setting up subscriptions:', error);
      setIsConnected(false);
    }
  }, [queryClient, syncWorksFromApi]);

  // Cleanup subscriptions
  const cleanupSubscriptions = useCallback(async () => {
    console.log('[RealtimeSync] Cleaning up subscriptions');

    // Clear any pending sync timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    if (channelsRef.current.profile) {
      await supabase.removeChannel(channelsRef.current.profile);
      channelsRef.current.profile = null;
    }
    if (channelsRef.current.work) {
      await supabase.removeChannel(channelsRef.current.work);
      channelsRef.current.work = null;
    }
    if (channelsRef.current.achievement) {
      await supabase.removeChannel(channelsRef.current.achievement);
      channelsRef.current.achievement = null;
    }

    setIsConnected(false);
  }, []);

  // Setup subscriptions on mount
  useEffect(() => {
    setupRealtimeSubscriptions();

    return () => {
      cleanupSubscriptions();
    };
  }, [setupRealtimeSubscriptions, cleanupSubscriptions]);

  // Handle app state changes - reconnect when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const wasInBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      appStateRef.current = nextAppState;

      // When app comes to foreground from background, reconnect realtime
      if (wasInBackground && isNowActive) {
        console.log('[RealtimeSync] App came to foreground, reconnecting...');

        // Small delay to ensure network is ready
        setTimeout(async () => {
          await setupRealtimeSubscriptions();
        }, 500);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [setupRealtimeSubscriptions]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<RealtimeSyncContextType>(() => ({
    isConnected,
    forceSync,
  }), [isConnected, forceSync]);

  return (
    <RealtimeSyncContext.Provider value={contextValue}>
      {children}
    </RealtimeSyncContext.Provider>
  );
}
