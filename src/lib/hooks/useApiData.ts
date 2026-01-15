import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  type GetProfileResponse,
  type CreateWorkResponse,
  type UpdateWorkResponse,
  type DeleteWorkResponse,
  type CreateAchievementResponse,
  type DeleteAchievementResponse,
  type UpdateStreakResponse,
  type Work,
} from '@/shared/contracts';

// Query keys
export const profileKeys = {
  all: ['profile'] as const,
  detail: () => [...profileKeys.all, 'detail'] as const,
};

export const worksKeys = {
  all: ['works'] as const,
  lists: () => [...worksKeys.all, 'list'] as const,
};

export const streakKeys = {
  all: ['streak'] as const,
};

// Hooks

// Fetch profile and works
export function useProfile() {
  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: async () => {
      try {
        const response = await api.get<GetProfileResponse>('/api/profile');
        return response;
      } catch (error) {
        console.log('Failed to fetch profile:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Disable auto refetch on focus to prevent network errors
    refetchOnReconnect: true, // Refetch when network reconnects
  });
}

// Create work
export function useCreateWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string }) => {
      const response = await api.post<CreateWorkResponse>('/api/works', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
    },
  });
}

// Update work
export function useUpdateWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workId,
      data,
    }: {
      workId: string;
      data: {
        name?: string;
        description?: string;
        color?: string;
        skipType?: 'today' | 'indefinite' | null;
        skipDate?: string | null;
      };
    }) => {
      const response = await api.patch<UpdateWorkResponse>(`/api/works/${workId}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
    },
  });
}

// Delete work
export function useDeleteWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workId: string) => {
      const response = await api.delete<DeleteWorkResponse>(`/api/works/${workId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
    },
  });
}

// Create achievement
export function useCreateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workId,
      text,
      date,
    }: {
      workId: string;
      text: string;
      date: string;
    }) => {
      const response = await api.post<CreateAchievementResponse>(
        `/api/works/${workId}/achievements`,
        { text, date }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      queryClient.invalidateQueries({ queryKey: streakKeys.all });
    },
  });
}

// Delete achievement
export function useDeleteAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workId,
      achievementId,
    }: {
      workId: string;
      achievementId: string;
    }) => {
      const response = await api.delete<DeleteAchievementResponse>(
        `/api/works/${workId}/achievements/${achievementId}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      queryClient.invalidateQueries({ queryKey: streakKeys.all });
    },
  });
}

// Update streak
export function useUpdateStreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<UpdateStreakResponse>('/api/streak/update');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
    },
  });
}

// Helper to transform API works to local format
export function transformApiWorksToLocal(apiWorks: Work[]): Work[] {
  return apiWorks;
}
