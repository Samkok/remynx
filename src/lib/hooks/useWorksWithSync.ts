import { useCallback } from 'react';
import { useWorksStore, WORK_COLORS, type SkipType } from '@/lib/state/works-store';
import { formatDate } from '@/lib/state/life-store';
import { api } from '@/lib/api';
import { authClient } from '@/lib/authClient';
import {
  type CreateWorkResponse,
  type UpdateWorkResponse,
  type DeleteWorkResponse,
  type CreateAchievementResponse,
  type DeleteAchievementResponse,
} from '@/shared/contracts';

// Hook to check if user is authenticated
async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await authClient.getSession();
    return !!session?.data?.user;
  } catch {
    return false;
  }
}

// Hook that wraps works store with API sync
export function useWorksWithSync() {
  // Local store actions
  const localAddWork = useWorksStore((s) => s.addWork);
  const localRemoveWork = useWorksStore((s) => s.removeWork);
  const localUpdateWork = useWorksStore((s) => s.updateWork);
  const localSkipWork = useWorksStore((s) => s.skipWork);
  const localUnskipWork = useWorksStore((s) => s.unskipWork);
  const localAddWorkAchievement = useWorksStore((s) => s.addWorkAchievement);
  const localRemoveWorkAchievement = useWorksStore((s) => s.removeWorkAchievement);
  const works = useWorksStore((s) => s.works);

  // Add work with API sync
  const addWork = useCallback(
    async (name: string, description?: string, color?: string) => {
      const workColor = color || WORK_COLORS[works.length % WORK_COLORS.length];

      // Always update local store first for immediate UI response
      localAddWork(name, description, workColor);

      // Sync to backend if authenticated
      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          const response = await api.post<CreateWorkResponse>('/api/works', {
            name,
            description,
            color: workColor,
          });

          // Update local work with backend ID if different
          if (response.work) {
            const localWorks = useWorksStore.getState().works;
            const lastWork = localWorks[localWorks.length - 1];
            if (lastWork && lastWork.name === name && lastWork.id !== response.work.id) {
              // Replace local ID with backend ID
              useWorksStore.setState({
                works: localWorks.map((w) =>
                  w.id === lastWork.id ? { ...w, id: response.work.id } : w
                ),
              });
            }
          }
        }
      } catch (error) {
        console.log('Failed to sync addWork to backend:', error);
      }
    },
    [localAddWork, works.length]
  );

  // Remove work with API sync
  const removeWork = useCallback(
    async (workId: string) => {
      localRemoveWork(workId);

      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          await api.delete<DeleteWorkResponse>(`/api/works/${workId}`);
        }
      } catch (error) {
        console.log('Failed to sync removeWork to backend:', error);
      }
    },
    [localRemoveWork]
  );

  // Update work with API sync
  const updateWork = useCallback(
    async (
      workId: string,
      updates: { name?: string; description?: string; color?: string }
    ) => {
      localUpdateWork(workId, updates);

      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          await api.patch<UpdateWorkResponse>(`/api/works/${workId}`, updates);
        }
      } catch (error) {
        console.log('Failed to sync updateWork to backend:', error);
      }
    },
    [localUpdateWork]
  );

  // Skip work with API sync
  const skipWork = useCallback(
    async (workId: string, skipType: SkipType) => {
      const today = formatDate(new Date());
      localSkipWork(workId, skipType);

      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          await api.patch<UpdateWorkResponse>(`/api/works/${workId}`, {
            skipType,
            skipDate: today,
          });
        }
      } catch (error) {
        console.log('Failed to sync skipWork to backend:', error);
      }
    },
    [localSkipWork]
  );

  // Unskip work with API sync
  const unskipWork = useCallback(
    async (workId: string) => {
      localUnskipWork(workId);

      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          await api.patch<UpdateWorkResponse>(`/api/works/${workId}`, {
            skipType: null,
            skipDate: null,
          });
        }
      } catch (error) {
        console.log('Failed to sync unskipWork to backend:', error);
      }
    },
    [localUnskipWork]
  );

  // Add achievement with API sync
  const addWorkAchievement = useCallback(
    async (workId: string, date: string, text: string) => {
      localAddWorkAchievement(workId, date, text);

      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          const response = await api.post<CreateAchievementResponse>(
            `/api/works/${workId}/achievements`,
            { text, date }
          );

          // Update local achievement with backend ID
          if (response.achievement) {
            const localWorks = useWorksStore.getState().works;
            useWorksStore.setState({
              works: localWorks.map((w) => {
                if (w.id !== workId) return w;

                const dateAchievements = w.achievements[date] || [];
                const lastAchievement = dateAchievements[dateAchievements.length - 1];

                if (
                  lastAchievement &&
                  lastAchievement.text === text &&
                  lastAchievement.id !== response.achievement.id
                ) {
                  return {
                    ...w,
                    achievements: {
                      ...w.achievements,
                      [date]: dateAchievements.map((a) =>
                        a.id === lastAchievement.id
                          ? { ...a, id: response.achievement.id }
                          : a
                      ),
                    },
                  };
                }

                return w;
              }),
            });
          }
        }
      } catch (error) {
        console.log('Failed to sync addWorkAchievement to backend:', error);
      }
    },
    [localAddWorkAchievement]
  );

  // Remove achievement with API sync
  const removeWorkAchievement = useCallback(
    async (workId: string, date: string, achievementId: string) => {
      localRemoveWorkAchievement(workId, date, achievementId);

      try {
        const authenticated = await isAuthenticated();
        if (authenticated) {
          await api.delete<DeleteAchievementResponse>(
            `/api/works/${workId}/achievements/${achievementId}`
          );
        }
      } catch (error) {
        console.log('Failed to sync removeWorkAchievement to backend:', error);
      }
    },
    [localRemoveWorkAchievement]
  );

  return {
    works,
    addWork,
    removeWork,
    updateWork,
    skipWork,
    unskipWork,
    addWorkAchievement,
    removeWorkAchievement,
  };
}
