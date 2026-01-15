import React, { useEffect, useCallback, useRef } from 'react';
import { useWorksStore, type Work as LocalWork, type WorkAchievement as LocalWorkAchievement } from '@/lib/state/works-store';
import { useStreakStore } from '@/lib/state/streak-store';
import { useProfile, useUpdateStreak } from '@/lib/hooks/useApiData';
import { type Work as ApiWork } from '@/shared/contracts';

// Transform API work format to local store format
function transformApiWorkToLocal(apiWork: ApiWork): LocalWork {
  // Convert achievements from Record<string, WorkAchievement[]> to the local format
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

interface DataSyncProviderProps {
  children: React.ReactNode;
}

export function DataSyncProvider({ children }: DataSyncProviderProps) {
  const { data: profileData, isSuccess: profileLoaded, dataUpdatedAt } = useProfile();
  const updateStreakMutation = useUpdateStreak();

  // Works store actions
  const localWorks = useWorksStore((s) => s.works);

  // Streak store
  const updateStreakFromWorks = useStreakStore((s) => s.updateStreakFromWorks);

  // Track last sync time to detect changes
  const lastSyncTimeRef = useRef<number>(0);

  // Sync works from API to local store
  const syncFromApi = useCallback(() => {
    if (!profileData?.works) {
      console.log('⏭️ [DataSync] Skipping sync: no works data available');
      return;
    }

    // Only sync if data has been updated since last sync
    if (dataUpdatedAt <= lastSyncTimeRef.current) {
      console.log('⏭️ [DataSync] Skipping sync: data has not been updated since last sync');
      return;
    }

    try {
      // Transform and set works in local store
      const transformedWorks = profileData.works.map(transformApiWorkToLocal);

      // Update local store with API data
      useWorksStore.setState({ works: transformedWorks });

      // Update streak from works
      updateStreakFromWorks(transformedWorks);

      lastSyncTimeRef.current = dataUpdatedAt;

      console.log('✅ [DataSync] Synced works from API to local store', {
        worksCount: transformedWorks.length,
        timestamp: new Date().toISOString(),
        dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
      });
    } catch (error) {
      console.error('❌ [DataSync] Sync from API failed:', error);
    }
  }, [profileData?.works, updateStreakFromWorks, dataUpdatedAt]);

  // Sync whenever profile data changes
  useEffect(() => {
    if (profileLoaded && profileData?.profile) {
      console.log('🔄 [DataSync] Profile loaded, triggering sync...', {
        hasProfile: !!profileData.profile,
        worksCount: profileData.works?.length || 0,
        dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
      });
      syncFromApi();
    } else {
      console.log('⏭️ [DataSync] Waiting for profile data...', {
        profileLoaded,
        hasProfile: !!profileData?.profile,
      });
    }
  }, [profileLoaded, profileData?.profile, profileData?.works, syncFromApi, dataUpdatedAt]);

  // Update streak when local works change
  useEffect(() => {
    if (localWorks.length > 0) {
      updateStreakFromWorks(localWorks);
    }
  }, [localWorks, updateStreakFromWorks]);

  // Periodic streak update to backend (every 5 minutes when works exist)
  useEffect(() => {
    const interval = setInterval(() => {
      if (localWorks.length > 0) {
        updateStreakMutation.mutate();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [localWorks.length, updateStreakMutation]);

  return <>{children}</>;
}
